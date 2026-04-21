"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { signIn } from "next-auth/react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

/**
 * Safe wrapper around useDynamicContext that returns no-op defaults
 * when the DynamicContextProvider is not yet mounted (SSR / pre-hydration).
 */
function useSafeDynamicContext() {
  try {
    return useDynamicContext();
  } catch {
    // Provider not mounted yet (SSR or before DynamicWalletProvider hydrates)
    return {
      setShowAuthFlow: (() => {}) as (show: boolean) => void,
      sdkHasLoaded: false,
      handleLogOut: async () => {},
    };
  }
}

interface WalletLoginButtonProps {
  turnstileToken?: string;
  disabled?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  onInitiate?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const STORAGE_KEY = "barzakh_wallet_login_initiating";

// Global lock to prevent multiple instances from triggering the login at once
let globalLoginInProgress = false;

export function WalletLoginButton({ turnstileToken, disabled, onLoadingChange, onInitiate, className, children }: WalletLoginButtonProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { setShowAuthFlow, sdkHasLoaded, handleLogOut } = useSafeDynamicContext();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitiatingLogin, setIsInitiatingLogin] = useState(false);

  // Ref guards to prevent double-firing and race conditions.
  const loginInProgress = useRef(false);

  const performLogin = async (walletAddress: string) => {
    if (loginInProgress.current || globalLoginInProgress) return;
    loginInProgress.current = true;
    globalLoginInProgress = true;

    if (!turnstileToken) {
      toast.error("Please complete the captcha verification");
      setIsInitiatingLogin(false);
      loginInProgress.current = false;
      return;
    }

    setIsLoading(true);
    try {
      // 1. Get Nonce
      const nonceRes = await fetch(`/api/auth/nonce?address=${walletAddress}`);
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
      const { nonce, timestamp } = await nonceRes.json();

      // 2. Sign Message
      const message = `Barzakh AI — Login\n\nNonce: ${nonce}\nTimestamp: ${timestamp}`;
      const signature = await signMessageAsync({ message });

      // 3. Sign In
      const result = await signIn("credentials-wallet", {
        address: walletAddress,
        signature,
        message,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      // Success - disconnect wallet before redirecting (keep session clean)
      disconnect();
      await handleLogOut().catch(console.error);
      window.location.href = "/";

    } catch (error: any) {
      // Handle user rejection specifically
      if (error.name === 'UserRejectedRequestError' ||
        error.message?.includes('User rejected the request') ||
        error.code === 4001) {
        toast.info("Login cancelled");
      } else if (error.message?.includes('Failed to connect to MetaMask') ||
        error.message?.includes('Resource unavailable')) {
        toast.error("Connection to wallet failed. Please try again.");
      } else {
        console.error("Login failed:", error);
        toast.error("Login failed. Please try again.");
      }

      disconnect();
      await handleLogOut().catch(console.error);
    } finally {
      setIsLoading(false);
      setIsInitiatingLogin(false);
      localStorage.removeItem(STORAGE_KEY);
      loginInProgress.current = false;
      globalLoginInProgress = false;
    }
  };

  const handleClick = () => {
    if (!turnstileToken) {
      toast.error("Please complete the captcha verification");
      return;
    }

    if (isConnected && address) {
      performLogin(address);
    } else {
      setIsInitiatingLogin(true);
      localStorage.setItem(STORAGE_KEY, "true");
      onInitiate?.();
      // Open Dynamic's unified wallet connect modal
      setShowAuthFlow(true);
    }
  };

  // Auto-trigger login once the wallet connects after we opened the modal.
  useEffect(() => {
    const wasInitiating = localStorage.getItem(STORAGE_KEY) === "true";
    if ((isInitiatingLogin || wasInitiating) && isConnected && address) {
      performLogin(address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitiatingLogin, isConnected, address]);

  // Reset isInitiatingLogin if wallet doesn't connect within a reasonable time
  // or if the Dynamic modal was closed without connecting
  useEffect(() => {
    if (!isInitiatingLogin) return;
    
    // If we've been waiting and still not connected, check after a short delay
    const timer = setTimeout(() => {
      if (!isConnected && !loginInProgress.current) {
        setIsInitiatingLogin(false);
        localStorage.removeItem(STORAGE_KEY);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isInitiatingLogin, isConnected]);

  // Notify parent of loading state changes (includes when wallet modal is open).
  // When this instance unmounts, always clear the parent flag.
  useEffect(() => {
    const walletInProgress = isLoading || isInitiatingLogin;
    onLoadingChange?.(walletInProgress);
    return () => {
      onLoadingChange?.(false);
    };
  }, [isLoading, isInitiatingLogin, onLoadingChange]);

  return (
    <button
      className={className || "w-full inline-flex h-10 items-center justify-center rounded-md border bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"}
      onClick={handleClick}
      disabled={isLoading || !turnstileToken || disabled}
      type="button"
    >
      {children || (
        <>
          <Wallet className="mr-2 h-4 w-4" />
          {isLoading ? "Signing in..." : "Continue with Wallet"}
        </>
      )}
    </button>
  );
}