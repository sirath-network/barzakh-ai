"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Check, Info, BadgeDollarSign } from "lucide-react";
import { useView } from "@/context/view-context";
import useSWR from "swr";
import { fetcher } from "@barzakh/shared/lib/utils/utils";
import type { SubscriptionResponse, SubscriptionSummary } from "@/types/billing";
import { format } from "date-fns";
import { X402PaymentModal } from "./x402-payment-modal";

type BillingCycle = "monthly" | "quarterly" | "yearly";

interface Plan {
  id: "free" | "pro" | "ultimate";
  name: string;
  description: string;
  image: string;
  features: string[];
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  quarterlyTotal: number;
  yearlyTotal: number;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "FREE PLAN",
    description: "Explore the top projects for free",
    image: "/images/barzakh/plan/free.png",
    features: [
      "Top 5 popular projects",
      "Top 5 surging projects",
      "Momentum graph preview",
      "Signals preview",
    ],
    monthlyPrice: 0,
    quarterlyPrice: 0,
    yearlyPrice: 0,
    quarterlyTotal: 0,
    yearlyTotal: 0,
  },
  {
    id: "pro",
    name: "PRO PLAN",
    description: "Grind with Pro",
    image: "/images/barzakh/plan/pro.png",
    features: [
      "Comprehensive project analysis",
      "Alerts when momentum breaks out",
      "Alerts on bookmarked projects",
      "Chat with Barzakh for narrative scouting",
      "1 custom daily reports",
      "Higher chat, tools & models limits",
    ],
    monthlyPrice: 25,
    quarterlyPrice: 22,
    yearlyPrice: 20,
    quarterlyTotal: 66,
    yearlyTotal: 240,
  },
  {
    id: "ultimate",
    name: "ULTIMATE PLAN",
    description: "Access higher limits",
    image: "/images/barzakh/plan/ultimate.png",
    features: [
      "All Pro features",
      "Higher chat limits",
      "3 custom daily reports",
      "Priority processing & early access",
    ],
    monthlyPrice: 250,
    quarterlyPrice: 220,
    yearlyPrice: 200,
    quarterlyTotal: 660,
    yearlyTotal: 2400,
  },
];

function inferPlanIdFromSubscription(
  subscription: SubscriptionSummary | null | undefined,
): Plan["id"] | null {
  if (!subscription) {
    return null;
  }

  const fromMetadata =
    subscription.metadata?.tier?.toLowerCase() ??
    subscription.metadata?.planId?.toLowerCase() ??
    null;

  if (
    fromMetadata === "free" ||
    fromMetadata === "pro" ||
    fromMetadata === "ultimate"
  ) {
    return fromMetadata;
  }

  const planName = subscription.planName?.toLowerCase() ?? "";
  if (planName.includes("ultimate")) {
    return "ultimate";
  }
  if (planName.includes("pro")) {
    return "pro";
  }

  return null;
}

function inferBillingCycleFromSubscription(
  subscription: SubscriptionSummary | null | undefined,
): BillingCycle | null {
  if (!subscription) {
    return null;
  }

  const interval = subscription.interval;
  const intervalCount = subscription.intervalCount ?? 1;

  if (interval === "year") {
    return "yearly";
  }
  if (interval === "month" && intervalCount === 3) {
    return "quarterly";
  }
  if (interval === "month") {
    return "monthly";
  }

  return null;
}

export default function PlanDetailPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [processingPlanId, setProcessingPlanId] = useState<Plan["id"] | null>(null);
  const [showX402Modal, setShowX402Modal] = useState(false);
  const [selectedPlanForX402, setSelectedPlanForX402] = useState<Plan["id"] | null>(null);
  const { data: session } = useSession();
  const { setView } = useView();

  const {
    data: subscriptionResponse,
    isLoading: isLoadingSubscription,
  } = useSWR<SubscriptionResponse>(
    session ? "/api/billing/subscription" : null,
    fetcher,
  );
  const subscription = subscriptionResponse?.subscription ?? null;

  const normalizedSessionTier = useMemo(() => {
    const rawTier = session?.user?.tier?.toLowerCase();
    if (rawTier === "free" || rawTier === "pro" || rawTier === "ultimate") {
      return rawTier as Plan["id"];
    }
    return null;
  }, [session?.user?.tier]);

  const inferredSubscriptionTier = inferPlanIdFromSubscription(subscription);
  const derivedSubscriptionTier =
    inferredSubscriptionTier ?? normalizedSessionTier;

  const isSubscriptionActive =
    subscription &&
    ["active", "trialing", "past_due", "incomplete"].includes(
      subscription.status,
    );

  let currentPlanId: Plan["id"] | null = null;
  if (
    subscription &&
    derivedSubscriptionTier &&
    (isSubscriptionActive || subscription.cancelAtPeriodEnd)
  ) {
    currentPlanId = derivedSubscriptionTier;
  } else if (!subscription && isLoadingSubscription) {
    currentPlanId = normalizedSessionTier;
  }

  if (!currentPlanId && !isLoadingSubscription) {
    currentPlanId = "free";
  }

  // Infer the current billing cycle from subscription
  const currentBillingCycle = useMemo(() => {
    return inferBillingCycleFromSubscription(subscription);
  }, [subscription]);

  const cancellationDateLabel = useMemo(() => {
    if (!subscription?.cancelAtPeriodEnd) {
      return null;
    }
    const isoDate = subscription.cancelAt ?? subscription.currentPeriodEnd;
    if (!isoDate) return null;
    try {
      return format(new Date(isoDate), "MMM dd, yyyy");
    } catch {
      return null;
    }
  }, [subscription?.cancelAt, subscription?.cancelAtPeriodEnd, subscription?.currentPeriodEnd]);

  const handleBack = () => {
    setView("chat");
  };

  const handleSubscribe = async (planId: Plan["id"]) => {
    if (planId === "free") {
      setView("chat");
      return;
    }

    try {
      setProcessingPlanId(planId);
      const response = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId, billingCycle }),
      });

      const payload = await response.json();
      if (!response.ok) {
        console.error("Failed to create checkout session", payload?.error);
        throw new Error(payload?.error ?? "Failed to create checkout session");
      }

      const stripeModule = await import("@stripe/stripe-js");
      const stripe = await stripeModule.loadStripe(
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
      );

      if (!stripe) {
        throw new Error("Stripe.js failed to initialise");
      }

      const result = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error(`Error subscribing to ${planId} plan`, error);
    } finally {
      setProcessingPlanId(null);
    }
  };

  const getPrice = (plan: Plan) => {
    switch (billingCycle) {
      case "monthly":
        return plan.monthlyPrice;
      case "quarterly":
        return plan.quarterlyPrice;
      case "yearly":
        return plan.yearlyPrice;
    }
  };

  const getTotalPrice = (plan: Plan) => {
    switch (billingCycle) {
      case "quarterly":
        return plan.quarterlyTotal;
      case "yearly":
        return plan.yearlyTotal;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-zinc-950 dark:to-zinc-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
            <BadgeDollarSign className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Plans Settings</h1>
            <p className="text-sm md:text-base text-muted-foreground">Choose the perfect plan for your needs</p>
          </div>
        </div>

        {/* Billing Cycle Selector */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="inline-flex bg-white/80 dark:bg-black/40 backdrop-blur-sm rounded-lg p-1 gap-1 border border-gray-200 dark:border-zinc-800/50">
            {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`
                  px-3 sm:px-4 md:px-6 py-2 rounded-md text-xs sm:text-sm font-semibold uppercase transition-all
                  ${billingCycle === cycle
                    ? "bg-gray-900 dark:bg-black/80 text-white dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-transparent"
                  }
                `}
              >
                {cycle === "monthly" ? "MONTHLY" : cycle === "quarterly" ? "QUARTERLY" : "YEARLY"}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {plans.map((plan) => {
            const price = getPrice(plan);
            const totalPrice = getTotalPrice(plan);
            const isSameTier = currentPlanId === plan.id;
            // Only show "Current Plan" if both tier AND billing cycle match
            const isExactCurrentPlan = isSameTier && currentBillingCycle === billingCycle;
            const isProcessingPlan = processingPlanId === plan.id;
            const isFree = plan.id === "free";
            // Only show cancellation scheduled if on current tier AND billing cycle
            const isCancellationScheduled =
              isExactCurrentPlan && subscription?.cancelAtPeriodEnd;

            return (
              <div
                key={plan.id}
                className={`
                  bg-white dark:bg-black/80 rounded-2xl border overflow-hidden shadow-2xl backdrop-blur-sm
                  ${isExactCurrentPlan ? "border-gray-400 dark:border-zinc-500" : "border-gray-200 dark:border-zinc-800/50"}
                  hover:border-gray-500 dark:hover:border-zinc-500/50 transition-all
                `}
              >
                {/* Plan Icon/Illustration */}
                <div className="p-4 sm:p-5 md:p-6 bg-gray-100 dark:bg-black/60 flex items-center justify-center min-h-[180px] sm:min-h-[200px] md:min-h-[220px] relative overflow-hidden border-b border-gray-200 dark:border-zinc-800/30">
                  {/* subtle red glow overlay in dark mode */}
                  <div className="absolute inset-0 pointer-events-none hidden dark:block bg-gradient-to-b from-zinc-800/20 via-transparent to-transparent" />
                  <img
                    src={plan.image}
                    alt={plan.name}
                    className="w-full h-full object-contain max-h-[140px] sm:max-h-[160px] md:max-h-[180px] relative z-10"
                  />
                </div>

                {/* Plan Content */}
                <div className="p-4 sm:p-5 md:p-6 space-y-3 md:space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white uppercase mb-1 md:mb-2 font-mono">
                      {plan.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white font-mono">
                        {isFree ? "$0" : `$${price}`}
                      </span>
                      {!isFree && (
                        <span className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                          / MONTH
                        </span>
                      )}
                    </div>
                    {!isFree && totalPrice && (
                      <p className="text-gray-500 dark:text-gray-500 text-xs sm:text-sm">
                        ${totalPrice} PAID {billingCycle === "quarterly" ? "QUARTERLY" : "YEARLY"}
                      </p>
                    )}
                    {isCancellationScheduled && cancellationDateLabel && (
                      <p className="text-xs text-amber-600 dark:text-amber-300">
                        Scheduled to cancel on {cancellationDateLabel}.
                      </p>
                    )}
                  </div>

                  {/* CTA Button - Pay with Crypto (x402) */}
                  {!isFree ? (
                    <button
                      onClick={() => {
                        setSelectedPlanForX402(plan.id);
                        setShowX402Modal(true);
                      }}
                      disabled={isExactCurrentPlan}
                      className={`
                        w-full py-2.5 sm:py-3 rounded-lg font-semibold uppercase text-xs sm:text-sm transition-all
                        ${isExactCurrentPlan
                          ? "bg-gray-100 dark:bg-zinc-900/50 border-2 border-gray-400 dark:border-zinc-500 text-gray-600 dark:text-zinc-300 cursor-default shadow-[0_0_10px_rgba(156,163,175,0.5)] dark:shadow-none"
                          : "bg-gray-900 dark:bg-zinc-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-zinc-900 shadow-lg shadow-black/5 dark:shadow-white/5"
                        }
                      `}
                    >
                      {isExactCurrentPlan ? "CURRENT PLAN" : "PAY WITH CRYPTO (X402)"}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 sm:py-3 rounded-lg font-semibold uppercase text-xs sm:text-sm transition-all bg-gray-200 dark:bg-zinc-800/50 text-gray-600 dark:text-zinc-400 border border-gray-300 dark:border-zinc-700/50"
                    >
                      EXPLORE FOR FREE
                    </button>
                  )}

                  {/* Stripe Button - Coming Soon */}
                  {!isFree && (
                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isExactCurrentPlan || isProcessingPlan || true}
                      className="w-full mt-2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold uppercase text-gray-600 dark:text-gray-300 transition-all opacity-50 cursor-not-allowed"
                    >
                      PAY WITH STRIPE (COMING SOON)
                    </button>
                  )}

                  {/* Features */}
                  <div className="space-y-2 sm:space-y-3 pt-3 md:pt-4 border-t border-gray-200 dark:border-zinc-800/30">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-zinc-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm flex items-center gap-1">
                          {feature}
                          {feature.includes("Comprehensive project analysis") && (
                            <Info className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 dark:text-gray-500" />
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPlanForX402 && (
        <X402PaymentModal
          isOpen={showX402Modal}
          onClose={() => setShowX402Modal(false)}
          planId={selectedPlanForX402}
          billingCycle={billingCycle}
          currentTier={currentPlanId}
          currentBillingCycle={currentBillingCycle}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

