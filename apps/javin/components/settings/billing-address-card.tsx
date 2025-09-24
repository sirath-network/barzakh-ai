"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function BillingAddressCard() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent>
                <p>
                    Your billing address is managed by Stripe. Click the "Manage Subscription" button above to update it.
                </p>
            </CardContent>
        </Card>
    );
}
