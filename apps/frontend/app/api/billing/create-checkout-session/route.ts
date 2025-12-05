import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import { getUserById } from "@/lib/db/queries";
import { db } from "@/lib/db/db";
import { customer as customerTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { planId, price, quantity = 1, billingCycle } = await req.json();
  const normalizedPlanId = typeof planId === "string" ? planId.toLowerCase() : undefined;
  const normalizedCycle = typeof billingCycle === "string" ? billingCycle.toLowerCase() : undefined;

  const planPriceMap: Record<string, Record<string, string | undefined>> = {
    pro: {
      default: process.env.STRIPE_PRO_PRICE_ID,
      monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      quarterly: process.env.STRIPE_PRO_QUARTERLY_PRICE_ID,
      yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    },
    ultimate: {
      default: process.env.STRIPE_ULTIMATE_PRICE_ID,
      monthly: process.env.STRIPE_ULTIMATE_MONTHLY_PRICE_ID,
      quarterly: process.env.STRIPE_ULTIMATE_QUARTERLY_PRICE_ID,
      yearly: process.env.STRIPE_ULTIMATE_YEARLY_PRICE_ID,
    },
  };

  let priceId: string | undefined = typeof price === "string" ? price : undefined;

  if (!priceId && normalizedPlanId) {
    const planConfig = planPriceMap[normalizedPlanId];
    priceId =
      (normalizedCycle ? planConfig?.[normalizedCycle] : undefined) ?? planConfig?.default;
  }

  if (!priceId) {
    return NextResponse.json(
      { error: "Missing Stripe price ID for the selected plan" },
      { status: 400 }
    );
  }

  const ultimatePriceCandidates = Object.values(planPriceMap.ultimate).filter(
    (value): value is string => Boolean(value)
  );

  let resolvedTier: "pro" | "ultimate" = "pro";
  if (
    normalizedPlanId === "ultimate" ||
    (!normalizedPlanId && ultimatePriceCandidates.includes(priceId))
  ) {
    resolvedTier = "ultimate";
  }
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserById(session.user.id);
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
        price: priceId,
        quantity: quantity,
      },
    ],
    mode: "subscription",
    subscription_data: {
      metadata: {
        tier: resolvedTier,
      },
    },
    metadata: {
      planId: resolvedTier,
    },
    // ✅ UPDATED LINE: Add the session_id query parameter back
    success_url: `${process.env.PUBLIC_BASE_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.PUBLIC_BASE_URL}`,
  });

  return NextResponse.json({ sessionId: stripeSession.id });
}
