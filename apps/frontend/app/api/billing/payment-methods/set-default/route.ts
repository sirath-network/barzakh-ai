import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  toHttpError,
} from "@/lib/billing/stripe-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const paymentMethodId =
      typeof payload.paymentMethodId === "string" ? payload.paymentMethodId : null;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Missing paymentMethodId" },
        { status: 400 },
      );
    }

    const customerRecord = await ensureStripeCustomer(session.user.id);

    await stripe.customers.update(customerRecord.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json(
      { error: httpError.message },
      { status: httpError.status },
    );
  }
}

