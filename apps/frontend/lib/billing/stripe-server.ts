import "server-only";

import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db/db";
import {
  customer as customerTable,
  user as userTable,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";

export type CustomerRecord = typeof customerTable.$inferSelect;

class StripeCustomerError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StripeCustomerError";
    this.status = status;
  }
}

export async function findCustomerByUserId(
  userId: string,
): Promise<CustomerRecord | null> {
  const customers = await db
    .select()
    .from(customerTable)
    .where(eq(customerTable.userId, userId));

  return customers.length > 0 ? customers[0] : null;
}

export async function ensureStripeCustomer(
  userId: string,
): Promise<CustomerRecord> {
  const existingCustomer = await findCustomerByUserId(userId);
  if (existingCustomer) {
    return existingCustomer;
  }

  const [user] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (!user || !user.email) {
    throw new StripeCustomerError("User not found or missing email", 404);
  }

  const createdCustomer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
  });

  const [record] = await db
    .insert(customerTable)
    .values({
      userId,
      stripeCustomerId: createdCustomer.id,
    })
    .returning();

  return record;
}

export async function retrieveStripeCustomer(
  stripeCustomerId: string,
  expand?: Stripe.CustomerExpandParameter[],
): Promise<Stripe.Customer> {
  const customer = await stripe.customers.retrieve(stripeCustomerId, {
    expand,
  });

  if ((customer as Stripe.DeletedCustomer).deleted) {
    throw new StripeCustomerError("Stripe customer record has been deleted", 410);
  }

  return customer as Stripe.Customer;
}

export class HttpError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof StripeCustomerError) {
    return new HttpError(error.message, error.status);
  }

  if (error instanceof Error && "statusCode" in error) {
    const statusCode = Number((error as any).statusCode);
    if (!Number.isNaN(statusCode) && statusCode >= 400) {
      return new HttpError(error.message, statusCode);
    }
  }

  return new HttpError(
    error instanceof Error ? error.message : "Internal Server Error",
    500,
  );
}

