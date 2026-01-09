"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAccount, useSwitchChain, useSendTransaction, useSignMessage, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRightLeft, Check, AlertCircle, Loader2, ExternalLink, Clock, Info, Wallet, ShieldCheck } from "lucide-react";
import { createClient } from "@relayprotocol/relay-sdk";
import { motion, AnimatePresence } from "framer-motion";

// Type aliases for React 19 compatibility
const ButtonAny = Button as any;

// Chain names for display
const CHAIN_NAMES: Record<number, string> = {
    1: "Ethereum",
    10: "Optimism",
    25: "Cronos",
    56: "BNB Chain",
    100: "Gnosis",
    130: "Unichain",
    137: "Polygon",
    143: "Monad",
    146: "Sonic",
    169: "Manta Pacific",
    288: "Boba",
    324: "zkSync Era",
    360: "Shape",
    30: "Rootstock",
    466: "AppChain",
    480: "World Chain",
    690: "Redstone",
    747: "Flow EVM",
    988: "Stable",
    999: "HyperEVM",
    1088: "Metis",
    1101: "Polygon zkEVM",
    1135: "Lisk",
    1329: "Sei",
    1337: "Hyperliquid",
    1424: "Perennial",
    1514: "Story",
    1625: "Gravity",
    1868: "Soneium",
    1923: "SwellChain",
    1996: "Sanko",
    2020: "Ronin",
    2741: "Abstract",
    2818: "Morph",
    5000: "Mantle",
    5031: "Somnia",
    5330: "Superseed",
    7560: "Cyber",
    7869: "Powerloom",
    7897: "Arena-Z",
    8333: "B3",
    8453: "Base",
    9745: "Plasma",
    33139: "ApeChain",
    33979: "Funkichain",
    34443: "Mode",
    42018: "Mythos",
    42161: "Arbitrum",
    42170: "Arbitrum Nova",
    42220: "Celo",
    43111: "Hemi",
    43114: "Avalanche",
    43419: "Gunz",
    48900: "Zircuit",
    55244: "Superposition",
    57073: "Ink",
    59144: "Linea",
    60808: "BOB",
    69000: "Animechain",
    80094: "Berachain",
    81457: "Blast",
    98866: "Plume",
    167000: "Taiko",
    510003: "Syndicate",
    534352: "Scroll",
    543210: "Zero",
    660279: "Xai",
    747474: "Katana",
    7777777: "Zora",
};

// Block explorers for transaction links
const BLOCK_EXPLORERS: Record<number, string> = {
    1: "https://etherscan.io",
    10: "https://optimistic.etherscan.io",
    25: "https://cronoscan.com",
    56: "https://bscscan.com",
    100: "https://gnosisscan.io",
    130: "https://uniscan.xyz",
    137: "https://polygonscan.com",
    146: "https://sonicscan.org",
    169: "https://pacific-explorer.manta.network",
    324: "https://explorer.zksync.io",
    480: "https://worldscan.org",
    999: "https://hyperevmscan.io",
    1088: "https://explorer.metis.io",
    1101: "https://zkevm.polygonscan.com",
    1135: "https://blockscout.lisk.com",
    1329: "https://seitrace.com",
    1868: "https://soneium.blockscout.com",
    2020: "https://app.roninchain.com",
    2741: "https://abscan.org",
    5000: "https://mantlescan.xyz",
    8333: "https://explorer.b3.fun",
    8453: "https://basescan.org",
    33139: "https://apescan.io",
    34443: "https://explorer.mode.network",
    42161: "https://arbiscan.io",
    42170: "https://nova.arbiscan.io",
    42220: "https://celoscan.io",
    43114: "https://snowtrace.io",
    48900: "https://explorer.zircuit.com",
    57073: "https://explorer.inkonchain.com",
    59144: "https://lineascan.build",
    60808: "https://explorer.gobob.xyz",
    69000: "https://explorer-animechain-39xf6m45e3.t.conduit.xyz",
    80094: "https://beratrail.io",
    81457: "https://blastscan.io",
    167000: "https://taikoscan.io",
    534352: "https://scrollscan.com",
    660279: "https://explorer.xai-chain.net",
    7777777: "https://explorer.zora.energy",
};

interface RelayTransaction {
    data: string;
    to: string;
    value: string;
    chainId: number;
}

interface RelayQuoteDetails {
    inputAmount?: string;
    inputToken?: string;
    outputAmount?: string;
    outputToken?: string;
    rate?: string;
    gasFee?: string;
    relayerFee?: string;
    totalFee?: string;
    estimatedTime?: string;
    steps?: number;
}

interface RelaySwapApprovalProps {
    result: {
        status: string;
        quote?: RelayQuoteDetails;
        quoteDetails?: RelayQuoteDetails;
        transactions?: RelayTransaction[];
        fromChain?: string;
        toChain?: string;
        sourceChain?: string;
        destinationChain?: string;
        error?: string;
        details?: string;
        suggestion?: string;
        message?: string;
        instructions?: string[];
        timestamp?: string;
        note?: string;
        toolParams?: {
            fromChainId: number;
            toChainId: number;
            fromToken: string;
            toToken: string;
            amount: string;
            isUSD: boolean;
        };
    };
}

export function RelaySwapApproval({ result }: RelaySwapApprovalProps) {
    const { address, isConnected, chain } = useAccount();
    const { switchChain } = useSwitchChain();
    const { sendTransactionAsync, isPending: isSending } = useSendTransaction();
    const { signMessageAsync } = useSignMessage();
    const { disconnect } = useDisconnect();

    const [step, setStep] = useState<"ready" | "verifying" | "switching" | "sending" | "confirming" | "success" | "error">("ready");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [currentTxIndex, setCurrentTxIndex] = useState(0);
    const [isVerified, setIsVerified] = useState(false);

    // Swap tracking state
    const [swapAlreadyCompleted, setSwapAlreadyCompleted] = useState(false);
    const [isCheckingSwapStatus, setIsCheckingSwapStatus] = useState(true);
    const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);

    // Client-side execution state
    const [clientTransactions, setClientTransactions] = useState<RelayTransaction[]>([]);
    const [clientLoading, setClientLoading] = useState(false);

    // Generate unique swap request ID from params
    const swapRequestId = result.toolParams && result.timestamp
        ? btoa(JSON.stringify({
            fromChainId: result.toolParams.fromChainId,
            toChainId: result.toolParams.toChainId,
            fromToken: result.toolParams.fromToken,
            toToken: result.toolParams.toToken,
            amount: result.toolParams.amount,
            timestamp: result.timestamp,
        }))
        : null;

    // Check if swap was already completed (server-side persistence)
    useEffect(() => {
        const checkSwapCompletion = async () => {
            if (!swapRequestId) {
                setIsCheckingSwapStatus(false);
                return;
            }

            try {
                const res = await fetch(`/api/relay/swap-tracking?swapRequestId=${encodeURIComponent(swapRequestId)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.completed) {
                        setSwapAlreadyCompleted(true);
                        setCompletedTxHash(data.transactionHash || null);
                        setStep("success");
                    }
                }
            } catch (error) {
                console.warn("Failed to check swap status:", error);
            } finally {
                setIsCheckingSwapStatus(false);
            }
        };

        checkSwapCompletion();
    }, [swapRequestId]);

    // Handle error results
    if (result.status === "error") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 max-w-md w-full"
            >
                <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="size-5" />
                    <span className="font-medium">Quote Error</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{result.error || result.details}</p>
                {result.suggestion && (
                    <p className="mt-2 text-xs text-zinc-500 italic">{result.suggestion}</p>
                )}
            </motion.div>
        );
    }

    // Get initial quote details
    const quote = result.quote || result.quoteDetails;
    const sourceChain = result.fromChain || result.sourceChain;
    const destChain = result.toChain || result.destinationChain;
    const initialTransactions = result.transactions || [];

    // Use client transactions if available, otherwise initial
    const processedTransactions = clientTransactions.length > 0 ? clientTransactions : initialTransactions;

    // Fetch executable transaction client-side if needed
    useEffect(() => {
        const fetchExecutableTx = async () => {
            if (isConnected && address && result.toolParams && processedTransactions.length === 0) {
                setClientLoading(true);
                try {
                    const client = createClient({
                        baseApiUrl: "https://api.relay.link"
                    });

                    const txQuote = await client.actions.getQuote({
                        chainId: result.toolParams.fromChainId,
                        toChainId: result.toolParams.toChainId,
                        currency: result.toolParams.fromToken,
                        toCurrency: result.toolParams.toToken,
                        amount: result.toolParams.amount,
                        tradeType: 'EXACT_INPUT',
                        user: address,
                        recipient: address
                    });

                    if (txQuote.steps) {
                        const txs = txQuote.steps.flatMap((step: any) =>
                            step.items.map((item: any) => {
                                const txData = item.data || item;
                                return {
                                    data: txData.data || "0x",
                                    to: txData.to,
                                    value: txData.value ?? "0",
                                    chainId: txData.chainId || step.chainId || result.toolParams?.fromChainId
                                };
                            })
                        );

                        setClientTransactions(txs);
                    }
                } catch (err: any) {
                    console.error("Client-side quote fetch failed:", err);
                    setErrorMessage("Failed to prepare transaction. Please try again.");
                } finally {
                    setClientLoading(false);
                }
            }
        };

        fetchExecutableTx();
    }, [isConnected, address, result.toolParams, processedTransactions.length]);

    // Reset verification when disconnected
    useEffect(() => {
        if (!isConnected) {
            setIsVerified(false);
        }
    }, [isConnected]);

    // Auto-disconnect on success
    useEffect(() => {
        if (step === "success") {
            const timer = setTimeout(() => {
                disconnect();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [step, disconnect]);

    // If no quote or no transactions, show informational card
    if (!quote) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/90 backdrop-blur-xl p-4 max-w-md w-full shadow-2xl"
            >
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 mb-2">
                    <ArrowRightLeft className="size-5" />
                    <span className="font-medium">Relay Protocol Swap</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {result.message || "Initializing swap details..."}
                </p>
                {!isConnected && (
                    <div className="mt-4 flex justify-center">
                        <ConnectButton />
                    </div>
                )}
            </motion.div>
        );
    }

    // Determine required chain for transaction
    const getChainIdFromName = (name: string): number | undefined => {
        const entry = Object.entries(CHAIN_NAMES).find(([_, n]) =>
            n.toLowerCase() === name?.toLowerCase()
        );
        return entry ? parseInt(entry[0]) : undefined;
    };

    const requiredChainIdNum = result.toolParams?.fromChainId || getChainIdFromName(sourceChain || "");
    const isWrongChain = chain?.id !== requiredChainIdNum;

    const handleVerify = async () => {
        try {
            setStep("verifying");

            // 1. Get nonce from server
            const nonceRes = await fetch(`/api/wallet/verify-signature?address=${address}`);
            if (!nonceRes.ok) throw new Error("Failed to get verification nonce");
            const { message } = await nonceRes.json();

            // 2. Sign message
            const signature = await signMessageAsync({ message });

            // 3. Verify on server
            const verifyRes = await fetch("/api/wallet/verify-signature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, signature }),
            });

            if (!verifyRes.ok) {
                const data = await verifyRes.json();
                throw new Error(data.error || "Verification failed");
            }

            setIsVerified(true);
            setStep("ready");
        } catch (error: any) {
            // Handle user rejection
            if (error.code === 4001 ||
                error?.name === 'UserRejectedRequestError' ||
                error?.message?.includes('User rejected')) {
                setStep("ready");
                return;
            }

            console.error("Verification failed:", error);
            setStep("ready");
            toast.error(error.message || "Verification failed. Please try again.");
        }
    };

    // Execute swap
    const handleExecuteSwap = async () => {
        if (!address || !processedTransactions || processedTransactions.length === 0) return;

        setStep("sending");
        setErrorMessage("");

        try {
            let lastTxHash: string | null = null;
            for (let i = 0; i < processedTransactions.length; i++) {
                setCurrentTxIndex(i);
                const tx = processedTransactions[i];

                if (tx.chainId !== chain?.id && switchChain) {
                    await switchChain({ chainId: tx.chainId });
                }

                const hash = await sendTransactionAsync({
                    to: tx.to as `0x${string}`,
                    data: tx.data as `0x${string}`,
                    value: BigInt(tx.value),
                    chainId: tx.chainId,
                });

                setTxHash(hash);
                lastTxHash = hash;
            }

            setStep("success");

            // Mark swap as completed (server-side persistence)
            if (swapRequestId && lastTxHash) {
                try {
                    await fetch("/api/relay/swap-tracking", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            swapRequestId,
                            transactionHash: lastTxHash,
                        }),
                    });
                } catch (err) {
                    console.warn("Failed to mark swap as completed:", err);
                }
            }
        } catch (error: any) {
            if (error?.name === "UserRejectedRequestError" ||
                error?.message?.includes("User rejected") ||
                error?.code === 4001) {
                setStep("ready");
                return;
            }

            console.error("Transaction error:", error);
            setErrorMessage(error.message || "Transaction failed");
            setStep("error");
        }
    };

    const handleSwitchChain = async () => {
        if (!requiredChainIdNum) return;
        setStep("switching");
        try {
            await switchChain?.({ chainId: requiredChainIdNum });
            setStep("ready");
        } catch (error: any) {
            setStep("ready");
        }
    };

    const explorerUrl = txHash && requiredChainIdNum
        ? `${BLOCK_EXPLORERS[requiredChainIdNum] || "https://etherscan.io"}/tx/${txHash}`
        : null;

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
                        src="/images/barzakh/banner/marble-new.png"
                        alt="Marble Texture"
                        fill
                        className="object-cover opacity-80"
                        style={{ objectPosition: "50% 35%" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

                    {/* Header Content on top of Marble */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white">
                                <ArrowRightLeft className="size-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Cross-Chain Swap</h3>
                                <p className="text-xs text-zinc-300 flex items-center gap-1">
                                    via Relay Protocol <span className="w-1 h-1 rounded-full bg-green-500 inline-block" />
                                </p>
                            </div>
                        </div>
                        {step === "sending" && (
                            <div className="px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                                <Loader2 className="size-3 animate-spin" /> Processing
                            </div>
                        )}
                        {isVerified && step !== "sending" && step !== "success" && (
                            <div className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                                <ShieldCheck className="size-3" /> Verified
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-5 pt-2 space-y-4">

                    {/* INPUT CARD */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">
                                From {sourceChain}
                            </p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white truncate" title={quote.inputAmount}>
                                {quote.inputAmount}
                            </span>
                            <span className="text-sm font-semibold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-md border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                {quote.inputToken}
                            </span>
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div className="relative h-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                        </div>
                        <div className="absolute inset-0 flex justify-center">
                            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 dark:text-zinc-500">
                                <ArrowRightLeft className="size-4 rotate-90" />
                            </span>
                        </div>
                    </div>

                    {/* OUTPUT CARD */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">
                                To {destChain}
                            </p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white truncate" title={quote.outputAmount}>
                                {quote.outputAmount}
                            </span>
                            <span className="text-sm font-semibold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-md border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                {quote.outputToken}
                            </span>
                        </div>
                    </div>

                    {/* INFO GRID */}
                    <AnimatePresence>
                        {(quote.rate || quote.estimatedTime || quote.totalFee) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-2 gap-2 text-xs text-zinc-500 pt-2"
                            >
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                                    <span className="opacity-70">Rate</span>
                                    <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{quote.rate}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-1 opacity-70">
                                        <Clock className="size-3" /> Est. Time
                                    </div>
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{quote.estimatedTime || "~2-5 seconds"}</span>
                                </div>

                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ERROR STATE */}
                    <AnimatePresence>
                        {step === "error" && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                            >
                                <AlertCircle className="size-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* SUCCESS STATE */}
                    <AnimatePresence>
                        {step === "success" && explorerUrl && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                                        <Check className="size-4" />
                                        <span className="text-sm font-medium">Swap Executed!</span>
                                    </div>
                                    <a
                                        href={explorerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                                    >
                                        View Transaction <ExternalLink className="size-3" />
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ALREADY COMPLETED INFO */}
                    {swapAlreadyCompleted && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50"
                        >
                            <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 flex-wrap">
                                <Info className="size-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
                                <span className="text-sm font-medium">Cross-Chain Swap Completed!</span>
                                {completedTxHash && (
                                    <a
                                        href={`${BLOCK_EXPLORERS[requiredChainIdNum!] || "https://etherscan.io"}/tx/${completedTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors"
                                    >
                                        View Transaction <ExternalLink className="size-3" />
                                    </a>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 pl-6">
                                Request a new quote for initiate another cross-chain swap
                            </p>
                        </motion.div>
                    )}

                    {/* ACTIONS - Hide when swap completed */}
                    {step !== "success" && !swapAlreadyCompleted && (
                        <div className="pt-2">
                            {!isConnected ? (
                                <div className="flex justify-center w-full [&_button]:w-full">
                                    <ConnectButton.Custom>
                                        {({ openConnectModal, mounted }) => (
                                            <ButtonAny
                                                onClick={openConnectModal}
                                                disabled={!mounted}
                                                className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-lg shadow-black/5 dark:shadow-white/5"
                                            >
                                                <Wallet className="size-4" />
                                                Connect Wallet
                                            </ButtonAny>
                                        )}
                                    </ConnectButton.Custom>
                                </div>
                            ) : isWrongChain ? (
                                <ButtonAny
                                    onClick={handleSwitchChain}
                                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white"
                                    variant="default"
                                    disabled={step === "switching"}
                                >
                                    {step === "switching" ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Switching to {CHAIN_NAMES[requiredChainIdNum!] || `Chain ${requiredChainIdNum}`}...
                                        </>
                                    ) : (
                                        <>Switch to {CHAIN_NAMES[requiredChainIdNum!] || `Chain ${requiredChainIdNum}`}</>
                                    )}
                                </ButtonAny>
                            ) : clientLoading ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400" variant="outline">
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Preparing Signature...
                                </ButtonAny>
                            ) : !isVerified ? (
                                <ButtonAny
                                    onClick={handleVerify}
                                    disabled={step === "verifying"}
                                    className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-lg shadow-black/5 dark:shadow-white/5"
                                >
                                    {step === "verifying" ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Verifying Ownership...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="size-4 mr-2" />
                                            Verify Wallet
                                        </>
                                    )}
                                </ButtonAny>
                            ) : processedTransactions.length === 0 ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800/50 text-zinc-500" variant="ghost">
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Fetching quote...
                                </ButtonAny>
                            ) : step === "ready" ? (
                                <ButtonAny
                                    onClick={handleExecuteSwap}
                                    className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    <ArrowRightLeft className="size-4 mr-2" />
                                    {processedTransactions.length > 1
                                        ? `Execute Step ${currentTxIndex + 1}/${processedTransactions.length}`
                                        : "Execute Swap"}
                                </ButtonAny>
                            ) : step === "sending" || isSending ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400">
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Confirm in wallet...
                                </ButtonAny>
                            ) : step === "confirming" ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400">
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Broadcasting...
                                </ButtonAny>
                            ) : step === "error" ? (
                                <ButtonAny
                                    onClick={() => setStep("ready")}
                                    variant="outline"
                                    className="w-full h-11 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                                >
                                    Try Again
                                </ButtonAny>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 font-semibold flex items-center justify-center gap-1.5">
                        Powered by Relay <span className="w-0.5 h-0.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" /> MEV Protected
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
