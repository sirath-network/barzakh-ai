"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent>
                <p>
                    You are currently on the <strong>{session?.user.tier}</strong> plan.
                </p>
                <div className="mt-4">
                    {session?.user.tier === "free" ? (
                        <Button onClick={handleSubscribe} disabled={loading}>
                            {loading ? "Loading..." : "Upgrade to Pro"}
                        </Button>
                    ) : (
                        <Button onClick={handleManageSubscription} disabled={loading}>
                            {loading ? "Loading..." : "Manage Subscription"}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
