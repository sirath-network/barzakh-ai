"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { IdCard } from "lucide-react";
import { useSession } from "next-auth/react";
import { fetcher } from "@barzakh/shared/lib/utils/utils";

import { SubscriptionCard } from "@/components/settings/subscription-card";
import { PaymentMethodsCard } from "@/components/settings/billing/payment-methods-card";
import { BillingHistoryCard } from "@/components/settings/billing/billing-history-card";

import type {
  InvoicesResponse,
  PaymentMethodsResponse,
  SubscriptionResponse,
  X402TransactionsResponse,
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

  // X402 transactions pagination state
  const [x402Pagination, setX402Pagination] = useState<{
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
    setX402Pagination({
      history: [{}],
      index: 0,
    });
  }, [session?.user?.id]);

  const currentCursor = invoicePagination.history[invoicePagination.index] ?? {};
  const currentX402Cursor = x402Pagination.history[x402Pagination.index] ?? {};

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

  // Build x402 transactions key with pagination
  const x402Key = useMemo(() => {
    if (!session) return null;
    const params = new URLSearchParams();
    params.set("limit", "10");

    if (currentX402Cursor.starting_after) {
      params.set("starting_after", currentX402Cursor.starting_after);
    }

    return `/api/billing/x402/transactions?${params.toString()}`;
  }, [session, currentX402Cursor.starting_after]);

  // Fetch x402 crypto transactions with pagination
  const {
    data: x402Data,
    isLoading: loadingX402,
    isValidating: validatingX402,
  } = useSWR<X402TransactionsResponse>(x402Key, fetcher);

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

  // X402 pagination handlers
  const handleNextX402Page = () => {
    if (!x402Data?.hasMore || !x402Data?.nextCursor) return;
    const nextCursor = x402Data.nextCursor;
    setX402Pagination((prev) => {
      const trimmedHistory = prev.history.slice(0, prev.index + 1);
      trimmedHistory.push({ starting_after: nextCursor });
      return {
        history: trimmedHistory,
        index: prev.index + 1,
      };
    });
  };

  const handlePreviousX402Page = () => {
    setX402Pagination((prev) => {
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

  // X402 pagination state
  const isPaginatingX402 = validatingX402 && !loadingX402;
  const canGoPreviousX402 = x402Pagination.index > 0;
  const canGoNextX402 =
    Boolean(x402Data?.hasMore) && Boolean(x402Data?.nextCursor);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border flex-shrink-0">
              <IdCard className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-tight">Manage Subscription &amp; Payments</h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1">Keep your plan, invoices, and payment methods up to date. Changes take effect immediately.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SubscriptionCard
              subscription={subscription}
              isLoading={loadingSubscription}
              onRefresh={refreshSubscriptionAndPayments}
              fallbackTier={subscriptionFallbackTier}
            />
          </div>
          <div>
            <PaymentMethodsCard
              paymentMethods={paymentMethods}
              defaultPaymentMethodId={defaultPaymentMethodId}
              isLoading={loadingPaymentMethods}
              isSubscribed={isSubscribed}
              onRefresh={refreshSubscriptionAndPayments}
              subscription={subscription}
            />
          </div>
        </div>

        <BillingHistoryCard
          data={invoicesData}
          x402Data={x402Data}
          isLoading={(loadingInvoices && !invoicesData) || (loadingX402 && !x402Data)}
          onNextPage={handleNextInvoicesPage}
          onPreviousPage={handlePreviousInvoicesPage}
          isPaginating={isPaginatingInvoices}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onNextX402Page={handleNextX402Page}
          onPreviousX402Page={handlePreviousX402Page}
          isPaginatingX402={isPaginatingX402}
          canGoPreviousX402={canGoPreviousX402}
          canGoNextX402={canGoNextX402}
        />

        <div className="bg-white dark:bg-zinc-900/80 rounded-2xl shadow-lg border border-gray-200 dark:border-zinc-800/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-1">
                Need help with billing?
              </h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                Questions about invoices, payment methods, or subscription changes? Our support team is ready to assist.
              </p>
            </div>
            <button
              onClick={() => window.open("https://barzakh.framer.ai/contact", "_blank")}
              className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-800 dark:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-300 dark:border-white/20 text-xs md:text-sm"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}