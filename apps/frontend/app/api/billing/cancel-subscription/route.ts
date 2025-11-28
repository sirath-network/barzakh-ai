import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  toHttpError,
} from "@/lib/billing/stripe-server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function sanitizeSubscription(subscription: Stripe.Subscription) {
  const subscriptionWithPeriods = subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };

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
      typeof subscriptionWithPeriods.current_period_end === "number"
        ? new Date(subscriptionWithPeriods.current_period_end * 1000).toISOString()
        : null,
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerRecord = await ensureStripeCustomer(session.user.id);
    const payload = await request.json().catch(() => ({}));

    const cancelImmediately =
      typeof payload.cancelImmediately === "boolean"
        ? payload.cancelImmediately
        : false;
    const cancelAtPeriodEnd =
      typeof payload.cancelAtPeriodEnd === "boolean"
        ? payload.cancelAtPeriodEnd
        : true;
    const incomingSubscriptionId =
      typeof payload.subscriptionId === "string"
        ? payload.subscriptionId
        : undefined;

    let targetSubscriptionId = incomingSubscriptionId;

    if (!targetSubscriptionId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerRecord.stripeCustomerId,
        status: "all",
        limit: 10,
      });

      const activeSubscription = subscriptions.data.find(
        (sub) =>
          sub.status === "active" ||
          sub.status === "trialing" ||
          sub.status === "past_due",
      );

      if (!activeSubscription) {
        // Check for x402 subscription
        const [dbUser] = await db
          .select()
          .from(user)
          .where(eq(user.id, session.user.id))
          .limit(1);

        if (dbUser && (dbUser.tier === "pro" || dbUser.tier === "ultimate")) {
          if (cancelImmediately) {
            const freeLimit = Number(process.env.FREE_USER_MESSAGE_LIMIT) || 5;
            await db
              .update(user)
              .set({ 
                tier: "free", 
                x402CancelAtPeriodEnd: false,
                dailyMessageRemaining: freeLimit
              })
              .where(eq(user.id, session.user.id));
            
            return NextResponse.json({
              subscription: {
                id: "x402-sub",
                status: "canceled",
                cancelAtPeriodEnd: false,
                cancelAt: new Date().toISOString(),
                canceledAt: new Date().toISOString(),
                currentPeriodEnd: new Date().toISOString(),
              }
            });
          } else {
            await db
              .update(user)
              .set({ x402CancelAtPeriodEnd: cancelAtPeriodEnd })
              .where(eq(user.id, session.user.id));

            return NextResponse.json({
              subscription: {
                id: "x402-sub",
                status: "active",
                cancelAtPeriodEnd: cancelAtPeriodEnd,
                cancelAt: null, // We don't calculate exact date here, but UI will use currentPeriodEnd
                canceledAt: null,
                currentPeriodEnd: null, // UI will fetch fresh data
              }
            });
          }
        }

        return NextResponse.json(
          { error: "No active subscription found" },
          { status: 404 },
        );
      }

      targetSubscriptionId = activeSubscription.id;
    }

    if (cancelImmediately) {
      const canceledSubscription = await stripe.subscriptions.cancel(
        targetSubscriptionId,
      );

      // Optimistically update DB to remove benefits immediately
      const freeLimit = Number(process.env.FREE_USER_MESSAGE_LIMIT) || 5;
      await db
        .update(user)
        .set({
          tier: "free",
          dailyMessageRemaining: freeLimit,
        })
        .where(eq(user.id, session.user.id));

      return NextResponse.json({
        subscription: sanitizeSubscription(canceledSubscription),
      });
    }

    const updatedSubscription = await stripe.subscriptions.update(
      targetSubscriptionId,
      {
        cancel_at_period_end: cancelAtPeriodEnd,
      },
    );

    return NextResponse.json({
      subscription: sanitizeSubscription(updatedSubscription),
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json(
      { error: httpError.message },
      { status: httpError.status },
    );
  }
}

