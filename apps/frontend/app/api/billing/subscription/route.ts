import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  retrieveStripeCustomer,
  toHttpError,
} from "@/lib/billing/stripe-server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db/db";
import { user, x402_transactions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

function normalizeAddress(address?: Stripe.Address | null) {
  if (!address) {
    return null;
  }

  return {
    city: address.city ?? null,
    country: address.country ?? null,
    line1: address.line1 ?? null,
    line2: address.line2 ?? null,
    postal_code: address.postal_code ?? null,
    state: address.state ?? null,
  };
}

function formatSubscription(
  subscription: Stripe.Subscription,
  customer: Stripe.Customer,
) {
  const primaryItem = subscription.items.data[0];
  const price = primaryItem?.price;
  const product = price?.product as Stripe.Product | undefined;

  const legacyCurrentPeriodEnd =
    "current_period_end" in subscription
      ? (subscription as Stripe.Subscription & { current_period_end?: number })
        .current_period_end ?? null
      : null;
  const expandedCurrentPeriod =
    (subscription as Stripe.Subscription & {
      current_period?: { start: number; end: number };
    }).current_period ?? null;
  const currentPeriodEndUnix =
    legacyCurrentPeriodEnd ?? expandedCurrentPeriod?.end ?? null;

  const nextBillingDate =
    subscription.cancel_at_period_end && subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : currentPeriodEndUnix
        ? new Date(currentPeriodEndUnix * 1000)
        : null;

  return {
    id: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    cancelAt:
      typeof subscription.cancel_at === "number"
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
    canceledAt:
      typeof subscription.canceled_at === "number"
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    currentPeriodEnd:
      typeof currentPeriodEndUnix === "number"
        ? new Date(currentPeriodEndUnix * 1000).toISOString()
        : null,
    nextBillingDate: nextBillingDate?.toISOString() ?? null,
    priceId: price?.id ?? null,
    planName:
      price?.nickname ??
      (typeof product?.name === "string" ? product.name : null) ??
      (subscription as any).plan?.nickname ??
      null,
    amount: typeof price?.unit_amount === "number" ? price.unit_amount : null,
    currency: price?.currency ?? null,
    interval: price?.recurring?.interval ?? null,
    intervalCount:
      typeof price?.recurring?.interval_count === "number"
        ? price.recurring.interval_count
        : null,
    defaultPaymentMethodId:
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings?.default_payment_method as
          | Stripe.PaymentMethod
          | null
          | undefined)?.id ?? null,
    metadata: subscription.metadata ?? {},
  };
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerRecord = await ensureStripeCustomer(session.user.id);
    const stripeCustomer = await retrieveStripeCustomer(
      customerRecord.stripeCustomerId,
      ["invoice_settings.default_payment_method"],
    );
    const defaultPaymentMethod =
      typeof stripeCustomer.invoice_settings?.default_payment_method ===
        "object"
        ? (stripeCustomer.invoice_settings
          .default_payment_method as Stripe.PaymentMethod)
        : null;
    const latestBillingAddress =
      defaultPaymentMethod?.billing_details?.address ??
      stripeCustomer.address ??
      null;

    const subscriptions = await stripe.subscriptions.list({
      customer: customerRecord.stripeCustomerId,
      limit: 1,
    });

    const subscription =
      subscriptions.data.length > 0
        ? await stripe.subscriptions.retrieve(subscriptions.data[0].id)
        : null;

    if (subscription) {
      return NextResponse.json({
        subscription: formatSubscription(subscription, stripeCustomer),
        billingAddress: normalizeAddress(latestBillingAddress),
        defaultPaymentMethod: defaultPaymentMethod
          ? {
            id: defaultPaymentMethod.id,
            brand: defaultPaymentMethod.card?.brand ?? null,
            last4: defaultPaymentMethod.card?.last4 ?? null,
            billingAddress: normalizeAddress(
              defaultPaymentMethod.billing_details?.address,
            ),
          }
          : null,
      });
    }

    // If no Stripe subscription, check for x402 subscription
    const [dbUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (dbUser && (dbUser.tier === "pro" || dbUser.tier === "ultimate")) {
      // Fetch latest x402 transaction to get billing details
      const [latestTx] = await db
        .select()
        .from(x402_transactions)
        .where(eq(x402_transactions.userId, session.user.id))
        .orderBy(desc(x402_transactions.createdAt))
        .limit(1);

      const billingCycle = dbUser.billingCycle || latestTx?.billingCycle || "monthly";
      let intervalCount = 1;
      let interval = "month";

      if (billingCycle === "quarterly") {
        intervalCount = 3;
      } else if (billingCycle === "yearly") {
        interval = "year";
      }

      // Use x402PeriodEnd from user table, fallback to calculating from transaction
      let currentPeriodEnd: Date;
      let shouldPersistPeriodEnd = false;

      if (dbUser.x402PeriodEnd) {
        currentPeriodEnd = new Date(dbUser.x402PeriodEnd);
      } else {
        // Fallback for users who paid before x402PeriodEnd was added
        // Calculate and persist it so future checks are faster
        const createdAt = latestTx?.createdAt ? new Date(latestTx.createdAt) : new Date();
        currentPeriodEnd = new Date(createdAt);
        if (interval === "year") {
          currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
        } else if (interval === "month") {
          currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + intervalCount);
        }
        shouldPersistPeriodEnd = true; // Mark for persistence
      }

      // Persist x402PeriodEnd for legacy users who don't have it
      if (shouldPersistPeriodEnd && latestTx) {
        await db.update(user).set({
          x402PeriodEnd: currentPeriodEnd,
        }).where(eq(user.id, session.user.id));
        console.log(`[Subscription] Persisted x402PeriodEnd for legacy user ${session.user.id}: ${currentPeriodEnd.toISOString()}`);
      }

      // Check if expired
      if (currentPeriodEnd < new Date()) {
        // Downgrade user
        await db.update(user).set({
          tier: "free",
          x402CancelAtPeriodEnd: false,
          x402PeriodEnd: null,
        }).where(eq(user.id, session.user.id));

        return NextResponse.json({
          subscription: null,
          billingAddress: normalizeAddress(latestBillingAddress),
          defaultPaymentMethod: null,
        });
      }

      // Fixed USD prices for plans in cents
      const PLAN_PRICES_CENTS: Record<string, Record<string, number>> = {
        pro: {
          monthly: 2500,
          quarterly: 6600,
          yearly: 24000,
        },
        ultimate: {
          monthly: 25000,
          quarterly: 66000,
          yearly: 240000,
        },
      };

      // Get the fixed USD price in cents based on tier and billing cycle
      const amountInCents = PLAN_PRICES_CENTS[dbUser.tier]?.[billingCycle] ?? 0;

      const mockSubscription = {
        id: "x402-sub",
        status: "active",
        cancelAtPeriodEnd: dbUser.x402CancelAtPeriodEnd ?? false,
        cancelAt: dbUser.x402CancelAtPeriodEnd ? currentPeriodEnd.toISOString() : null,
        canceledAt: null,
        currentPeriodEnd: currentPeriodEnd.toISOString(),
        nextBillingDate: currentPeriodEnd.toISOString(),
        priceId: "x402-price",
        planName: dbUser.tier.charAt(0).toUpperCase() + dbUser.tier.slice(1),
        amount: amountInCents,
        currency: "USD",
        interval: interval,
        intervalCount: intervalCount,
        defaultPaymentMethodId: null,
        metadata: {
          tier: dbUser.tier,
          paidWithTcro: true,
        },
      };

      return NextResponse.json({
        subscription: mockSubscription,
        billingAddress: null,
        defaultPaymentMethod: null,
      });
    }

    return NextResponse.json({
      subscription: null,
      billingAddress: normalizeAddress(latestBillingAddress),
      defaultPaymentMethod: defaultPaymentMethod
        ? {
          id: defaultPaymentMethod.id,
          brand: defaultPaymentMethod.card?.brand ?? null,
          last4: defaultPaymentMethod.card?.last4 ?? null,
          billingAddress: normalizeAddress(
            defaultPaymentMethod.billing_details?.address,
          ),
        }
        : null,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json(
      { error: httpError.message },
      { status: httpError.status },
    );
  }
}

