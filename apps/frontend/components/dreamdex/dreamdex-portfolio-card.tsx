"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  BarChart3,
  Coins,
  Layers,
  History,
  Sparkles,
  RotateCw,
  Clock,
  Timer,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Position {
  market?: string;
  marketName?: string;
  symbol?: string;
  marketSymbol?: string;
  side: string;
  quantity: number;
  entryPrice?: number;
  currentPrice?: number;
  currentValue?: number | string;
  unrealizedPnL?: number | string;
  pnl?: number | string;
  pnlFormatted?: string;
  pnlPercentage?: string;
  payout?: string;
  outcome?: string;
  isWinner?: boolean;
  isRedeemed?: boolean;
  claimable?: boolean;
  status?: string;
  txHash?: string;
  claimed?: boolean;
  timeframe?: string;
  expiryTimestamp?: number;
  expiryTime?: string;
  spotPrice?: number;
  strikePrice?: number;
  createdAt?: string;
  settledAt?: string;
  closedAt?: string;
}

interface PortfolioResult {
  address?: string;
  walletAddress?: string;
  totalInvested?: number | string;
  totalPnL?: number | string;
  winRate?: number | string;
  totalTrades?: number;
  positions?: Position[];
  resolvedPositions?: Position[];
  history?: Position[];
  explorerUrl?: string;
  portfolio?: {
    activePositions?: Position[];
    openOrders?: Position[];
    resolvedPositions?: Position[];
    summary?: {
      totalInvested?: string;
      totalPnL?: string;
      winRate?: string;
      totalTrades?: number;
    };
  };
}

interface DreamDexPortfolioCardProps {
  result: PortfolioResult | any;
  onSelectAction?: (promptText: string) => void;
}

export function DreamDexPortfolioCard({ result, onSelectAction }: DreamDexPortfolioCardProps) {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "WON" | "LOST" | "REFUNDED" | "CLOSED">("ALL");
  const [portfolioData, setPortfolioData] = useState<any>(result);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [closedKeys, setClosedKeys] = useState<Set<string>>(new Set());

  const isPositionClosed = (p: Position | any): boolean => {
    if (!p) return false;
    const pool = (p.poolAddress || "").toLowerCase();
    const sym = (p.market || p.marketName || p.symbol || p.marketSymbol || "").toLowerCase();
    const side = (p.side || "").toLowerCase();
    const sideNorm = side.includes("down") || side.includes("no") ? "down" : "up";

    for (const key of closedKeys) {
      if (pool && key.includes(pool)) return true;
      if (sym && (key.includes(sym) || sym.includes(key.split("-")[0])) && key.includes(sideNorm)) return true;
    }
    return false;
  };

  // Keep local state in sync when parent result updates, respecting closed positions
  useEffect(() => {
    if (result) {
      if (closedKeys.size > 0) {
        const rawAct = result.positions || result.activePositions || result.portfolio?.activePositions || [];
        const filteredAct = (Array.isArray(rawAct) ? rawAct : []).filter((p: any) => !isPositionClosed(p));
        setPortfolioData({
          ...result,
          positions: filteredAct,
          activePositions: filteredAct,
          portfolio: {
            ...result.portfolio,
            activePositions: filteredAct,
          },
        });
      } else {
        setPortfolioData(result);
      }
    }
  }, [result, closedKeys]);

  // If mounted with empty or missing data, auto-trigger a fresh load
  useEffect(() => {
    if (
      !portfolioData ||
      (!portfolioData.positions && !portfolioData.portfolio && !portfolioData.resolvedPositions)
    ) {
      handleRefresh(true);
    }
  }, []);

  const dispatchAction = (promptText: string) => {
    if (onSelectAction) {
      onSelectAction(promptText);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("barzakh:send-prompt", { detail: { prompt: promptText } }));
    }
  };

  const address = portfolioData?.address || portfolioData?.walletAddress || result?.address || result?.walletAddress || "0xcE63...aB1d";
  const displayAddress = address.length > 14
    ? `${address.slice(0, 6)} ... ${address.slice(-4)}`
    : address;

  const explorerUrl = portfolioData?.explorerUrl || result?.explorerUrl || (
    address
      ? `https://shannon-explorer.somnia.network/address/${address}`
      : "https://shannon-explorer.somnia.network/address/0xcE6327fFb8329303e6D2db4d274D80F7337daB1d"
  );

  // Manual refresh handler with cache-busting
  const handleRefresh = async (bypass = false) => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/dreamdex/portfolio?address=${address}&_t=${Date.now()}${bypass ? "&refresh=true" : ""}`, {
        cache: "no-store",
        headers: { "Pragma": "no-cache", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.portfolio) {
          const fresh = json.portfolio;
          const rawAct = fresh.positions || fresh.activePositions || fresh.portfolio?.activePositions || [];
          const filteredAct = (Array.isArray(rawAct) ? rawAct : []).filter((p: any) => !isPositionClosed(p));
          setPortfolioData({
            ...fresh,
            positions: filteredAct,
            activePositions: filteredAct,
            portfolio: {
              ...fresh.portfolio,
              activePositions: filteredAct,
            },
          });
          setLastRefreshed(new Date());
        }
      }
    } catch (err) {
      console.error("[DreamDexPortfolioCard] Refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Track locally redeemed positions with their txHashes for optimistic UI updates (persisted across reloads and messages)
  const getStorageKey = (addr?: string) => `dreamdex_redeemed_${(addr || address || "default").toLowerCase()}`;

  const [redeemedTxMap, setRedeemedTxMap] = useState<Map<string, string>>(() => {
    if (typeof window === "undefined") return new Map();
    try {
      const key = `dreamdex_redeemed_${(result?.address || result?.walletAddress || "default").toLowerCase()}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return new Map(Object.entries(JSON.parse(stored)));
      }
    } catch {}
    return new Map();
  });

  const updateRedeemedTxMap = (updater: (prev: Map<string, string>) => Map<string, string>) => {
    setRedeemedTxMap((prev) => {
      const next = updater(prev);
      if (typeof window !== "undefined") {
        try {
          const obj = Object.fromEntries(next);
          localStorage.setItem(getStorageKey(address), JSON.stringify(obj));
        } catch {}
      }
      return next;
    });
  };

  // Sync with localStorage when address updates
  useEffect(() => {
    if (typeof window !== "undefined" && address) {
      try {
        const stored = localStorage.getItem(getStorageKey(address));
        if (stored) {
          const parsed = JSON.parse(stored);
          setRedeemedTxMap((prev) => {
            const next = new Map(prev);
            for (const [k, v] of Object.entries(parsed)) {
              if (v || !next.has(k)) {
                next.set(k, v as string);
              }
            }
            return next;
          });
        }
      } catch {}
    }
  }, [address]);

  // Listen for redemption events dispatched by DreamDexTradeCard after a successful redeem
  useEffect(() => {
    const onRedeemed = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const tx = detail?.txHash || "";
      const sym = (detail?.marketSymbol || "").toLowerCase();
      const pool = (detail?.poolAddress || "").toLowerCase();
      const isAll = detail?.isRedeemAll || !sym || sym.includes("all") || sym.includes("winning");

      updateRedeemedTxMap((prev) => {
        const next = new Map(prev);
        if (isAll) {
          next.set("__all__", tx);
        }
        if (sym) next.set(sym, tx);
        if (pool) next.set(pool, tx);
        return next;
      });
      // Force an immediate cache-busting refresh
      handleRefresh(true);
    };
    window.addEventListener("barzakh:dreamdex-redeemed", onRedeemed);
    return () => window.removeEventListener("barzakh:dreamdex-redeemed", onRedeemed);
  }, [address]);

  const isPositionLocallyRedeemed = (pos: Position | any): boolean => {
    if (pos?.isRedeemed || pos?.status === "Redeemed" || pos?.claimed) return true;
    if (redeemedTxMap.size === 0) return false;
    if (redeemedTxMap.has("__all__")) return true;
    const pool = (pos.poolAddress || "").toLowerCase();
    const sym = (pos.market || pos.marketName || pos.symbol || pos.marketSymbol || "").toLowerCase();
    if (pool && redeemedTxMap.has(pool)) return true;
    if (sym && redeemedTxMap.has(sym)) return true;
    for (const [key] of redeemedTxMap) {
      if (key !== "__all__" && sym && (sym.includes(key) || key.includes(sym))) return true;
    }
    return false;
  };

  const getLocalRedeemedTx = (pos: Position | any): string | undefined => {
    if (pos.txHash) return pos.txHash;
    if (redeemedTxMap.size === 0) return undefined;
    const pool = (pos.poolAddress || "").toLowerCase();
    const sym = (pos.market || pos.marketName || pos.symbol || pos.marketSymbol || "").toLowerCase();
    if (pool && redeemedTxMap.get(pool)) return redeemedTxMap.get(pool);
    if (sym && redeemedTxMap.get(sym)) return redeemedTxMap.get(sym);
    if (redeemedTxMap.get("__all__")) return redeemedTxMap.get("__all__");
    for (const [key, tx] of redeemedTxMap) {
      if (key !== "__all__" && tx && sym && (sym.includes(key) || key.includes(sym))) return tx;
    }
    return undefined;
  };

  const [closingPosKey, setClosingPosKey] = useState<string | null>(null);

  // Early exit handler: closes active position immediately on-chain
  const handleClosePosition = async (pos: Position) => {
    const sym = pos.market || pos.marketName || pos.symbol || pos.marketSymbol || "";
    const key = `${sym}-${pos.side}`;
    if (closingPosKey) return;
    setClosingPosKey(key);

    try {
      const res = await fetch("/api/dreamdex/close-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketSymbol: sym,
          pool: (pos as any).poolAddress,
          quantity: pos.quantity,
          side: pos.side?.toLowerCase().includes("up") ? "sell_up" : "sell_down",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const poolAddr = ((pos as any).poolAddress || "").toLowerCase();
        const sideNorm = (pos.side || "").toLowerCase().includes("down") ? "down" : "up";
        const symNorm = sym.toLowerCase();

        setClosedKeys((prev) => {
          const next = new Set(prev);
          if (poolAddr) next.add(`${poolAddr}-${sideNorm}`);
          if (symNorm) next.add(`${symNorm}-${sideNorm}`);
          return next;
        });

        // Optimistically remove closed position from active list in local state immediately
        // and move it to resolved positions as "Closed Early"
        setPortfolioData((prev: any) => {
          if (!prev) return prev;
          const currentActive = prev.positions || prev.activePositions || prev.portfolio?.activePositions || [];
          const updatedActive = currentActive.filter((p: any) => {
            const pPool = (p.poolAddress || "").toLowerCase();
            const pSym = (p.market || p.marketName || p.symbol || p.marketSymbol || "").toLowerCase();
            const pSide = (p.side || "").toLowerCase();
            const pSideNorm = pSide.includes("down") || pSide.includes("no") ? "down" : "up";

            if (poolAddr && pPool && poolAddr === pPool) return false;
            if ((pSym === symNorm || pSym.startsWith(symNorm) || symNorm.startsWith(pSym)) && pSideNorm === sideNorm) return false;
            return true;
          });

          const currentResolved = prev.resolvedPositions || prev.portfolio?.resolvedPositions || prev.history || [];
          const newClosedPosition = {
            market: sym,
            marketId: (pos as any).poolAddress || `${sym}-closed`,
            marketSymbol: sym,
            poolAddress: (pos as any).poolAddress,
            side: pos.side,
            quantity: pos.quantity,
            outcome: "CLOSED",
            pnl: 0,
            pnlFormatted: "$0.00 tUSDC",
            pnlPercentage: "0.0%",
            payout: `$${((pos.quantity || 20) * 0.5).toFixed(2)} tUSDC`,
            status: "Closed Early",
            timeframe: (pos as any).timeframe || "5m",
            closedAt: new Date().toISOString(),
            txHash: data.txHash || data.transactionHash,
            explorerUrl: data.explorerUrl,
          };

          const updatedResolved = [newClosedPosition, ...currentResolved];

          return {
            ...prev,
            positions: updatedActive,
            activePositions: updatedActive,
            resolvedPositions: updatedResolved,
            portfolio: {
              ...prev.portfolio,
              activePositions: updatedActive,
              resolvedPositions: updatedResolved,
            },
          };
        });

        // Background refresh to sync state with server
        await handleRefresh(true);
      } else {
        const errMsg = data?.error || "Failed to close position";
        console.warn("[DreamDexPortfolioCard] Early exit notice:", errMsg);
        await handleRefresh(true);
        if (
          !errMsg.includes("No active contracts") &&
          !errMsg.includes("ended") &&
          !errMsg.includes("expired") &&
          !errMsg.includes("Insufficient")
        ) {
          dispatchAction(`Close my position on ${sym}`);
        }
      }
    } catch (e) {
      await handleRefresh(true);
    } finally {
      setClosingPosKey(null);
    }
  };

  // Auto-refresh polling every 15 seconds (keeps both active bets and settled history up to date)
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        handleRefresh();
      }
    }, 15_000);
    return () => clearInterval(timer);
  }, [address]);

  if (!portfolioData) {
    return (
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Wallet className="size-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">DreamDEX Portfolio</h3>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Somnia Shannon</span>
        </div>
        <div className="p-8 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex flex-col items-center justify-center gap-2.5 text-center">
          <RotateCw className="size-5 text-cyan-400 animate-spin" />
          <p className="text-xs font-medium text-zinc-300">Fetching live DreamDEX portfolio from Somnia Shannon...</p>
        </div>
      </div>
    );
  }

  const isPending = Boolean(portfolioData?.isLoading || portfolioData?.isPending);

  // Extract Summary KPIs
  const summary = portfolioData.portfolio?.summary || {};
  const totalInvested = portfolioData.totalInvested ?? summary.totalInvested ?? "$0.00 tUSDC";
  const totalPnL = portfolioData.totalPnL ?? summary.totalPnL ?? "$0.00 tUSDC";
  const winRate = portfolioData.winRate ?? summary.winRate ?? "0.0%";
  const totalTrades = portfolioData.totalTrades ?? summary.totalTrades ?? 0;

  // Extract Active Positions (filtering out any locally closed positions)
  const rawActive = portfolioData.positions || portfolioData.activePositions || portfolioData.portfolio?.activePositions || [];
  const rawOpenOrders = portfolioData.openOrders || portfolioData.portfolio?.openOrders || [];
  const activePositions: Position[] = [
    ...(Array.isArray(rawActive) ? rawActive : []),
    ...(Array.isArray(rawOpenOrders) ? rawOpenOrders : []),
  ].filter((p) => !isPositionClosed(p));

  // Extract Resolved History with local redeemed override
  const rawResolved = portfolioData.resolvedPositions || portfolioData.history || portfolioData.portfolio?.resolvedPositions || [];
  const resolvedPositions: Position[] = (Array.isArray(rawResolved) ? rawResolved : []).map((p: any) => {
    if (isPositionLocallyRedeemed(p)) {
      return {
        ...p,
        isRedeemed: true,
        claimed: true,
        claimable: false,
        status: "Redeemed",
        txHash: p.txHash || getLocalRedeemedTx(p),
      };
    }
    return p;
  });

  // Categorize positions for filtering
  const getPositionCategory = (pos: Position) => {
    const isRefunded = pos.outcome === "REFUNDED" || pos.status === "Refunded";
    if (isRefunded) return "REFUNDED";
    const isClosedEarly = pos.outcome === "CLOSED" || pos.status === "Closed Early";
    if (isClosedEarly) return "CLOSED";
    const isExpired = pos.outcome === "EXPIRED" || pos.status === "Expired";
    if (pos.outcome === "LOST" || pos.isWinner === false) return "LOST";
    const pnlVal = typeof pos.pnl === "number" ? pos.pnl : parseFloat(String(pos.pnl || "0").replace(/[^0-9.-]/g, "")) || 0;
    const won = !isExpired && (pos.outcome === "WON" || pos.isWinner === true || pnlVal > 0);
    if (won) return "WON";
    return "LOST";
  };

  const wonCount = resolvedPositions.filter((p) => getPositionCategory(p) === "WON").length;
  const lostCount = resolvedPositions.filter((p) => getPositionCategory(p) === "LOST").length;
  const refundedCount = resolvedPositions.filter((p) => getPositionCategory(p) === "REFUNDED").length;
  const closedCount = resolvedPositions.filter((p) => getPositionCategory(p) === "CLOSED").length;

  const filteredHistoryPositions = resolvedPositions.filter((p) => {
    if (historyFilter === "ALL") return true;
    return getPositionCategory(p) === historyFilter;
  });

  const filterTabs: Array<{
    key: "ALL" | "WON" | "LOST" | "REFUNDED" | "CLOSED";
    label: string;
    count: number;
    activeClass: string;
    badgeActiveClass: string;
    hoverClass: string;
  }> = [
    {
      key: "ALL",
      label: "All",
      count: resolvedPositions.length,
      activeClass: "bg-white text-black font-semibold shadow-sm",
      badgeActiveClass: "bg-zinc-200 text-zinc-900 font-bold",
      hoverClass: "hover:text-white hover:bg-zinc-800/60",
    },
    {
      key: "WON",
      label: "Won",
      count: wonCount,
      activeClass: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold shadow-[0_0_10px_rgba(52,211,153,0.15)]",
      badgeActiveClass: "bg-emerald-500/30 text-emerald-300 font-bold",
      hoverClass: "hover:text-emerald-300 hover:bg-emerald-500/10",
    },
    {
      key: "LOST",
      label: "Lost",
      count: lostCount,
      activeClass: "bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold shadow-[0_0_10px_rgba(244,63,94,0.15)]",
      badgeActiveClass: "bg-rose-500/30 text-rose-300 font-bold",
      hoverClass: "hover:text-rose-300 hover:bg-rose-500/10",
    },
    {
      key: "REFUNDED",
      label: "Refunded",
      count: refundedCount,
      activeClass: "bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold shadow-[0_0_10px_rgba(59,130,246,0.15)]",
      badgeActiveClass: "bg-blue-500/30 text-blue-300 font-bold",
      hoverClass: "hover:text-blue-300 hover:bg-blue-500/10",
    },
  ];

  if (closedCount > 0) {
    filterTabs.push({
      key: "CLOSED",
      label: "Closed Early",
      count: closedCount,
      activeClass: "bg-amber-500/20 text-amber-400 border border-amber-500/40 font-semibold shadow-[0_0_10px_rgba(245,158,11,0.15)]",
      badgeActiveClass: "bg-amber-500/30 text-amber-300 font-bold",
      hoverClass: "hover:text-amber-300 hover:bg-amber-500/10",
    });
  }

  const isPositivePnL = String(totalPnL).startsWith("+");

  // Format Timeframe Badge
  const formatTimeframe = (tf?: string, sym?: string) => {
    const clean = (tf || "").toLowerCase();
    if (clean.includes("4h") || sym?.includes("-4h")) {
      return { label: "4h Window", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
    }
    if (clean.includes("1h") || sym?.includes("-1h")) {
      return { label: "1h Window", color: "bg-sky-500/10 text-sky-400 border-sky-500/30" };
    }
    if (clean.includes("15m") || sym?.includes("-15m")) {
      return { label: "15m Window", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    }
    if (clean.includes("5m") || sym?.includes("-5m")) {
      return { label: "5m Window", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    }
    if (clean.includes("1m") || sym?.includes("-1m")) {
      return { label: "1m Window", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    }
    return { label: "Rolling Window", color: "bg-zinc-800 text-zinc-400 border-zinc-700" };
  };

  // Format Expiry countdown
  const formatExpiry = (expirySec?: number) => {
    if (!expirySec) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    const diff = expirySec - nowSec;
    if (diff <= 0) return { text: "Resolving...", isUrgent: true };
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) return { text: `Ends in ${h}h ${remM}m`, isUrgent: false };
    if (m > 0) return { text: `Ends in ${m}m ${s}s`, isUrgent: m < 5 };
    return { text: `Ends in ${s}s`, isUrgent: true };
  };

  // Format Relative Placed Time
  const formatRelativeTime = (isoOrStr?: string) => {
    if (!isoOrStr) return null;
    try {
      const t = new Date(isoOrStr).getTime();
      if (isNaN(t)) return null;
      const diffMin = Math.round((Date.now() - t) / 60_000);
      if (diffMin < 1) return "Placed just now";
      if (diffMin < 60) return `Placed ${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Placed ${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return diffDays === 1 ? "Placed 1d ago" : `Placed ${diffDays}d ago`;
    } catch {
      return null;
    }
  };

  // Format Settled / Closed Timestamp with human friendly relative day
  const formatTimestamp = (isoOrStr?: string, prefix = "Settled") => {
    if (!isoOrStr) return null;
    try {
      const d = new Date(isoOrStr);
      if (isNaN(d.getTime())) return null;

      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();

      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      if (isToday) {
        return `${prefix} Today ${timeStr}`;
      }
      if (isYesterday) {
        return `${prefix} Yesterday ${timeStr}`;
      }
      const dateStr = d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      });
      return `${prefix} ${dateStr}, ${timeStr}`;
    } catch {
      return null;
    }
  };

  return (
    <div className="w-full max-w-lg sm:max-w-xl mx-auto my-3 px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        {/* Header Banner matching Screenshot 2 */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="DreamDEX Prediction Portfolio"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                <BarChart3 className="size-4 sm:size-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  <span>Prediction Portfolio</span>
                </h3>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors group mt-0.5 truncate"
                >
                  <span className="truncate">{displayAddress}</span>
                  <ExternalLink className="size-2.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                  <span className="size-1.5 rounded-full bg-emerald-400 ml-0.5 shrink-0" />
                </a>
              </div>
            </div>

            {/* Refresh Button & Network Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleRefresh(true)}
                disabled={isRefreshing}
                title="Refresh live portfolio & mark-to-market PnL"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-[10px] sm:text-xs text-zinc-300 hover:text-white border border-white/10 cursor-pointer disabled:opacity-50"
              >
                <RotateCw className={`size-3 text-cyan-400 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="font-medium">{isRefreshing ? "Updating..." : "Refresh"}</span>
              </button>

              <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs text-zinc-300 font-medium shrink-0">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Somnia Shannon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-4 space-y-3">
          {/* KPI Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <span className="text-[11px] text-zinc-400 block font-medium">Invested</span>
              {isPending ? (
                <div className="h-4 w-14 bg-zinc-800/80 animate-pulse rounded mt-1" />
              ) : (
                <span className="font-mono text-xs font-bold text-white block mt-0.5 truncate">
                  {String(totalInvested).replace(" tUSDC", "")} <span className="text-[10px] text-zinc-400 font-normal">tUSDC</span>
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <span className="text-[11px] text-zinc-400 block font-medium">Net P&L</span>
              {isPending ? (
                <div className="h-4 w-14 bg-zinc-800/80 animate-pulse rounded mt-1" />
              ) : (
                <span className={`font-mono text-xs font-bold block mt-0.5 truncate ${isPositivePnL ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]"}`}>
                  {String(totalPnL).replace(" tUSDC", "")} <span className="text-[10px] text-zinc-400 font-normal">tUSDC</span>
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <span className="text-[11px] text-zinc-400 block font-medium">Win Rate</span>
              {isPending ? (
                <div className="h-4 w-10 bg-zinc-800/80 animate-pulse rounded mt-1" />
              ) : (
                <span className="font-mono text-xs font-bold text-white block mt-0.5">
                  {winRate}
                </span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              <span className="text-[11px] text-zinc-400 block font-medium">Total Bets</span>
              {isPending ? (
                <div className="h-4 w-8 bg-zinc-800/80 animate-pulse rounded mt-1" />
              ) : (
                <span className="font-mono text-xs font-bold text-white block mt-0.5">
                  {totalTrades}
                </span>
              )}
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-1.5 p-1 rounded-xl bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/60">
            <button
              onClick={() => setActiveTab("active")}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "active"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="size-3.5 shrink-0" />
              <span className="truncate">Active Positions ({activePositions.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("history");
                handleRefresh(true);
              }}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <History className="size-3.5 shrink-0" />
              <span className="truncate">Win / Lose History ({resolvedPositions.length})</span>
            </button>
          </div>

          {/* Tab 1: Active Positions */}
          {activeTab === "active" && (
            <div className="space-y-2">
              {isPending ? (
                <div className="p-7 rounded-xl bg-zinc-950/40 border border-zinc-800/60 flex flex-col items-center justify-center gap-2.5 text-center">
                  <RotateCw className="size-5 text-cyan-400 animate-spin" />
                  <p className="text-xs font-medium text-zinc-300">Syncing live on-chain positions from Somnia Shannon...</p>
                  <p className="text-[11px] text-zinc-500 font-mono">DreamDEX CLOB • Instant Live View</p>
                </div>
              ) : activePositions.length === 0 ? (
                <div className="p-5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-center space-y-1">
                  <p className="text-xs font-medium text-zinc-300">No active positions open right now.</p>
                  <p className="text-[11px] text-zinc-500">All previous market windows have resolved. Check Win / Lose History or place a new bet on Live Markets!</p>
                </div>
              ) : (
                activePositions.map((pos, idx) => {
                  const isOpenOrder = pos.status === "Open";
                  const isUp = pos.side?.toLowerCase().includes("up");
                  const sym = pos.market || pos.marketName || pos.symbol || pos.marketSymbol || `Market #${idx + 1}`;
                  const tfInfo = formatTimeframe(pos.timeframe, sym);
                  const expiryInfo = formatExpiry(pos.expiryTimestamp);
                  const placedStr = formatRelativeTime(pos.createdAt);
                  const pnlStr = isOpenOrder ? "OPEN ORDER" : String(pos.unrealizedPnL || pos.pnl || "$0.00 tUSDC");
                  const isProfit = pnlStr.startsWith("+");
                  const isLoss = pnlStr.startsWith("-");
                  const pnlPct = pos.pnlPercentage ? `(${pos.pnlPercentage})` : "";

                  return (
                    <div
                      key={`${sym}-${idx}`}
                      className="p-3 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 space-y-2 hover:border-zinc-700/80 transition-colors"
                    >
                      {/* Top row: Symbol, Timeframe, Expiry countdown, Live PnL */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="font-mono font-semibold text-xs text-white">
                            {sym}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${tfInfo.color}`}>
                            {tfInfo.label}
                          </span>
                          {expiryInfo && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 ${
                              expiryInfo.isUrgent
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"
                                : "bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
                            }`}>
                              <Timer className="size-2.5" />
                              {expiryInfo.text}
                            </span>
                          )}
                          {placedStr && (
                            <span className="text-zinc-500 text-[10px] flex items-center gap-0.5 whitespace-nowrap">
                              <Clock className="size-2.5 text-zinc-500" /> {placedStr}
                            </span>
                          )}
                        </div>

                        {/* Real-time Dynamic PnL */}
                        <div className="text-right shrink-0">
                          <span className={`font-mono text-xs font-bold block ${
                            isProfit
                              ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]"
                              : isLoss
                              ? "text-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.3)]"
                              : "text-zinc-400"
                          }`}>
                            {pnlStr} <span className="text-[10px] font-normal">{pnlPct}</span>
                          </span>
                          {isOpenOrder ? (
                            <span className="text-[10px] text-amber-400 block font-medium">Awaiting fill</span>
                          ) : pos.currentPrice !== undefined && (
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              Mark: ${(pos.currentPrice).toFixed(2)} ({Math.round(pos.currentPrice * 100)}%)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom info row: Contracts, Entry, Placed time, Value & AI action */}
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center text-[11px] text-zinc-400 pt-1.5 border-t border-zinc-800/40 gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] flex items-center gap-0.5 shrink-0 ${
                            isUp ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {isUp ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                            {isUp ? "UP" : "DOWN"}
                          </span>
                          <span className="shrink-0">{pos.quantity} contracts</span>
                          {pos.entryPrice && <span className="shrink-0">• {isOpenOrder ? "Limit" : "Entry"}: ${Number(pos.entryPrice).toFixed(2)}</span>}
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                          <span className="font-mono text-zinc-300 shrink-0">
                            Value: {pos.currentValue || "$0.00 tUSDC"}
                          </span>
                          {!isOpenOrder && <button
                            type="button"
                            disabled={closingPosKey === `${sym}-${pos.side}`}
                            onClick={() => handleClosePosition(pos)}
                            title="Exit position early by selling back contracts at current mark price"
                            className="flex items-center gap-1 h-6 px-2 text-[10px] font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-md active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {closingPosKey === `${sym}-${pos.side}` ? (
                              <RotateCw className="size-2.5 animate-spin text-amber-400" />
                            ) : (
                              <Zap className="size-2.5 text-amber-400 fill-amber-400" />
                            )}
                            <span>{closingPosKey === `${sym}-${pos.side}` ? "Exiting..." : "Exit Early"}</span>
                          </button>}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-md active:scale-95 transition-all"
                            onClick={() => dispatchAction(`Analyze ${sym} with AI conviction scoring`)}
                          >
                            <Sparkles className="size-2.5 mr-1 text-cyan-400" /> AI
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Win / Lose History */}
          {activeTab === "history" && (
            <div className="space-y-2.5">
              {/* History Filter Chips Bar */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/60 overflow-x-auto">
                {filterTabs.map((tab) => {
                  const isActive = historyFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setHistoryFilter(tab.key)}
                      className={`flex-1 min-w-[65px] flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? tab.activeClass
                          : `text-zinc-400 border border-transparent ${tab.hoverClass}`
                      }`}
                    >
                      <span className="truncate">{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                          isActive
                            ? tab.badgeActiveClass
                            : "bg-zinc-800/80 text-zinc-400"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {filteredHistoryPositions.length === 0 ? (
                <div className="p-4 rounded-xl bg-zinc-950/40 border border-zinc-800 text-center text-xs text-zinc-400">
                  {resolvedPositions.length === 0
                    ? "No resolved prediction history yet. Settled markets will appear here automatically."
                    : `No ${historyFilter === "ALL" ? "" : historyFilter.toLowerCase()} positions found in this filter.`}
                </div>
              ) : (
                filteredHistoryPositions.map((pos, idx) => {
                  const isRefunded = pos.outcome === "REFUNDED" || pos.status === "Refunded";
                  const isClosedEarly = pos.outcome === "CLOSED" || pos.status === "Closed Early";
                  const isExpired = !isRefunded && !isClosedEarly && (pos.outcome === "EXPIRED" || pos.status === "Expired");
                  const pnlVal = typeof pos.pnl === "number" ? pos.pnl : parseFloat(String(pos.pnl || "0").replace(/[^0-9.-]/g, "")) || 0;
                  const won = !isRefunded && !isClosedEarly && !isExpired && pos.outcome !== "LOST" && pos.isWinner !== false && (pos.outcome === "WON" || pos.isWinner === true || pnlVal > 0);
                  const isClaimable = won && (pos.claimable === true || pos.status === "Claimable") && !pos.isRedeemed && pos.status !== "Redeemed" && !pos.claimed && !isPositionLocallyRedeemed(pos);
                  const sym = pos.market || pos.marketName || pos.symbol || pos.marketSymbol || `Market #${idx + 1}`;
                  const tfInfo = formatTimeframe(pos.timeframe, sym);
                  const placedStr = formatRelativeTime(pos.createdAt);
                  const settledOrClosedStr = formatTimestamp(
                    pos.closedAt || pos.settledAt,
                    isClosedEarly ? "Closed" : isRefunded ? "Refunded" : "Settled"
                  );

                  return (
                    <div
                      key={`${sym}-${idx}`}
                      className="p-3 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-semibold text-xs text-white">
                            {sym}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${tfInfo.color}`}>
                            {tfInfo.label}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            won
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : isClosedEarly
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : isRefunded
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                              : isExpired
                              ? "bg-zinc-800/80 text-zinc-400 border border-zinc-700/60"
                              : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                          }`}>
                            {won ? "WON" : isClosedEarly ? "CLOSED EARLY" : isRefunded ? "REFUNDED" : isExpired ? "EXPIRED" : "LOST"}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono text-xs font-bold ${
                            won
                              ? "text-emerald-400"
                              : isClosedEarly
                              ? (String(pos.pnl).startsWith("+") ? "text-emerald-400" : "text-amber-400")
                              : isRefunded
                              ? "text-blue-400"
                              : isExpired
                              ? "text-zinc-500"
                              : "text-zinc-400"
                          }`}>
                            {isRefunded || isExpired ? "$0.00 tUSDC" : pos.pnl || (won ? "+$0.00 tUSDC" : "-$0.00 tUSDC")}
                          </span>
                          {won ? (
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              Payout: {pos.payout || `${((pos.quantity || 0)).toFixed(2)} tUSDC`}
                            </span>
                          ) : isClosedEarly ? (
                            <span className="text-[10px] text-amber-400/80 block font-mono">
                              Exit: {pos.payout || pos.currentValue || `${((pos.quantity || 0) * (pos.currentPrice || 0.5)).toFixed(2)} tUSDC`}
                            </span>
                          ) : isRefunded ? (
                            <span className="text-[10px] text-blue-400/80 block font-mono">
                              Returned: {pos.payout || `${((pos.quantity || 0) * 0.5).toFixed(2)} tUSDC`}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/40 flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>
                            {isRefunded
                              ? `Unfilled Order • ${pos.quantity} contracts refunded`
                              : isClosedEarly
                              ? `Early Exit • ${pos.quantity} contracts sold`
                              : `Outcome: ${pos.outcome || (won ? "WON" : isExpired ? "EXPIRED" : "LOST")} • ${pos.quantity} contracts`}
                          </span>
                          {settledOrClosedStr && (
                            <span className="text-zinc-400 text-[10px] flex items-center gap-0.5">
                              <Clock className="size-2.5 text-zinc-400" />
                              {settledOrClosedStr}
                            </span>
                          )}
                          {placedStr && (
                            <span className="text-zinc-500 text-[10px]">
                              • {placedStr}
                            </span>
                          )}
                        </div>

                        {pos.isRedeemed || pos.status === "Redeemed" || pos.claimed || isPositionLocallyRedeemed(pos) ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-1 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <Coins className="size-2.5 text-emerald-400" /> Redeemed
                            </span>
                            {(() => {
                              const displayTx = pos.txHash || getLocalRedeemedTx(pos);
                              return displayTx ? (
                                <a
                                  href={`https://shannon-explorer.somnia.network/tx/${displayTx}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 rounded-md text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 font-mono border border-zinc-700/50"
                                >
                                  <span>TX</span>
                                  <ExternalLink className="size-2.5" />
                                </a>
                              ) : null;
                            })()}
                          </div>
                        ) : isClosedEarly ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                              <Zap className="size-2.5 text-amber-400" /> Closed Early
                            </span>
                            {pos.txHash && (
                              <a
                                href={`https://shannon-explorer.somnia.network/tx/${pos.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-md text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 font-mono border border-zinc-700/50"
                              >
                                <span>TX</span>
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        ) : isClaimable ? (
                          <Button
                            size="sm"
                            className="h-7 px-3 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-95"
                            onClick={() => {
                              // Optimistically mark as redeemed immediately
                              updateRedeemedTxMap((prev) => {
                                const next = new Map(prev);
                                next.set(sym.toLowerCase(), "");
                                if ((pos as any).poolAddress) next.set(((pos as any).poolAddress).toLowerCase(), "");
                                return next;
                              });
                              dispatchAction(`Redeem winning contracts on ${sym}`);
                            }}
                          >
                            <Coins className="size-3 text-black" />
                            Redeem
                          </Button>
                        ) : isRefunded ? (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                              <Coins className="size-2.5 text-blue-400" /> Refunded
                            </span>
                            {pos.txHash && (
                              <a
                                href={`https://shannon-explorer.somnia.network/tx/${pos.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-md text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 font-mono border border-zinc-700/50"
                              >
                                <span>TX</span>
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-500 text-[10px]">Expired</span>
                            {pos.txHash && (
                              <a
                                href={`https://shannon-explorer.somnia.network/tx/${pos.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-md text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center gap-1 font-mono border border-zinc-700/50"
                              >
                                <span>TX</span>
                                <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-xl transition-all active:scale-95 cursor-pointer px-2"
              onClick={() => dispatchAction("Show me the live prediction markets on DreamDEX")}
            >
              <TrendingUp className="size-3.5 shrink-0" />
              <span className="truncate">Live Markets</span>
            </button>

            {resolvedPositions.some(
              (p) =>
                (p.outcome === "WON" || p.isWinner === true) &&
                (p.claimable === true || p.status === "Claimable") &&
                !p.isRedeemed &&
                p.status !== "Redeemed" &&
                !p.claimed &&
                !isPositionLocallyRedeemed(p)
            ) ? (
              <button
                type="button"
                className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer px-2"
                onClick={() => {
                  // Optimistically mark ALL claimable positions as redeemed
                  updateRedeemedTxMap((prev) => {
                    const next = new Map(prev);
                    next.set("__all__", "");
                    for (const p of resolvedPositions) {
                      const sym = (p.market || p.marketName || p.symbol || p.marketSymbol || "").toLowerCase();
                      if (sym) next.set(sym, "");
                      if ((p as any).poolAddress) next.set(((p as any).poolAddress).toLowerCase(), "");
                    }
                    return next;
                  });
                  dispatchAction("Redeem my winnings on DreamDEX");
                }}
              >
                <Coins className="size-3.5 shrink-0 text-black" />
                <span className="truncate">Redeem Winnings</span>
              </button>
            ) : (
              <button
                disabled
                type="button"
                className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 border border-zinc-800 text-zinc-400 text-xs font-medium rounded-xl opacity-75 cursor-default px-2"
              >
                <Coins className="size-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">Winnings Claimed</span>
              </button>
            )}

            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              title="View on Explorer"
              className="shrink-0 flex items-center justify-center px-3 h-9 rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-all active:scale-95 cursor-pointer"
            >
              <ExternalLink className="size-3.5" />
            </a>
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
