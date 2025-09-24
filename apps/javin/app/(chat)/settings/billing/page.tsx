'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { SubscriptionCard } from '@/components/settings/subscription-card';
import { BillingAddressCard } from '@/components/settings/billing-address-card';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const { update: updateSession } = useSession();

  useEffect(() => {
    // Check if the user was redirected from a Stripe checkout
    if (searchParams.get('session_id')) {
      toast.success('Payment successful! Your plan is now active.', {
        description: 'It may take a moment for your session to update.',
      });
      
      // Force a session update to get the new user tier
      updateSession();
    }
  }, [searchParams, updateSession]);

  return (
    <div className="space-y-4 p-4 md:p-8">
      <SubscriptionCard />
      <BillingAddressCard />
    </div>
  );
}
