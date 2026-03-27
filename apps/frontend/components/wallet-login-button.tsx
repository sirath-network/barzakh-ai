"use client";

import { useState, useEffect } from "react";
import { useAccount, useSignMessage, useDisconnect, useAccountEffect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { signIn } from "next-auth/react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

interface WalletLoginButtonProps {
  turnstileToken?: string;
  disabled?: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

export function WalletLoginButton({ turnstileToken, disabled, onLoadingChange, className, children }: WalletLoginButtonProps) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitiatingLogin, setIsInitiatingLogin] = useState(false);
  const [hasModalOpened, setHasModalOpened] = useState(false);

  const performLogin = async (walletAddress: string) => {
    if (!turnstileToken) {
      toast.error("Please complete the captcha verification");
      setIsInitiatingLogin(false);
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
      window.location.href = "/";

    } catch (error: any) {
      // Handle user rejection specifically
      if (error.name === 'UserRejectedRequestError' ||
        error.message?.includes('User rejected the request') ||
        error.code === 4001) { // 4001 is the standard EIP-1193 error code for user rejection
        toast.info("Login cancelled");
      } else if (error.message?.includes('Failed to connect to MetaMask') ||
        error.message?.includes('Resource unavailable')) {
        // Handle MetaMask connection issues without logging error to console (avoids Next.js overlay)
        toast.error("Connection to wallet failed. Please try again.");
      } else {
        console.error("Login failed:", error);
        toast.error("Login failed. Please try again.");
      }

      disconnect();
    } finally {
      setIsLoading(false);
      setIsInitiatingLogin(false);
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
      setHasModalOpened(false);
      openConnectModal?.();
    }
  };

  // Track if the connect modal has actually opened
  useEffect(() => {
    if (connectModalOpen) {
      setHasModalOpened(true);
    }
  }, [connectModalOpen]);

  useAccountEffect({
    onConnect({ address: newAddress, isReconnected }) {
      if (isInitiatingLogin && newAddress) {
        performLogin(newAddress);
      }
    },
  });

  // Reset isInitiatingLogin when modal is closed without connecting
  useEffect(() => {
    if (isInitiatingLogin && !connectModalOpen && !isConnected && hasModalOpened) {
      // Add a small delay to allow wallet connection state to update after modal closes
      const timeout = setTimeout(() => {
        setIsInitiatingLogin(false);
        setHasModalOpened(false);
      }, 1500);

      return () => clearTimeout(timeout);
    }
  }, [connectModalOpen, isInitiatingLogin, isConnected, hasModalOpened]);

  // Notify parent of loading state changes (includes when wallet modal is open)
  useEffect(() => {
    const walletInProgress = isLoading || isInitiatingLogin;
    onLoadingChange?.(walletInProgress);
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
