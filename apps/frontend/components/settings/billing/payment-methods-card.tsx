"use client";

import { useEffect, useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeCardElementOptions } from "@stripe/stripe-js";
import type {
  PaymentMethodSummary,
  SubscriptionSummary,
} from "@/types/billing";
import { toast } from "sonner";

interface PaymentMethodsCardProps {
  paymentMethods: PaymentMethodSummary[] | undefined;
  defaultPaymentMethodId: string | null | undefined;
  isLoading: boolean;
  isSubscribed: boolean;
  onRefresh: () => Promise<void>;
  subscription: SubscriptionSummary | null | undefined;
}

function AddPaymentMethodForm({
  onSuccess,
  isSubscribed,
}: {
  onSuccess: () => Promise<void>;
  isSubscribed: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardElementStyle, setCardElementStyle] = useState<
    StripeCardElementOptions["style"]
  >({
    base: {
      color: "#111827",
      fontSize: "16px",
      "::placeholder": {
        color: "#9CA3AF",
      },
      iconColor: "#0f172a",
    },
    invalid: {
      color: "#DC2626",
    },
  });

  useEffect(() => {
    const updateStyle = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setCardElementStyle({
        base: {
          color: isDark ? "#F9FAFB" : "#111827",
          fontSize: "16px",
          "::placeholder": {
            color: isDark ? "#9CA3AF" : "#9CA3AF",
          },
          iconColor: isDark ? "#FAFBFC" : "#0f172a",
        },
        invalid: {
          color: "#F87171",
          iconColor: "#F87171",
        },
      });
    };

    updateStyle();

    const observer = new MutationObserver(updateStyle);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/billing/create-setup-intent", {
        method: "POST",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to create setup intent");
      }

      const { error, setupIntent } = await stripe.confirmCardSetup(
        payload.clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        },
      );

      if (error) {
        throw new Error(error.message);
      }

      if (!setupIntent) {
        throw new Error("Stripe did not return a setup intent");
      }

      toast.success("Payment method added successfully.");
      cardElement.clear();
      await onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to add payment method",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-red-900/40 p-4 bg-gray-50/60 dark:bg-black/40">
        <CardElement
          options={{
            hidePostalCode: true,
            style: cardElementStyle,
          }}
        />
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !stripe || !isSubscribed}
          className="px-6 py-3 rounded-lg bg-gray-900 text-white dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Payment Method"}
        </button>
      </div>
    </form>
  );
}

export function PaymentMethodsCard({
  paymentMethods,
  defaultPaymentMethodId,
  isLoading,
  isSubscribed,
  onRefresh,
  subscription,
}: PaymentMethodsCardProps) {
  const [settingDefault, setSettingDefault] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [stripePromise, setStripePromise] = useState<
    PromiseLike<Stripe | null> | null
  >(null);

  useEffect(() => {
    setIsClient(true);
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      return;
    }
    setStripePromise(loadStripe(publishableKey));
  }, []);

  const canRenderStripeForm = Boolean(isClient && stripePromise);

  const handleSetDefault = async (paymentMethodId: string) => {
    try {
      setSettingDefault(paymentMethodId);
      const response = await fetch(
        "/api/billing/payment-methods/set-default",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethodId }),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to set default payment method");
      }

      toast.success("Default payment method updated.");
      await onRefresh();
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update default payment method",
      );
    } finally {
      setSettingDefault(null);
    }
  };

  return (
    <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
      <div className="p-8 space-y-1">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Payment Methods
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">
          Securely manage the cards used for your subscription.
        </p>
      </div>

      <div className="p-8 pt-0 space-y-6">
        <div className="space-y-3">
          {isLoading ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-red-900/30 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
              Loading payment methods...
            </div>
          ) : paymentMethods && paymentMethods.length > 0 ? (
            paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-red-900/30 bg-gray-50/60 dark:bg-black/40 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {pm.brand ? pm.brand.toUpperCase() : "Card"} ····{" "}
                    {pm.last4 ?? "----"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Expires{" "}
                    {pm.expMonth && pm.expYear
                      ? `${String(pm.expMonth).padStart(2, "0")}/${pm.expYear}`
                      : "--/--"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {pm.isDefault ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50">
                      Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefault(pm.id)}
                      disabled={
                        settingDefault === pm.id ||
                        !isSubscribed ||
                        Boolean(settingDefault)
                      }
                      className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full border border-gray-300 dark:border-red-900/40 hover:border-gray-400 dark:hover:border-red-700/60 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {settingDefault === pm.id ? "Updating..." : "Set Default"}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-red-900/30 p-6 text-center text-sm text-gray-500 dark:text-gray-300">
              No payment methods on file. Add a card below.
            </div>
          )}
        </div>

        {canRenderStripeForm ? (
          <Elements stripe={stripePromise!} options={{ appearance: { theme: "night" } }}>
            <AddPaymentMethodForm onSuccess={onRefresh} isSubscribed={isSubscribed} />
          </Elements>
        ) : (
          <div className="rounded-lg border border-dashed border-red-400/60 bg-red-50/70 dark:border-red-800/60 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300">
            {isClient
              ? "Stripe publishable key is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable card updates."
              : "Preparing secure payment form..."}
          </div>
        )}

        {!isSubscribed && (
          <div className="rounded-lg border border-yellow-400/40 bg-yellow-50/70 dark:border-yellow-800/60 dark:bg-yellow-950/30 p-4 text-xs text-yellow-700 dark:text-yellow-300">
            Add a payment method after you upgrade to a paid plan to manage your invoices.
          </div>
        )}

        {subscription?.defaultPaymentMethodId && paymentMethods?.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your subscription currently uses a default payment method stored in Stripe. Add a new card to replace it.
          </p>
        )}
      </div>
    </div>
  );
}

