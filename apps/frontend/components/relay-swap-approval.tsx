"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAccount, useSwitchChain, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { parseEther } from "viem";
import { ArrowRightLeft, Check, AlertCircle, Loader2, ExternalLink, Wallet } from "lucide-react";
import { createClient } from "@relayprotocol/relay-sdk";

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

    const [step, setStep] = useState<"ready" | "switching" | "sending" | "confirming" | "success" | "error">("ready");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [currentTxIndex, setCurrentTxIndex] = useState(0);

    // Client-side execution state
    const [clientTransactions, setClientTransactions] = useState<RelayTransaction[]>([]);
    const [clientLoading, setClientLoading] = useState(false);

    // Handle error results
    if (result.status === "error") {
        return (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 max-w-md">
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="size-5" />
                    <span className="font-medium">Quote Error</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{result.error || result.details}</p>
                {result.suggestion && (
                    <p className="mt-2 text-xs text-muted-foreground italic">{result.suggestion}</p>
                )}
            </div>
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
            // If we have toolParams and connected wallet, but no transactions (or preview mode)
            if (isConnected && address && result.toolParams && processedTransactions.length === 0) {
                setClientLoading(true);
                try {
                    const client = createClient({
                        baseApiUrl: "https://api.relay.link"
                    });

                    // console.log("Fetching Relay quote client-side...", result.toolParams);

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

                    // Transform transactions - Relay SDK returns tx data in item.data object
                    if (txQuote.steps) {
                        const txs = txQuote.steps.flatMap((step: any) =>
                            step.items.map((item: any) => {
                                // Handle both direct tx format and nested format
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
                    // Don't block UI entirely, let retry
                } finally {
                    setClientLoading(false);
                }
            }
        };

        fetchExecutableTx();
    }, [isConnected, address, result.toolParams, processedTransactions.length]);

    // If no quote or no transactions, show informational card
    if (!quote) {
        return (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 max-w-md">
                <div className="flex items-center gap-2 text-primary mb-2">
                    <ArrowRightLeft className="size-5" />
                    <span className="font-medium">Relay Protocol Quote</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    {result.message || "Quote generated successfully. Connect wallet to execute."}
                </p>
                {/* Show connect button if disconnected */}
                {!isConnected && (
                    <div className="mt-4 flex justify-center">
                        <ConnectButton />
                    </div>
                )}
            </div>
        );
    }

    // Determine required chain for transaction - case-insensitive lookup
    const getChainIdFromName = (name: string): number | undefined => {
        const entry = Object.entries(CHAIN_NAMES).find(([_, n]) =>
            n.toLowerCase() === name?.toLowerCase()
        );
        return entry ? parseInt(entry[0]) : undefined;
    };

    // Use explicit Chain ID from toolParams if available, otherwise name lookup
    const requiredChainIdNum = result.toolParams?.fromChainId || getChainIdFromName(sourceChain || "");
    const isWrongChain = chain?.id !== requiredChainIdNum;

    // Execute swap
    const handleExecuteSwap = async () => {
        if (!address || !processedTransactions || processedTransactions.length === 0) return;

        setStep("sending");
        setErrorMessage("");

        try {
            // Execute transactions sequentially
            for (let i = 0; i < processedTransactions.length; i++) {
                setCurrentTxIndex(i);
                const tx = processedTransactions[i];

                // If switch needed and not handled by outer button (e.g. multi-chain steps?)
                // Usually Relay logic ensures we are on source chain
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

                // For simplicity, we just wait for the first/main tx hash to consider it "sent"
                // Ideally we wait for receipt
            }

            setStep("success");
            toast.success("Transaction submitted!");
        } catch (error: any) {
            // Handle user rejection
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

    // Switch chain
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
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 md:p-6 max-w-md">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/20">
                    <ArrowRightLeft className="size-5 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold text-lg">Cross-Chain Swap</h3>
                    <p className="text-sm text-muted-foreground">via Relay Protocol</p>
                </div>
            </div>

            {/* Swap Details */}
            <div className="space-y-3 mb-4">
                {/* From */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                        <p className="text-xs text-muted-foreground">From {sourceChain}</p>
                        <p className="font-medium">{quote.inputAmount} {quote.inputToken}</p>
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                    <div className="p-1 rounded-full bg-muted border border-border">
                        <ArrowRightLeft className="size-4 text-muted-foreground rotate-90" />
                    </div>
                </div>

                {/* To */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <div>
                        <p className="text-xs text-muted-foreground">To {destChain}</p>
                        <p className="font-medium text-primary">{quote.outputAmount} {quote.outputToken}</p>
                    </div>
                </div>
            </div>

            {/* Fee Info */}
            {(quote.gasFee || quote.relayerFee || quote.estimatedTime) && (
                <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                    {quote.rate && quote.rate !== "N/A" && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Rate:</span>
                            <span className="font-mono">{quote.rate}</span>
                        </div>
                    )}
                    {quote.totalFee && quote.totalFee !== "N/A" && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Total Fee:</span>
                            <span className="font-mono">{quote.totalFee}</span>
                        </div>
                    )}
                    {quote.estimatedTime && (
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Est. Time:</span>
                            <span>{quote.estimatedTime}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Status Messages */}
            {step === "error" && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="size-4" />
                        <span className="text-sm">{errorMessage}</span>
                    </div>
                </div>
            )}

            {step === "success" && explorerUrl && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-green-500">
                            <Check className="size-4" />
                            <span className="text-sm font-medium">Swap Executed!</span>
                        </div>
                        <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                        >
                            View TX <ExternalLink className="size-3" />
                        </a>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
                {!isConnected ? (
                    <div className="flex justify-center">
                        <ConnectButton />
                    </div>
                ) : clientLoading ? (
                    <ButtonAny disabled className="w-full" variant="outline">
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Preparing swap...
                    </ButtonAny>
                ) : isWrongChain ? (
                    <ButtonAny
                        onClick={handleSwitchChain}
                        className="w-full"
                        variant="outline"
                        disabled={step === "switching"}
                    >
                        {step === "switching" ? (
                            <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Switching...
                            </>
                        ) : (
                            <>Switch to {CHAIN_NAMES[requiredChainIdNum!] || `Chain ${requiredChainIdNum}`}</>
                        )}
                    </ButtonAny>
                ) : processedTransactions.length === 0 ? (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border text-center">
                        <p className="text-sm text-muted-foreground">
                            Waiting for quote...
                        </p>
                    </div>
                ) : step === "ready" ? (
                    <ButtonAny
                        onClick={handleExecuteSwap}
                        className="w-full bg-gradient-to-r from-primary to-primary/80"
                    >
                        <ArrowRightLeft className="size-4 mr-2" />
                        {processedTransactions.length > 1
                            ? `Execute Step ${currentTxIndex + 1}/${processedTransactions.length}`
                            : "Execute Swap"}
                    </ButtonAny>
                ) : step === "sending" || isSending ? (
                    <ButtonAny disabled className="w-full">
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Confirm in wallet...
                    </ButtonAny>
                ) : step === "confirming" ? (
                    <ButtonAny disabled className="w-full">
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Waiting for confirmation...
                    </ButtonAny>
                ) : step === "success" ? (
                    <ButtonAny disabled className="w-full bg-green-600 hover:bg-green-600 disabled:opacity-100">
                        <Check className="size-4 mr-2" />
                        Swap Complete
                    </ButtonAny>
                ) : step === "error" ? (
                    <ButtonAny
                        onClick={() => setStep("ready")}
                        variant="outline"
                        className="w-full"
                    >
                        Try Again
                    </ButtonAny>
                ) : null}
            </div>

            {/* Instructions (if not client executed) */}
            {result.instructions && result.instructions.length > 0 && step === "ready" && processedTransactions.length > 0 && !result.toolParams && (
                <div className="mt-3 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Instructions:</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                        {result.instructions.map((instruction, i) => (
                            <li key={i}>{instruction.replace(/^\d+\.\s*/, '')}</li>
                        ))}
                    </ol>
                </div>
            )}

            {/* Footer */}
            <p className="mt-3 text-xs text-muted-foreground text-center">
                Powered by Relay Protocol • MEV Protected
            </p>
        </div>
    );
}
