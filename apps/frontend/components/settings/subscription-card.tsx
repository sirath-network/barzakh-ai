"use client";

import { Lock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SubscriptionSummary } from "@/types/billing";
import { format } from "date-fns";

interface SubscriptionCardProps {
  subscription: SubscriptionSummary | null | undefined;
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  fallbackTier?: string | null | undefined;
}

function formatAmount(amount: number | null, currency: string | null) {
  if (amount == null || currency == null) {
    return "--";
  }

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  });

  return formatter.format(amount / 100);
}

function formatStatus(status: string | undefined) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function computeMonthlyAmountCents(
  amountCents: number | null | undefined,
  interval: SubscriptionSummary["interval"],
  intervalCount: number | null | undefined,
) {
  if (amountCents == null) {
    return null;
  }

  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;

  switch (interval) {
    case "month":
      return Math.round(amountCents / count);
    case "year":
      return Math.round(amountCents / (12 * count));
    case "week":
      return Math.round((amountCents / (count * 7)) * 30);
    case "day":
      return Math.round((amountCents / count) * 30);
    default:
      return amountCents;
  }
}

function formatCycleLabel(
  interval: SubscriptionSummary["interval"],
  intervalCount: number | null | undefined,
) {
  if (!interval) {
    return null;
  }

  const count = intervalCount && intervalCount > 0 ? intervalCount : 1;
  const plural = count > 1 ? `${interval}s` : interval;

  return count === 1 ? `every ${interval}` : `every ${count} ${plural}`;
}

export function SubscriptionCard({
  subscription,
  isLoading,
  onRefresh,
  fallbackTier,
}: SubscriptionCardProps) {
  const [isManagingPortal, setIsManagingPortal] = useState(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);
  const [showCancelOptions, setShowCancelOptions] = useState(false);
  const [showImmediateCancelConfirm, setShowImmediateCancelConfirm] =
    useState(false);

  useEffect(() => {
    if (!showCancelOptions) {
      setShowImmediateCancelConfirm(false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowCancelOptions(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showCancelOptions]);

  const normalizedFallbackTier =
    fallbackTier && fallbackTier !== "free"
      ? fallbackTier.toLowerCase()
      : null;

  const isSubscribed = Boolean(subscription) || Boolean(normalizedFallbackTier);
  const isCancellationScheduled = Boolean(subscription?.cancelAtPeriodEnd);

  const amountCents = subscription?.amount ?? null;
  const currency = subscription?.currency ?? null;
  const interval = subscription?.interval ?? null;
  const intervalCount = subscription?.intervalCount ?? null;

  const monthlyAmountText = useMemo(() => {
    if (amountCents == null || !currency) {
      return null;
    }
    const monthlyCents = computeMonthlyAmountCents(
      amountCents,
      interval,
      intervalCount,
    );
    if (monthlyCents == null) {
      return null;
    }
    return `${formatAmount(monthlyCents, currency)} / month`;
  }, [amountCents, currency, interval, intervalCount]);

  const cycleBillingText = useMemo(() => {
    if (amountCents == null || !currency) {
      return null;
    }
    const cycleLabel = formatCycleLabel(interval, intervalCount);
    const formattedTotal = formatAmount(amountCents, currency);
    if (!cycleLabel) {
      return formattedTotal;
    }
    return `${formattedTotal} billed ${cycleLabel}`;
  }, [amountCents, currency, interval, intervalCount]);

  const cancellationDate = useMemo(() => {
    const dateIso = subscription?.cancelAt ?? subscription?.currentPeriodEnd;
    if (!dateIso) return null;
    try {
      return format(new Date(dateIso), "dd MMMM yyyy");
    } catch {
      return null;
    }
  }, [subscription?.cancelAt, subscription?.currentPeriodEnd]);

  const metadataPlanName = subscription?.metadata?.tier
    ? subscription.metadata.tier.charAt(0).toUpperCase() +
    subscription.metadata.tier.slice(1)
    : subscription?.metadata?.planId
      ? subscription.metadata.planId.charAt(0).toUpperCase() +
      subscription.metadata.planId.slice(1)
      : null;
  const formattedPlanName =
    subscription?.planName ??
    metadataPlanName ??
    (normalizedFallbackTier
      ? normalizedFallbackTier.charAt(0).toUpperCase() +
      normalizedFallbackTier.slice(1)
      : null) ??
    "Paid";
  const planChargeCopy = monthlyAmountText ?? cycleBillingText ?? null;

  const handleManageSubscription = async () => {
    try {
      setIsManagingPortal(true);
      const res = await fetch("/api/billing/manage-subscription", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to open billing portal");
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No billing portal URL returned");
      }
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Unable to open billing portal",
      );
    } finally {
      setIsManagingPortal(false);
    }
  };

  const sendCancellationRequest = async (
    body: Record<string, unknown>,
    successMessage: string,
  ) => {
    try {
      setIsUpdatingSubscription(true);
      const res = await fetch("/api/billing/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to cancel subscription");
      }

      toast.success(successMessage);
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel subscription",
      );
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  const handleCancelSubscriptionAtPeriodEnd = async () => {
    await sendCancellationRequest(
      { cancelAtPeriodEnd: true },
      "Subscription will cancel at the end of the billing cycle.",
    );
  };

  const handleCancelSubscriptionImmediately = async () => {
    await sendCancellationRequest(
      { cancelImmediately: true },
      "Subscription has been canceled immediately.",
    );
  };

  const handleResumeSubscription = async () => {
    await sendCancellationRequest(
      { cancelAtPeriodEnd: false },
      "Subscription cancellation has been removed.",
    );
  };

  const isLoadingState = isLoading || subscription === undefined;
  const rawStatus =
    subscription?.status ?? (normalizedFallbackTier ? "active" : undefined);
  const statusLabel = isCancellationScheduled
    ? "Inactive"
    : formatStatus(rawStatus);

  return (
    <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-stone-800/50 overflow-visible backdrop-blur-sm relative">
      <div className="p-8 space-y-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Your Subscription
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
          {isSubscribed
            ? `Currently on the ${formattedPlanName} plan${planChargeCopy ? ` billed at ${planChargeCopy}` : ""
            }.`
            : "Manage your plan, billing cycle, and subscription status."}
        </p>
      </div>

      <div className="relative min-h-[180px]">
        {isSubscribed ? (
          <div className="p-8 border-t border-gray-200 dark:border-stone-800/30 text-sm space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Plan</span>
              <span className="font-medium text-gray-800 dark:text-stone-300">
                {isLoadingState
                  ? "Loading..."
                  : formattedPlanName ?? "Custom Plan"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Price</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {isLoadingState
                  ? "Loading..."
                  : monthlyAmountText ?? cycleBillingText ?? "--"}
              </span>
            </div>
            {cycleBillingText && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {cycleBillingText}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Status</span>
              <span
                className={`px-3 py-1 rounded-full border text-sm font-medium ${isCancellationScheduled
                  ? "text-amber-600 bg-amber-100 border-amber-200 dark:text-amber-300 dark:bg-amber-900/30 dark:border-amber-700/50"
                  : rawStatus === "active" || rawStatus === "trialing"
                    ? "text-emerald-600 bg-emerald-100 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-700/50"
                    : "text-rose-600 bg-rose-100 border-rose-200 dark:text-rose-300 dark:bg-rose-900/30 dark:border-rose-700/50"
                  }`}
              >
                {statusLabel}
              </span>
            </div>
            {isCancellationScheduled && (
              <div className="rounded-lg border border-red-400/40 bg-red-50/60 dark:border-red-800/60 dark:bg-red-950/40 p-4">
                {cancellationDate ? (
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your subscription is scheduled to cancel on{" "}
                    <span className="font-semibold">{cancellationDate}</span>.
                  </p>
                ) : (
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your subscription is scheduled to cancel at the end of the current billing period.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-stone-800/30">
              {isCancellationScheduled ? (
                <button
                  onClick={handleResumeSubscription}
                  disabled={isUpdatingSubscription}
                  className="px-4 py-2 rounded-lg border border-emerald-500 text-emerald-600 dark:text-emerald-300 dark:border-emerald-600 font-semibold text-sm transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUpdatingSubscription ? "Updating..." : "Resume Subscription"}
                </button>
              ) : (
                <div className="relative flex flex-col items-end gap-3 w-full">
                  <button
                    onClick={() => setShowCancelOptions(true)}
                    disabled={isUpdatingSubscription}
                    className="px-4 py-2 rounded-lg border border-red-500 text-red-600 dark:text-red-300 dark:border-red-600 font-semibold text-sm transition-all hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isUpdatingSubscription ? "Updating..." : "Cancel Subscription"}
                  </button>

                  {showCancelOptions && (
                    <>
                      <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-black/60 px-4 py-6 backdrop-blur-md"
                        onClick={() => {
                          if (showImmediateCancelConfirm) {
                            setShowImmediateCancelConfirm(false);
                            return;
                          }
                          setShowCancelOptions(false);
                        }}
                      >
                        <div
                          className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-red-900/60 bg-white dark:bg-black/90 p-6 shadow-2xl ring-1 ring-gray-900/5 dark:ring-red-500/10"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                How would you like to cancel?
                              </p>
                              <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                                Finish the current cycle or stop immediately.
                              </p>
                            </div>

                            <div className="space-y-3">
                              {showImmediateCancelConfirm ? (
                                <>
                                  <div className="rounded-xl border border-gray-300 dark:border-red-800 bg-gray-50 dark:bg-red-950/30 px-4 py-4 text-sm text-gray-700 dark:text-red-200">
                                    <p className="font-semibold text-gray-900 dark:text-red-200">
                                      Cancel immediately?
                                    </p>
                                    <p className="mt-2 text-xs text-gray-600 dark:text-red-300 leading-relaxed">
                                      This will end your Ultimate access right away and any remaining time in the current billing cycle will be forfeited. This action cannot be undone.
                                    </p>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowImmediateCancelConfirm(false)}
                                      className="w-full sm:w-auto px-4 py-2 rounded-lg border border-gray-300 dark:border-red-900/40 text-sm font-semibold text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-red-900/30 transition-colors"
                                    >
                                      Go back
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setShowImmediateCancelConfirm(false);
                                        setShowCancelOptions(false);
                                        await handleCancelSubscriptionImmediately();
                                      }}
                                      disabled={isUpdatingSubscription}
                                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      Yes, cancel now
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={async () => {
                                      setShowCancelOptions(false);
                                      await handleCancelSubscriptionAtPeriodEnd();
                                    }}
                                    disabled={isUpdatingSubscription}
                                    className="w-full rounded-xl border border-gray-200 dark:border-red-900/40 bg-gray-50/80 dark:bg-red-950/20 px-4 py-4 text-left transition-all hover:border-gray-300 hover:bg-white dark:hover:border-red-700/60 dark:hover:bg-red-900/40 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                                      Cancel at end of period
                                    </span>
                                    <span className="mt-2 block text-xs text-gray-600 dark:text-gray-300">
                                      Keep access until {cancellationDate ?? "the current cycle ends"}.
                                    </span>
                                  </button>

                                  <button
                                    onClick={() => setShowImmediateCancelConfirm(true)}
                                    disabled={isUpdatingSubscription}
                                    className="group relative w-full rounded-xl border-2 border-red-300 dark:border-red-700 bg-gradient-to-br from-red-50 to-white dark:from-red-950/60 dark:to-red-900/30 px-4 py-4 text-left transition-all hover:border-red-400 hover:shadow-lg hover:shadow-red-200/50 dark:hover:border-red-600 dark:hover:shadow-red-900/30 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden"
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-100/50 to-transparent dark:via-red-500/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    <span className="relative block text-sm font-semibold text-red-700 dark:text-red-200">
                                      Cancel immediately
                                    </span>
                                    <span className="relative mt-2 block text-xs text-red-500 dark:text-red-300">
                                      End access right away and stop billing.
                                    </span>
                                  </button>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setShowImmediateCancelConfirm(false);
                                setShowCancelOptions(false);
                              }}
                              className="w-full rounded-lg border border-transparent bg-transparent px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                              Keep subscription for now
                            </button>
                          </div>
                        </div>
                      </div>

                    </>
                  )}
                </div>
              )}

              {subscription?.id !== "x402-sub" && (
                <button
                  onClick={handleManageSubscription}
                  disabled={isManagingPortal}
                  className="px-6 py-3 rounded-lg bg-gray-900 text-white dark:bg-gradient-to-r dark:from-stone-600 dark:to-stone-700 font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isManagingPortal ? "Loading..." : "Manage Billing Portal"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 border-t border-gray-200 dark:border-stone-800/30 space-y-6">
            <div className="text-center space-y-2">
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-dashed border-gray-300 dark:border-stone-800/40 bg-white/40 dark:bg-black/40">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-400/10 via-transparent to-gray-500/20 dark:from-stone-500/10 dark:via-transparent dark:to-stone-900/20 blur-xl" />
              <div className="relative px-8 py-12 text-center space-y-5 backdrop-blur-md">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:text-stone-200 dark:bg-stone-800/30 shadow-inner dark:shadow-stone-900/50">
                  <Lock className="h-7 w-7 animate-[pulse_2s_ease-in-out_infinite]" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    Upgrade through Plans &amp; Pricing Settings
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
                    Pick a subscription tier from the dedicated Plans &amp; Pricing section to unlock billing management and premium features.
                  </p>
                </div>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-stone-400/80">
                  Data available after subscribing
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}