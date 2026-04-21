"use client";

import Image from "next/image";
import React, { useState } from "react";

const ImageAny = Image as any;

interface FourMemeTokenResult {
    rank?: number;
    name: string;
    symbol: string;
    address: string;
    image?: string | null;
    price_usd?: string;
    market_cap?: string;
    volume_24h?: string;
    progress?: string | null;
    holder_count?: number;
    is_graduated?: boolean;
    description?: string | null;
    created_at?: string | null;
    url?: string;
    network?: string;
}

interface FourMemeSearchResult {
    status: string;
    count?: number;
    total_available?: number;
    results?: FourMemeTokenResult[];
    message?: string;
    query?: string | null;
    filter_type?: string;
    filter_status?: string;
    ranking_type?: string;
}

function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => { });
}

const ITEMS_PER_PAGE = 5;

const FourMemeTokenSearch: React.FC<{ result: FourMemeSearchResult }> = ({ result }) => {
    const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
    const [page, setPage] = useState(0);

    if (!result || result.status === "error") {
        return (
            <div className="text-muted-foreground p-4 bg-muted/50 rounded-lg border border-border/20">
                {result?.message || "Failed to fetch Four.meme tokens."}
            </div>
        );
    }

    const tokens = result.results || [];

    if (tokens.length === 0) {
        return (
            <div className="text-muted-foreground p-4 bg-muted/50 rounded-lg border border-border/20">
                {result.message || "No tokens found."}
            </div>
        );
    }

    const totalPages = Math.ceil(tokens.length / ITEMS_PER_PAGE);
    const startIdx = page * ITEMS_PER_PAGE;
    const endIdx = startIdx + ITEMS_PER_PAGE;
    const visibleTokens = tokens.slice(startIdx, endIdx);
    const totalAvailable = result.total_available || tokens.length;

    const label = result.ranking_type
        ? `Rankings • ${result.ranking_type}`
        : result.query
            ? `• ${result.query}`
            : "Tokens";

    const handleCopyAddress = (address: string) => {
        copyToClipboard(address);
        setCopiedAddr(address);
        setTimeout(() => setCopiedAddr(null), 2000);
    };

    return (
        <div className="w-full max-w-2xl mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Four.meme {label}
                    </span>
                </div>
                <span className="text-xs text-muted-foreground">
                    {startIdx + 1}–{Math.min(endIdx, tokens.length)} of {totalAvailable}
                </span>
            </div>

            {/* Token Cards */}
            <div className="flex flex-col gap-2">
                {visibleTokens.map((token, index) => (
                    <a
                        key={token.address || startIdx + index}
                        href={token.url || `https://four.meme/token/${token.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3 rounded-xl bg-muted/40 border border-border/30 hover:border-yellow-500/40 hover:bg-muted/70 transition-all duration-200 cursor-pointer"
                    >
                        {/* Rank Badge (if available) */}
                        {token.rank && (
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-yellow-500/15 text-yellow-500 text-[10px] font-bold">
                                {token.rank}
                            </div>
                        )}

                        {/* Token Image */}
                        <div className="relative flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-muted border border-border/40">
                            {token.image ? (
                                <ImageAny
                                    src={token.image}
                                    alt={token.name || "Token"}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                    onError={(e: any) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                    unoptimized
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                                    {token.symbol?.charAt(0) || "?"}
                                </div>
                            )}
                            {/* Graduated badge */}
                            {token.is_graduated && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-yellow-500 rounded-full border-2 border-background flex items-center justify-center">
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </div>

                        {/* Token Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-sm text-foreground truncate">
                                    {token.name}
                                </span>
                                <span className="text-xs text-muted-foreground flex-shrink-0">
                                    {token.symbol}
                                </span>
                                {token.is_graduated && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500 font-medium flex-shrink-0">
                                        DEX
                                    </span>
                                )}
                                {!token.is_graduated && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-500 font-medium flex-shrink-0">
                                        CURVE
                                    </span>
                                )}
                            </div>
                            {/* Address Row */}
                            <div className="flex items-center gap-1 mt-0.5 max-w-[140px] sm:max-w-none">
                                <span className="text-[11px] text-muted-foreground font-mono truncate">
                                    {token.address}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleCopyAddress(token.address);
                                    }}
                                    className="flex-shrink-0 p-0.5 hover:bg-muted rounded transition-colors"
                                    title="Copy address"
                                >
                                    {copiedAddr === token.address ? (
                                        <svg className="w-3 h-3 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {/* Progress bar (for bonding curve tokens) */}
                            {token.progress && !token.is_graduated && (
                                <div className="mt-1 w-full max-w-[120px]">
                                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full transition-all duration-300"
                                            style={{ width: token.progress }}
                                        />
                                    </div>
                                    <span className="text-[9px] text-muted-foreground">{token.progress}</span>
                                </div>
                            )}
                        </div>

                        {/* Price & Market Info */}
                        <div className="flex-shrink-0 text-right">
                            <div className="text-sm font-semibold text-foreground">
                                {token.price_usd || "N/A"}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                {token.market_cap && token.market_cap !== "N/A" ? (
                                    <span className="text-yellow-500">MCap: {token.market_cap}</span>
                                ) : null}
                            </div>
                            {token.volume_24h && token.volume_24h !== "N/A" && (
                                <div className="text-[10px] text-muted-foreground">
                                    Vol: {token.volume_24h}
                                </div>
                            )}
                            {(token.holder_count !== undefined && token.holder_count > 0) && (
                                <div className="text-[10px] text-muted-foreground">
                                    {token.holder_count} holders
                                </div>
                            )}
                        </div>
                    </a>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 px-1">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hidden sm:inline">Prev</span>
                    </button>

                    {/* Desktop: Page Numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i)
                            .filter(i => {
                                return i === 0 || i === totalPages - 1 || Math.abs(page - i) <= 1;
                            })
                            .map((i, index, array) => {
                                const prev = array[index - 1];
                                const showEllipsis = prev !== undefined && i - prev > 1;

                                return (
                                    <React.Fragment key={i}>
                                        {showEllipsis && <span className="text-muted-foreground/40 text-xs px-1">...</span>}
                                        <button
                                            onClick={() => setPage(i)}
                                            className={`w-7 h-7 text-xs font-medium rounded-lg transition-all duration-200 ${i === page
                                                ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30"
                                                : "text-muted-foreground hover:bg-muted/60 border border-transparent"
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    </React.Fragment>
                                );
                            })}
                    </div>

                    {/* Mobile: Simple "Page X of Y" */}
                    <div className="sm:hidden text-xs text-muted-foreground font-medium">
                        Page {page + 1} of {totalPages}
                    </div>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border/40 bg-muted/30 hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        <span className="hidden sm:inline">Next</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    );
};

export default FourMemeTokenSearch;
