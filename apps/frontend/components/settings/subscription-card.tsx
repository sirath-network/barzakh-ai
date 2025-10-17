"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Lock } from "lucide-react";

export function SubscriptionCard() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);

    const handleManageSubscription = async () => {
        setLoading(true);
        const res = await fetch("/api/billing/manage-subscription", {
            method: "POST",
        });
        const { url } = await res.json();
        window.location.href = url;
        setLoading(false);
    };

    const handleSubscribe = async () => {
        setLoading(true);
        const res = await fetch("/api/billing/create-checkout-session", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ price: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }),
        });
        const { sessionId } = await res.json();
        const stripe = (await import("@stripe/stripe-js")).loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
        (await stripe)?.redirectToCheckout({ sessionId });
        setLoading(false);
    };

    const isSubscribed = session?.user.tier !== "free";

    return (
        <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Subscription</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
              You are currently on the <strong>{session?.user.tier}</strong> plan.
            </p>
          </div>
          
          <div className="relative">
            {isSubscribed ? (
                <>
                    <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">Package</span>
                            <span className="font-medium text-red-600 dark:text-red-400">Pro Plan</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">Status</span>
                            <span className="font-medium text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50">Active</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600 dark:text-gray-300">Next billing date</span>
                            <span className="font-medium text-gray-900 dark:text-white">17 August 2100</span>
                        </div>
                    </div>
                    <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end">
                        <button onClick={handleManageSubscription} disabled={loading} className="bg-gray-800 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold">
                            {loading ? "Loading..." : "Manage Subscription"}
                        </button>
                    </div>
                </>
            ) : (
                <>
                    {/* Placeholder content to define the card's height */}
                    <div className="blur-sm select-none pointer-events-none">
                        <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Package</span>
                                <span className="font-medium text-red-600 dark:text-red-400">---</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Status</span>
                                <span className="font-medium text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700/50">Inactive</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 dark:text-gray-300">Next billing date</span>
                                <span className="font-medium text-gray-900 dark:text-white">---</span>
                            </div>
                        </div>
                        <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end">
                            <div className="bg-gray-800 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold opacity-50">
                                Upgrade to Pro
                            </div>
                        </div>
                    </div>

                    {/* Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-black/60 backdrop-blur-[1px]">
                      <div className="text-center space-y-4 p-6">
                        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-full animate-pulse opacity-20"></div>
                          <div className="absolute inset-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-ping opacity-30"></div>
                          <Lock className="w-8 h-8 text-red-600 dark:text-red-400 relative z-10" />
                        </div>
                        
                        <div className="space-y-2">
                            <button onClick={handleSubscribe} disabled={loading} className="bg-gray-800 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold">
                                {loading ? "Loading..." : "Upgrade to Pro"}
                            </button>
                          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                            Upgrade your plan to get access to all features.
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