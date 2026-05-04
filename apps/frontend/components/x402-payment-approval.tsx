"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAccount, useBalance, useSwitchChain, useSignTypedData, useDisconnect, useSignMessage } from "wagmi";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { base } from "viem/chains";
import { formatUnits } from "viem";
import { CreditCard, Check, AlertCircle, Loader2, Sparkles, Zap, Crown, ShieldCheck, Wallet, LogOut } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

// Type aliases for React 19 compatibility
const ButtonAny = Button as any;

// USDC contract on Base Mainnet
const USDC_MAINNET_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
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
        isAgentExecution?: boolean;
        planId?: string;
        billingCycle?: string;
        txHash?: string;
        explorerUrl?: string;
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
    const { setShowAuthFlow, handleLogOut } = useDynamicContext();
    const { switchChain } = useSwitchChain();
    const { disconnect } = useDisconnect();
    const { data: usdcBalance, isLoading: isLoadingBalance } = useBalance({
        address,
        token: USDC_MAINNET_ADDRESS,
        chainId: base.id
    });

    const [step, setStep] = useState<"ready" | "verifying" | "signing" | "settling" | "success" | "error">("ready");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [walletVerified, setWalletVerified] = useState(false);
    const [signedData, setSignedData] = useState<{
        signature: string;
        authorization: any;
        paymentPayload: any;
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
    const { signMessageAsync, isPending: isSigningMessage } = useSignMessage();

    // Reset wallet verification when address changes
    useEffect(() => {
        setWalletVerified(false);
    }, [address]);

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
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full max-w-md mx-auto"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
                        {/* Marble Header Image */}
                        <div className="relative h-32 w-full overflow-hidden">
                            <Image
                                src="/images/barzakh/banner/x402-art.png"
                                alt="Marble Texture"
                                fill
                                className="object-cover opacity-80"
                                style={{ objectPosition: "50% 35%" }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

                            {/* Header Content on top of Marble */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 pb-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5">
                                        <Check className="size-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white text-lg">Already Subscribed</h3>
                                        <p className="text-xs text-zinc-300 flex items-center gap-1">
                                            {result.currentSubscription.tier.toUpperCase()} Plan
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 pt-3">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                You are already on the <span className="font-medium text-zinc-800 dark:text-zinc-200">{result.currentSubscription.tier.toUpperCase()}</span> plan with <span className="font-medium text-zinc-800 dark:text-zinc-200">{result.currentSubscription.billingCycle}</span> billing.
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                                No payment needed - your subscription is active!
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 font-semibold">
                                Barzakh AI
                            </p>
                        </div>
                    </div>
                </motion.div>
            );
        }
        
        // Check if this was an autonomous agent execution success
        if (result.isAgentExecution && result.success) {
            const PlanIcon = result.planId?.toLowerCase() === "ultimate" ? Crown : Zap;
            
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="w-full max-w-md mx-auto"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
                        {/* Marble Header Image */}
                        <div className="relative h-32 w-full overflow-hidden">
                            <Image
                                src="/images/barzakh/banner/x402-art.png"
                                alt="Marble Texture"
                                fill
                                className="object-cover opacity-80"
                                style={{ objectPosition: "50% 35%" }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

                            {/* Header Content on top of Marble */}
                            <div className="absolute bottom-0 left-0 right-0 p-5 pb-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5">
                                        <Check className="size-5 text-green-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white text-lg">Subscription Active</h3>
                                        <p className="text-xs text-zinc-300 flex items-center gap-1">
                                            Autonomously Executed
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 pt-3">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                Your agent wallet successfully upgraded your account to the <span className="font-medium text-zinc-800 dark:text-zinc-200">{result.planId?.toUpperCase()}</span> plan ({result.billingCycle}).
                            </p>
                            
                            {result.explorerUrl && (
                                <div className="mt-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                                    <a
                                        href={result.explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex justify-between items-center text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="size-3" />
                                            <span>View Transaction on BaseScan</span>
                                        </div>
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 font-semibold">
                                Barzakh AI Agent Executor
                            </p>
                        </div>
                    </div>
                </motion.div>
            );
        }
        
        return null;
    }

    // Real-time subscription check - show if user has subscribed since this old chat was viewed
    if (isCheckingSubscription) {
        return (
            <div className="rounded-xl border border-border bg-card p-4 md:p-6 max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm">Checking subscription status...</span>
                </div>
            </div>
        );
    }

    if (isAlreadySubscribed && currentSubscription) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full max-w-md mx-auto"
            >
                <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
                    {/* Marble Header Image */}
                    <div className="relative h-32 w-full overflow-hidden">
                        <Image
                            src="/images/barzakh/banner/x402-art.png"
                            alt="Marble Texture"
                            fill
                            className="object-cover opacity-80"
                            style={{ objectPosition: "50% 35%" }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

                        {/* Header Content on top of Marble */}
                        <div className="absolute bottom-0 left-0 right-0 p-5 pb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5">
                                    <Check className="size-5 text-green-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-lg">Already Subscribed</h3>
                                    <p className="text-xs text-zinc-300 flex items-center gap-1">
                                        {currentSubscription.tier.toUpperCase()} Plan
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 pt-3">
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                            You are already on the <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentSubscription.tier.toUpperCase()}</span> plan with <span className="font-medium text-zinc-800 dark:text-zinc-200">{currentSubscription.billingCycle}</span> billing.
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
                            No payment needed - your subscription is active!
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 font-semibold">
                            Barzakh AI
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    const payment = result.paymentRequest;
    const isWrongChain = isConnected && chain?.id !== base.id;
    const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535";
    const usdcAmount = usdToUsdcUnits(payment.usdPrice);

    // Verify wallet ownership before payment
    const verifyWalletOwnership = async () => {
        if (!isConnected || !address) {
            return;
        }

        try {
            setStep("verifying");

            // 1. Get verification message from server API
            const nonceRes = await fetch(`/api/wallet/verify-signature?address=${address}`);
            if (!nonceRes.ok) {
                throw new Error("Failed to get verification nonce");
            }
            const { message } = await nonceRes.json();

            // 2. Sign the message to prove ownership
            const signature = await signMessageAsync({ message });

            // 3. Verify signature with server (without binding wallet to account)
            const verifyRes = await fetch("/api/wallet/verify-signature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature, bindWallet: false }),
            });

            if (!verifyRes.ok) {
                const data = await verifyRes.json();
                throw new Error(data.error || "Wallet verification failed");
            }

            // Success - wallet is verified
            setWalletVerified(true);
            setStep("ready");
        } catch (error: any) {
            // Handle user rejection
            if (error.code === 4001 ||
                error.name === 'UserRejectedRequestError' ||
                error.message?.includes('User rejected')) {
                setStep("ready");
                return;
            }

            console.error("Wallet verification error:", error);
            setErrorMessage(error.message || "Wallet verification failed");
            setStep("error");
        }
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

            // EIP-712 domain for USDC (must match x402-facilitator.ts)
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

            const paymentRequirements = {
                scheme: "exact",
                network: "eip155:8453",
                payTo: receiverAddress,
                asset: USDC_MAINNET_ADDRESS,
                amount: usdcAmount.toString(),
                maxTimeoutSeconds: 300,
                extra: {
                    name: "USD Coin",
                    version: "2",
                },
            };

            // Build V2 PaymentPayload object (per x402 V2 spec)
            const paymentPayload = {
                x402Version: 2,
                accepted: paymentRequirements,
                payload: {
                    authorization,
                    signature,
                    asset: USDC_MAINNET_ADDRESS,
                },
            };

            setSignedData({
                signature,
                authorization,
                paymentPayload,
                paymentRequirements,
            });

            // Proceed to settlement
            await settlePayment(paymentPayload, paymentRequirements);
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
    const settlePayment = async (paymentPayload: any, paymentRequirements: any) => {
        setStep("settling");
        try {
            const response = await fetch("/api/billing/x402/settle", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paymentPayload,
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
                // Disconnect wallet after 5 seconds (let user see success state first)
                setTimeout(() => {
                    disconnect();
                }, 5000);
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
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md mx-auto"
        >
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">

                {/* Marble Header Image */}
                <div className="relative h-32 w-full overflow-hidden">
                    <Image
                        src="/images/barzakh/banner/x402-art.png"
                        alt="Marble Texture"
                        fill
                        className="object-cover opacity-80"
                        style={{ objectPosition: "50% 35%" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

                    {/* Header Content on top of Marble */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5">
                                <PlanIcon className={`size-5 ${payment.planId === "ultimate" ? "text-amber-400" : "text-white"}`} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg">{payment.planName} Plan</h3>
                                <p className="text-xs text-zinc-300 flex items-center gap-1">
                                    {payment.cycleName} subscription
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-5 pt-2 space-y-4">

                    {/* Price */}
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-3xl font-bold text-zinc-900 dark:text-white">${payment.usdPrice}</span>
                        <span className="text-zinc-500 dark:text-zinc-400">/ {payment.billingCycle}</span>
                        {payment.savings && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium">
                                Save {payment.savings.percentage}%
                            </span>
                        )}
                    </div>

                    {/* Features */}
                    <div className="space-y-2 mb-4">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white">Includes:</p>
                        <ul className="text-sm text-zinc-500 dark:text-zinc-400 space-y-1">
                            <li className="flex items-center gap-2">
                                <Sparkles className="size-3 text-zinc-900 dark:text-white" />
                                {payment.messageLimit} messages/day
                            </li>
                            {payment.features.slice(1, 3).map((feature, i) => (
                                <li key={i} className="flex items-center gap-2">
                                    <Check className="size-3 text-green-600 dark:text-green-500" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Payment Info */}
                    {isConnected && !isWrongChain && (
                        <div className="mb-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-zinc-200 dark:border-zinc-700/50">
                                <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300">
                                    <Wallet className="size-4" />
                                    <span className="font-medium text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
                                </div>
                                <button
                                    onClick={() => { disconnect(); handleLogOut(); }}
                                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-500 transition-colors"
                                >
                                    <LogOut className="size-3" />
                                    Disconnect
                                </button>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-zinc-500 dark:text-zinc-400">Amount:</span>
                                <span className="font-mono font-medium text-zinc-900 dark:text-white">{formattedUsdcAmount} USDC</span>
                            </div>
                            {usdcBalance && (
                                <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    <span>Your Balance:</span>
                                    <span className={!hasEnoughBalance ? "text-red-600 dark:text-red-500" : ""}>
                                        {parseFloat(formatUnits(usdcBalance.value, USDC_DECIMALS)).toFixed(2)} USDC
                                    </span>
                                </div>
                            )}
                            {payment.isGasless && (
                                <div className="flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                                    <Sparkles className="size-3" />
                                    <span>Gasless transaction on Base!</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Status Messages */}

                    {step === "error" && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50">
                            <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                                <AlertCircle className="size-4" />
                                <span className="text-sm">{errorMessage}</span>
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                        {!isConnected ? (
                            <div className="w-full">
                                <ButtonAny
                                    onClick={() => setShowAuthFlow(true)}
                                    className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-lg shadow-black/5 dark:shadow-white/5"
                                >
                                    <div className="flex items-center gap-2">
                                        <Wallet className="size-4" />
                                        Connect Wallet
                                    </div>
                                </ButtonAny>
                            </div>
                        ) : isWrongChain ? (
                            <ButtonAny
                                onClick={() => switchChain?.({ chainId: base.id })}
                                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md"
                            >
                                Switch to Base
                            </ButtonAny>
                        ) : step === "verifying" || isSigningMessage ? (
                            <ButtonAny disabled className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Verifying wallet ownership...
                            </ButtonAny>
                        ) : step === "ready" ? (
                            <>
                                {isLoadingBalance ? (
                                    <ButtonAny disabled className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                        Checking balance...
                                    </ButtonAny>
                                ) : !hasEnoughBalance ? (
                                    <ButtonAny disabled className="w-full h-11 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-500 border border-red-200 dark:border-red-500/20 disabled:opacity-100 font-semibold rounded-md">
                                        <AlertCircle className="size-4 mr-2" />
                                        Insufficient USDC Balance
                                    </ButtonAny>
                                ) : !walletVerified ? (
                                    <ButtonAny
                                        onClick={verifyWalletOwnership}
                                        className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-lg shadow-black/5 dark:shadow-white/5"
                                    >
                                        <ShieldCheck className="size-4 mr-2" />
                                        Verify Wallet & Proceed
                                    </ButtonAny>
                                ) : (
                                    <ButtonAny
                                        onClick={handleSignPayment}
                                        className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-lg shadow-black/5 dark:shadow-white/5"
                                    >
                                        <CreditCard className="size-4 mr-2" />
                                        Sign & Pay {formattedUsdcAmount} USDC
                                    </ButtonAny>
                                )}
                            </>
                        ) : step === "signing" || isSigning ? (
                            <ButtonAny disabled className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Sign in wallet...
                            </ButtonAny>
                        ) : step === "settling" ? (
                            <ButtonAny disabled className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Processing...
                            </ButtonAny>
                        ) : step === "success" ? (
                            <ButtonAny disabled className="w-full h-11 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-white font-semibold disabled:opacity-100">
                                <Check className="size-4 mr-2" />
                                Subscription Active
                            </ButtonAny>
                        ) : step === "error" ? (
                            <ButtonAny
                                onClick={() => setStep("ready")}
                                variant="outline"
                                className="w-full h-11 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            >
                                Try Again
                            </ButtonAny>
                        ) : null}
                    </div>

                    {/* Footer Note */}
                    <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500 text-center pb-2">
                        {payment.note}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
