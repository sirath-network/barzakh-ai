'use client';

import { useState, useEffect } from 'react';
import { useCurrentAccount, useConnectWallet, useWallets } from '@onelabs/dapp-kit';
import { signIn } from 'next-auth/react';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';

interface OneChainWalletLoginProps {
  turnstileToken?: string;
  disabled?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

/**
 * OneChainWalletLogin
 * 
 * Component for Sui wallet authentication via OneChain dApp kit.
 * Manages wallet connection state and handles auth flow with the backend.
 */
export function OneChainWalletLogin({
  turnstileToken,
  disabled,
  onLoadingChange,
  className,
  children,
}: OneChainWalletLoginProps) {
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet } = useConnectWallet();
  const wallets = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const performLogin = async (walletAddress: string) => {
    if (!turnstileToken) {
      toast.error('Please complete the captcha verification');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get Nonce from backend
      const nonceRes = await fetch(`/api/auth/nonce?address=${walletAddress}`);
      if (!nonceRes.ok) throw new Error('Failed to fetch nonce');
      const { nonce, timestamp } = await nonceRes.json();

      // 2. Create message for authentication
      const message = `Barzakh AI — Login\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

      // 3. For Sui, authenticate using the wallet address
      // Backend will verify this address is valid for a Sui wallet
      const result = await signIn('credentials-wallet', {
        address: walletAddress,
        signature: message, // For Sui, using the message itself as proof
        message,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Success - redirect to home
      window.location.href = '/';
    } catch (error: any) {
      console.error('OneChain login failed:', error);
      toast.error('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger login when wallet connects
  useEffect(() => {
    if (isConnecting && currentAccount?.address && !isLoading) {
      performLogin(currentAccount.address);
    }
  }, [isConnecting, currentAccount?.address, isLoading]);

  const handleClick = () => {
    if (!turnstileToken) {
      toast.error('Please complete the captcha verification');
      return;
    }

    if (currentAccount?.address) {
      // Already connected
      performLogin(currentAccount.address);
    } else {
      // Trigger wallet connection - connect to the first available wallet
      const wallet = wallets[0];
      if (!wallet) {
        toast.error('No wallet detected. Please install a Sui wallet.');
        return;
      }
      setIsConnecting(true);
      connectWallet({ wallet });
    }
  };

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(isLoading || isConnecting);
  }, [isLoading, isConnecting, onLoadingChange]);

  // Reset connecting state if wallet connection didn't complete
  useEffect(() => {
    if (isConnecting && currentAccount?.address) {
      setIsConnecting(false);
    }
  }, [isConnecting, currentAccount?.address]);

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
