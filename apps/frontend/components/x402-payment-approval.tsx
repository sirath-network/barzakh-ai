"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAccount, useBalance, useSwitchChain, useSignTypedData } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cronosTestnet } from "@/lib/wagmi";
import { formatUnits } from "viem";
import { CreditCard, Check, AlertCircle, Loader2, Sparkles, Zap, Crown } from "lucide-react";

// Type aliases for React 19 compatibility
const ButtonAny = Button as any;

// devUSDC.e contract on Cronos Testnet
const USDC_TESTNET_ADDRESS = "0xc01efAaF7C5C61bEbFAeb358E1161b537b8bC0e0";
const USDC_DECIMALS = 6;

interface PaymentRequest {
    planId: string;
    billingCycle: string;
    usdPrice: number;
    planName: string;
    cycleName: string;
    features: string[];
    messageLimit: number;
    savings: { amount: number; percentage: number } | null;
    network: string;
    chainId: number;
    paymentMethod: string;
    tokenAddress?: string;
    tokenDecimals?: number;
    isGasless: boolean;
    note: string;
}

interface X402PaymentApprovalProps {
    result: {
        success: boolean;
        requiresPayment?: boolean;
        paymentRequest?: PaymentRequest;
        message?: string;
        reason?: string;
        error?: string;
        isDuplicate?: boolean;
        currentSubscription?: {
            tier: string;
            billingCycle: string;
        };
    };
}

// Generate random nonce for EIP-3009
function generateNonce(): `0x${string}` {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as `0x${string}`;
}

// Convert USD to USDC units (6 decimals)
function usdToUsdcUnits(usdAmount: number): bigint {
    return BigInt(Math.floor(usdAmount * 10 ** USDC_DECIMALS));
}

export function X402PaymentApproval({ result }: X402PaymentApprovalProps) {
    const { address, isConnected, chain } = useAccount();
    const { switchChain } = useSwitchChain();
    const { data: usdcBalance } = useBalance({
        address,
        token: USDC_TESTNET_ADDRESS,
        chainId: cronosTestnet.id
    });

    const [step, setStep] = useState<"idle" | "ready" | "signing" | "settling" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [signedData, setSignedData] = useState<{
        signature: string;
        authorization: any;
        paymentHeader: string;
        paymentRequirements: any;
    } | null>(null);

    // Real-time subscription check - detects if user has subscribed since this modal was rendered
    const [currentSubscription, setCurrentSubscription] = useState<{
        tier: string;
        billingCycle: string;
    } | null>(null);
    const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false);
    const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

    const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();

    // Fetch current subscription on mount to prevent re-subscription from old chats
    useEffect(() => {
        const checkCurrentSubscription = async () => {
            try {
                setIsCheckingSubscription(true);
                const response = await fetch('/api/billing/subscription');
                if (response.ok) {
                    const data = await response.json();

                    // Parse tier from API response (x402 subs have metadata.tier)
                    let tier = 'free';
                    let billingCycle = 'monthly';

                    if (data?.subscription) {
                        // x402 subscription: tier is in metadata or planName
                        tier = (data.subscription.metadata?.tier ||
                            data.subscription.planName?.toLowerCase() ||
                            'free').toLowerCase();

                        // Convert interval to billingCycle
                        if (data.subscription.interval === 'year') {
                            billingCycle = 'yearly';
                        } else if (data.subscription.intervalCount === 3) {
                            billingCycle = 'quarterly';
                        } else {
                            billingCycle = 'monthly';
                        }
                    }

                    setCurrentSubscription({ tier, billingCycle });

                    // Check if user is already on this plan+cycle
                    if (result.paymentRequest) {
                        const requestedPlan = result.paymentRequest.planId?.toLowerCase();
                        const requestedCycle = result.paymentRequest.billingCycle?.toLowerCase();

                        if (tier === requestedPlan && billingCycle === requestedCycle) {
                            setIsAlreadySubscribed(true);
                        }
                    }
                }
            } catch (error) {
                console.warn("Failed to check subscription status:", error);
            } finally {
                setIsCheckingSubscription(false);
            }
        };

        checkCurrentSubscription();
    }, [result.paymentRequest]);

    // Handle result states
    if (!result.success) {
        return (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="size-5" />
                    <span className="font-medium">Payment Error</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{result.error}</p>
            </div>
        );
    }

    if (!result.requiresPayment || !result.paymentRequest) {
        // Check if this is a duplicate subscription
        if (result.isDuplicate && result.currentSubscription) {
            return (
                <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 md:p-6 max-w-md">
                    <div className="flex items-center gap-2 text-green-500 mb-3">
                        <Check className="size-5" />
                        <span className="font-semibold">Already Subscribed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        You are already on the <span className="font-medium text-foreground">{result.currentSubscription.tier.toUpperCase()}</span> plan with <span className="font-medium text-foreground">{result.currentSubscription.billingCycle}</span> billing.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        No payment needed - your subscription is active!
                    </p>
                </div>
            );
        }
        return null;
    }

    // Real-time subscription check - show if user has subscribed since this old chat was viewed
    if (isCheckingSubscription) {
        return (
            <div className="rounded-xl border border-border bg-card p-4 md:p-6 max-w-md">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Checking subscription status...</span>
                </div>
            </div>
        );
    }

    if (isAlreadySubscribed && currentSubscription) {
        return (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 md:p-6 max-w-md">
                <div className="flex items-center gap-2 text-green-500 mb-3">
                    <Check className="size-5" />
                    <span className="font-semibold">Already Subscribed</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    You are already on the <span className="font-medium text-foreground">{currentSubscription.tier.toUpperCase()}</span> plan with <span className="font-medium text-foreground">{currentSubscription.billingCycle}</span> billing.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                    No payment needed - your subscription is active!
                </p>
            </div>
        );
    }

    const payment = result.paymentRequest;
    const isWrongChain = isConnected && chain?.id !== cronosTestnet.id;
    const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535";
    const usdcAmount = usdToUsdcUnits(payment.usdPrice);

    // Prepare and sign EIP-3009 authorization
    const handlePreparePayment = async () => {
        if (!address) return;
        setStep("ready");
    };

    // Sign the EIP-3009 authorization
    const handleSignPayment = async () => {
        if (!address) return;

        setStep("signing");
        try {
            const now = Math.floor(Date.now() / 1000);
            const validAfter = now - 60; // Valid from 1 minute ago
            const validBefore = now + 300; // Valid for 5 minutes
            const nonce = generateNonce();

            // EIP-712 domain for USDC.e (must match x402-facilitator.ts)
            const domain = {
                name: "Bridged USDC (Stargate)",
                version: "1",
                chainId: cronosTestnet.id,
                verifyingContract: USDC_TESTNET_ADDRESS as `0x${string}`,
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

            const message = {
                from: address,
                to: receiverAddress,
                value: usdcAmount,
                validAfter: BigInt(validAfter),
                validBefore: BigInt(validBefore),
                nonce,
            };

            // Sign the typed data
            const signature = await signTypedDataAsync({
                domain,
                types,
                primaryType: "TransferWithAuthorization",
                message,
            });

            // Build x402 payment header
            const authorization = {
                from: address,
                to: receiverAddress,
                value: usdcAmount.toString(),
                validAfter: validAfter.toString(),
                validBefore: validBefore.toString(),
                nonce,
            };

            const paymentHeader = {
                x402Version: 1,
                scheme: "exact",
                network: "cronos-testnet",
                payload: {
                    ...authorization,
                    signature,
                    asset: USDC_TESTNET_ADDRESS,
                },
            };

            const paymentRequirements = {
                scheme: "exact",
                network: "cronos-testnet",
                payTo: receiverAddress,
                asset: USDC_TESTNET_ADDRESS,
                maxAmountRequired: usdcAmount.toString(),
                maxTimeoutSeconds: 300,
                description: `Barzakh AI ${payment.planName} Plan - ${payment.billingCycle} subscription`,
                mimeType: "application/json",
            };

            const encodedHeader = btoa(JSON.stringify(paymentHeader));

            setSignedData({
                signature,
                authorization,
                paymentHeader: encodedHeader,
                paymentRequirements,
            });

            // Proceed to settlement
            await settlePayment(encodedHeader, paymentRequirements);
        } catch (error: any) {
            // Handle user rejection gracefully - check BEFORE logging to avoid Next.js error overlay
            const isUserRejection =
                error?.name === 'UserRejectedRequestError' ||
                error?.message?.includes('User rejected') ||
                error?.message?.includes('user rejected') ||
                error?.code === 4001;

            if (isUserRejection) {
                // User cancelled - just reset to ready state, no error or logging
                setStep("ready");
                return;
            }

            console.error("Signing error:", error);
            setErrorMessage(error.message || "Failed to sign payment");
            setStep("error");
        }
    };

    // Settle payment via backend
    const settlePayment = async (paymentHeader: string, paymentRequirements: any) => {
        setStep("settling");
        try {
            const response = await fetch("/api/billing/x402/settle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentHeader,
                    paymentRequirements,
                    planId: payment.planId,
                    billingCycle: payment.billingCycle,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || data.reason || "Settlement failed");
            }

            const data = await response.json();
            if (data.success) {
                setStep("success");
                toast.success("Subscription activated! 🎉");
            } else {
                throw new Error(data.error || "Settlement failed");
            }
        } catch (error: any) {
            console.error("Settlement error:", error);
            setErrorMessage(error.message);
            setStep("error");
        }
    };

    const PlanIcon = payment.planId === "ultimate" ? Crown : Zap;
    const formattedUsdcAmount = (payment.usdPrice).toFixed(2);
    const hasEnoughBalance = usdcBalance && usdcBalance.value >= usdcAmount;

    return (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 md:p-6 max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg ${payment.planId === "ultimate" ? "bg-amber-500/20" : "bg-primary/20"}`}>
                    <PlanIcon className={`size-5 ${payment.planId === "ultimate" ? "text-amber-500" : "text-primary"}`} />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">{payment.planName} Plan</h3>
                    <p className="text-sm text-muted-foreground">{payment.cycleName} subscription</p>
                </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-4">
                <span className="text-3xl font-bold">${payment.usdPrice}</span>
                <span className="text-muted-foreground">/ {payment.billingCycle}</span>
                {payment.savings && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-medium">
                        Save {payment.savings.percentage}%
                    </span>
                )}
            </div>

            {/* Features */}
            <div className="space-y-2 mb-4">
                <p className="text-sm font-medium">Includes:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                        <Sparkles className="size-3 text-primary" />
                        {payment.messageLimit} messages/day
                    </li>
                    {payment.features.slice(1, 3).map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                            <Check className="size-3 text-green-500" />
                            {feature}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Payment Info */}
            {isConnected && !isWrongChain && step !== "idle" && (
                <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Amount:</span>
                        <span className="font-mono font-medium">{formattedUsdcAmount} devUSDC.e</span>
                    </div>
                    {usdcBalance && (
                        <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                            <span>Your Balance:</span>
                            <span className={!hasEnoughBalance ? "text-red-500" : ""}>
                                {parseFloat(formatUnits(usdcBalance.value, USDC_DECIMALS)).toFixed(2)} devUSDC.e
                            </span>
                        </div>
                    )}
                    {payment.isGasless && (
                        <div className="flex items-center gap-1 text-xs text-green-500 mt-2">
                            <Sparkles className="size-3" />
                            <span>Gasless transaction - no CRO needed!</span>
                        </div>
                    )}
                </div>
            )}

            {/* Status Messages - Only show for terminal states, not for button states */}

            {step === "success" && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 text-green-500">
                        <Check className="size-4" />
                        <span className="text-sm font-medium">Payment successful! Subscription activated.</span>
                    </div>
                </div>
            )}

            {step === "error" && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="size-4" />
                        <span className="text-sm">{errorMessage}</span>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
                {!isConnected ? (
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
                ) : isWrongChain ? (
                    <ButtonAny
                        onClick={() => switchChain?.({ chainId: cronosTestnet.id })}
                        className="w-full"
                        variant="outline"
                    >
                        Switch to Cronos Testnet
                    </ButtonAny>
                ) : step === "idle" ? (
                    <ButtonAny
                        onClick={handlePreparePayment}
                        className="w-full"
                    >
                        <CreditCard className="size-4 mr-2" />
                        Pay with devUSDC.e
                    </ButtonAny>
                ) : step === "ready" ? (
                    <>
                        {!hasEnoughBalance ? (
                            <ButtonAny disabled className="w-full" variant="destructive">
                                <AlertCircle className="size-4 mr-2" />
                                Insufficient devUSDC.e Balance
                            </ButtonAny>
                        ) : (
                            <ButtonAny
                                onClick={handleSignPayment}
                                className="w-full bg-gradient-to-r from-primary to-primary/80"
                            >
                                <CreditCard className="size-4 mr-2" />
                                Sign & Pay {formattedUsdcAmount} devUSDC.e
                            </ButtonAny>
                        )}
                    </>
                ) : step === "signing" || isSigning ? (
                    <ButtonAny disabled className="w-full">
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Sign in wallet...
                    </ButtonAny>
                ) : step === "settling" ? (
                    <ButtonAny disabled className="w-full">
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Processing...
                    </ButtonAny>
                ) : step === "success" ? (
                    <ButtonAny disabled className="w-full bg-green-600">
                        <Check className="size-4 mr-2" />
                        Subscription Active
                    </ButtonAny>
                ) : step === "error" ? (
                    <ButtonAny
                        onClick={() => setStep("idle")}
                        variant="outline"
                        className="w-full"
                    >
                        Try Again
                    </ButtonAny>
                ) : null}
            </div>

            {/* Footer Note */}
            <p className="mt-3 text-xs text-muted-foreground text-center">
                {payment.note}
            </p>
        </div>
    );
}
