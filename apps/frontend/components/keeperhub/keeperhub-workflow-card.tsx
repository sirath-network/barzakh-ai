"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Loader2,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  FileSearch,
  Eye,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Bot,
  Sliders,
  Check,
  Pause,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface KeeperHubWorkflowCardProps {
  result: any;
  toolCallId?: string;
  onSelectAction?: (promptText: string) => void;
}

interface MarketOption {
  symbol: string;
  shortSymbol?: string;
  asset: string;
  timeframe: string;
  suffix?: string;
  impliedProbability?: string;
  tradingVolume?: string;
  expiryTime?: string;
  expiryTimestamp?: number;
  poolAddress?: string;
}

const getTimeframe = (sym: string): string => {
  const s = (sym || "").toLowerCase();
  if (s.includes("-1m")) return "1m";
  if (s.includes("-5m")) return "5m";
  if (s.includes("-15m")) return "15m";
  if (s.includes("-1h")) return "1h";
  if (s.includes("-4h")) return "4h";
  return "5m";
};

const getTimeframeBadge = (tf: string) => {
  switch (tf) {
    case "1m":
      return "bg-purple-500/10 text-purple-400 border-purple-500/30";
    case "5m":
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    case "15m":
      return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    case "1h":
      return "bg-sky-500/10 text-sky-400 border-sky-500/30";
    case "4h":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/30";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
};

const formatProb = (probStr?: string): string => {
  if (!probStr) return "50% UP";
  const num = parseFloat(probStr);
  return isNaN(num) ? "50% UP" : `${Math.round(num)}% UP`;
};

const DEFAULT_MARKETS: MarketOption[] = [
  {
    symbol: "BTC-UP-5m",
    shortSymbol: "BTC-5m",
    asset: "BTC",
    timeframe: "5m",
    impliedProbability: "50.0%",
    tradingVolume: "$12,450 tUSDC",
    poolAddress: "0x6c85b0800F676F217dd9DA3188Bf30281A024F6D",
  },
  {
    symbol: "BTC-UP-15m",
    shortSymbol: "BTC-15m",
    asset: "BTC",
    timeframe: "15m",
    impliedProbability: "50.0%",
    tradingVolume: "$18,200 tUSDC",
    poolAddress: "0xcce58096d52EABedD5a11b0D01Ffa8DE845B7650",
  },
  {
    symbol: "ETH-UP-5m",
    shortSymbol: "ETH-5m",
    asset: "ETH",
    timeframe: "5m",
    impliedProbability: "50.0%",
    tradingVolume: "$11,800 tUSDC",
    poolAddress: "0xE2E1C96c210B24F1f608A6A759B40619fCCbbF9D",
  },
  {
    symbol: "ETH-UP-15m",
    shortSymbol: "ETH-15m",
    asset: "ETH",
    timeframe: "15m",
    impliedProbability: "50.0%",
    tradingVolume: "$14,600 tUSDC",
    poolAddress: "0x644FFaCDe798524ca64dbE7C5Eb5e4FBa6b0363d",
  },
];

const PRESET_AMOUNTS = ["5", "10", "25", "50"];

export function KeeperHubWorkflowCard({
  result,
  toolCallId,
  onSelectAction,
}: KeeperHubWorkflowCardProps) {
  const initialWorkflow = result?.workflow || result?.data?.workflow || {};

  // Extract initial prediction parameters from result params, workflow, or text
  const initialMarketSymbol = useMemo(() => {
    const explicit = result?.params?.marketSymbol || result?.marketSymbol || result?.parameters?.marketSymbol;
    if (explicit) return String(explicit).toUpperCase();
    const match = `${result?.workflowName || ""} ${initialWorkflow?.name || ""} ${initialWorkflow?.description || ""} ${JSON.stringify(result || {})}`.match(/(BTC|ETH)-UP-(?:5m|15m|4h|1h)(?:-[A-Za-z0-9]+)?/i);
    return match ? match[0].toUpperCase() : "BTC-UP-5m";
  }, [initialWorkflow, result]);

  const initialSide = useMemo<"UP" | "DOWN">(() => {
    const explicit = result?.params?.side || result?.side || result?.parameters?.side;
    if (explicit) {
      return /down/i.test(String(explicit)) ? "DOWN" : "UP";
    }
    const text = `${result?.workflowName || ""} ${initialWorkflow?.name || ""} ${initialWorkflow?.description || ""} ${JSON.stringify(result || {})}`.toLowerCase();
    return text.includes("down") ? "DOWN" : "UP";
  }, [initialWorkflow, result]);

  const initialAmount = useMemo(() => {
    const explicit = result?.params?.amount || result?.amount || result?.parameters?.amount;
    if (explicit) return String(explicit);
    const match = `${result?.workflowName || ""} ${initialWorkflow?.name || ""} ${initialWorkflow?.description || ""} ${JSON.stringify(result || {})}`.match(/(\d+(?:\.\d+)?)\s*t?usdc/i);
    return match ? match[1] : "10";
  }, [initialWorkflow, result]);

  const initialName =
    initialWorkflow?.name ||
    result?.workflowName ||
    (initialMarketSymbol
      ? `DreamDEX: ${initialSide} on ${initialMarketSymbol} (${initialAmount} tUSDC)`
      : "KeeperHub Onchain Workflow");

  const initialDesc =
    initialWorkflow?.description ||
    (initialMarketSymbol
      ? `Place a ${initialSide} prediction on ${initialMarketSymbol} DreamDEX market using ${initialAmount} tUSDC on Somnia Testnet. Deterministic execution via KeeperHub with full audit trail.`
      : "Deterministic onchain execution composed by Barzakh AI.");

  // Stable storage key to persist execution state across page refreshes
  const storageKey = useMemo(() => {
    if (toolCallId) return `keeperhub_card_${toolCallId}`;
    const cleanName = (initialWorkflow?.name || initialName || "").toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const wfId = initialWorkflow?.id || result?.id || "default";
    return `keeperhub_card_${cleanName}_${wfId}`;
  }, [toolCallId, initialWorkflow, initialName, result]);

  // Detect whether this is a prediction market workflow
  const isPredictionWorkflow = useMemo(() => {
    const text = `${initialName} ${initialDesc} ${result?.intent || ""} ${JSON.stringify(result?.params || {})} ${JSON.stringify(initialWorkflow)} ${JSON.stringify(result || {})}`.toLowerCase();
    return (
      text.includes("dreamdex") ||
      text.includes("btc-up") ||
      text.includes("eth-up") ||
      text.includes("prediction") ||
      text.includes("tusdc") ||
      text.includes("50312") ||
      result?.intent === "dreamdex-trade" ||
      result?.intent === "dreamdex-auto-trade" ||
      result?.intent === "dreamdex-redeem" ||
      Boolean(result?.params?.marketSymbol)
    );
  }, [initialName, initialDesc, initialWorkflow, result]);

  const isInitialAutoTrade = useMemo(() => {
    return Boolean(
      initialWorkflow?.nodes?.some((n: any) => n.type === "schedule-trigger") ||
      initialName.toLowerCase().includes("auto-trade")
    );
  }, [initialWorkflow, initialName]);

  // Interactive UI State for prediction options
  const [selectedMarket, setSelectedMarket] = useState<string>(initialMarketSymbol);
  const [selectedSide, setSelectedSide] = useState<"UP" | "DOWN">(initialSide);
  const [selectedAmount, setSelectedAmount] = useState<string>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [tradeMode, setTradeMode] = useState<"single" | "auto">(isInitialAutoTrade ? "auto" : "single");
  const [timeframeFilter, setTimeframeFilter] = useState<string>("all");
  const [convictionThreshold, setConvictionThreshold] = useState<number>(75);
  const [autoInterval, setAutoInterval] = useState<number>(5);

  const isPending = Boolean(result?.isLoading || result?.isPending);

  const [isAutopilotMode, setIsAutopilotMode] = useState<boolean>(
    result?.executionMode === "autopilot" ||
    (typeof window !== "undefined" &&
      (localStorage.getItem("barzakh_execution_mode") === "autopilot" ||
       localStorage.getItem("agent_execution_mode") === "autopilot"))
  );

  useEffect(() => {
    if (result?.executionMode) {
      setIsAutopilotMode(result.executionMode === "autopilot");
      return;
    }
    fetch("/api/settings/agent")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const mode = data?.status?.executionMode || data?.executionMode;
        if (mode === "autopilot") {
          setIsAutopilotMode(true);
        }
      })
      .catch(() => {});
  }, [result?.executionMode]);

  useEffect(() => {
    if (initialMarketSymbol && (!selectedMarket || selectedMarket === "BTC-UP-5m")) {
      setSelectedMarket(initialMarketSymbol);
    }
  }, [initialMarketSymbol]);

  useEffect(() => {
    if (initialSide) {
      setSelectedSide(initialSide);
    }
  }, [initialSide]);

  useEffect(() => {
    if (initialAmount && (!selectedAmount || selectedAmount === "10")) {
      setSelectedAmount(initialAmount);
    }
  }, [initialAmount]);

  // Live markets fetched from /api/dreamdex/markets
  const [markets, setMarkets] = useState<MarketOption[]>(DEFAULT_MARKETS);
  const [isRefreshingMarkets, setIsRefreshingMarkets] = useState<boolean>(false);
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));

  // Ticking timer for market expiration display
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live rolling markets from Somnia Shannon
  const fetchLiveMarkets = async () => {
    setIsRefreshingMarkets(true);
    try {
      const res = await fetch(`/api/dreamdex/markets?_t=${Date.now()}&refresh=true`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.markets) && json.markets.length > 0) {
          const mapped: MarketOption[] = json.markets.map((m: any) => {
            const sym = m.symbol || "BTC-UP-5m";
            const tf = getTimeframe(sym);
            const assetMatch = sym.match(/^(BTC|ETH)/i);
            const asset = assetMatch ? assetMatch[0].toUpperCase() : (m.asset || "BTC");
            
            const suffixMatch = sym.match(/-(?:5m|15m|1h|4h)-([A-Za-z0-9]+)$/i);
            const suffix = suffixMatch ? suffixMatch[1] : undefined;

            return {
              symbol: sym,
              shortSymbol: suffix ? `${asset}-${tf} (#${suffix})` : `${asset}-${tf}`,
              asset,
              timeframe: tf,
              suffix,
              impliedProbability: m.impliedProbability || "50.0%",
              tradingVolume: m.tradingVolume || "$12,450 tUSDC",
              expiryTime: m.expiryTime,
              expiryTimestamp: m.expiryTimestamp,
              poolAddress: m.poolAddress || m.marketAddress,
            };
          });
          setMarkets(mapped);
        }
      }
    } catch (err) {
      console.warn("[KeeperHub] Failed to fetch live markets:", err);
    } finally {
      setIsRefreshingMarkets(false);
    }
  };

  // Compute available timeframes from markets
  const availableTimeframes = useMemo(() => {
    const tfs = new Set<string>();
    for (const m of markets) {
      tfs.add(m.timeframe);
    }
    const order = ["5m", "15m", "1h", "4h"];
    return ["all", ...order.filter((tf) => tfs.has(tf))];
  }, [markets]);

  // Filtered markets based on timeframe filter
  const filteredMarkets = useMemo(() => {
    if (timeframeFilter === "all") return markets;
    return markets.filter((m) => m.timeframe === timeframeFilter);
  }, [markets, timeframeFilter]);

  // Selected market object
  const activeMarket = useMemo(() => {
    return markets.find((m) => m.symbol === selectedMarket) || markets[0] || DEFAULT_MARKETS[0];
  }, [markets, selectedMarket]);

  // Implied probability calculation
  const probNum = useMemo(() => {
    const str = activeMarket?.impliedProbability || "50%";
    return parseFloat(str) || 50;
  }, [activeMarket]);

  const downProbNum = 100 - probNum;

  // Active trade amount
  const effectiveAmount = isCustomAmount ? customAmount || "10" : selectedAmount;

  // Execution & Dry Run State with Persistence
  const isInitiallyExecuted = Boolean(
    !isPending && (
      result?.status === "completed" ||
      result?.isExecuted === true ||
      (result?.executionMode === "autopilot" && result?.status !== "error") ||
      result?.execution?.status === "completed" ||
      (Array.isArray(result?.transactionHashes) && result.transactionHashes.length > 0) ||
      (Array.isArray(result?.execution?.transactionHashes) && result.execution.transactionHashes.length > 0)
    )
  );

  const [dryRunState, setDryRunState] = useState<"idle" | "running" | "passed" | "failed">(
    result?.simulation?.status === "passed" ? "passed" : "idle"
  );
  const [dryRunResult, setDryRunResult] = useState<any>(result?.simulation || null);

  const [execState, setExecState] = useState<"idle" | "running" | "confirmed" | "failed">(
    isInitiallyExecuted ? "confirmed" : "idle"
  );
  const [execResult, setExecResult] = useState<any>(
    isInitiallyExecuted
      ? {
          ...result,
          transactionHashes: result?.transactionHashes || result?.execution?.transactionHashes || [],
        }
      : null
  );

  // Sync state whenever result completes in background
  useEffect(() => {
    if (isInitiallyExecuted) {
      setExecState("confirmed");
      setExecResult({
        ...result,
        transactionHashes: result?.transactionHashes || result?.execution?.transactionHashes || [],
      });
    }
  }, [isInitiallyExecuted, result]);

  const [showAudit, setShowAudit] = useState(false);
  const [auditData, setAuditData] = useState<any>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    result?.status === "error" ? (result?.error || result?.message || "Execution failed") : null
  );

  // Save initial execution to localStorage so refreshing the page preserves confirmed state
  useEffect(() => {
    if (isInitiallyExecuted && storageKey && typeof window !== "undefined") {
      try {
        const existing = localStorage.getItem(storageKey);
        if (!existing) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              execState: "confirmed",
              execResult: {
                ...result,
                transactionHashes: result?.transactionHashes || result?.execution?.transactionHashes || [],
              },
              executedAt: Date.now(),
              workflowName: initialName,
            })
          );
        }
      } catch {}
    }
  }, [isInitiallyExecuted, storageKey, result, initialName]);

  // === MARKET POLLING & EXPIRATION SMART ROLLOVER ===

  // Initial fetch on mount
  useEffect(() => {
    fetchLiveMarkets();
  }, []);

  // 1. Periodic background polling every 8s to keep live pools and expiration counters fresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveMarkets();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // 2. Active pool expiration trigger: when diffSec <= 0, immediately re-fetch within 800ms and poll every 2.5s until unexpired
  const isCurrentlyExpired = useMemo(() => {
    if (!activeMarket?.expiryTimestamp) return false;
    return activeMarket.expiryTimestamp <= nowSec;
  }, [activeMarket, nowSec]);

  useEffect(() => {
    if (isCurrentlyExpired) {
      const initialTimer = setTimeout(() => {
        fetchLiveMarkets();
      }, 800);
      const pollTimer = setInterval(() => {
        fetchLiveMarkets();
      }, 2500);
      return () => {
        clearTimeout(initialTimer);
        clearInterval(pollTimer);
      };
    }
  }, [isCurrentlyExpired]);

  // 3. Smart Rollover: when fresh markets arrive, if selectedMarket has expired, roll over to the unexpired active pool
  useEffect(() => {
    if (!markets || markets.length === 0) return;

    const currentM = markets.find((m) => m.symbol === selectedMarket);
    const isExpired = currentM && currentM.expiryTimestamp && currentM.expiryTimestamp <= nowSec;

    if (!currentM || isExpired) {
      const asset = (selectedMarket.match(/^(BTC|ETH)/i)?.[0]?.toUpperCase()) || activeMarket?.asset || "BTC";
      const tf = getTimeframe(selectedMarket) || activeMarket?.timeframe || "5m";

      const unexpired = markets.filter(
        (m) => (!m.expiryTimestamp || m.expiryTimestamp > nowSec)
      );

      const matchExact = unexpired.find(
        (m) => (m.asset === asset || m.symbol.startsWith(asset)) && m.timeframe === tf
      );
      if (matchExact) {
        setSelectedMarket(matchExact.symbol);
        return;
      }

      const matchAsset = unexpired.find((m) => m.asset === asset || m.symbol.startsWith(asset));
      if (matchAsset) {
        setSelectedMarket(matchAsset.symbol);
        return;
      }

      if (unexpired.length > 0) {
        setSelectedMarket(unexpired[0].symbol);
      }
    }
  }, [markets, nowSec, activeMarket?.asset, activeMarket?.timeframe, selectedMarket]);

  // === AUTO BOT STATE & RECURRING EXECUTION RUNNER ===

  const botStorageKey = useMemo(() => {
    const raw = toolCallId || initialName || "default";
    return `keeperhub_autobot_${raw.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
  }, [toolCallId, initialName]);

  const [isAutoBotActive, setIsAutoBotActive] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = toolCallId || initialName || "default";
      const key = `keeperhub_autobot_${raw.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored).active === true;
      }
    } catch {}
    return Boolean(isInitialAutoTrade && isInitiallyExecuted);
  });

  const [botNextRunSec, setBotNextRunSec] = useState<number>(() => {
    if (typeof window === "undefined") return 300;
    try {
      const raw = toolCallId || initialName || "default";
      const key = `keeperhub_autobot_${raw.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        const diff = Math.floor((parsed.nextExecutionAt - Date.now()) / 1000);
        return diff > 0 ? diff : autoInterval * 60;
      }
    } catch {}
    return autoInterval * 60;
  });

  const [isBotExecutingRound, setIsBotExecutingRound] = useState(false);
  const [lastBotTx, setLastBotTx] = useState<string | null>(null);
  const [botRoundsCompleted, setBotRoundsCompleted] = useState<number>(1);

  // Sync Auto Bot state on execute or prop load
  useEffect(() => {
    if (tradeMode === "auto" && execState === "confirmed") {
      setIsAutoBotActive(true);
      const nextRun = Date.now() + autoInterval * 60 * 1000;
      setBotNextRunSec(autoInterval * 60);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            botStorageKey,
            JSON.stringify({
              active: true,
              autoInterval,
              nextExecutionAt: nextRun,
              marketSymbol: selectedMarket,
              side: selectedSide,
              amount: effectiveAmount,
            })
          );
        } catch {}
      }
    }
  }, [tradeMode, execState, autoInterval, botStorageKey, selectedMarket, selectedSide, effectiveAmount]);

  // Ticking countdown for Auto Bot
  useEffect(() => {
    if (tradeMode !== "auto" || !isAutoBotActive) return;

    const timer = setInterval(() => {
      setBotNextRunSec((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [tradeMode, isAutoBotActive]);

  // Function to execute a recurring Auto Bot round
  const executeAutoBotRound = async () => {
    if (isBotExecutingRound) return;
    setIsBotExecutingRound(true);
    setErrorMessage(null);

    try {
      // 1. Fetch latest rolling active market
      let targetSymbol = selectedMarket;
      let targetPool = activeMarket?.poolAddress;
      try {
        const mRes = await fetch(`/api/dreamdex/markets?_t=${Date.now()}&refresh=true`, { cache: "no-store" });
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.success && Array.isArray(mData.markets)) {
            const asset = (selectedMarket.match(/^(BTC|ETH)/i)?.[0]?.toUpperCase()) || activeMarket?.asset || "BTC";
            const tf = getTimeframe(selectedMarket) || activeMarket?.timeframe || "5m";
            const fresh = mData.markets.find((m: any) =>
              (m.asset === asset || m.symbol?.startsWith(asset)) &&
              (m.timeframe === tf || m.symbol?.toLowerCase().includes(`-${tf}`)) &&
              (!m.expiryTimestamp || m.expiryTimestamp > Math.floor(Date.now() / 1000))
            ) || mData.markets.find((m: any) =>
              (m.asset === asset || m.symbol?.startsWith(asset)) &&
              (!m.expiryTimestamp || m.expiryTimestamp > Math.floor(Date.now() / 1000))
            );
            if (fresh) {
              targetSymbol = fresh.symbol;
              targetPool = fresh.poolAddress;
              setSelectedMarket(fresh.symbol);
            }
          }
        }
      } catch (mErr) {
        console.warn("[AutoBot] Error fetching fresh market:", mErr);
      }

      // 2. Build DAG workflow for target pool
      const botWf = {
        name: `DreamDEX Auto-Trade: ${targetSymbol} (every ${autoInterval}m)`,
        description: `Automated prediction trading on ${targetSymbol}. Placed ${effectiveAmount} tUSDC trade on ${selectedSide} via KeeperHub Auto Bot.`,
        nodes: [
          {
            id: "place-trade",
            type: "web3-write",
            label: `Auto-Trade ${effectiveAmount} tUSDC on ${selectedSide}`,
            config: {
              dreamdex: {
                marketSymbol: targetSymbol,
                side: selectedSide,
                amount: effectiveAmount,
                orderType: "market",
              },
              contractAddress: targetPool,
            },
          },
        ],
      };

      // 3. Execute via KeeperHub onchain execute route
      const execRes = await fetch("/api/keeperhub/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: botWf }),
      });

      const execData = await execRes.json();
      if (execData.success && execData.transactionHashes?.length > 0) {
        const tx = execData.transactionHashes[0];
        setLastBotTx(tx);
        setBotRoundsCompleted((prev) => prev + 1);
        setExecState("confirmed");
        setExecResult(execData);

        // Dispatch events so DreamDEX Portfolio updates immediately!
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("barzakh:dreamdex-traded", {
            detail: { txHash: tx, marketSymbol: targetSymbol, amount: effectiveAmount },
          }));
          window.dispatchEvent(new CustomEvent("barzakh:dreamdex-order-placed", {
            detail: { txHash: tx, marketSymbol: targetSymbol, amount: effectiveAmount },
          }));
        }

        // Immediately refresh markets so card displays new pool countdown
        fetchLiveMarkets();

        // Reset next countdown
        setBotNextRunSec(autoInterval * 60);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              botStorageKey,
              JSON.stringify({
                active: true,
                autoInterval,
                nextExecutionAt: Date.now() + autoInterval * 60 * 1000,
                lastTx: tx,
                marketSymbol: targetSymbol,
                roundsCompleted: botRoundsCompleted + 1,
              })
            );
          } catch {}
        }
      } else {
        console.warn("[AutoBot] Execution failed, retry in 60s:", execData.error);
        setBotNextRunSec(60);
      }
    } catch (err: any) {
      console.error("[AutoBot] Exception in auto bot round:", err);
      setBotNextRunSec(60);
    } finally {
      setIsBotExecutingRound(false);
    }
  };

  // Auto-trigger bot execution when countdown reaches 0
  useEffect(() => {
    if (tradeMode === "auto" && isAutoBotActive && botNextRunSec === 0 && !isBotExecutingRound) {
      executeAutoBotRound();
    }
  }, [tradeMode, isAutoBotActive, botNextRunSec, isBotExecutingRound]);

  const toggleAutoBot = (enable: boolean) => {
    setIsAutoBotActive(enable);
    if (enable) {
      setBotNextRunSec(autoInterval * 60);
    }
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          botStorageKey,
          JSON.stringify({
            active: enable,
            autoInterval,
            nextExecutionAt: Date.now() + autoInterval * 60 * 1000,
            marketSymbol: selectedMarket,
          })
        );
      } catch {}
    }
  };

  // Dynamic DAG workflow construction based on interactive controls
  const currentWorkflow = useMemo(() => {
    if (!isPredictionWorkflow) {
      return initialWorkflow;
    }

    const chainId = 50312;
    const tUSDCAddress = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E";
    const poolAddress = activeMarket?.poolAddress || "0x6c85b0800F676F217dd9DA3188Bf30281A024F6D";
    const amountFloat = parseFloat(effectiveAmount) || 10;
    const rawAmountBigInt = String(BigInt(Math.floor(amountFloat * 1_000_000)));

    if (tradeMode === "auto") {
      // 24/7 Automated Strategy DAG
      return {
        name: `DreamDEX Auto-Trade: ${selectedMarket} (every ${autoInterval}m)`,
        description: `Automated prediction trading on ${selectedMarket}. Checks market every ${autoInterval} minutes, computes AI conviction score, and places ${effectiveAmount} tUSDC trade when score exceeds ${convictionThreshold}/100. Fully deterministic — no LLM at execution time.`,
        nodes: [
          {
            id: "schedule",
            type: "schedule-trigger",
            label: `Every ${autoInterval} minutes`,
            config: { cron: `*/${autoInterval} * * * *` },
          },
          {
            id: "read-market",
            type: "web3-read",
            label: `Read ${selectedMarket} Market State`,
            config: { chainId, contractAddress: poolAddress },
          },
          {
            id: "compute-score",
            type: "code",
            label: "Compute AI Conviction Score",
            config: {
              language: "javascript",
              code: "const impliedProb = 0.5; let score = 50; if (impliedProb > 0.7 || impliedProb < 0.3) score += 25; return { score, direction: 'UP' };",
            },
          },
          {
            id: "check-threshold",
            type: "condition",
            label: `Score > ${convictionThreshold}?`,
            config: { expression: `score > ${convictionThreshold}` },
          },
          {
            id: "place-trade",
            type: "web3-write",
            label: `Auto-Trade ${effectiveAmount} tUSDC on ${selectedSide}`,
            config: {
              chainId,
              contractAddress: poolAddress,
              dreamdex: {
                marketSymbol: selectedMarket,
                side: selectedSide,
                amount: effectiveAmount,
                orderType: "market",
              },
            },
          },
        ],
        edges: [
          { source: "schedule", target: "read-market" },
          { source: "read-market", target: "compute-score" },
          { source: "compute-score", target: "check-threshold" },
          { source: "check-threshold", target: "place-trade", sourceHandle: "true" },
        ],
      };
    }

    // Instant Deterministic Execution DAG
    return {
      name: `DreamDEX: ${selectedSide} on ${selectedMarket} (${effectiveAmount} tUSDC)`,
      description: `Place a ${selectedSide} prediction on ${selectedMarket} DreamDEX market using ${effectiveAmount} tUSDC on Somnia Testnet. Deterministic execution via KeeperHub with full audit trail.`,
      nodes: [
        {
          id: "trigger",
          type: "manual-trigger",
          label: "Manual Trigger",
          config: {},
        },
        {
          id: "check-tusdc",
          type: "web3-read",
          label: "Check tUSDC Balance",
          config: {
            chainId,
            contractAddress: tUSDCAddress,
            method: "balanceOf",
          },
        },
        {
          id: "validate-balance",
          type: "condition",
          label: "Sufficient tUSDC?",
          config: {
            expression: `balance >= ${rawAmountBigInt}`,
          },
        },
        {
          id: "approve-tusdc",
          type: "web3-write",
          label: `Approve ${effectiveAmount} tUSDC for DreamDEX`,
          config: {
            chainId,
            contractAddress: tUSDCAddress,
            method: "approve",
            args: [poolAddress, rawAmountBigInt],
          },
        },
        {
          id: "place-order",
          type: "web3-write",
          label: `Place ${selectedSide} Order on ${selectedMarket}`,
          config: {
            chainId,
            contractAddress: poolAddress,
            dreamdex: {
              marketSymbol: selectedMarket,
              side: selectedSide,
              amount: effectiveAmount,
              orderType: "market",
            },
          },
        },
        {
          id: "confirm",
          type: "web3-read",
          label: "Confirm Position",
          config: {
            chainId,
            contractAddress: poolAddress,
          },
        },
      ],
      edges: [
        { source: "trigger", target: "check-tusdc" },
        { source: "check-tusdc", target: "validate-balance" },
        { source: "validate-balance", target: "approve-tusdc", sourceHandle: "true" },
        { source: "approve-tusdc", target: "place-order" },
        { source: "place-order", target: "confirm" },
      ],
    };
  }, [
    isPredictionWorkflow,
    initialWorkflow,
    tradeMode,
    selectedMarket,
    selectedSide,
    effectiveAmount,
    activeMarket,
    convictionThreshold,
    autoInterval,
  ]);

  // Steps to render in execution graph
  const steps = useMemo(() => {
    if (currentWorkflow?.nodes && currentWorkflow.nodes.length > 0) {
      const nonTriggers = currentWorkflow.nodes.filter((n: any) => !n.type?.includes("trigger"));
      if (nonTriggers.length > 0) return nonTriggers;
    }
    // Fallback deterministic steps so execution graph never shows (0 Steps)
    return [
      { id: "check-tusdc", type: "web3-read", label: "Check tUSDC Balance" },
      { id: "validate-balance", type: "condition", label: "Sufficient tUSDC?" },
      { id: "approve-tusdc", type: "web3-write", label: `Approve ${effectiveAmount} tUSDC for DreamDEX` },
      { id: "place-order", type: "web3-write", label: `Place ${selectedSide} Order on ${selectedMarket}` },
      { id: "confirm", type: "web3-read", label: "Confirm Position" },
    ];
  }, [currentWorkflow, effectiveAmount, selectedSide, selectedMarket]);


  // Sync execution state from localStorage on mount so page refreshes preserve the executed state
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.execState === "confirmed" && parsed.execResult) {
          setExecState("confirmed");
          setExecResult(parsed.execResult);
        } else if (parsed.dryRunState === "passed" && parsed.dryRunResult && execState !== "confirmed") {
          setDryRunState("passed");
          setDryRunResult(parsed.dryRunResult);
        }
      }
    } catch (e) {
      console.warn("[KeeperHub] Error reading execution cache from localStorage:", e);
    }
  }, [storageKey, execState]);

  // When user intentionally changes market, side, or amount, clear the executed state so they can execute the new selection
  const handleMarketChange = (sym: string) => {
    setSelectedMarket(sym);
    setExecState("idle");
    setDryRunState("idle");
    setErrorMessage(null);
  };

  const handleSideChange = (side: "UP" | "DOWN") => {
    setSelectedSide(side);
    setExecState("idle");
    setDryRunState("idle");
    setErrorMessage(null);
  };

  const handleAmountChange = (amt: string) => {
    setSelectedAmount(amt);
    setIsCustomAmount(false);
    setExecState("idle");
    setDryRunState("idle");
    setErrorMessage(null);
  };

  // Reset execution to allow executing again
  const handleResetToExecutable = () => {
    setExecState("idle");
    setErrorMessage(null);
    if (typeof window !== "undefined" && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    }
  };

  // Dry run trigger
  const handleDryRun = async () => {
    try {
      setDryRunState("running");
      setErrorMessage(null);

      const res = await fetch("/api/keeperhub/dry-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: currentWorkflow }),
      });

      const data = await res.json();
      if (data.success) {
        setDryRunState("passed");
        setDryRunResult(data.simulation);
        if (typeof window !== "undefined" && storageKey) {
          try {
            const existing = JSON.parse(localStorage.getItem(storageKey) || "{}");
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                ...existing,
                dryRunState: "passed",
                dryRunResult: data.simulation,
              })
            );
          } catch {}
        }
      } else {
        setDryRunState("failed");
        setErrorMessage(data.error || "Simulation failed");
      }
    } catch (err: any) {
      setDryRunState("failed");
      setErrorMessage(err.message || "Failed to contact dry-run simulator");
    }
  };

  // Real onchain execution trigger
  const handleExecute = async () => {
    try {
      setExecState("running");
      setErrorMessage(null);

      const res = await fetch("/api/keeperhub/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow: currentWorkflow }),
      });

      const data = await res.json();
      if (data.success) {
        setExecState("confirmed");
        setExecResult(data);

        // Dispatch events so DreamDEX Portfolio updates immediately!
        const tx = data.transactionHashes?.[0] || data.execution?.transactionHashes?.[0];
        if (typeof window !== "undefined" && tx) {
          window.dispatchEvent(new CustomEvent("barzakh:dreamdex-traded", {
            detail: { txHash: tx, marketSymbol: selectedMarket, amount: effectiveAmount },
          }));
          window.dispatchEvent(new CustomEvent("barzakh:dreamdex-order-placed", {
            detail: { txHash: tx, marketSymbol: selectedMarket, amount: effectiveAmount },
          }));
        }

        // Activate Auto Bot if in auto mode
        if (tradeMode === "auto") {
          setIsAutoBotActive(true);
          setBotNextRunSec(autoInterval * 60);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(
                botStorageKey,
                JSON.stringify({
                  active: true,
                  autoInterval,
                  nextExecutionAt: Date.now() + autoInterval * 60 * 1000,
                  marketSymbol: selectedMarket,
                  side: selectedSide,
                  amount: effectiveAmount,
                })
              );
            } catch {}
          }
        }

        // Persist execution result in localStorage
        if (typeof window !== "undefined" && storageKey) {
          try {
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                execState: "confirmed",
                execResult: data,
                executedAt: Date.now(),
                workflowName: currentWorkflow.name,
              })
            );
          } catch (e) {
            console.warn("[KeeperHub] Failed to cache execution state in localStorage:", e);
          }
        }
      } else {
        setExecState("failed");
        setErrorMessage(data.error || "Execution failed");
      }
    } catch (err: any) {
      setExecState("failed");
      setErrorMessage(err.message || "Failed to execute workflow");
    }
  };

  // Audit trail trigger
  const handleLoadAudit = async () => {
    const txHash =
      execResult?.transactionHashes?.[0] ||
      execResult?.execution?.transactionHashes?.[0] ||
      result?.transactionHashes?.[0] ||
      "";
    const executionId =
      execResult?.execution?.id ||
      result?.execution?.id ||
      (txHash ? `kh-run-${txHash.slice(2, 10)}` : `kh-run-${Date.now().toString(36)}`);

    try {
      setLoadingAudit(true);
      setShowAudit(true);
      const res = await fetch(`/api/keeperhub/audit?executionId=${executionId}&txHash=${txHash}`);
      const data = await res.json();
      if (data.success) {
        setAuditData(data.audit);
      }
    } catch (err) {
      console.error("Failed to load audit:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const dispatchAction = (promptText: string) => {
    if (onSelectAction) {
      onSelectAction(promptText);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("barzakh:send-prompt", { detail: { prompt: promptText } }));
    }
  };

  // Format remaining time
  const getRemainingText = (expiryTime?: string, expirySec?: number) => {
    const targetSec = expirySec || (expiryTime ? Math.floor(new Date(expiryTime).getTime() / 1000) : 0);
    if (!targetSec) return "Active Window";
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

  return (
    <div className="w-full max-w-2xl mx-auto my-3 px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl text-zinc-200 text-sm font-sans">
        
        {/* === HEADER BANNER === */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="KeeperHub & DreamDEX Automated Workflows"
            fill
            priority
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0 shadow-inner">
                {tradeMode === "auto" ? (
                  <Bot className="size-4 sm:size-5 text-white" />
                ) : (
                  <ShieldCheck className="size-4 sm:size-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                    KeeperHub Execution
                  </h3>
                  <span className="text-[10px] bg-white/10 text-zinc-300 border border-white/10 px-1.5 py-0.5 rounded font-mono font-semibold uppercase">
                    DETERMINISTIC
                  </span>
                  {(result?.executionMode === "autopilot" || execResult?.executionMode === "autopilot") && (
                    <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono font-semibold uppercase flex items-center gap-0.5">
                      <Zap className="size-2.5 fill-amber-300" /> AUTOPILOT
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                  Zero-reinterpretation onchain workflow DAG
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
              </div>
            </div>

            {/* Right Header Badges / Buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchLiveMarkets}
                disabled={isRefreshingMarkets}
                title="Refresh live prediction markets and pool data"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10 text-[11px] sm:text-xs text-zinc-200 hover:text-white font-medium transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`size-3 text-zinc-300 ${isRefreshingMarkets ? "animate-spin" : ""}`} />
                <span className="hidden xs:inline">{isRefreshingMarkets ? "Refreshing..." : "Refresh"}</span>
              </button>

              {/* Status Pill */}
              <div className="hidden sm:flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs font-medium">
                {isPending ? (
                  isAutopilotMode ? (
                    <span className="flex items-center gap-1 text-amber-300 font-semibold animate-pulse">
                      <Loader2 className="size-3 animate-spin text-amber-300" /> Autopilot Executing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-zinc-200 font-semibold animate-pulse">
                      <Loader2 className="size-3 animate-spin text-zinc-300" /> Composing...
                    </span>
                  )
                ) : (result?.executionMode === "autopilot" || execResult?.executionMode === "autopilot" || isAutopilotMode) && execState === "confirmed" ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Zap className="size-3 text-amber-300 fill-amber-300" /> Autopilot Executed
                  </span>
                ) : execState === "confirmed" ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <CheckCircle2 className="size-3" /> Executed
                  </span>
                ) : dryRunState === "passed" ? (
                  <span className="flex items-center gap-1 text-zinc-200 font-semibold">
                    <Sparkles className="size-3" /> Dry Run OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-300">
                    <Layers className="size-3" /> Composed
                  </span>
                )}
              </div>

              {/* Network Pill */}
              <div className="hidden md:flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs text-zinc-300 font-medium">
                <span>Somnia Shannon</span>
              </div>
            </div>
          </div>
        </div>

        {/* === MAIN CARD BODY === */}
        <div className="p-3.5 sm:p-4 space-y-4">
          
          {/* Active Workflow Title & Description */}
          <div className="border-b border-zinc-200 dark:border-zinc-800/60 pb-3">
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap sm:flex-nowrap">
              <h3 className="text-sm sm:text-base font-semibold text-white truncate flex items-center gap-2">
                {currentWorkflow.name}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setTradeMode("single")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    tradeMode === "single"
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  Single
                </button>
                <button
                  type="button"
                  onClick={() => setTradeMode("auto")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                    tradeMode === "auto"
                      ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold shadow-sm"
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white border border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <Bot className="size-3" /> Auto Bot
                </button>
              </div>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {currentWorkflow.description}
            </p>
          </div>

          {/* === INTERACTIVE PREDICTION SELECTOR SECTION === */}
          {isPredictionWorkflow && (
            <div className="space-y-3 p-3 sm:p-3.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
              
              {/* Header for prediction switcher */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Sliders className="size-3.5 text-zinc-400" />
                  Choose Prediction Market & Outcome
                </span>
                
                {/* Timeframe selector pills */}
                <div className="flex items-center gap-1 text-[10px]">
                  {availableTimeframes.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframeFilter(tf)}
                      className={`px-2 py-0.5 rounded-md transition-all cursor-pointer ${
                        timeframeFilter === tf
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold shadow-sm"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:text-white border border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {tf === "all" ? "All" : tf}
                    </button>
                  ))}
                </div>
              </div>

              {/* 1. Market Selection Cards Grid (Fully Responsive on Mobile & Desktop) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {filteredMarkets.slice(0, 4).map((m) => {
                  const isSelected = m.symbol === selectedMarket;
                  const tf = m.timeframe || getTimeframe(m.symbol);
                  const badgeClass = getTimeframeBadge(tf);
                  const cleanOdds = formatProb(m.impliedProbability);

                  return (
                    <button
                      key={m.symbol}
                      type="button"
                      onClick={() => handleMarketChange(m.symbol)}
                      className={`p-2 sm:p-2.5 rounded-xl text-left transition-all border cursor-pointer relative flex flex-col justify-between min-h-[64px] min-w-0 ${
                        isSelected
                          ? "bg-zinc-800/90 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-200 ring-1 ring-zinc-400/40 dark:ring-white/30 text-white shadow-sm"
                          : "bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      {/* Top row: Timeframe badge + Asset + Suffix */}
                      <div className="flex items-center justify-between gap-1 w-full mb-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${badgeClass} shrink-0`}>
                            {tf}
                          </span>
                          <span className="font-bold text-xs text-white truncate">
                            {m.asset}
                          </span>
                          {m.suffix && (
                            <span className="text-[10px] font-mono text-zinc-500 truncate">
                              #{m.suffix}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <div className="size-3.5 rounded-full bg-white text-black flex items-center justify-center shrink-0">
                            <Check className="size-2.5 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Bottom row: Volume + Implied Odds */}
                      <div className="flex items-center justify-between text-[11px] font-mono w-full min-w-0">
                        <span className="text-zinc-400 text-[10px] truncate">
                          {m.tradingVolume ? m.tradingVolume.replace(" tUSDC", "") : "$12.4k"}
                        </span>
                        <span className="text-emerald-400 font-bold shrink-0">
                          {cleanOdds}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 2. Interactive Prediction Side (UP vs DOWN) Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSideChange("UP")}
                  className={`h-10 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 rounded-xl font-semibold text-xs transition-all duration-150 active:scale-95 cursor-pointer border min-w-0 ${
                    selectedSide === "UP"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-sm"
                      : "bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30"
                  }`}
                >
                  <TrendingUp className="size-3.5 sm:size-4 text-emerald-400 shrink-0" />
                  <span className="truncate">Predict UP ({probNum.toFixed(0)}%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSideChange("DOWN")}
                  className={`h-10 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 rounded-xl font-semibold text-xs transition-all duration-150 active:scale-95 cursor-pointer border min-w-0 ${
                    selectedSide === "DOWN"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/60 ring-1 ring-rose-500/30 shadow-sm"
                      : "bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30"
                  }`}
                >
                  <TrendingDown className="size-3.5 sm:size-4 text-rose-400 shrink-0" />
                  <span className="truncate">Predict DOWN ({downProbNum.toFixed(0)}%)</span>
                </button>
              </div>

              {/* 3. Live Probability Gauge Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-emerald-400 flex items-center gap-1 font-mono">
                    <TrendingUp className="size-3" /> UP {probNum.toFixed(0)}%
                  </span>
                  <span className="text-zinc-400 text-[11px] font-mono flex items-center gap-1">
                    <Clock className="size-3 text-zinc-400" /> {getRemainingText(activeMarket.expiryTime, activeMarket.expiryTimestamp)}
                  </span>
                  <span className="text-rose-400 flex items-center gap-1 font-mono">
                    DOWN {downProbNum.toFixed(0)}% <TrendingDown className="size-3" />
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex gap-0.5 p-0.5">
                  <div
                    className="h-full bg-emerald-400 rounded-l-full transition-all duration-500"
                    style={{ width: `${probNum}%` }}
                  />
                  <div
                    className="h-full bg-rose-400 rounded-r-full transition-all duration-500"
                    style={{ width: `${downProbNum}%` }}
                  />
                </div>
              </div>

              {/* 4. Trade Amount Selector (Responsive wrap) */}
              <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-1">
                <span className="text-xs text-zinc-400 font-medium shrink-0">Amount:</span>
                <div className="flex items-center gap-1.5 flex-1 justify-end flex-wrap sm:flex-nowrap">
                  {PRESET_AMOUNTS.map((amt) => {
                    const isSelected = !isCustomAmount && selectedAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handleAmountChange(amt)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold border-transparent shadow-sm"
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-white"
                        }`}
                      >
                        {amt} tUSDC
                      </button>
                    );
                  })}
                  <div className="relative w-20">
                    <input
                      type="number"
                      placeholder="Custom"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setIsCustomAmount(true);
                        setExecState("idle");
                        setDryRunState("idle");
                      }}
                      className={`w-full h-7.5 px-2 text-xs rounded-lg bg-zinc-950/60 border text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 ${
                        isCustomAmount ? "border-zinc-400" : "border-zinc-800"
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 5. Automated Strategy Config & Live Runner (if auto mode enabled) */}
              {tradeMode === "auto" && (
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Execution Interval:</span>
                    <div className="flex items-center gap-1">
                      {[5, 15, 60].map((int) => (
                        <button
                          key={int}
                          type="button"
                          onClick={() => {
                            setAutoInterval(int);
                            setBotNextRunSec(int * 60);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer border transition-all ${
                            autoInterval === int
                              ? "bg-zinc-900 dark:bg-white text-white dark:text-black font-semibold border-transparent shadow-sm"
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-white"
                          }`}
                        >
                          {int}m
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Conviction Threshold:</span>
                    <span className="font-mono text-zinc-200 font-bold">{convictionThreshold}/100</span>
                  </div>

                  {/* Live Auto Bot Status & Controls Card */}
                  <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Bot className="size-3.5 text-zinc-300" />
                        {isAutoBotActive ? `Auto Bot Active (Every ${autoInterval}m)` : "Auto Bot Paused"}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 font-semibold ${
                        isAutoBotActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {isAutoBotActive && <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                        {isAutoBotActive ? "RUNNING" : "PAUSED"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-300">
                      <span className="text-zinc-400">Next Round Execution:</span>
                      <span className="font-mono font-bold text-white flex items-center gap-1">
                        <Clock className="size-3 text-zinc-400" />
                        {isBotExecutingRound
                          ? "Executing onchain on Somnia..."
                          : isAutoBotActive
                          ? `in ${Math.floor(botNextRunSec / 60)}m ${String(botNextRunSec % 60).padStart(2, "0")}s`
                          : "Paused"}
                      </span>
                    </div>

                    {lastBotTx && (
                      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-zinc-800/60 min-w-0">
                        <span className="text-zinc-400 shrink-0">Last Round Tx:</span>
                        <a
                          href={`https://shannon-explorer.somnia.network/tx/${lastBotTx}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-300 hover:text-white underline truncate flex items-center gap-1 ml-2"
                        >
                          {lastBotTx.slice(0, 10)}...{lastBotTx.slice(-8)}
                          <ExternalLink className="size-2.5 shrink-0" />
                        </a>
                      </div>
                    )}

                    {/* Bot Controls */}
                    <div className="flex items-center gap-2 pt-1 flex-col xs:flex-row">
                      {isAutoBotActive ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleAutoBot(false)}
                            className="w-full xs:flex-1 bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-amber-300 text-xs h-8.5 gap-1 rounded-xl cursor-pointer"
                          >
                            <Pause className="size-3" />
                            <span>Pause Bot</span>
                          </Button>
                          <Button
                            size="sm"
                            onClick={executeAutoBotRound}
                            disabled={isBotExecutingRound}
                            className="w-full xs:flex-1 bg-white hover:bg-zinc-200 text-black font-semibold text-xs h-8.5 gap-1 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Play className="size-3 fill-black" />
                            <span>{isBotExecutingRound ? "Placing..." : "Trigger Round Now"}</span>
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => toggleAutoBot(true)}
                          className="w-full bg-white hover:bg-zinc-200 text-black font-semibold text-xs h-8.5 gap-1.5 rounded-xl shadow-sm cursor-pointer"
                        >
                          <Play className="size-3 fill-black" />
                          <span>Start Auto Bot (Every {autoInterval}m)</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === WORKFLOW EXECUTION GRAPH (DAG PREVIEW) === */}
          <div className="rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Layers className="size-3.5 text-zinc-400" />
                Workflow Execution Graph ({steps.length} Steps)
              </span>
              <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Zap className="size-3 text-amber-400" /> ~300,000 gas
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3 text-zinc-400" /> ~15s
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {steps.map((stepItem: any, idx: number) => {
                const label = stepItem.action || stepItem.label || `Step ${idx + 1}`;
                const type = stepItem.type || "action";
                const isWrite = type === "web3-write";
                const isRead = type === "web3-read";
                const isCondition = type === "condition";
                const isCode = type === "code";

                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-zinc-900/60 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/60 rounded-lg text-xs hover:border-zinc-700 transition-colors gap-2 min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="size-4 rounded-full bg-zinc-800 text-zinc-300 text-[10px] flex items-center justify-center font-mono font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="text-zinc-200 font-medium truncate">{label}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isWrite && (
                        <span className="text-[10px] text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded font-mono uppercase">
                          Web3 Write
                        </span>
                      )}
                      {isRead && (
                        <span className="text-[10px] text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 px-1.5 py-0.5 rounded font-mono uppercase">
                          Web3 Read
                        </span>
                      )}
                      {isCondition && (
                        <span className="text-[10px] text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded font-mono uppercase">
                          Conditional
                        </span>
                      )}
                      {isCode && (
                        <span className="text-[10px] text-zinc-300 bg-zinc-800/80 border border-zinc-700/60 px-1.5 py-0.5 rounded font-mono uppercase">
                          AI Logic
                        </span>
                      )}

                      {execState === "confirmed" ? (
                        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                      ) : dryRunState === "passed" ? (
                        <CheckCircle2 className="size-3.5 text-zinc-300 shrink-0" />
                      ) : (isPending && isAutopilotMode) || execState === "running" ? (
                        <Loader2 className="size-3.5 text-amber-400 animate-spin shrink-0" />
                      ) : isPending ? (
                        <Loader2 className="size-3.5 text-zinc-400 animate-spin shrink-0" />
                      ) : (
                        <ChevronRight className="size-3.5 text-zinc-600 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* === DRY RUN SIMULATION RESULTS === */}
          {dryRunState === "passed" && dryRunResult && (
            <div className="bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-300 font-medium">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-emerald-400" /> Dry Run Simulation Passed
                </span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 px-2 py-0.5 rounded">
                  Zero Chain Impact
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60">
                  <span className="text-zinc-400 block text-[10px]">Read Ops</span>
                  <span className="font-semibold text-white">{dryRunResult.readOperations || 2} steps</span>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60">
                  <span className="text-zinc-400 block text-[10px]">Write Ops</span>
                  <span className="font-semibold text-zinc-200">{dryRunResult.writeOperations || 1} tx</span>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/60">
                  <span className="text-zinc-400 block text-[10px]">Estimated Gas</span>
                  <span className="font-semibold text-zinc-200">{dryRunResult.estimatedGasTotal || "~300,000 gas"}</span>
                </div>
              </div>
            </div>
          )}

          {/* === CONFIRMED ONCHAIN EXECUTION RESULTS === */}
          {execState === "confirmed" && execResult && (
            <div className="bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-200 font-medium">
                <span className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  {execResult?.executionMode === "autopilot" || result?.executionMode === "autopilot"
                    ? "Executed Autonomously via Autopilot"
                    : "Executed via KeeperHub"}
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-mono font-semibold">
                  {execResult?.executionMode === "autopilot" || result?.executionMode === "autopilot"
                    ? "⚡ AUTOPILOT ONCHAIN"
                    : "SLA-BACKED • DETERMINISTIC"}
                </span>
              </div>

              {execResult.transactionHashes?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-400">Confirmed Onchain Transactions:</span>
                  {execResult.transactionHashes.map((tx: string, tIdx: number) => {
                    const explorerHref =
                      execResult.explorerUrl || `https://shannon-explorer.somnia.network/tx/${tx}`;

                    return (
                      <div
                        key={tIdx}
                        className="flex items-center justify-between text-xs font-mono bg-zinc-900/70 px-2.5 py-1.5 rounded-lg border border-zinc-800 gap-2 min-w-0"
                      >
                        <a
                          href={explorerHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-200 hover:text-white underline underline-offset-2 truncate min-w-0 flex-1 flex items-center gap-1 font-semibold"
                          title="View on Shannon Explorer"
                        >
                          {tx.slice(0, 14)}...{tx.slice(-10)}
                          <ExternalLink className="size-2.5 shrink-0" />
                        </a>
                        <a
                          href={explorerHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-zinc-300 hover:text-white flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 rounded border border-zinc-700 shrink-0"
                        >
                          Shannon <ExternalLink className="size-2.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-2.5 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="size-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Audit Trail Drawer */}
          {showAudit && auditData && (
            <div className="bg-zinc-950/60 dark:bg-zinc-950/80 border border-zinc-800/70 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <FileSearch className="size-3.5 text-zinc-400" />
                  KeeperHub Execution Audit Trail
                </span>
                <span className="text-[10px] font-mono text-zinc-400">{auditData.executionId}</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {auditData.entries?.map((entry: any, eIdx: number) => (
                  <div key={eIdx} className="flex flex-col gap-1 py-1.5 border-b border-zinc-800/40">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-200 font-medium">{entry.action}</span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-emerald-400">✓ passed</span>
                        <span className="text-zinc-500">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    {entry.transactionHash && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 pl-2">
                        <span>Tx:</span>
                        <a
                          href={`https://shannon-explorer.somnia.network/tx/${entry.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-300 hover:text-white underline flex items-center gap-0.5 truncate max-w-[280px]"
                        >
                          {entry.transactionHash.slice(0, 16)}...{entry.transactionHash.slice(-8)}
                          <ExternalLink className="size-2 shrink-0" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === BOTTOM ACTION CONTROLS === */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-zinc-800/70">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {execState !== "confirmed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDryRun}
                  disabled={isPending || dryRunState === "running" || execState === "running"}
                  className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs h-9 px-3 gap-1.5 rounded-xl cursor-pointer disabled:opacity-50"
                >
                  <Eye className="size-3.5 text-zinc-400" />
                  {dryRunState === "running" ? "Simulating..." : dryRunState === "passed" ? "Re-Simulate" : "Dry Run"}
                </Button>
              )}

              {execState === "confirmed" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadAudit}
                  disabled={loadingAudit}
                  className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs h-9 px-3 gap-1.5 rounded-xl cursor-pointer"
                >
                  <FileSearch className="size-3.5 text-zinc-400" />
                  {loadingAudit ? "Loading..." : "View Audit Trail"}
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => dispatchAction(`Analyze ${selectedMarket} with AI conviction scoring`)}
                disabled={isPending}
                className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs h-9 px-3 gap-1.5 rounded-xl cursor-pointer disabled:opacity-50"
                title="Run Barzakh AI Conviction Analysis"
              >
                <Sparkles className="size-3.5 text-zinc-400 shrink-0" />
                <span>AI</span>
              </Button>
            </div>

            <div className="flex items-center gap-2 justify-end sm:justify-start w-full sm:w-auto">
              {execState === "confirmed" ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToExecutable}
                    className="flex-1 sm:flex-initial bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs h-9 px-3 gap-1.5 rounded-xl cursor-pointer"
                    title="Execute another order with this card"
                  >
                    <RefreshCw className="size-3 text-zinc-400" />
                    <span>Execute Again</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dispatchAction("Show my KeeperHub execution history")}
                    className="text-xs text-zinc-400 hover:text-white h-9 px-2.5 gap-1 rounded-xl cursor-pointer shrink-0"
                  >
                    <span>History</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              ) : isPending ? (
                isAutopilotMode ? (
                  <Button
                    size="sm"
                    disabled
                    className="w-full sm:w-auto bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold text-xs h-9 px-4 gap-2 rounded-xl cursor-wait"
                  >
                    <Loader2 className="size-3.5 animate-spin text-amber-400" />
                    <span>Autopilot Executing Onchain...</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled
                    className="w-full sm:w-auto bg-zinc-800 text-zinc-400 font-semibold text-xs h-9 px-4 gap-2 rounded-xl cursor-wait border border-zinc-700"
                  >
                    <Loader2 className="size-3.5 animate-spin text-zinc-400" />
                    <span>Composing Workflow...</span>
                  </Button>
                )
              ) : (
                <Button
                  size="sm"
                  onClick={handleExecute}
                  disabled={execState === "running"}
                  className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black font-semibold text-xs h-9 px-5 gap-1.5 rounded-xl shadow-sm cursor-pointer active:scale-95 transition-all flex items-center justify-center"
                >
                  <Play className="size-3.5 fill-black" />
                  {execState === "running" ? "Executing Onchain..." : "Execute Deterministically"}
                </Button>
              )}
            </div>
          </div>

        </div>

        {/* Footer info line */}
        <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-center gap-1.5">
            Powered by KeeperHub <span className="w-0.5 h-0.5 bg-zinc-600 rounded-full" /> DreamDEX CLOB <span className="w-0.5 h-0.5 bg-zinc-600 rounded-full" /> Somnia Shannon
          </p>
        </div>

      </div>
    </div>
  );
}
