"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Copy, Check, Wallet, AlertCircle, ExternalLink, LogOut, AlertTriangle, Sparkles, ShieldCheck } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount, useBalance, useSwitchChain, useSignTypedData, useSignMessage, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";

interface X402PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  billingCycle: string;
  onSuccess: () => void;
  currentTier?: string | null;
  currentBillingCycle?: string | null;
}

// USDC contract on Base Mainnet
const USDC_MAINNET_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Type aliases for React 19 compatibility
const DialogAny = Dialog as any;
const DialogContentAny = DialogContent as any;
const DialogHeaderAny = DialogHeader as any;
const DialogTitleAny = DialogTitle as any;
const DialogDescriptionAny = DialogDescription as any;
const ButtonAny = Button as any;

export function X402PaymentModal({
  isOpen,
  onClose,
  planId,
  billingCycle,
  onSuccess,
  currentTier,
  currentBillingCycle,
}: X402PaymentModalProps) {
  // Added "verify" step for wallet ownership verification
  const [step, setStep] = useState<"init" | "verify" | "payment" | "signing" | "settling">("init");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmPlanChange, setConfirmPlanChange] = useState(false);
  const [walletVerified, setWalletVerified] = useState(false);

  // RainbowKit/Wagmi hooks
  const { address, isConnected, chain } = useAccount();

  // USDC balance on Cronos Mainnet
  const { data: usdcBalance } = useBalance({
    address: address,
    token: USDC_MAINNET_ADDRESS,
    chainId: base.id,
  });

  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  const {
    signTypedDataAsync,
    isPending: isSigningTypedData,
    reset: resetSignTypedData,
  } = useSignTypedData();

  // For wallet ownership verification
  const {
    signMessageAsync,
    isPending: isSigningMessage,
  } = useSignMessage();

  // Check if user is changing plans
  const hasPaidSubscription = currentTier && currentTier !== "free";
  const isTierChange = hasPaidSubscription && currentTier !== planId;
  const isBillingCycleChange = hasPaidSubscription && currentTier === planId && currentBillingCycle !== billingCycle;
  const isChangingPlan = isTierChange || isBillingCycleChange;

  const isUpgrade = isTierChange && (
    (currentTier === "pro" && planId === "ultimate") ||
    (currentTier === "free" && (planId === "pro" || planId === "ultimate"))
  );

  const isDowngrade = isTierChange && (
    (currentTier === "ultimate" && planId === "pro") ||
    ((currentTier === "pro" || currentTier === "ultimate") && planId === "free")
  );

  const isOnCorrectChain = chain?.id === base.id;

  // Parse USDC balance (6 decimals)
  const userUsdcBalance = usdcBalance ? formatUnits(usdcBalance.value, 6) : "0";
  const requiredAmount = paymentData?.displayInfo?.usdPrice || 0;
  const hasInsufficientBalance = parseFloat(userUsdcBalance) < requiredAmount;

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep("init");
      setPaymentData(null);
      setIsLoading(false);
      setCopied(false);
      setConfirmPlanChange(false);
      setWalletVerified(false);
      resetSignTypedData?.();
    }
  }, [isOpen, planId, billingCycle, resetSignTypedData]);

  // Reset wallet verification when wallet changes
  useEffect(() => {
    setWalletVerified(false);
  }, [address]);

  // Auto-close modal when wallet disconnects after verification/payment step
  useEffect(() => {
    if (isOpen && !isConnected && (step === "payment" || step === "verify" || walletVerified)) {
      onClose();
    }
  }, [isConnected, isOpen, step, walletVerified, onClose]);

  // Step 1: Verify wallet ownership before payment
  const verifyWalletOwnership = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnCorrectChain) {
      try {
        switchChain({ chainId: base.id });
      } catch (error) {
        toast.error("Please switch to Base");
      }
      return;
    }

    try {
      setStep("verify");
      setIsLoading(true);

      // 1. Get nonce from unified wallet verification API
      const nonceRes = await fetch(`/api/wallet/verify-signature?address=${address}`);
      if (!nonceRes.ok) {
        throw new Error("Failed to get verification nonce");
      }
      const { message } = await nonceRes.json();

      // 2. Sign the message to prove ownership
      const signature = await signMessageAsync({ message });

      // 3. Verify signature with server
      const verifyRes = await fetch("/api/wallet/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Wallet verification failed");
      }

      // Success - wallet is verified
      setWalletVerified(true);

      // Now proceed to init payment
      await initPayment();
    } catch (error: any) {
      // Handle user rejection
      if (error.code === 4001 ||
        error.name === 'UserRejectedRequestError' ||
        error.message?.includes('User rejected')) {
        toast.info("Signature cancelled");
        setStep("init");
        return;
      }

      console.error("Wallet verification error:", error);
      toast.error(error.message || "Wallet verification failed");
      setStep("init");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize payment - get x402 requirements from server
  const initPayment = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/billing/x402/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (res.status === 402) {
        const data = await res.json();
        setPaymentData(data);
        setStep("payment");
      } else {
        toast.error("Failed to initiate payment");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error initiating payment");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate EIP-3009 authorization and sign with wallet
  const handlePayment = async () => {
    if (!isConnected || !address || !paymentData) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnCorrectChain) {
      try {
        switchChain({ chainId: base.id });
      } catch (error) {
        toast.error("Please switch to Base");
      }
      return;
    }

    if (hasInsufficientBalance) {
      toast.error(
        `Insufficient USDC balance. You have ${parseFloat(userUsdcBalance).toFixed(2)} but need ${requiredAmount} USDC.`
      );
      return;
    }

    try {
      setStep("signing");

      // Generate nonce
      const nonceArray = new Uint8Array(32);
      window.crypto.getRandomValues(nonceArray);
      const nonce = "0x" + Array.from(nonceArray).map(b => b.toString(16).padStart(2, "0")).join("");

      const now = Math.floor(Date.now() / 1000);
      const validBefore = (now + 300).toString(); // 5 minutes validity
      const value = (requiredAmount * 1_000_000).toString(); // Convert to 6 decimals

      // EIP-712 domain for USDC
      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: base.id,
        verifyingContract: USDC_MAINNET_ADDRESS as `0x${string}`,
      };

      // EIP-3009 TransferWithAuthorization types
      const types = {
        TransferWithAuthorization: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "validAfter", type: "uint256" },
          { name: "validBefore", type: "uint256" },
          { name: "nonce", type: "bytes32" },
        ],
      };

      // Message to sign
      const message = {
        from: address,
        to: paymentData.paymentRequirements.payTo,
        value,
        validAfter: "0",
        validBefore,
        nonce,
      };

      // Sign EIP-712 typed data
      const signature = await signTypedDataAsync({
        domain,
        types,
        primaryType: "TransferWithAuthorization",
        message,
      });

      // Build V2 PaymentPayload object (per x402 V2 spec)
      const paymentPayload = {
        x402Version: 2,
        accepted: paymentData.paymentRequirements,
        payload: {
          authorization: {
            from: address,
            to: paymentData.paymentRequirements.payTo,
            value: value,
            validAfter: 0,
            validBefore: parseInt(validBefore),
            nonce,
          },
          signature,
          asset: paymentData.paymentRequirements.asset,
        },
      };

      // Settle payment via our API
      setStep("settling");

      const settleRes = await fetch("/api/billing/x402/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentPayload,
          paymentRequirements: paymentData.paymentRequirements,
          planId,
          billingCycle,
        }),
      });

      const settleData = await settleRes.json();

      if (settleRes.ok && settleData.success) {
        toast.success("Payment successful! Subscription activated.");
        // Disconnect wallet immediately after success
        disconnect();
        onSuccess();
        onClose();
      } else {
        toast.error(settleData.error || settleData.reason || "Payment failed");
        setStep("payment");
      }
    } catch (error: any) {
      // Handle user rejection
      if (error.code === 4001 ||
        error.name === 'UserRejectedRequestError' ||
        error.message?.includes('User rejected')) {
        toast.info("Signature cancelled");
        setStep("payment");
        return;
      }

      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
      setStep("payment");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle dialog close
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <DialogAny open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <DialogContentAny
        className="sm:max-w-md w-[90%] rounded-xl"
        onPointerDownOutside={(e: any) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-rk]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e: any) => {
          const target = e.target as HTMLElement;
          if (target.closest('[data-rk]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e: any) => {
          e.preventDefault();
        }}
      >
        <DialogHeaderAny>
          <DialogTitleAny className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pay with Crypto
          </DialogTitleAny>
          <DialogDescriptionAny className="flex items-center gap-1.5">
            <span>Payment via x402 on Base</span>
          </DialogDescriptionAny>
        </DialogHeaderAny>

        <div className="overflow-y-auto max-h-[60vh] sm:max-h-[70vh] px-1 scrollbar-hide">
          {step === "init" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-5">
              <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-medium">Gasless USDC Payment</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                  Subscribe to <strong>{planId.toUpperCase()}</strong> using USDC on Base.
                  <span className="text-muted-foreground font-bold"> Fast and low-cost!</span>
                </p>
              </div>

              {/* Plan Change Warning */}
              {isChangingPlan && !confirmPlanChange && (
                <div className="w-full max-w-xs space-y-3">
                  <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                          {isBillingCycleChange ? "Billing Cycle Change" : isUpgrade ? "Plan Upgrade" : isDowngrade ? "Plan Downgrade" : "Plan Change"}
                        </p>
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          {isBillingCycleChange ? (
                            <>Your current <strong>{currentTier?.toUpperCase()} ({currentBillingCycle?.toUpperCase()})</strong> subscription will be <strong>cancelled immediately</strong> and replaced.</>
                          ) : (
                            <>Your current <strong>{currentTier?.toUpperCase()}</strong> subscription will be <strong>cancelled immediately</strong> and replaced with <strong>{planId.toUpperCase()}</strong>.</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ButtonAny
                    onClick={() => setConfirmPlanChange(true)}
                    className="w-full"
                    variant="outline"
                  >
                    I understand, continue
                  </ButtonAny>
                </div>
              )}

              {(!isChangingPlan || confirmPlanChange) && (
                <div className="w-full max-w-xs space-y-3">
                  {!isConnected ? (
                    /* Step 1: Connect Wallet */
                    <ConnectButton.Custom>
                      {({ openConnectModal, mounted }) => {
                        const ready = mounted;
                        return (
                          <ButtonAny
                            onClick={openConnectModal}
                            disabled={!ready}
                            className="w-full"
                            size="lg"
                          >
                            <Wallet className="mr-2 h-4 w-4" />
                            Connect Wallet to Continue
                          </ButtonAny>
                        );
                      }}
                    </ConnectButton.Custom>
                  ) : !isOnCorrectChain ? (
                    /* Step 2: Switch to correct chain */
                    <ButtonAny
                      onClick={() => switchChain({ chainId: base.id })}
                      className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md border-none"
                      size="lg"
                    >
                      Switch to Base
                    </ButtonAny>
                  ) : (
                    /* Step 3: Verify wallet ownership and proceed */
                    <div className="space-y-3">
                      {/* Connected wallet info */}
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400">
                            <Wallet className="h-3 w-3" />
                          </div>
                          <span className="text-sm font-medium">
                            {address?.slice(0, 6)}...{address?.slice(-4)}
                          </span>
                          {walletVerified && (
                            <ShieldCheck className="h-4 w-4 text-zinc-500" />
                          )}
                        </div>
                        <ConnectButton.Custom>
                          {({ openAccountModal }) => (
                            <button
                              onClick={openAccountModal}
                              className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                            >
                              Change
                            </button>
                          )}
                        </ConnectButton.Custom>
                      </div>

                      <ButtonAny
                        onClick={verifyWalletOwnership}
                        disabled={isLoading || isSigningMessage}
                        className="w-full"
                        size="lg"
                      >
                        {(isLoading || isSigningMessage) ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        {isSigningMessage ? "Sign to Verify..." : "Verify Wallet & Proceed"}
                      </ButtonAny>
                      <p className="text-xs text-center text-muted-foreground">
                        You'll sign a message to prove wallet ownership
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === "payment" && paymentData && (
            <div className="space-y-6">
              {/* Payment Details Card */}
              <div className="p-4 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-700/30 rounded-lg space-y-4 border border-zinc-300 dark:border-zinc-500/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">GASLESS PAYMENT</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-medium text-zinc-500 dark:text-zinc-400">Base</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{paymentData.displayInfo?.usdcAmount}</span>
                      <span className="text-sm font-medium text-muted-foreground">{paymentData.displayInfo?.usdcSymbol}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ≈ ${paymentData.displayInfo?.usdPrice} USD
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Recipient</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-black/20 rounded border shadow-sm">
                    <code className="flex-1 text-xs font-mono truncate text-muted-foreground">
                      {paymentData.displayInfo?.receiver}
                    </code>
                    <ButtonAny
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 hover:bg-muted"
                      onClick={() => handleCopy(paymentData.displayInfo?.receiver)}
                    >
                      {copied ? <Check className="h-3 w-3 text-zinc-500" /> : <Copy className="h-3 w-3" />}
                    </ButtonAny>
                  </div>
                </div>

                <p className="text-xs text-zinc-700 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-700/40 p-2 rounded border border-zinc-200 dark:border-zinc-600/50">
                  {paymentData.displayInfo?.note}
                </p>
              </div>

              {/* Wallet Section */}
              <div className="space-y-3">
                {!isConnected ? (
                  <div className="flex flex-col items-center gap-3">
                    <ConnectButton.Custom>
                      {({ openConnectModal, mounted }) => {
                        const ready = mounted;
                        return (
                          <ButtonAny
                            onClick={openConnectModal}
                            disabled={!ready}
                            className="w-full"
                            size="lg"
                          >
                            <Wallet className="mr-2 h-4 w-4" />
                            Connect Wallet
                          </ButtonAny>
                        );
                      }}
                    </ConnectButton.Custom>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Wrong Chain Warning */}
                    {!isOnCorrectChain && (
                      <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                              Wrong Network
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              Please switch to Base.
                            </p>
                          </div>
                          <ButtonAny
                            size="sm"
                            variant="outline"
                            onClick={() => switchChain({ chainId: base.id })}
                          >
                            Switch
                          </ButtonAny>
                        </div>
                      </div>
                    )}

                    {/* Wallet Info with USDC Balance */}
                    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700/50">
                        <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                          <Wallet className="h-4 w-4" />
                          <span className="font-medium text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                        </div>
                        <ConnectButton.Custom>
                          {({ openAccountModal }) => (
                            <button
                              onClick={openAccountModal}
                              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-500 transition-colors"
                            >
                              <LogOut className="h-3 w-3" />
                              Disconnect
                            </button>
                          )}
                        </ConnectButton.Custom>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500 dark:text-zinc-400">Amount:</span>
                        <span className="font-mono font-medium text-zinc-900 dark:text-white">{requiredAmount} USDC</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        <span>Your Balance:</span>
                        <span className={hasInsufficientBalance ? "text-red-600 dark:text-red-500" : ""}>
                          {parseFloat(userUsdcBalance).toFixed(2)} USDC
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                        <Sparkles className="h-3 w-3" />
                        <span>Gasless transaction on Base!</span>
                      </div>
                    </div>

                    {hasInsufficientBalance ? (
                      <ButtonAny
                        disabled
                        className="w-full h-11 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20 disabled:opacity-100 font-semibold rounded-md"
                        size="lg"
                      >
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Insufficient USDC Balance
                      </ButtonAny>
                    ) : (
                      <ButtonAny
                        onClick={handlePayment}
                        disabled={isSigningTypedData || !isOnCorrectChain}
                        className="w-full font-semibold shadow-lg bg-gradient-to-r from-zinc-500 to-zinc-600 hover:from-zinc-600 hover:to-zinc-700 dark:from-zinc-300 dark:to-zinc-400 dark:hover:from-zinc-200 dark:hover:to-zinc-300 text-white dark:text-zinc-900"
                        size="lg"
                      >
                        {isSigningTypedData ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sign in Wallet...
                          </>
                        ) : (
                          <>
                            Sign & Pay {requiredAmount} USDC (Gasless)
                          </>
                        )}
                      </ButtonAny>
                    )}
                  </div>
                )}
              </div>

              {/* Token info */}
              <div className="pt-2 border-t">
                <a
                  href={`https://basescan.org/token/${USDC_MAINNET_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <span>View USDC on Explorer</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {step === "verify" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <ShieldCheck className="h-8 w-8 text-primary animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Verifying Wallet Ownership</p>
                <p className="text-sm text-muted-foreground">Please sign the verification message in your wallet</p>
              </div>
            </div>
          )}

          {step === "signing" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Sign Authorization</p>
                <p className="text-sm text-muted-foreground">Please sign the EIP-3009 authorization in your wallet</p>
              </div>
            </div>
          )}

          {step === "settling" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Settling Payment</p>
                <p className="text-sm text-muted-foreground">The facilitator is submitting your payment on-chain...</p>
              </div>
            </div>
          )}
        </div>
      </DialogContentAny>
    </DialogAny>
  );
}
