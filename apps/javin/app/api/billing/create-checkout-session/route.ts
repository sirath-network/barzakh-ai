import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/lib/db/queries";
import { db } from "@/lib/db/db";
import { customer as customerTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { price, quantity = 1 } = await req.json();
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUser(session.user.email!);
  if (!user || user.length === 0) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let customer;
  const customers = await db.select().from(customerTable).where(eq(customerTable.userId, user[0].id));
  if (customers.length > 0) {
    customer = customers[0];
  }

  if (!customer) {
    const customerData = await stripe.customers.create({
      email: user[0].email!,
      name: user[0].name!,
    });
    const newCustomer = await db.insert(customerTable).values({
        userId: user[0].id,
        stripeCustomerId: customerData.id,
    }).returning();
    customer = newCustomer[0];
  }

  const stripeSession = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    billing_address_collection: "required",
    customer: customer.stripeCustomerId,
    line_items: [
      {
        price: price,
        quantity: quantity,
      },
    ],
    mode: "subscription",
    // ✅ UPDATED LINE: Add the session_id query parameter back
    success_url: `${process.env.PUBLIC_BASE_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PUBLIC_BASE_URL}`,
  });

  return NextResponse.json({ sessionId: stripeSession.id });
}
