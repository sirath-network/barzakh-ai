import type { Address } from "@stripe/stripe-js";

export type BillingInterval = "day" | "week" | "month" | "year" | null;

export interface SubscriptionSummary {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  cancelAt: string | null;
  canceledAt: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  priceId: string | null;
  planName: string | null;
  amount: number | null;
  currency: string | null;
  interval: BillingInterval;
  intervalCount: number | null;
  defaultPaymentMethodId: string | null;
  metadata: Record<string, string>;
}

export interface SubscriptionResponse {
  subscription: SubscriptionSummary | null;
  billingAddress: Address | null;
  defaultPaymentMethod: {
    id: string;
    brand: string | null;
    last4: string | null;
    billingAddress: Address | null;
  } | null;
}

export interface PaymentMethodSummary {
  id: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
}

export interface PaymentMethodsResponse {
  paymentMethods: PaymentMethodSummary[];
  defaultPaymentMethodId: string | null;
  hasMore: boolean;
}

export interface InvoiceSummary {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  status: string | null;
  created: number;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  chargeId: string | null;
}

export interface InvoicesResponse {
  invoices: InvoiceSummary[];
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
}

