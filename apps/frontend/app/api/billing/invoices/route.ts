import { auth } from "@/app/(auth)/auth";
import { stripe } from "@/lib/stripe";
import {
  ensureStripeCustomer,
  toHttpError,
} from "@/lib/billing/stripe-server";
import { NextResponse } from "next/server";

function parseLimit(value: string | null): number {
  if (!value) return 10;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 10;
  }
  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customerRecord = await ensureStripeCustomer(session.user.id);

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const limit = parseLimit(searchParams.get("limit"));
    const startingAfter = searchParams.get("starting_after") || undefined;
    const endingBefore = searchParams.get("ending_before") || undefined;

    const invoices = await stripe.invoices.list({
      customer: customerRecord.stripeCustomerId,
      limit,
      starting_after: startingAfter,
      ending_before: endingBefore,
    });

    const data = invoices.data.map((invoice) => ({
      id: invoice.id,
      number: invoice.number ?? null,
      amountPaid: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      chargeId: invoice.charge ?? null,
    }));

    const nextCursor =
      invoices.data.length > 0
        ? invoices.data[invoices.data.length - 1].id
        : null;
    const prevCursor =
      invoices.data.length > 0 ? invoices.data[0].id : null;

    return NextResponse.json({
      invoices: data,
      hasMore: invoices.has_more,
      nextCursor,
      prevCursor,
    });
  } catch (error) {
    const httpError = toHttpError(error);
    return NextResponse.json(
      { error: httpError.message },
      { status: httpError.status },
    );
  }
}

