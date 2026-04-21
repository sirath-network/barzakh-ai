"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAccount, useSwitchChain, useSendTransaction, useDisconnect } from "wagmi";
import { ArrowRightLeft, Check, AlertCircle, Loader2, ExternalLink, Rocket, Wallet, Coins, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { cn } from "@barzakh/shared/lib/utils/utils";

const ButtonAny = Button as any;

const DynamicConnectButton = () => {
    const { setShowAuthFlow } = useDynamicContext();
    return (
        <ButtonAny
            onClick={() => setShowAuthFlow(true)}
            className="w-full h-11 bg-white text-black hover:bg-zinc-100 font-semibold text-sm shadow-sm"
        >
            <Wallet className="size-4 mr-2" />
            Connect Wallet
        </ButtonAny>
    );
};

interface FourMemeApprovalProps {
    result: {
        status: string;
        type?: "buy" | "sell" | "launch";
        name?: string;
        symbol?: string;
        tokenAddress?: string;
        amount?: string;
        tokenAmount?: string;
        estimatedTokens?: string;
        estimatedBnb?: string;
        presaleBnb?: string;
        imgUrl?: string;
        preparedAt?: number;
        transaction?: {
            to: string;
            value: string;
            data: string;
            chainId: number;
        };
        message?: string;
        transactionHash?: string;
    };
}

export function FourMemeApproval({ result }: FourMemeApprovalProps) {
    const { address, isConnected, chain } = useAccount();
    const { switchChain } = useSwitchChain();
    const { sendTransactionAsync } = useSendTransaction();
    const { disconnect } = useDisconnect();
    const { handleLogOut } = useDynamicContext();

    const [step, setStep] = useState<"ready" | "switching" | "sending" | "confirming" | "success" | "error">(
        result.status === "success" ? "success" : "ready"
    );
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [txHash, setTxHash] = useState<string | null>(result.transactionHash || null);
    const [timeElapsed, setTimeElapsed] = useState<number>(0);

    // Track time since preparation
    useEffect(() => {
        if (result.preparedAt && step === "ready") {
            const interval = setInterval(() => {
                setTimeElapsed(Date.now() - result.preparedAt!);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [result.preparedAt, step]);

    const isExpired = result.preparedAt && timeElapsed > 270000; // 4.5 minutes (most sigs last 5)
    const isApproachingExpiry = result.preparedAt && timeElapsed > 180000; // 3 minutes

    const formatTimeElapsed = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s ago`;
        const minutes = Math.floor(seconds / 60);
        return `${minutes}m ${seconds % 60}s ago`;
    };

    const isWrongChain = chain?.id !== 56;

    // Auto-disconnect on success after a delay
    useEffect(() => {
        if (step === "success") {
            const timer = setTimeout(() => {
                disconnect();
                handleLogOut();
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [step, disconnect, handleLogOut]);

    const handleExecute = async () => {
        if (!result.transaction) return;
        
        setStep("sending");
        setErrorMessage("");

        try {
            const hash = await sendTransactionAsync({
                to: result.transaction.to as `0x${string}`,
                value: BigInt(result.transaction.value),
                data: result.transaction.data as `0x${string}`,
                chainId: 56,
            });

            setTxHash(hash);
            setStep("success");
            toast.success("Transaction submitted successfully!");
        } catch (err: any) {
            console.error("Transaction failed:", err);
            setErrorMessage(err.shortMessage || err.message || "Transaction failed");
            setStep("ready");
        }
    };

    // Error state: show compact inline error, NOT the approval modal
    if (result.status === "error") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 max-w-md w-full shadow-lg"
            >
                <div className="flex items-center gap-3 text-rose-500">
                    <div className="size-8 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="size-4" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">
                            {result.type === "launch" ? "Launch" :
                             result.type === "sell" ? "Sell" : "Buy"} Failed
                        </h3>
                        <p className="text-[11px] opacity-80 mt-0.5 leading-tight">
                            {result.message || "An unexpected error occurred."}
                        </p>
                    </div>
                </div>
            </motion.div>
        );
    }

    if (step === "success" || result.status === "success") {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 max-w-md w-full shadow-lg"
            >
                <div className="flex items-center gap-3 text-emerald-500 mb-4">
                    <div className="size-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="size-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Execution Successful</h3>
                        <p className="text-xs opacity-80">Transaction has been broadcasted.</p>
                    </div>
                </div>

                {txHash && (
                    <a
                        href={`https://bscscan.com/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group"
                    >
                        <span className="text-xs font-mono text-emerald-400">
                            {txHash.slice(0, 10)}...{txHash.slice(-8)}
                        </span>
                        <ExternalLink className="size-3 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                )}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/90 backdrop-blur-xl p-5 max-w-md w-full shadow-2xl overflow-hidden relative"
        >
            {/* Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "size-10 rounded-xl flex-shrink-0 flex items-center justify-center shadow-lg",
                        result.type === "launch" ? "bg-yellow-500/20 text-yellow-500" :
                        result.type === "buy" ? "bg-emerald-500/20 text-emerald-500" :
                        "bg-rose-500/20 text-rose-500"
                    )}>
                        {result.type === "launch" ? <Rocket className="size-5" /> :
                         result.type === "buy" ? <ArrowUpRight className="size-5" /> :
                         <ArrowDownRight className="size-5" />}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm text-white truncate">
                            {result.type === "launch" ? "Launch Token" :
                             result.type === "buy" ? "Buy Token" : "Sell Token"}
                        </h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold truncate">
                            Four.meme Protocol
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                    <div className="px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 whitespace-nowrap">
                        <div className="size-1.5 rounded-full bg-yellow-500/80" />
                        BNB CHAIN
                    </div>
                    
                    <div className="px-2 py-1 rounded bg-zinc-800/50 border border-zinc-700/50 text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 whitespace-nowrap">
                        {result.preparedAt && (
                            <span className={cn(
                                "flex items-center gap-1",
                                isExpired ? "text-rose-500" : isApproachingExpiry ? "text-yellow-500" : "text-zinc-500"
                            )}>
                                <Clock className="size-3" />
                                {formatTimeElapsed(timeElapsed)}
                            </span>
                        )}
                        <span className="opacity-20 text-zinc-500">|</span>
                        MANUAL APPROVAL
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="space-y-4 mb-6">
                {isExpired && step === "ready" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2 overflow-hidden mb-2"
                    >
                        <AlertCircle className="size-4 text-rose-500 flex-shrink-0" />
                        <div>
                            <p className="text-[11px] text-rose-500 font-bold leading-tight">PREPARATION EXPIRED</p>
                            <p className="text-[10px] text-rose-500/80 leading-tight mt-1">Four.meme signatures expire after 5 minutes. Please ask the AI to "Refresh" or "Try again".</p>
                        </div>
                    </motion.div>
                )}
                {result.type === "launch" && (
                    <div className="flex flex-col min-[450px]:flex-row gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                        {result.imgUrl && (
                            <div className="size-24 min-[450px]:size-16 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/10 mx-auto min-[450px]:mx-0">
                                <Image src={result.imgUrl} alt={result.name || "Token"} width={96} height={96} className="object-cover w-full h-full" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0 text-center min-[450px]:text-left">
                            <h4 className="text-white font-semibold truncate">{result.name}</h4>
                            <p className="text-zinc-400 text-xs">${result.symbol}</p>
                            <div className="mt-2 flex items-center justify-center min-[450px]:justify-start gap-2">
                                <span className="text-[10px] text-zinc-500">INIT:</span>
                                <span className="text-xs text-yellow-500 font-bold">{result.presaleBnb} BNB</span>
                            </div>
                        </div>
                    </div>
                )}

                {(result.type === "buy" || result.type === "sell") && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                        <div className="flex flex-col min-[450px]:flex-row justify-between items-start min-[450px]:items-end gap-3">
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                                    {result.type === "buy" ? "Spending" : "Selling"}
                                </p>
                                <p className="text-xl font-bold text-white tracking-tight">
                                    {result.type === "buy" ? `${result.amount} BNB` : `${result.tokenAmount} TOKENS`}
                                </p>
                            </div>
                            <div className="text-left min-[450px]:text-right">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                                    Receiving (Est.)
                                </p>
                                <p className={cn("text-sm font-bold", result.type === "buy" ? "text-emerald-500" : "text-yellow-500")}>
                                    {result.type === "buy" ? `~${result.estimatedTokens} TOKENS` : `~${result.estimatedBnb} BNB`}
                                </p>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[10px] text-zinc-500">TOKEN ADDRESS</span>
                            <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">
                                {result.tokenAddress}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Error Message */}
            <AnimatePresence>
                {errorMessage && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex gap-2 overflow-hidden"
                    >
                        <AlertCircle className="size-4 text-rose-500 flex-shrink-0" />
                        <p className="text-[11px] text-rose-500 font-medium leading-tight">{errorMessage}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Action Buttons */}
            <div className="space-y-3">
                {!isConnected ? (
                    <DynamicConnectButton />
                ) : isWrongChain ? (
                    <ButtonAny
                        onClick={() => switchChain({ chainId: 56 })}
                        disabled={step === "switching"}
                        className="w-full h-11 bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                    >
                        {step === "switching" ? <Loader2 className="size-4 animate-spin mr-2" /> : <ArrowRightLeft className="size-4 mr-2" />}
                        Switch to BNB Chain
                    </ButtonAny>
                ) : (
                    <ButtonAny
                        onClick={handleExecute}
                        disabled={step === "sending" || step === "confirming"}
                        className={cn(
                            "w-full h-12 text-white font-bold text-sm shadow-xl transition-all active:scale-[0.98]",
                            result.type === "buy" ? "bg-emerald-600 hover:bg-emerald-500" :
                            result.type === "sell" ? "bg-rose-600 hover:bg-rose-500" :
                            "bg-yellow-600 hover:bg-yellow-500 text-black"
                        )}
                    >
                        {step === "sending" ? (
                            <>
                                <Loader2 className="size-4 animate-spin mr-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                {result.type === "launch" ? "INITIALIZE LAUNCH" :
                                 result.type === "buy" ? "CONFIRM PURCHASE" :
                                 "CONFIRM SALE"}
                            </>
                        )}
                    </ButtonAny>
                )}
                
                <p className="text-[10px] text-center text-zinc-600 px-4 leading-normal">
                    This transaction will be signed by your connected wallet and broadcasted to the BNB Chain.
                </p>
            </div>
        </motion.div>
    );
}

export default FourMemeApproval;
