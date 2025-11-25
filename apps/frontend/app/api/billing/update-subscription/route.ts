import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  toHttpError,
} from "@/lib/billing/stripe-server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

function sanitizeSubscription(subscription: Stripe.Subscription) {
  const primaryItem = subscription.items.data[0];

  return {
    id: subscription.id,
    status: subscription.status,
    priceId: primaryItem?.price.id ?? null,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd:
      typeof (subscription as any).current_period_end === "number"
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const newPriceId =
      typeof payload.priceId === "string" ? payload.priceId : null;

    if (!newPriceId) {
      return NextResponse.json(
        { error: "Missing required priceId" },
        { status: 400 },
      );
    }

    const prorationBehavior: Stripe.SubscriptionUpdateParams.ProrationBehavior =
      payload.prorationBehavior ?? "create_prorations";

    const customerRecord = await ensureStripeCustomer(session.user.id);

    const incomingSubscriptionId =
      typeof payload.subscriptionId === "string"
        ? payload.subscriptionId
        : undefined;

    let subscription: Stripe.Subscription | null = null;

    if (incomingSubscriptionId) {
      subscription = await stripe.subscriptions.retrieve(incomingSubscriptionId);
    } else {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerRecord.stripeCustomerId,
        status: "all",
        limit: 1,
        expand: ["data.items.data.price"],
      });
      subscription = subscriptions.data.length > 0 ? subscriptions.data[0] : null;
    }

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 },
      );
    }

    const firstItem = subscription.items.data[0];
    if (!firstItem) {
      return NextResponse.json(
        { error: "Subscription has no items to update" },
        { status: 400 },
      );
    }

    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        cancel_at_period_end: false,
        proration_behavior: prorationBehavior,
        items: [
          {
            id: firstItem.id,
            price: newPriceId,
          },
        ],
        metadata: {
          ...subscription.metadata,
          updatedByUserId: session.user.id,
        },
      },
    );

    const paymentMethodId =
      typeof payload.paymentMethodId === "string"
        ? payload.paymentMethodId
        : null;

    if (paymentMethodId) {
      await stripe.customers.update(customerRecord.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

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

