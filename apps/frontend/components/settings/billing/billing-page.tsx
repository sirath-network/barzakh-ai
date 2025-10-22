import { SubscriptionCard } from "@/components/settings/subscription-card";
import { BillingAddressCard } from "@/components/settings/billing-address-card";

export default function BillingPage() {
    return (
        <div className="space-y-4 p-4 md:p-8">
            <SubscriptionCard />
            <BillingAddressCard address={null} isLoading={false} />
        </div>
    );
}
