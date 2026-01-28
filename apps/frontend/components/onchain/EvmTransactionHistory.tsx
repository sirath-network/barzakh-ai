"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    ArrowUpRight,
    ArrowDownLeft,
    ArrowDownToLine,
    ArrowUpFromLine,
    ExternalLink,
    RefreshCw,
    Coins,
    CheckCircle2,
    XCircle,
    Gift,
    Sparkles,
    Flame,
    UserPlus,
    Rocket,
    Zap,
} from "lucide-react";

// Chain configuration for explorer URLs and native tokens
const CHAIN_CONFIG: Record<string, { explorer: string; symbol: string; name: string }> = {
    mantle: {
        explorer: "https://mantlescan.xyz",
        symbol: "MNT",
        name: "Mantle",
    },
    "mantle-testnet": {
        explorer: "https://sepolia.mantlescan.xyz",
        symbol: "MNT",
        name: "Mantle Sepolia",
    },
    cronos: {
        explorer: "https://explorer.cronos.org",
        symbol: "CRO",
        name: "Cronos",
    },
    "cronos-testnet": {
        explorer: "https://explorer.cronos.org/testnet",
        symbol: "CRO",
        name: "Cronos Testnet",
    },
    creditcoin: {
        explorer: "https://creditcoin.subscan.io",
        symbol: "CTC",
        name: "Creditcoin",
    },
    vana: {
        explorer: "https://vanascan.io",
        symbol: "VANA",
        name: "Vana",
    },
    zeta: {
        explorer: "https://explorer.zetachain.com",
        symbol: "ZETA",
        name: "ZetaChain",
    },
    flow: {
        explorer: "https://flowscan.org",
        symbol: "FLOW",
        name: "Flow",
    },
    wormhole: {
        explorer: "https://wormholescan.io",
        symbol: "W",
        name: "Wormhole",
    },
    // Default fallback
    evm: {
        explorer: "https://etherscan.io",
        symbol: "ETH",
        name: "EVM",
    },
};

// Transaction interface matching EVM tool response
interface EvmTransaction {
    hash: string;
    explorerUrl?: string;
    blockNumber?: number;
    timestamp: string;
    direction: "IN" | "OUT" | "SELF" | string;
    txType: string;
    status: string;
    from: string;
    to: string;
    value: string;
    chain?: string;
    tokenTransfer?: {
        direction: string;
        amount: string;
        symbol: string;
        formatted: string;
    } | Array<{
        direction: string;
        amount: string;
        symbol: string;
        formatted: string;
    }>;
    method?: string | null;
    gasUsed?: string;
    gasPrice?: string;
    txFee?: string;
    // New fields from Zerion
    dappName?: string | null;
    dappIcon?: string | null;
    methodName?: string | null;
    fee?: {
        value: number;
        symbol: string;
        formatted: string | null;
    } | null;
}

interface EvmTransactionHistoryResponse {
    address: string;
    network: string;
    chainId?: number;
    page?: number;
    limit?: number;
    transactionCount: number;
    transactions: EvmTransaction[];
    viewAllUrl?: string;
    explorerUrl?: string;
    note?: string;
    error?: string;
}

interface EvmTransactionHistoryProps {
    result: EvmTransactionHistoryResponse | string;
}

// Format large numbers
const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
};

// Truncate address
const truncateAddress = (address: string): string => {
    if (!address || address.length <= 12) return address || "—";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format date
const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

// Get transaction type icon and color
const getTransactionStyle = (direction: string, txType: string) => {
    const type = txType?.toLowerCase() || '';

    // Handle specific operation types from Zerion
    if (type === 'trade' || type.includes('swap')) {
        return {
            icon: RefreshCw,
            bgColor: "bg-blue-500/10",
            iconColor: "text-blue-500",
            label: "Trade",
        };
    }
    if (type === 'approve') {
        return {
            icon: CheckCircle2,
            bgColor: "bg-amber-500/10",
            iconColor: "text-amber-500",
            label: "Approve",
        };
    }
    if (type === 'revoke' || type === 'revoke_delegation') {
        return {
            icon: XCircle,
            bgColor: "bg-orange-500/10",
            iconColor: "text-orange-500",
            label: type === 'revoke_delegation' ? "Revoke Delegation" : "Revoke",
        };
    }
    if (type === 'deposit') {
        return {
            icon: ArrowDownToLine,
            bgColor: "bg-teal-500/10",
            iconColor: "text-teal-500",
            label: "Deposit",
        };
    }
    if (type === 'withdraw') {
        return {
            icon: ArrowUpFromLine,
            bgColor: "bg-cyan-500/10",
            iconColor: "text-cyan-500",
            label: "Withdraw",
        };
    }
    if (type === 'claim') {
        return {
            icon: Gift,
            bgColor: "bg-purple-500/10",
            iconColor: "text-purple-500",
            label: "Claim",
        };
    }
    if (type === 'mint') {
        return {
            icon: Sparkles,
            bgColor: "bg-pink-500/10",
            iconColor: "text-pink-500",
            label: "Mint",
        };
    }
    if (type === 'burn') {
        return {
            icon: Flame,
            bgColor: "bg-red-600/10",
            iconColor: "text-red-600",
            label: "Burn",
        };
    }
    if (type === 'delegate') {
        return {
            icon: UserPlus,
            bgColor: "bg-indigo-500/10",
            iconColor: "text-indigo-500",
            label: "Delegate",
        };
    }
    if (type === 'deploy') {
        return {
            icon: Rocket,
            bgColor: "bg-violet-500/10",
            iconColor: "text-violet-500",
            label: "Deploy",
        };
    }
    if (type === 'execute') {
        return {
            icon: Zap,
            bgColor: "bg-yellow-500/10",
            iconColor: "text-yellow-500",
            label: "Execute",
        };
    }

    // Fallback to direction-based styling for send/receive
    if (type === 'receive' || direction === "IN") {
        return {
            icon: ArrowDownLeft,
            bgColor: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
            label: "Received",
        };
    }
    if (type === 'send' || direction === "OUT") {
        return {
            icon: ArrowUpRight,
            bgColor: "bg-rose-500/10",
            iconColor: "text-rose-500",
            label: "Sent",
        };
    }

    // Default fallback
    return {
        icon: Coins,
        bgColor: "bg-zinc-500/10",
        iconColor: "text-zinc-500",
        label: txType || "Transaction",
    };
};

// Detect chain from network string
const detectChain = (network: string): { explorer: string; symbol: string; name: string } => {
    const networkLower = network.toLowerCase();

    if (networkLower.includes("mantle") && networkLower.includes("sepolia")) {
        return CHAIN_CONFIG["mantle-testnet"];
    }
    if (networkLower.includes("mantle")) {
        return CHAIN_CONFIG.mantle;
    }
    if (networkLower.includes("cronos") && networkLower.includes("test")) {
        return CHAIN_CONFIG["cronos-testnet"];
    }
    if (networkLower.includes("cronos")) {
        return CHAIN_CONFIG.cronos;
    }
    if (networkLower.includes("creditcoin")) {
        return CHAIN_CONFIG.creditcoin;
    }
    if (networkLower.includes("vana")) {
        return CHAIN_CONFIG.vana;
    }
    if (networkLower.includes("zeta")) {
        return CHAIN_CONFIG.zeta;
    }
    if (networkLower.includes("flow")) {
        return CHAIN_CONFIG.flow;
    }
    if (networkLower.includes("wormhole")) {
        return CHAIN_CONFIG.wormhole;
    }

    return CHAIN_CONFIG.evm;
};

const EvmTransactionHistory: React.FC<EvmTransactionHistoryProps> = ({ result }) => {
    // Handle empty or whitespace-only string result - don't render anything
    if (typeof result === "string" && (!result || result.trim().length === 0)) {
        return null;
    }

    // Handle string result - check if it's an API error/explanation message that shouldn't be shown
    if (typeof result === "string") {
        const lowerResult = result.toLowerCase();

        // Detect patterns that indicate this is an internal API error/explanation message
        const isSystemMessage =
            lowerResult.includes("etherscan api") ||
            lowerResult.includes("pro endpoint") ||
            lowerResult.includes("paid subscription") ||
            lowerResult.includes("i cannot fulfill") ||
            lowerResult.includes("i am unable to") ||
            lowerResult.includes("unable to retrieve") ||
            lowerResult.includes("the user is asking") ||
            lowerResult.includes("the api path") ||
            lowerResult.includes("module=account") ||
            lowerResult.includes("addresstokenbalance") ||
            lowerResult.includes("chainid:") ||
            lowerResult.includes("api pro tier") ||
            lowerResult.includes("zerion api") ||
            lowerResult.includes("alternative api") ||
            lowerResult.includes("requires a paid") ||
            lowerResult.includes("suggestion:") ||
            lowerResult.includes("current access level") ||
            lowerResult.includes("i recommend using") ||
            lowerResult.includes("for comprehensive") ||
            lowerResult.includes("explore alternative");

        // If it's a system/API message, don't render anything
        if (isSystemMessage) {
            return null;
        }

        // Otherwise, render the string in a styled container
        return (
            <div className="w-full max-w-full font-sans p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{result}</p>
            </div>
        );
    }

    // Handle error response
    if (result.error) {
        return (
            <div className="w-full max-w-full font-sans p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{result.error}</p>
            </div>
        );
    }

    const { address, network, transactions, transactionCount, viewAllUrl, explorerUrl } = result;
    const chainConfig = detectChain(network);

    if (!transactions || transactions.length === 0) {
        return (
            <div className="w-full max-w-full font-sans p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    No transactions found for this wallet on {chainConfig.name} in the last ~4 months.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-full space-y-3 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                        {chainConfig.name} Transactions
                    </h3>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        {transactionCount} txns
                    </span>
                </div>
            </div>

            {/* Transactions List */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {transactions.map((tx, index) => {
                        const style = getTransactionStyle(tx.direction, tx.txType);
                        const IconComponent = style.icon;

                        // Parse value for display
                        let valueDisplay = tx.value || "0";
                        // Handle token transfer display
                        if (tx.tokenTransfer) {
                            if (Array.isArray(tx.tokenTransfer)) {
                                valueDisplay = tx.tokenTransfer.map(t => t.formatted).join(", ");
                            } else {
                                valueDisplay = tx.tokenTransfer.formatted;
                            }
                        }

                        // Clean value of existing signs to avoid ++/--
                        const cleanValue = valueDisplay.replace(/^[+-]/, '');

                        // Determine how to display the value based on transaction type
                        const txTypeLower = tx.txType?.toLowerCase() || '';
                        const isTradeOrSwap = txTypeLower === 'trade' || txTypeLower.includes('swap');
                        const isApproveOrRevoke = txTypeLower === 'approve' || txTypeLower === 'revoke' || txTypeLower === 'revoke_delegation';
                        const isDeployOrExecute = txTypeLower === 'deploy' || txTypeLower === 'execute';

                        let finalValueDisplay = cleanValue;
                        let valueColor = "text-zinc-600 dark:text-zinc-300";

                        if (isTradeOrSwap) {
                            // Trades/swaps already have arrow in formatted string
                            valueColor = "text-blue-600 dark:text-blue-400";
                        } else if (isApproveOrRevoke || isDeployOrExecute) {
                            // Approvals/deploys don't need +/- signs
                            valueColor = "text-amber-600 dark:text-amber-400";
                        } else if (tx.direction === "IN") {
                            finalValueDisplay = `+${cleanValue}`;
                            valueColor = "text-emerald-600 dark:text-emerald-400";
                        } else if (tx.direction === "OUT") {
                            finalValueDisplay = `-${cleanValue}`;
                            valueColor = "text-rose-600 dark:text-rose-400";
                        }

                        // Get explorer URL for transaction
                        const txExplorerUrl = tx.explorerUrl || `${chainConfig.explorer}/tx/${tx.hash}`;
                        const displayAddress = truncateAddress(tx.direction === "IN" ? tx.from : tx.to);
                        const addressLabel = tx.direction === "IN" ? "From" : "To";

                        return (
                            <motion.div
                                key={tx.hash}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03, duration: 0.2 }}
                                className="px-4 py-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                            >
                                {/* Mobile Layout (< 640px) */}
                                <div className="sm:hidden flex items-start gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${style.bgColor}`}
                                    >
                                        <IconComponent className={`w-4 h-4 ${style.iconColor}`} />
                                    </div>
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-medium text-sm text-zinc-900 dark:text-white truncate">
                                                {style.label}
                                            </span>
                                            <span className={`font-semibold text-sm tabular-nums flex-shrink-0 ${valueColor}`}>
                                                {finalValueDisplay}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                                {formatDate(tx.timestamp)}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                    <span>{addressLabel}</span>
                                                    <span className="font-mono text-zinc-600 dark:text-zinc-300">
                                                        {displayAddress}
                                                    </span>
                                                </div>
                                                <a
                                                    href={txExplorerUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                                >
                                                    <ExternalLink className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Desktop Layout (>= 640px) */}
                                <div className="hidden sm:grid sm:grid-cols-3 sm:items-center">
                                    {/* Left: Icon + Type + Time */}
                                    <div className="flex items-center gap-3 min-w-0 justify-self-start">
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${style.bgColor}`}
                                        >
                                            <IconComponent className={`w-4 h-4 ${style.iconColor}`} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium text-sm text-zinc-900 dark:text-white">
                                                {style.label}
                                            </span>
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                                {formatDate(tx.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Center: Value */}
                                    <div className="flex flex-col items-center text-center px-2 justify-self-center">
                                        <span
                                            className={`font-semibold text-sm tabular-nums ${valueColor}`}
                                        >
                                            {finalValueDisplay}
                                        </span>
                                        {tx.txFee && (
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                                                Fee: {tx.txFee}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: Counterparty + Link */}
                                    <div className="flex items-center gap-3 justify-self-end">
                                        <div className="flex flex-col items-end">
                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {addressLabel}
                                            </span>
                                            <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                                                {displayAddress}
                                            </span>
                                        </div>
                                        <a
                                            href={txExplorerUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                                        </a>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center">
                <a
                    href={viewAllUrl || explorerUrl || `${chainConfig.explorer}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    View full history on {chainConfig.name} Explorer →
                </a>
            </div>
        </div>
    );
};

export default EvmTransactionHistory;
