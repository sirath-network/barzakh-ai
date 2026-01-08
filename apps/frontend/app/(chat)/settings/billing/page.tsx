'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import BillingSettingsPage from '@/components/settings/billing/billing-page';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, update: updateSession } = useSession();
  const toastShown = useRef(false);

  useEffect(() => {
    if (searchParams.get("session_id") && !toastShown.current) {
      toastShown.current = true;
      toast.success("Payment successful! Your plan is now active.", {
        description: "Redirecting you to the homepage",
      });

      // Immediate redirect
      router.push("/");

      // Update session in background (optional)
      updateSession().catch(console.error);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      <div className="max-w-5xl mx-auto py-6 md:py-10">
        <BillingSettingsPage />
      </div>
    </div>
  );
}