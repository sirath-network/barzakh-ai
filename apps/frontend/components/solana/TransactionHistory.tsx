"use client";

import React from "react";
import { motion } from "framer-motion";
import {
    ArrowUpRight,
    ArrowDownLeft,
    ExternalLink,
    RefreshCw,
    Coins,
} from "lucide-react";

// Type imports
interface SolanaTransaction {
    hash: string;
    type: string;
    status: string;
    timestamp: string;
    from: string;
    to: string;
    fee: {
        amount: number;
        symbol: string;
        valueUsd: number | null;
    } | null;
    transfers: Array<{
        direction: "in" | "out";
        token: string;
        symbol: string;
        amount: number;
        valueUsd: number | null;
        from: string;
        to: string;
    }>;
}

interface TransactionHistoryResponse {
    wallet: string;
    chain: "solana";
    transactions: SolanaTransaction[];
    totalCount: number;
}

interface TransactionHistoryProps {
    result: TransactionHistoryResponse | string;
}

// Format large numbers
const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
};

// Format crypto amount
const formatCrypto = (num: number): string => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    if (num >= 1) return num.toFixed(4);
    if (num >= 0.0001) return num.toFixed(6);
    return num.toExponential(2);
};

// Truncate address
const truncateAddress = (address: string): string => {
    if (address.length <= 12) return address;
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
const getTransactionStyle = (type: string, transfers: SolanaTransaction["transfers"]) => {
    const hasIncoming = transfers.some(t => t.direction === "in");
    const hasOutgoing = transfers.some(t => t.direction === "out");

    if (type === "Receive" || (hasIncoming && !hasOutgoing)) {
        return {
            icon: ArrowDownLeft,
            bgColor: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
            label: "Received",
        };
    }
    if (type === "Send" || (hasOutgoing && !hasIncoming)) {
        return {
            icon: ArrowUpRight,
            bgColor: "bg-rose-500/10",
            iconColor: "text-rose-500",
            label: "Sent",
        };
    }
    if (type === "Swap" || (hasIncoming && hasOutgoing)) {
        return {
            icon: RefreshCw,
            bgColor: "bg-blue-500/10",
            iconColor: "text-blue-500",
            label: "Swap",
        };
    }
    return {
        icon: Coins,
        bgColor: "bg-zinc-500/10",
        iconColor: "text-zinc-500",
        label: type,
    };
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ result }) => {
    // Handle error string
    if (typeof result === "string") {
        return (
            <div className="w-full max-w-full font-sans p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">{result}</p>
            </div>
        );
    }

    const { wallet, transactions, totalCount } = result;

    if (!transactions || transactions.length === 0) {
        return (
            <div className="w-full max-w-full font-sans p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                    No transactions found for this wallet.
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
                        Recent Transactions
                    </h3>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                        {totalCount} txns
                    </span>
                </div>
            </div>

            {/* Transactions List */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {transactions.map((tx, index) => {
                        const style = getTransactionStyle(tx.type, tx.transfers);
                        const IconComponent = style.icon;

                        // Get primary transfer for display
                        const primaryTransfer = tx.transfers[0];

                        return (
                            <motion.div
                                key={tx.hash}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03, duration: 0.2 }}
                                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50/80 dark:hover:bg-zinc-900/30 transition-colors"
                            >
                                {/* Left: Icon + Type + Time */}
                                <div className="flex items-center gap-3 min-w-0">
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

                                {/* Center: Token + Amount */}
                                {primaryTransfer && (
                                    <div className="flex flex-col items-center text-center px-2">
                                        <span
                                            className={`font-semibold text-sm tabular-nums ${primaryTransfer.direction === "in"
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-rose-600 dark:text-rose-400"
                                                }`}
                                        >
                                            {primaryTransfer.direction === "in" ? "+" : "-"}
                                            {formatCrypto(primaryTransfer.amount)} {primaryTransfer.symbol}
                                        </span>
                                        {primaryTransfer.valueUsd !== null && (
                                            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
                                                ${formatNumber(primaryTransfer.valueUsd)}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Right: Counterparty + Link */}
                                <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {primaryTransfer?.direction === "in" ? "From" : "To"}
                                        </span>
                                        <span className="text-xs font-mono text-zinc-600 dark:text-zinc-300">
                                            {truncateAddress(
                                                primaryTransfer?.direction === "in"
                                                    ? primaryTransfer.from
                                                    : primaryTransfer?.to || tx.to || "—"
                                            )}
                                        </span>
                                    </div>
                                    <a
                                        href={`https://solscan.io/tx/${tx.hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                                    </a>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center">
                <a
                    href={`https://solscan.io/account/${wallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    View full history on Solscan →
                </a>
            </div>
        </div>
    );
};

export default TransactionHistory;
