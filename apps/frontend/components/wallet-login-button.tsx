"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { signIn } from "next-auth/react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";

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
  const { openConnectModal, connectModalOpen } = useConnectModal();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitiatingLogin, setIsInitiatingLogin] = useState(false);

  // Ref guards to prevent double-firing and race conditions.
  // - loginInProgress: prevents performLogin from being called twice while async work is running.
  // - modalJustClosed: tracks that connectModalOpen went false this render cycle so we can
  //   wait one tick before deciding whether to reset isInitiatingLogin. This is the fix for
  //   the core bug: RainbowKit sets connectModalOpen=false slightly *before* wagmi sets
  //   isConnected=true, so the old "reset" effect fired prematurely and killed the flow.
  const loginInProgress = useRef(false);
  const modalJustClosed = useRef(false);
  const prevModalOpen = useRef(false);

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
      openConnectModal?.();
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

  // Detect the moment the RainbowKit modal closes so we can mark it.
  useEffect(() => {
    if (prevModalOpen.current && !connectModalOpen) {
      modalJustClosed.current = true;
    }
    prevModalOpen.current = connectModalOpen ?? false;
  }, [connectModalOpen]);

  // Reset isInitiatingLogin ONLY when the modal closed AND the wallet did NOT connect.
  // We defer via setTimeout(0) to let wagmi flush isConnected=true in the same tick
  // before we make the decision — this closes the race window in the original code.
  useEffect(() => {
    if (!isInitiatingLogin || !modalJustClosed.current) return;
    modalJustClosed.current = false;

    const timer = setTimeout(() => {
      // By now wagmi has had a chance to update isConnected. If still not connected,
      // the user dismissed the modal without choosing a wallet — reset the flag.
      if (!loginInProgress.current) {
        const currentlyConnected = !!address; // check again to be sure
        if (!currentlyConnected) {
          setIsInitiatingLogin(false);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }, 100); // 100 ms is enough for wagmi's state to settle after modal close

    return () => clearTimeout(timer);
  }, [connectModalOpen, isInitiatingLogin]);

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