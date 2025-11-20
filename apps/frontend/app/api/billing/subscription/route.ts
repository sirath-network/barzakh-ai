import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  retrieveStripeCustomer,
  toHttpError,
} from "@/lib/billing/stripe-server";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

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
      subscription.plan?.nickname ??
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

    return NextResponse.json({
      subscription: subscription
        ? formatSubscription(subscription, stripeCustomer)
        : null,
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

