'use client';

import { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WalletLoginButton } from '@/components/wallet-login-button';
import { OneChainWalletLogin } from '@/components/onechain-wallet-login';

interface WalletSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  turnstileToken?: string;
  disabled?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  onTurnstileReset?: () => void;
  className?: string;
}

export function WalletSelectorModal({
  isOpen,
  onClose,
  turnstileToken,
  disabled,
  onLoadingChange,
  onTurnstileReset,
  className,
}: WalletSelectorModalProps) {
  const [activeWalletLoading, setActiveWalletLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleWalletLoadingChange = (isLoading: boolean) => {
    setActiveWalletLoading(isLoading);
    onLoadingChange?.(isLoading);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[400px] p-5 rounded-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-center flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-center">
            Choose how you want to connect to Barzakh AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* EVM Wallet Option (RainbowKit) */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400 px-1">Ethereum &amp; EVM Networks</p>
            <WalletLoginButton
              turnstileToken={turnstileToken}
              disabled={disabled || activeWalletLoading}
              onLoadingChange={handleWalletLoadingChange}
              onInitiate={onClose}
              className="w-full inline-flex h-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-white text-sm font-medium transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Continue with EVM Wallet
            </WalletLoginButton>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-medium">
              <span className="bg-zinc-950 px-2 text-zinc-600">
                OR
              </span>
            </div>
          </div>

          {/* Sui Network Option */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-zinc-400 px-1">Sui Network</p>
            {mounted ? (
              <OneChainWalletLogin
                turnstileToken={turnstileToken}
                disabled={disabled || activeWalletLoading}
                onLoadingChange={handleWalletLoadingChange}
                onTurnstileReset={onTurnstileReset}
                className="w-full inline-flex h-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-white text-sm font-medium transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Continue with Sui Wallet
              </OneChainWalletLogin>
            ) : (
              <div className="w-full h-10 bg-zinc-900/50 rounded-md border border-zinc-800 flex items-center justify-center text-sm text-zinc-500">
                Loading...
              </div>
            )}
          </div>

          {/* Info text */}
          <p className="text-xs text-zinc-500 text-center pt-2">
            We support multiple blockchain networks. Choose the wallet that matches your preferred network.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
