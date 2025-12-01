"use client";

import type { InvoicesResponse } from "@/types/billing";
import { format } from "date-fns";

interface BillingHistoryCardProps {
  data: InvoicesResponse | undefined;
  isLoading: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  isPaginating: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

function formatAmount(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });

  return formatter.format(amount / 100);
}

export function BillingHistoryCard({
  data,
  isLoading,
  onNextPage,
  onPreviousPage,
  isPaginating,
  canGoPrevious,
  canGoNext,
}: BillingHistoryCardProps) {
  const hasInvoices = data?.invoices && data.invoices.length > 0;

  // Temporarily disabled - Stripe integration coming soon
  const isTemporarilyDisabled = true;

  return (
    <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
      {/* Blur overlay for temporarily disabled state */}
      {isTemporarilyDisabled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/70 backdrop-blur-sm rounded-2xl">
          <div className="text-center px-6">
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">Coming Soon</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Billing history will be available soon</p>
          </div>
        </div>
      )}
      <div className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Billing History
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Review your past invoices and download receipts.
            </p>
          </div>
          {hasInvoices && (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onPreviousPage}
                disabled={!canGoPrevious || isPaginating}
                className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-red-900/40 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-red-700/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2">
                {isPaginating ? "Fetching..." : "Invoices"}
              </span>
              <button
                onClick={onNextPage}
                disabled={!canGoNext || isPaginating}
                className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-red-900/40 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-red-700/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 pt-0 overflow-x-auto">
        {isLoading ? (
          <div className="border border-dashed border-gray-300 dark:border-red-900/40 rounded-xl p-6 text-center text-sm text-gray-500 dark:text-gray-300">
            Loading invoices...
          </div>
        ) : hasInvoices ? (
          <div className="space-y-4">
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-red-900/40 text-sm">
                <thead className="bg-gray-50 dark:bg-black/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-red-900/30">
                  {data?.invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {format(new Date(invoice.created * 1000), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {formatAmount(invoice.amountPaid, invoice.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${
                            invoice.status === "paid"
                              ? "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700/40"
                              : invoice.status === "open"
                              ? "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700/40"
                              : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-black/40 dark:border-red-900/40"
                          }`}
                        >
                          {invoice.status?.toUpperCase() ?? "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {invoice.invoicePdf || invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.invoicePdf ?? invoice.hostedInvoiceUrl ?? "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-900 underline decoration-dashed underline-offset-4 hover:text-gray-600 dark:text-white dark:hover:text-red-400"
                          >
                            Download PDF
                          </a>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            N/A
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {data?.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="rounded-2xl border border-gray-200 dark:border-red-900/40 bg-white/70 dark:bg-black/50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {format(new Date(invoice.created * 1000), "dd MMM yyyy")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {invoice.number ?? invoice.id}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${
                        invoice.status === "paid"
                          ? "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700/40"
                          : invoice.status === "open"
                          ? "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700/40"
                          : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-black/40 dark:border-red-900/40"
                      }`}
                    >
                      {invoice.status?.toUpperCase() ?? "UNKNOWN"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    <div className="flex w-full justify-between text-gray-600 dark:text-gray-300">
                      <span>Amount</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatAmount(invoice.amountPaid, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex w-full justify-between text-gray-600 dark:text-gray-300">
                      <span>Invoice</span>
                      {invoice.invoicePdf || invoice.hostedInvoiceUrl ? (
                        <a
                          href={invoice.invoicePdf ?? invoice.hostedInvoiceUrl ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-gray-700 hover:text-gray-500 dark:text-red-300 dark:hover:text-red-200 underline decoration-dashed underline-offset-4"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          N/A
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 dark:border-red-900/40 rounded-xl p-6 text-center text-sm text-gray-500 dark:text-gray-300">
            No invoices generated yet. Once you upgrade, your receipts will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

