'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WalletLoginButton } from '@/components/wallet-login-button';

interface WalletSelectorModalProps {
  isOpen: boolean;
  /** Called when the dialog is dismissed (overlay, Esc, close). Use to recover Turnstile / loading flags. */
  onClose: () => void;
  /** Called when user starts EVM connect — only hide this dialog; do not reset Turnstile here. */
  onWalletConnectInitiated?: () => void;
  turnstileToken?: string;
  disabled?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
}

export function WalletSelectorModal({
  isOpen,
  onClose,
  onWalletConnectInitiated,
  turnstileToken,
  disabled,
  onLoadingChange,
}: WalletSelectorModalProps) {
  const hideForWalletFlow = onWalletConnectInitiated ?? onClose;
  const [activeWalletLoading, setActiveWalletLoading] = useState(false);

  const handleWalletLoadingChange = (isLoading: boolean) => {
    setActiveWalletLoading(isLoading);
    onLoadingChange?.(isLoading);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="w-[95vw] max-w-[400px] p-5 rounded-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold text-center flex items-center justify-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription className="text-center">
            Sign in with your wallet
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Wallet Connection via Dynamic SDK */}
          <div className="space-y-2">
            <WalletLoginButton
              turnstileToken={turnstileToken}
              disabled={disabled || activeWalletLoading}
              onLoadingChange={handleWalletLoadingChange}
              onInitiate={hideForWalletFlow}
              className="w-full inline-flex h-10 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/50 text-white text-sm font-medium transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Continue with Wallet
            </WalletLoginButton>
          </div>

          {/* Info text */}
          <p className="text-xs text-zinc-500 text-center pt-2">
            Connect any supported wallet to sign in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
