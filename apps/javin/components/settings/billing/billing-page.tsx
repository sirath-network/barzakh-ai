"use client";

import { toast } from "sonner";

// Placeholder untuk ikon, Anda bisa menggunakan library seperti lucide-react
const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

export default function BillingSettingsPage() {
  const handleManageSubscription = () => {
    toast.info("Directing you to the subscription management portal...");
    // window.location.href = 'URL_STRIPE_PORTAL';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Card Langganan Saat Ini */}
        <div className="bg-black/80 rounded-2xl shadow-2xl border border-red-900/50 overflow-hidden backdrop-blur-sm">
          <div className="p-8">
            <h2 className="text-xl font-bold text-white">Your Subscription</h2>
            <p className="text-sm text-gray-300 mt-1">
              View details and manage your subscription package.
            </p>
          </div>
          <div className="p-8 border-t border-red-900/30 text-sm space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Package</span>
              <span className="font-medium text-red-400">Pro Plan</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Status</span>
              <span className="font-medium text-emerald-400 bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-700/50">Active</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Next billing date</span>
              <span className="font-medium text-white">17 August 2100</span>
            </div>
          </div>
          <div className="p-8 border-t border-red-900/30 flex justify-end">
            <button onClick={handleManageSubscription} className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-800 text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-red-900/25">
              Manage Subscriptions
            </button>
          </div>
        </div>

        {/* Card Metode Pembayaran */}
        <div className="bg-black/80 rounded-2xl shadow-2xl border border-red-900/50 overflow-hidden backdrop-blur-sm">
          <div className="p-8">
            <h2 className="text-xl font-bold text-white">Payment Methods</h2>
            <p className="text-sm text-gray-300 mt-1">
              Update your payment information.
            </p>
          </div>
          <div className="p-8 border-t border-red-900/30 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCardIcon />
                <span className="font-medium text-white">Visa card ending 4242</span>
              </div>
              <span className="text-gray-300">Expires 12/28</span>
            </div>
          </div>
          <div className="p-8 border-t border-red-900/30 flex justify-end">
            <button disabled className="bg-gray-800/50 text-gray-400 px-6 py-3 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed border border-red-900/20">
              Update Payment Methods
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}