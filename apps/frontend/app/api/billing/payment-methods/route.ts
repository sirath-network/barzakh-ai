import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  retrieveStripeCustomer,
  toHttpError,
} from "@/lib/billing/stripe-server";
import { NextResponse } from "next/server";

export async function GET() {
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

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerRecord.stripeCustomerId,
      type: "card",
    });

    const defaultPaymentMethodId =
      typeof stripeCustomer.invoice_settings?.default_payment_method ===
      "string"
        ? (stripeCustomer.invoice_settings
            .default_payment_method as string)
        : stripeCustomer.invoice_settings?.default_payment_method?.id ?? null;

    return NextResponse.json({
      paymentMethods: paymentMethods.data.map((pm) => ({
        id: pm.id,
        brand: pm.card?.brand ?? null,
        last4: pm.card?.last4 ?? null,
        expMonth: pm.card?.exp_month ?? null,
        expYear: pm.card?.exp_year ?? null,
        isDefault: pm.id === defaultPaymentMethodId,
      })),
      defaultPaymentMethodId,
      hasMore: paymentMethods.has_more,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json(
      { error: httpError.message },
      { status: httpError.status },
    );
  }
}

