"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, Check, Wallet, AlertCircle, ExternalLink, ChevronDown, ChevronUp, LogOut, AlertTriangle } from "lucide-react";
import { parseEther, formatEther } from "viem";
import { useAccount, useBalance, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PenLine } from "lucide-react";
import { cronosTestnet } from "@/lib/wagmi";

interface X402PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  billingCycle: string;
  onSuccess: () => void;
  currentTier?: string | null;
  currentBillingCycle?: string | null;
}

const DialogAny = Dialog as any;
const DialogContentAny = DialogContent as any;
const DialogHeaderAny = DialogHeader as any;
const DialogTitleAny = DialogTitle as any;
const DialogDescriptionAny = DialogDescription as any;
const ButtonAny = Button as any;
const InputAny = Input as any;
const LabelAny = Label as any;

export function X402PaymentModal({
  isOpen,
  onClose,
  planId,
  billingCycle,
  onSuccess,
  currentTier,
  currentBillingCycle,
}: X402PaymentModalProps) {
  const [step, setStep] = useState<"init" | "signature" | "payment" | "verifying">("init");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [txHash, setTxHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [confirmPlanChange, setConfirmPlanChange] = useState(false);
  const [isWalletVerified, setIsWalletVerified] = useState(false);
  const [signatureMessage, setSignatureMessage] = useState<string | null>(null);
  const [isVerifyingSignature, setIsVerifyingSignature] = useState(false);

  // RainbowKit/Wagmi hooks
  const { address, isConnected, chain } = useAccount();
  const { data: balanceData } = useBalance({
    address: address,
    chainId: cronosTestnet.id,
  });
  const { switchChain } = useSwitchChain();

  const {
    sendTransactionAsync,
    data: sendTxHash,
    isPending: isSending,
    isError: sendError,
    reset: resetSendTransaction
  } = useSendTransaction();

  const {
    signMessageAsync,
    data: signatureData,
    isPending: isSigningMessage,
    isError: signError,
    reset: resetSignMessage,
  } = useSignMessage();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed
  } = useWaitForTransactionReceipt({
    hash: sendTxHash,
  });

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

  const isOnCorrectChain = chain?.id === cronosTestnet.id;
  const userBalance = balanceData ? formatEther(balanceData.value) : null;
  const hasInsufficientBalance = userBalance && paymentDetails &&
    parseFloat(userBalance) < parseFloat(paymentDetails.amount);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setStep("init");
      setPaymentDetails(null);
      setTxHash("");
      setIsLoading(false);
      setCopied(false);
      setShowManualEntry(false);
      setConfirmPlanChange(false);
      setIsWalletVerified(false);
      setSignatureMessage(null);
      setIsVerifyingSignature(false);
      resetSendTransaction?.();
      resetSignMessage?.();
    }
  }, [isOpen, planId, billingCycle, resetSendTransaction, resetSignMessage]);

  // Reset wallet verification when address changes
  useEffect(() => {
    setIsWalletVerified(false);
    setSignatureMessage(null);
    setIsVerifyingSignature(false);
    resetSignMessage?.();
  }, [address, resetSignMessage]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && sendTxHash) {
      setStep("verifying");
      verifyWithRetry(sendTxHash);
    }
  }, [isConfirmed, sendTxHash]);

  // Handle send error
  useEffect(() => {
    if (sendError) {
      toast.error("Transaction failed. Please try again.");
    }
  }, [sendError]);

  // Effects for handling signature success/error removed in favor of async/await handling


  // Request signature message from server (for payment verification only)
  const requestSignatureMessage = async () => {
    if (!address) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      setIsVerifyingSignature(true);
      // Use the payment-specific endpoint that does NOT save wallet address
      const res = await fetch(`/api/billing/x402/verify-wallet?address=${address}`);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to get signature message");
      }

      const data = await res.json();
      setSignatureMessage(data.message);

      // Trigger signature request
      const signature = await signMessageAsync({ message: data.message });
      if (signature) {
        verifyWalletSignature(signature);
      }
    } catch (error: any) {
      // Handle user rejection specifically
      if (error.name === 'UserRejectedRequestError' ||
        error.message?.includes('User rejected the request') ||
        error.code === 4001) {
        toast.info("Signature request cancelled");
      } else if (error.message?.includes('Failed to connect to MetaMask') ||
        error.message?.includes('Resource unavailable')) {
        toast.error("Connection to wallet failed. Please try again.");
      } else {
        console.error("Error requesting signature:", error);
        toast.error(error.message || "Failed to request signature");
      }

      setIsVerifyingSignature(false);
    }
  };

  // Verify the signature with the server (for payment only - does NOT save wallet)
  const verifyWalletSignature = async (signature: string) => {
    try {
      // Use the payment-specific endpoint that does NOT save wallet address
      const res = await fetch("/api/billing/x402/verify-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signature verification failed");
      }

      setIsWalletVerified(true);
      setIsVerifyingSignature(false);
      toast.success("Wallet verified successfully!");
    } catch (error: any) {
      console.error("Signature verification error:", error);
      toast.error(error.message || "Signature verification failed");
      setIsVerifyingSignature(false);
      resetSignMessage?.();
      setSignatureMessage(null);
    }
  };

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
        setPaymentDetails(data.paymentDetails);
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyWithRetry = async (hash: string, maxRetries = 5) => {
    let retries = maxRetries;
    const toastId = toast.loading("Verifying payment...");

    while (retries > 0) {
      try {
        const res = await fetch("/api/billing/x402/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionHash: hash, planId, billingCycle }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          toast.dismiss(toastId);
          toast.success("Payment verified! Subscription active.");
          onSuccess();
          onClose();
          return true;
        } else if (res.status === 409 && data.code === "BLOCK_NOT_FOUND") {
          console.log(`Block not found, retrying verification... (${retries} left)`);
          toast.loading(`Verifying... Block confirmation pending (${retries} retries left)`, { id: toastId });
          retries--;
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        } else {
          toast.dismiss(toastId);
          toast.error(data.error || "Verification failed");
          setStep("payment");
          return false;
        }
      } catch (error) {
        console.error(error);
        retries--;
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    toast.dismiss(toastId);
    toast.error("Verification timed out. Please try again manually.");
    setStep("payment");
    return false;
  };

  const handlePayment = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnCorrectChain) {
      try {
        switchChain({ chainId: cronosTestnet.id });
      } catch (error) {
        toast.error("Please switch to Cronos Testnet");
      }
      return;
    }

    if (hasInsufficientBalance) {
      toast.error(
        `Insufficient TCRO balance. You have ${parseFloat(userBalance || "0").toFixed(4)} TCRO but need ${paymentDetails.amount} TCRO.`
      );
      return;
    }

    try {
      const amount = parseEther(paymentDetails.amount);
      await sendTransactionAsync({
        to: paymentDetails.receiver as `0x${string}`,
        value: amount,
      });
    } catch (error: any) {
      // Check for user rejection
      if (error.code === 4001 ||
        error.name === 'UserRejectedRequestError' ||
        error.message?.includes('User rejected the request')) {
        toast.info("Transaction cancelled");
        return;
      }

      if (error.message?.includes('Failed to connect to MetaMask') ||
        error.message?.includes('Resource unavailable')) {
        toast.error("Connection to wallet failed. Please try again.");
        return;
      }

      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
    }
  };

  const verifyPayment = async () => {
    if (!txHash) return;
    try {
      setStep("verifying");
      await verifyWithRetry(txHash);
    } catch (error) {
      console.error(error);
      toast.error("Error verifying payment");
      setStep("payment");
    }
  };

  // Handle dialog close - prevent closing when RainbowKit modal is interacting
  const handleOpenChange = (open: boolean) => {
    // Only allow closing if explicitly requested (not from focus loss)
    if (!open) {
      onClose();
    }
  };

  return (
    <DialogAny open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <DialogContentAny
        className="sm:max-w-md w-[90%] rounded-xl"
        onPointerDownOutside={(e: any) => {
          // Prevent closing when clicking on RainbowKit modal
          const target = e.target as HTMLElement;
          if (target.closest('[data-rk]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e: any) => {
          // Prevent closing when interacting with RainbowKit
          const target = e.target as HTMLElement;
          if (target.closest('[data-rk]') || target.closest('[data-radix-popper-content-wrapper]')) {
            e.preventDefault();
          }
        }}
        onFocusOutside={(e: any) => {
          // Prevent closing when focus moves to RainbowKit modal
          e.preventDefault();
        }}
      >
        <DialogHeaderAny>
          <DialogTitleAny>Pay with Crypto (x402)</DialogTitleAny>
          <DialogDescriptionAny>
            Secure payment via Cronos Testnet
          </DialogDescriptionAny>
        </DialogHeaderAny>

        <div className="overflow-y-auto max-h-[60vh] sm:max-h-[70vh] px-1">
          {step === "init" && (
            <div className="flex flex-col items-center justify-center py-6 space-y-5">
              <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="font-medium">Crypto Payment</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                  Subscribe to the <strong>{planId.toUpperCase()}</strong> plan using TCRO on Cronos Testnet.
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
                            <>Your current <strong>{currentTier?.toUpperCase()} ({currentBillingCycle?.toUpperCase()})</strong> subscription will be <strong>cancelled immediately</strong> and replaced with <strong>{planId.toUpperCase()} ({billingCycle.toUpperCase()})</strong>. Any remaining time on your current plan will not be refunded or prorated.</>
                          ) : (
                            <>Your current <strong>{currentTier?.toUpperCase()}</strong> subscription will be <strong>cancelled immediately</strong> and replaced with the new <strong>{planId.toUpperCase()}</strong> plan. Any remaining time on your current plan will not be refunded or prorated.</>
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
                <ButtonAny onClick={initPayment} disabled={isLoading} className="w-full max-w-xs">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Proceed to Payment
                </ButtonAny>
              )}
            </div>
          )}

          {step === "payment" && paymentDetails && (
            <div className="space-y-6">
              {/* Payment Details Card */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-4 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{paymentDetails.amount}</span>
                      <span className="text-sm font-medium text-muted-foreground">TCRO</span>
                    </div>
                    {paymentDetails.usdPrice && (
                      <span className="text-xs text-muted-foreground">
                        ≈ ${paymentDetails.usdPrice} USD @ ${paymentDetails.croUsdPrice?.toFixed(4)}/CRO
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Send to address</span>
                    <span className="text-[10px] uppercase tracking-wider font-medium text-primary/70">Cronos Testnet</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-background rounded border shadow-sm">
                    <code className="flex-1 text-xs font-mono truncate text-muted-foreground">
                      {paymentDetails.receiver}
                    </code>
                    <ButtonAny
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 hover:bg-muted"
                      onClick={() => handleCopy(paymentDetails.receiver)}
                    >
                      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </ButtonAny>
                  </div>
                </div>
              </div>

              {/* Wallet Section - Using RainbowKit */}
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
                ) : !isWalletVerified ? (
                  <div className="space-y-3">
                    {/* Signature Verification Section */}
                    <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
                          <PenLine className="h-4 w-4" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Verify Wallet Ownership
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            Sign a message to prove you own this wallet. This links your wallet to your account for secure payments.
                          </p>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                            <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/50">
                              <Wallet className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-xs font-mono text-blue-700 dark:text-blue-300">
                              {address?.slice(0, 6)}...{address?.slice(-4)}
                            </span>
                            <ConnectButton.Custom>
                              {({ openAccountModal }) => (
                                <button
                                  onClick={openAccountModal}
                                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-500 transition-colors ml-auto"
                                >
                                  <LogOut className="h-3 w-3" />
                                  Change
                                </button>
                              )}
                            </ConnectButton.Custom>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ButtonAny
                      onClick={requestSignatureMessage}
                      disabled={isSigningMessage || isVerifyingSignature}
                      className="w-full"
                      size="lg"
                    >
                      {isSigningMessage || isVerifyingSignature ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isSigningMessage ? "Sign in your wallet..." : "Verifying..."}
                        </>
                      ) : (
                        <>
                          <PenLine className="mr-2 h-4 w-4" />
                          Sign to Verify Wallet
                        </>
                      )}
                    </ButtonAny>
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
                              Please switch to Cronos Testnet to continue.
                            </p>
                          </div>
                          <ButtonAny
                            size="sm"
                            variant="outline"
                            onClick={() => switchChain({ chainId: cronosTestnet.id })}
                          >
                            Switch
                          </ButtonAny>
                        </div>
                      </div>
                    )}

                    {/* Wallet Info */}
                    <div className={`p-3 rounded-lg border transition-colors ${hasInsufficientBalance
                        ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                        : "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-full ${hasInsufficientBalance
                              ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                              : "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                            }`}>
                            <Wallet className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex flex-col items-start">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium">
                                {address?.slice(0, 6)}...{address?.slice(-4)}
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                <Check className="h-2.5 w-2.5" />
                                Verified
                              </span>
                            </div>
                            <ConnectButton.Custom>
                              {({ openAccountModal }) => (
                                <button
                                  onClick={openAccountModal}
                                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                  <LogOut className="h-3 w-3" />
                                  Disconnect
                                </button>
                              )}
                            </ConnectButton.Custom>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Balance</div>
                          <div className={`font-mono font-medium ${hasInsufficientBalance
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                            }`}>
                            {userBalance ? parseFloat(userBalance).toFixed(4) : "..."} TCRO
                          </div>
                        </div>
                      </div>

                      {hasInsufficientBalance && (
                        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-2 pt-2 border-t border-red-200 dark:border-red-900/50">
                          <AlertCircle className="h-3 w-3" />
                          <span>Insufficient balance. You need {paymentDetails.amount} TCRO.</span>
                        </div>
                      )}
                    </div>

                    <ButtonAny
                      onClick={handlePayment}
                      disabled={isSending || isConfirming || hasInsufficientBalance || !isOnCorrectChain}
                      className="w-full"
                      size="lg"
                    >
                      {isSending || isConfirming ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isConfirming ? "Confirming Transaction..." : "Processing..."}
                        </>
                      ) : (
                        `Pay ${paymentDetails.amount} TCRO`
                      )}
                    </ButtonAny>
                  </div>
                )}
              </div>

              {/* Transaction Status */}
              {isConfirming && sendTxHash && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Waiting for block confirmation</p>
                      <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                        This usually takes a few seconds. Please don't close this window.
                      </p>
                      <a
                        href={`https://explorer.cronos.org/testnet/tx/${sendTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 hover:underline mt-1"
                      >
                        View on Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Entry Toggle */}
              <div className="pt-2 border-t">
                <button
                  onClick={() => setShowManualEntry(!showManualEntry)}
                  className="flex items-center justify-center w-full gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <span>Having trouble? Enter transaction hash manually</span>
                  {showManualEntry ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {showManualEntry && (
                  <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <LabelAny htmlFor="txHash" className="text-xs">Transaction Hash</LabelAny>
                      <InputAny
                        id="txHash"
                        placeholder="0x..."
                        value={txHash}
                        onChange={(e: any) => setTxHash(e.target.value)}
                        disabled={isConfirming}
                        className="font-mono text-xs"
                      />
                    </div>
                    <ButtonAny
                      onClick={verifyPayment}
                      disabled={!txHash || isLoading || isConfirming}
                      variant="secondary"
                      className="w-full"
                    >
                      Verify Payment Manually
                    </ButtonAny>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "verifying" && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying transaction on-chain...</p>
            </div>
          )}
        </div>
      </DialogContentAny>
    </DialogAny>
  );
}
