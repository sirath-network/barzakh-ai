"use client";

import { Lock } from "lucide-react";
import type { Address } from "@stripe/stripe-js";

interface BillingAddressCardProps {
  address: Address | null | undefined;
  isLoading: boolean;
  isSubscribed: boolean;
}

export function BillingAddressCard({
  address,
  isLoading,
  isSubscribed,
}: BillingAddressCardProps) {
  return (
    <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm relative">
      <div className="p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Billing Address
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
          Manage your billing address for invoices.
        </p>
      </div>

      <div className="relative">
        {isSubscribed && !isLoading ? (
          address ? (
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Address</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {address.line1}
                </span>
              </div>
              {address.line2 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300">
                    Address 2
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {address.line2}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">City</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {address.city}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">State</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {address.state}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">
                  ZIP Code
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {address.postal_code}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Country</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {address.country}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm text-center">
              <p className="text-gray-500 dark:text-gray-400">
                No billing address on file. Please add one in the Stripe portal.
              </p>
            </div>
          )
        ) : (
          <>
            <div className="p-8 border-t border-gray-200 dark:border-red-900/30 text-sm space-y-4 blur-sm select-none pointer-events-none">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">Address</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ---
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">City</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ---
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-300">
                  ZIP Code
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  ---
                </span>
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Upgrade to Pro
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm">
                    Upgrade to a Barzakh Pro plan to manage your billing address.
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