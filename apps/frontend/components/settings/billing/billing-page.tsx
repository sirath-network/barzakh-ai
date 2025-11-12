"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@barzakh/shared/lib/utils/utils";

import { SubscriptionCard } from "@/components/settings/subscription-card";
import { PaymentMethodsCard } from "@/components/settings/billing/payment-methods-card";
import { BillingHistoryCard } from "@/components/settings/billing/billing-history-card";

import type {
  InvoicesResponse,
  PaymentMethodsResponse,
  SubscriptionResponse,
} from "@/types/billing";

interface CursorState {
  starting_after?: string | null;
}

export default function BillingPage() {
  const { data: session } = useSession();
  const [invoicePagination, setInvoicePagination] = useState<{
    history: CursorState[];
    index: number;
  }>({
    history: [{}],
    index: 0,
  });

  useEffect(() => {
    setInvoicePagination({
      history: [{}],
      index: 0,
    });
  }, [session?.user?.id]);

  const currentCursor = invoicePagination.history[invoicePagination.index] ?? {};

  const {
    data: subscriptionData,
    isLoading: loadingSubscription,
    mutate: mutateSubscription,
  } = useSWR<SubscriptionResponse>(
    session ? "/api/billing/subscription" : null,
    fetcher,
  );

  const {
    data: paymentMethodsData,
    isLoading: loadingPaymentMethods,
    mutate: mutatePaymentMethods,
  } = useSWR<PaymentMethodsResponse>(
    session ? "/api/billing/payment-methods" : null,
    fetcher,
  );

  const invoicesKey = useMemo(() => {
    if (!session) return null;
    const params = new URLSearchParams();
    params.set("limit", "10");

    if (currentCursor.starting_after) {
      params.set("starting_after", currentCursor.starting_after);
    }

    return `/api/billing/invoices?${params.toString()}`;
  }, [session, currentCursor.starting_after]);

  const {
    data: invoicesData,
    isLoading: loadingInvoices,
    isValidating: validatingInvoices,
  } = useSWR<InvoicesResponse>(invoicesKey, fetcher);

  const subscription = subscriptionData?.subscription ?? null;
  const paymentMethods = paymentMethodsData?.paymentMethods;
  const defaultPaymentMethodId = paymentMethodsData?.defaultPaymentMethodId ?? null;
  const tierFromSession = session?.user?.tier ?? null;
  const subscriptionFallbackTier =
    subscriptionData?.subscription ? tierFromSession : null;
  const isSubscribed =
    Boolean(subscription) ||
    Boolean(
      subscriptionFallbackTier && subscriptionFallbackTier !== "free",
    );

  const refreshSubscriptionAndPayments = async () => {
    await Promise.all([mutateSubscription(), mutatePaymentMethods()]);
  };

  const handleNextInvoicesPage = () => {
    if (!invoicesData?.hasMore || !invoicesData?.nextCursor) return;
    const nextCursor = invoicesData.nextCursor;
    setInvoicePagination((prev) => {
      const trimmedHistory = prev.history.slice(0, prev.index + 1);
      trimmedHistory.push({ starting_after: nextCursor });
      return {
        history: trimmedHistory,
        index: prev.index + 1,
      };
    });
  };

  const handlePreviousInvoicesPage = () => {
    setInvoicePagination((prev) => {
      if (prev.index === 0) {
        return prev;
      }
      return {
        history: prev.history,
        index: prev.index - 1,
      };
    });
  };

  const isPaginatingInvoices = validatingInvoices && !loadingInvoices;
  const canGoPrevious = invoicePagination.index > 0;
  const canGoNext =
    Boolean(invoicesData?.hasMore) && Boolean(invoicesData?.nextCursor);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <SubscriptionCard
        subscription={subscription}
        isLoading={loadingSubscription}
        onRefresh={refreshSubscriptionAndPayments}
        fallbackTier={subscriptionFallbackTier}
      />

      <PaymentMethodsCard
        paymentMethods={paymentMethods}
        defaultPaymentMethodId={defaultPaymentMethodId}
        isLoading={loadingPaymentMethods}
        isSubscribed={isSubscribed}
        onRefresh={refreshSubscriptionAndPayments}
        subscription={subscription}
      />

      <BillingHistoryCard
        data={invoicesData}
        isLoading={loadingInvoices && !invoicesData}
        onNextPage={handleNextInvoicesPage}
        onPreviousPage={handlePreviousInvoicesPage}
        isPaginating={isPaginatingInvoices}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
      />
    </div>
  );
}
