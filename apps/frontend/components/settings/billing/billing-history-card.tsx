"use client";

import type { InvoicesResponse, X402TransactionsResponse } from "@/types/billing";
import { format } from "date-fns";
import { ExternalLink } from "lucide-react";

interface BillingHistoryCardProps {
  data: InvoicesResponse | undefined;
  x402Data: X402TransactionsResponse | undefined;
  isLoading: boolean;
  // Invoice pagination
  onNextPage: () => void;
  onPreviousPage: () => void;
  isPaginating: boolean;
  canGoPrevious: boolean;
  canGoNext: boolean;
  // X402 pagination
  onNextX402Page: () => void;
  onPreviousX402Page: () => void;
  isPaginatingX402: boolean;
  canGoPreviousX402: boolean;
  canGoNextX402: boolean;
}

function formatAmount(amount: number, currency: string) {
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });

  return formatter.format(amount / 100);
}

function truncateHash(hash: string): string {
  if (hash.length <= 14) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

// Format date in UTC to avoid timezone confusion across midnight
function formatDateUTC(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getUTCDate().toString().padStart(2, "0")} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function BillingHistoryCard({
  data,
  x402Data,
  isLoading,
  onNextPage,
  onPreviousPage,
  isPaginating,
  canGoPrevious,
  canGoNext,
  onNextX402Page,
  onPreviousX402Page,
  isPaginatingX402,
  canGoPreviousX402,
  canGoNextX402,
}: BillingHistoryCardProps) {
  const hasInvoices = data?.invoices && data.invoices.length > 0;
  const hasX402Transactions = x402Data?.transactions && x402Data.transactions.length > 0;
  const hasAnyData = hasInvoices || hasX402Transactions;

  // Show "Coming Soon" only if there's no x402 data AND no Stripe data
  const isTemporarilyDisabled = !hasX402Transactions && !hasInvoices && !isLoading;

  return (
    <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm relative">
      {/* Blur overlay for temporarily disabled state */}
      {isTemporarilyDisabled && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 dark:bg-black/70 backdrop-blur-sm rounded-2xl">
          <div className="text-center px-6">
            <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">No Transactions Yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your payment history will appear here after your first subscription</p>
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
              Review your past payments and transaction records.
            </p>
          </div>
          {hasAnyData && (
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={hasX402Transactions ? onPreviousX402Page : onPreviousPage}
                disabled={hasX402Transactions
                  ? (!canGoPreviousX402 || isPaginatingX402)
                  : (!canGoPrevious || isPaginating)
                }
                className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-800/40 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-red-700/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide px-2">
                {(hasX402Transactions ? isPaginatingX402 : isPaginating) ? "Fetching..." : "Payments"}
              </span>
              <button
                onClick={hasX402Transactions ? onNextX402Page : onNextPage}
                disabled={hasX402Transactions
                  ? (!canGoNextX402 || isPaginatingX402)
                  : (!canGoNext || isPaginating)
                }
                className="px-3 sm:px-4 py-2 rounded-lg border border-gray-300 dark:border-zinc-800/40 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-red-700/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 pt-0 overflow-x-auto">
        {isLoading ? (
          <div className="border border-dashed border-gray-300 dark:border-zinc-800/40 rounded-xl p-6 text-center text-sm text-gray-500 dark:text-gray-300">
            Loading payment history...
          </div>
        ) : hasX402Transactions ? (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-red-900/40 text-sm">
                <thead className="bg-gray-50 dark:bg-black/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">
                      Transaction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-red-900/30">
                  {x402Data?.transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {formatDateUTC(tx.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        <span className="font-medium">{tx.planName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 capitalize">
                          ({tx.billingCycle})
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">
                        {formatAmount(tx.amountCents, tx.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${tx.status === "confirmed"
                            ? "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700/40"
                            : tx.status === "pending"
                              ? "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700/40"
                              : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-black/40 dark:border-zinc-800/40"
                            }`}
                        >
                          {tx.status?.toUpperCase() ?? "UNKNOWN"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tx.explorerUrl ? (
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-500 dark:text-zinc-300 dark:hover:text-red-300 transition-colors"
                          >
                            <span className="font-mono text-xs">{truncateHash(tx.transactionHash)}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {truncateHash(tx.transactionHash)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
              {x402Data?.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-gray-200 dark:border-zinc-800/40 bg-white/70 dark:bg-black/50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatDateUTC(tx.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tx.planName} • {tx.billingCycle}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${tx.status === "confirmed"
                        ? "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700/40"
                        : tx.status === "pending"
                          ? "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700/40"
                          : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-black/40 dark:border-zinc-800/40"
                        }`}
                    >
                      {tx.status?.toUpperCase() ?? "UNKNOWN"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 text-sm">
                    <div className="flex w-full justify-between text-gray-600 dark:text-gray-300">
                      <span>Amount</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatAmount(tx.amountCents, tx.currency)}
                      </span>
                    </div>
                    <div className="flex w-full justify-between text-gray-600 dark:text-gray-300">
                      <span>Network</span>
                      <span className="text-gray-900 dark:text-white">
                        {tx.chainName}
                      </span>
                    </div>
                    <div className="flex w-full justify-between text-gray-600 dark:text-gray-300">
                      <span>Transaction</span>
                      {tx.explorerUrl ? (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-500 dark:text-zinc-300 dark:hover:text-red-200"
                        >
                          <span className="font-mono text-xs">{truncateHash(tx.transactionHash)}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                          {truncateHash(tx.transactionHash)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold uppercase tracking-wide ${invoice.status === "paid"
                            ? "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700/40"
                            : invoice.status === "open"
                              ? "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700/40"
                              : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-black/40 dark:border-zinc-800/40"
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
                  className="rounded-2xl border border-gray-200 dark:border-zinc-800/40 bg-white/70 dark:bg-black/50 p-4 shadow-sm"
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
                      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide ${invoice.status === "paid"
                        ? "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700/40"
                        : invoice.status === "open"
                          ? "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700/40"
                          : "text-gray-600 bg-gray-100 border-gray-200 dark:text-gray-300 dark:bg-black/40 dark:border-zinc-800/40"
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
                          className="text-sm font-semibold text-gray-700 hover:text-gray-500 dark:text-zinc-300 dark:hover:text-red-200 underline decoration-dashed underline-offset-4"
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
          <div className="border border-dashed border-gray-300 dark:border-zinc-800/40 rounded-xl p-6 text-center text-sm text-gray-500 dark:text-gray-300">
            No payments yet. Once you subscribe, your payment history will appear here.
          </div>
        )}
      </div>
    </div>
  );
}

