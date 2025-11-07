"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";

type PaidPlanId = "pro" | "ultimate";

const PAID_PLAN_OPTIONS: { id: PaidPlanId; label: string; tagline: string }[] = [
  {
    id: "pro",
    label: "Pro",
    tagline: "Advanced access",
  },
  {
    id: "ultimate",
    label: "Ultimate",
    tagline: "Highest limits",
  },
];

function formatTierLabel(tier?: string | null) {
  if (!tier) return "Free";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function SubscriptionCard() {
  const { data: session } = useSession();
  const [isManaging, setIsManaging] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PaidPlanId>("pro");
  const [processingPlan, setProcessingPlan] = useState<PaidPlanId | null>(null);

  const isSubscribed = session?.user.tier !== "free";
  const formattedTier = formatTierLabel(session?.user.tier);
  const packageLabel = isSubscribed ? `${formattedTier} Plan` : "---";

  const handleManageSubscription = async () => {
    try {
      setIsManaging(true);
      const res = await fetch("/api/billing/manage-subscription", {
        method: "POST",
      });

      const data = await res.json();
      if (res.ok && data?.url) {
        window.location.href = data.url;
      } else {
        console.error("Failed to load manage subscription portal", data?.error);
      }
    } catch (error) {
      console.error("Error while managing subscription", error);
    } finally {
      setIsManaging(false);
    }
  };

  const handleSubscribe = async (plan: PaidPlanId) => {
    try {
      setProcessingPlan(plan);
      const res = await fetch("/api/billing/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId: plan }),
      });

      const payload = await res.json();
      if (!res.ok) {
        console.error("Failed to create Stripe checkout session", payload?.error);
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
      console.error("Error initiating subscription checkout", error);
    } finally {
      setProcessingPlan(null);
    }
  };

  const isProcessingSelectedPlan = processingPlan !== null;
  const upgradeLabel = selectedPlan === "ultimate" ? "Ultimate" : "Pro";

  return (
    <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
      <div className="p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Subscription</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
          You are currently on the <strong>{formattedTier.toUpperCase()}</strong> plan.
        </p>
      </div>

      <div className="relative">
        {isSubscribed ? (
          <>
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Package</span>
                <span className="font-medium text-red-600 dark:text-red-400">{packageLabel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Status</span>
                <span className="font-medium text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50">
                  Active
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Next billing date</span>
                <span className="font-medium text-gray-900 dark:text-white">17 August 2100</span>
              </div>
            </div>
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end">
              <button
                onClick={handleManageSubscription}
                disabled={isManaging}
                className="bg-gray-800 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isManaging ? "Loading..." : "Manage Subscription"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="blur-sm select-none pointer-events-none">
              <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Package</span>
                  <span className="font-medium text-red-600 dark:text-red-400">---</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Status</span>
                  <span className="font-medium text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700/50">
                    Inactive
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">Next billing date</span>
                  <span className="font-medium text-gray-900 dark:text-white">---</span>
                </div>
              </div>
              <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end">
                <div className="bg-gray-800 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold opacity-50">
                  Upgrade your plan
                </div>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-black/60 backdrop-blur-[1px]">
              <div className="text-center space-y-5 p-6">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-full animate-pulse opacity-20"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-ping opacity-30"></div>
                  <Lock className="w-8 h-8 text-red-600 dark:text-red-400 relative z-10" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-center gap-3">
                    {PAID_PLAN_OPTIONS.map((plan) => {
                      const isSelected = selectedPlan === plan.id;
                      const isDisabled = processingPlan !== null && processingPlan !== plan.id;

                      return (
                        <button
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan.id)}
                          disabled={isDisabled}
                          className={`px-4 py-2 rounded-lg border text-xs sm:text-sm font-semibold uppercase transition-all flex flex-col items-center gap-1 min-w-[110px]
                            ${
                              isSelected
                                ? "bg-gray-900 text-white border-gray-900 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 dark:border-red-600"
                                : "bg-white/70 text-gray-700 border-gray-300 hover:border-gray-400 dark:bg-black/40 dark:text-gray-300 dark:border-red-900/40 dark:hover:border-red-700/60"
                            }
                            ${isDisabled ? "opacity-60 cursor-not-allowed" : ""}
                          `}
                        >
                          <span>{plan.label}</span>
                          <span className="text-[0.65rem] font-normal normal-case text-gray-500 dark:text-gray-400">
                            {plan.tagline}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleSubscribe(selectedPlan)}
                    disabled={isProcessingSelectedPlan}
                    className={`bg-gray-800 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all
                      ${isProcessingSelectedPlan ? "opacity-70 cursor-progress" : "hover:bg-gray-700 dark:hover:from-red-700 dark:hover:to-red-800"}
                    `}
                  >
                    {isProcessingSelectedPlan ? "Redirecting..." : `Upgrade to ${upgradeLabel}`}
                  </button>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
                    Upgrade your plan to unlock premium analytics, alerts, and higher usage limits.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}