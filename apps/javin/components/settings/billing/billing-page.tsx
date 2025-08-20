"use client";

import { toast } from "sonner";
import { Lock } from "lucide-react";

const CreditCardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-red-400">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

export default function BillingSettingsPage() {
  const handleManageSubscription = () => {
    toast.info("Directing you to the subscription management portal...");
    // window.location.href = 'URL_STRIPE_PORTAL';
  };

  const handleAddBillingAddress = () => {
    toast.info("Redirecting to add billing address...");
    // Add your billing address logic here
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your Subscription</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
              View details and manage your subscription package.
            </p>
          </div>
          
          <div className="relative">
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4 blur-sm select-none pointer-events-none">
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
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end blur-sm select-none pointer-events-none">
              <button className="bg-gray-800 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold">
                Manage Subscriptions
              </button>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-black/60 backdrop-blur-[1px]">
              <div className="text-center space-y-4 p-6">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-full animate-pulse opacity-20"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-ping opacity-30"></div>
                  <Lock className="w-8 h-8 text-red-600 dark:text-red-400 relative z-10" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coming Soon</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                    Subscription management features are currently in development and will be available soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Methods</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
              Update your payment information.
            </p>
          </div>
          
          <div className="relative">
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm blur-sm select-none pointer-events-none">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCardIcon />
                  <span className="font-medium text-gray-900 dark:text-white">Visa card ending 4242</span>
                </div>
                <span className="text-gray-600 dark:text-gray-300">Expires 12/28</span>
              </div>
            </div>
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end blur-sm select-none pointer-events-none">
              <button className="bg-gray-200 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 px-6 py-3 rounded-lg text-sm font-semibold border border-gray-300 dark:border-red-900/20">
                Update Payment Methods
              </button>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-black/60 backdrop-blur-[1px]">
              <div className="text-center space-y-4 p-6">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-full animate-pulse opacity-20"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-ping opacity-30"></div>
                  <Lock className="w-8 h-8 text-red-600 dark:text-red-400 relative z-10" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coming Soon</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                    Payment method management is being developed with enhanced security features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
          <div className="p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Billing Address</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
              Manage your billing address for invoices.
            </p>
          </div>
          
          <div className="relative">
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4 blur-sm select-none pointer-events-none">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Full Name</span>
                <span className="font-medium text-gray-900 dark:text-white">John Doe</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Address</span>
                <span className="font-medium text-gray-900 dark:text-white">123 Main Street</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">City</span>
                <span className="font-medium text-gray-900 dark:text-white">New York</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">ZIP Code</span>
                <span className="font-medium text-gray-900 dark:text-white">10001</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Country</span>
                <span className="font-medium text-gray-900 dark:text-white">United States</span>
              </div>
            </div>

            <div className="absolute inset-0 flex items-center justify-center bg-gray-200/50 dark:bg-black/60 backdrop-blur-[1px]">
              <div className="text-center space-y-4 p-6">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-full animate-pulse opacity-20"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-ping opacity-30"></div>
                  <Lock className="w-8 h-8 text-red-600 dark:text-red-400 relative z-10" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Coming Soon</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                    Billing address management will be available with our next major update.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}