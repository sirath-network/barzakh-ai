'use client';

import { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useConnectWallet, useDisconnectWallet, useWallets } from '@onelabs/dapp-kit';
import { signIn } from 'next-auth/react';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface OneChainWalletLoginProps {
  turnstileToken?: string;
  disabled?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  onTurnstileReset?: () => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * OneChainWalletLogin
 *
 * Handles Sui wallet authentication via OneChain dApp kit.
 *
 * OneWallet quirk: the connectWallet mutation resolves as 'success' even when
 * the user rejects — it just returns no account. We treat success+no-address
 * as a cancellation and reset accordingly.
 *
 * On success: disconnects the wallet before redirecting to keep the session clean.
 */
export function OneChainWalletLogin({
  turnstileToken,
  disabled,
  onLoadingChange,
  onTurnstileReset,
  className,
  children,
}: OneChainWalletLoginProps) {
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet, status: connectStatus, reset: resetConnect } = useConnectWallet();
  const { mutateAsync: disconnectWalletAsync } = useDisconnectWallet();
  const wallets = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const didInitiateRef = useRef(false);

  const handleCancel = () => {
    setIsConnecting(false);
    didInitiateRef.current = false;
    onTurnstileReset?.();
    resetConnect();
  };

  const performLogin = async (walletAddress: string) => {
    if (!turnstileToken) {
      toast.error('Please complete the captcha verification');
      handleCancel();
      return;
    }

    setIsLoading(true);
    try {
      const nonceRes = await fetch(`/api/auth/nonce?address=${walletAddress}`);
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { nonce, timestamp } = await nonceRes.json();
      const message = `Barzakh AI — Login\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

      const result = await signIn('credentials-wallet', {
        address: walletAddress,
        signature: message,
        message,
        redirect: false,
      });

      if (result?.error) throw new Error(result.error);

      // Success — disconnect wallet before redirecting to keep the session clean
      try { await disconnectWalletAsync(); } catch (_) { }
      window.location.href = '/';
    } catch (error: any) {
      console.error('OneChain login failed:', error);
      toast.error('Login failed. Please try again.');
      onTurnstileReset?.();
      try { await disconnectWalletAsync(); } catch (_) { }
    } finally {
      setIsLoading(false);
      setIsConnecting(false);
      didInitiateRef.current = false;
    }
  };

  // React to mutation settling.
  // OneWallet resolves as 'success' with no account on rejection — handle both cases.
  useEffect(() => {
    if (!isConnecting) return;

    if (connectStatus === 'error') {
      // Standard rejection path
      handleCancel();
    } else if (connectStatus === 'success') {
      if (currentAccount?.address) {
        // Genuine connection — proceed to login
        setIsConnecting(false);
        performLogin(currentAccount.address);
      } else {
        // OneWallet resolves success with no account when user rejects
        handleCancel();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectStatus, isConnecting]);

  const handleClick = () => {
    if (!turnstileToken) {
      toast.error('Please complete the captcha verification');
      return;
    }

    if (currentAccount?.address) {
      performLogin(currentAccount.address);
    } else {
      const wallet = wallets[0];
      if (!wallet) {
        toast.error('No wallet detected. Please install a Sui wallet.');
        return;
      }
      didInitiateRef.current = true;
      resetConnect();
      setIsConnecting(true);
      connectWallet({ wallet });
    }
  };

  useEffect(() => {
    onLoadingChange?.(isLoading || isConnecting);
  }, [isLoading, isConnecting, onLoadingChange]);

  return (
    <>
      <button
        className={
          className ||
          'w-full inline-flex h-10 items-center justify-center rounded-md border bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed'
        }
        onClick={handleClick}
        disabled={isLoading || isConnecting || !turnstileToken || disabled}
        type="button"
      >
        {children || (
          <>
            <Wallet className="mr-2 h-4 w-4" />
            {isLoading ? 'Signing in...' : isConnecting ? 'Connecting...' : 'Continue with Sui'}
          </>
        )}
      </button>
    </>
  );
}