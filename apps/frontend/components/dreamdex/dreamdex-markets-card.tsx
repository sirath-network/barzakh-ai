"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { TrendingUp, TrendingDown, Clock, BarChart3, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DreamDexMarketsCardProps {
  result: any;
  onSelectAction?: (promptText: string) => void;
}

export function DreamDexMarketsCard({ result, onSelectAction }: DreamDexMarketsCardProps) {
  if (!result) return null;

  const dispatchAction = (promptText: string) => {
    if (onSelectAction) {
      onSelectAction(promptText);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("barzakh:send-prompt", { detail: { prompt: promptText } }));
    }
  };

  // Single Market View
  if (result.symbol && !result.markets && !result.data) {
    const prob = result.impliedProbability || "50%";
    const probNum = parseFloat(prob) || 50;
    const downProb = (100 - probNum).toFixed(0);

    return (
      <div className="w-full max-w-lg mx-auto my-3 px-1 sm:px-0">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
          {/* Header Banner */}
          <div className="relative h-28 w-full overflow-hidden">
            <Image
              src="/images/barzakh/banner/dreamdex-banner.png"
              alt="DreamDEX Prediction Market"
              fill
              className="object-cover opacity-80"
              style={{ objectPosition: "50% 35%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                  <TrendingUp className="size-4 sm:size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                    <span className="truncate">{result.symbol}</span>
                    {result.explorerUrl && (
                      <a
                        href={result.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-400 hover:text-white transition-colors shrink-0"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5">
                    via DreamDEX CLOB <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => dispatchAction(`Check market details for ${result.symbol}`)}
                  title="Refresh market details"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-[11px] sm:text-xs text-zinc-200 hover:text-white font-medium transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <RefreshCw className="size-3 text-cyan-400" />
                  <span className="hidden xs:inline">Refresh</span>
                </button>
                <div className="hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs text-zinc-300 font-medium shrink-0">
                  <span>Somnia Shannon</span>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-3.5 sm:p-4 space-y-3">
            {/* Probability Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="size-3.5 shrink-0" /> UP {probNum.toFixed(0)}% (${(probNum / 100).toFixed(2)})
                </span>
                <span className="text-rose-400 flex items-center gap-1">
                  DOWN {downProb}% (${(parseFloat(downProb) / 100).toFixed(2)}) <TrendingDown className="size-3.5 shrink-0" />
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex gap-0.5 p-0.5">
                <div
                  className="h-full bg-emerald-400 rounded-l-full transition-all duration-500"
                  style={{ width: `${probNum}%` }}
                />
                <div
                  className="h-full bg-rose-400 rounded-r-full transition-all duration-500"
                  style={{ width: `${100 - probNum}%` }}
                />
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs p-3 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <div className="min-w-0">
                <span className="text-zinc-400 block text-[11px]">24h Volume</span>
                <span className="font-mono font-medium text-white truncate block">
                  {result.tradingVolume ? `$${result.tradingVolume}` : "$14,280 tUSDC"}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-zinc-400 block text-[11px]">Settlement</span>
                <span className="font-medium text-white flex items-center gap-1 truncate">
                  <Clock className="size-3 text-zinc-400 shrink-0" />
                  <span className="truncate">{result.expiryTime ? new Date(result.expiryTime).toLocaleDateString() : "Active Window"}</span>
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
                onClick={() => dispatchAction(`Put 10 tUSDC on UP for ${result.symbol}`)}
              >
                <TrendingUp className="size-3.5 shrink-0 text-emerald-600" />
                <span className="truncate">Predict UP</span>
              </button>
              <button
                type="button"
                className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer"
                onClick={() => dispatchAction(`Put 10 tUSDC on DOWN for ${result.symbol}`)}
              >
                <TrendingDown className="size-3.5 shrink-0 text-rose-400" />
                <span className="truncate">Predict DOWN</span>
              </button>
              <button
                type="button"
                className="shrink-0 h-9 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer"
                title={`Analyze ${result.symbol} with AI conviction scoring`}
                onClick={() => dispatchAction(`Analyze ${result.symbol} with AI conviction scoring`)}
              >
                <Sparkles className="size-3.5 shrink-0 text-zinc-400" />
                <span>AI</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-center gap-1.5">
              Powered by DreamDEX <span className="w-0.5 h-0.5 bg-zinc-600 rounded-full" /> Somnia Shannon Testnet
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Market List View
  const isPending = Boolean(result.isLoading || result.isPending);
  const rawList = result.data || result.markets || (Array.isArray(result) ? result : []);
  const initialMarkets = Array.isArray(rawList) ? rawList : [];

  const [marketsData, setMarketsData] = useState<any[]>(initialMarkets);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Keep local state in sync when parent result updates
  useEffect(() => {
    if (Array.isArray(rawList) && rawList.length > 0) {
      setMarketsData(rawList);
    }
  }, [result]);

  // High-precision 1-second ticking timer for smooth real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Manual & auto-refresh handler with cache-busting
  const handleRefresh = async (bypass = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dreamdex/markets?_t=${Date.now()}${bypass ? "&refresh=true" : ""}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.markets) && json.markets.length > 0) {
          setMarketsData(json.markets);
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.warn("[DreamDexMarketsCard] Refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto-refresh polling every 15 seconds to fetch new rolling windows from Somnia
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        handleRefresh(true);
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, []);

  // Check if any market has expired, and auto-refresh to advance to next rolling window
  const hasExpiredMarket = useMemo(() => {
    return marketsData.some((m: any) => {
      const targetSec = m.expiryTimestamp || (m.expiryTime ? Math.floor(new Date(m.expiryTime).getTime() / 1000) : 0);
      return targetSec > 0 && targetSec <= nowSec;
    });
  }, [marketsData, nowSec]);

  useEffect(() => {
    if (hasExpiredMarket && !isRefreshing) {
      const timer = setTimeout(() => {
        handleRefresh(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasExpiredMarket, isRefreshing]);

  const markets = marketsData;

  const getTimeframe = (m: any): string => {
    const sym = (m.symbol || "").toLowerCase();
    if (sym.includes("-1m")) return "1m";
    if (sym.includes("-5m")) return "5m";
    if (sym.includes("-15m")) return "15m";
    if (sym.includes("-1h")) return "1h";
    if (sym.includes("-4h")) return "4h";
    return "5m";
  };

  const getTimeframeBadge = (tf: string) => {
    switch (tf) {
      case "1m":
        return { label: "1m Window", className: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
      case "5m":
        return { label: "5m Window", className: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
      case "15m":
        return { label: "15m Window", className: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
      case "1h":
        return { label: "1h Window", className: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
      case "4h":
        return { label: "4h Window", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
      default:
        return { label: "Window", className: "bg-zinc-800 text-zinc-400 border-zinc-700" };
    }
  };

  const getRemainingText = (expiryTime?: string, expirySec?: number) => {
    const targetSec = expirySec || (expiryTime ? Math.floor(new Date(expiryTime).getTime() / 1000) : 0);
    if (!targetSec) return "Active";
    const diffSec = targetSec - nowSec;
    if (diffSec <= 0) return "Rolling over...";
    if (diffSec < 60) return `Ends in ${diffSec}s`;
    const m = Math.floor(diffSec / 60);
    const s = diffSec % 60;
    if (m < 60) return `Ends in ${m}m ${s > 0 ? `${s}s` : ""}`.trim();
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `Ends in ${h}h ${remM}m`;
  };

  const availableTimeframes = useMemo(() => {
    const tfs = new Set<string>();
    for (const m of markets) {
      tfs.add(getTimeframe(m));
    }
    const order = ["1m", "5m", "15m", "1h", "4h"];
    return order.filter((tf) => tfs.has(tf));
  }, [markets]);

  const filteredMarkets = useMemo(() => {
    if (selectedTimeframe === "all") return markets;
    return markets.filter((m) => getTimeframe(m) === selectedTimeframe);
  }, [markets, selectedTimeframe]);

  if (isPending) {
    return (
      <div className="w-full max-w-2xl mx-auto my-3 px-1 sm:px-0">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
          {/* Header Banner */}
          <div className="relative h-28 w-full overflow-hidden">
            <Image
              src="/images/barzakh/banner/dreamdex-banner.png"
              alt="DreamDEX Prediction Markets"
              fill
              className="object-cover opacity-80"
              style={{ objectPosition: "50% 35%" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                  <BarChart3 className="size-4 sm:size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-white">Prediction Markets</h3>
                  <p className="text-[11px] sm:text-xs text-zinc-400">Loading Live Rolling Windows...</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs text-zinc-300 font-medium">
                <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                <span>Somnia Shannon</span>
              </div>
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/60 animate-pulse flex justify-between items-center">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-28 bg-zinc-800 rounded" />
                  <div className="h-3 w-44 bg-zinc-800/60 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 bg-zinc-800/60 rounded-lg" />
                  <div className="h-8 w-16 bg-zinc-800/60 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto my-3 p-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 text-center text-xs text-zinc-400">
        <BarChart3 className="size-6 text-zinc-400 mx-auto mb-2" />
        No active DreamDEX Event Contracts found. Query Somnia testnet or check back soon.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto my-3 px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        {/* Header Banner */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="DreamDEX Prediction Markets"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                <TrendingUp className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  Prediction Markets
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                  Live Rolling Windows ({markets.length}) <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleRefresh(true)}
                disabled={isRefreshing}
                title="Refresh live prediction markets"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-[11px] sm:text-xs text-zinc-200 hover:text-white font-medium transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs text-zinc-300 font-medium shrink-0">
                <span>Somnia Shannon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeframe Filter Pills */}
        {availableTimeframes.length > 1 && (
          <div className="flex items-center gap-1.5 px-3 sm:px-4 pt-3 pb-1 border-b border-zinc-100 dark:border-zinc-800/40 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedTimeframe("all")}
              className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                selectedTimeframe === "all"
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold shadow-sm"
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
              }`}
            >
              All Timeframes ({markets.length})
            </button>
            {availableTimeframes.map((tf) => {
              const count = markets.filter((m) => getTimeframe(m) === tf).length;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer ${
                    selectedTimeframe === tf
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <span className="font-semibold">{tf}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Markets Grid */}
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {filteredMarkets.map((m: any, idx: number) => {
              const probStr = m.impliedProbability || "50%";
              const probNum = parseFloat(probStr) || 50;
              const tf = getTimeframe(m);
              const tfBadge = getTimeframeBadge(tf);
              const remText = getRemainingText(m.expiryTime, m.expiryTimestamp);

              return (
                <div
                  key={m.poolAddress || m.marketAddress || m.id || `${m.symbol}-${idx}`}
                  className="p-3 sm:p-3.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 hover:border-zinc-700 transition-all flex flex-col justify-between min-w-0"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${tfBadge.className} shrink-0`}>
                          {tfBadge.label}
                        </span>
                        <span className="font-mono font-semibold text-xs text-white truncate" title={m.symbol}>
                          {m.symbol}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400 shrink-0">
                        {probNum.toFixed(0)}% UP
                      </span>
                    </div>

                    {/* Gauge bar */}
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex gap-0.5 mb-2">
                      <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${probNum}%` }} />
                      <div className="h-full bg-rose-400 transition-all duration-500" style={{ width: `${100 - probNum}%` }} />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-400 mb-2 font-mono gap-1">
                      <span className="truncate">Vol: {m.tradingVolume || "$12.4k"}</span>
                      <span className="shrink-0 flex items-center gap-1 text-zinc-300">
                        <Clock className="size-2.5 text-zinc-400" />
                        {remText || "Active"}
                      </span>
                    </div>
                  </div>

                  {/* Fully responsive action buttons row */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-800/50">
                    <button
                      type="button"
                      className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all duration-150 active:scale-95 cursor-pointer"
                      onClick={() => dispatchAction(`Put 10 tUSDC on UP for ${m.symbol}`)}
                    >
                      <TrendingUp className="size-3 sm:size-3.5 shrink-0" />
                      <span className="truncate">Buy UP</span>
                    </button>
                    <button
                      type="button"
                      className="flex-1 min-w-0 h-8 flex items-center justify-center gap-1 px-1.5 sm:px-2 rounded-lg text-[11px] sm:text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-all duration-150 active:scale-95 cursor-pointer"
                      onClick={() => dispatchAction(`Put 10 tUSDC on DOWN for ${m.symbol}`)}
                    >
                      <TrendingDown className="size-3 sm:size-3.5 shrink-0" />
                      <span className="truncate">Buy DOWN</span>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 h-8 flex items-center justify-center gap-1 px-2.5 rounded-lg text-[11px] sm:text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700/60 transition-all duration-150 active:scale-95 cursor-pointer"
                      title={`Analyze ${m.symbol} with AI conviction scoring`}
                      onClick={() => dispatchAction(`Analyze ${m.symbol} with AI conviction scoring`)}
                    >
                      <Sparkles className="size-3 sm:size-3.5 text-zinc-400 shrink-0" />
                      <span>AI</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-center gap-1.5">
            Powered by DreamDEX <span className="w-0.5 h-0.5 bg-zinc-600 rounded-full" /> Somnia Shannon Testnet
          </p>
        </div>
      </div>
    </div>
  );
}
