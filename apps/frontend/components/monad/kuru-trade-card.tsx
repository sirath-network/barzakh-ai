"use client";

import { useState } from "react";
import Image from "next/image";
import { Zap, Check, ExternalLink, RefreshCw, BarChart2, ShieldCheck, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KuruTradeCardProps {
  result: any;
  toolCallId?: string;
  onSelectAction?: (promptText: string) => void;
}

export function KuruTradeCard({ result, onSelectAction }: KuruTradeCardProps) {
  const isOrderBook = !!result?.bids && !!result?.asks;
  const isFilled = result?.status === "filled";
  const isPlaced = result?.status === "order_placed";
  const isDone = isFilled || isPlaced;
  const isMarketsList = Array.isArray(result?.markets);

  const pair = result?.pair || result?.fill?.pair || result?.details?.pair || "MON/USDC";
  const [baseToken = "MON", quoteToken = "USDC"] = pair.includes("/") ? pair.split("/") : [pair, "USDC"];
  const txHash = result?.txHash || null;
  const explorerUrl = result?.explorerUrl || (txHash ? `https://monadscan.com/tx/${txHash}` : null);
  const isSimulation = result?.isSimulation ?? !txHash;

  const displayPrice = result?.midPrice || result?.details?.limitPrice || result?.fill?.executionPrice || "0.00";

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto my-3 px-1 sm:px-0 font-sans">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        {/* Header Banner */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="Kuru Spot CLOB"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                {isDone ? (
                  <Check className="size-4 sm:size-5 text-emerald-400" />
                ) : (
                  <Zap className="size-4 sm:size-5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{pair} CLOB</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    400ms Sub-Second
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                  via Kuru CLOB (Monad) <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-bold text-emerald-400 block">${displayPrice}</span>
              <span className="text-[10px] text-zinc-400">Zero Pending</span>
            </div>
          </div>
        </div>

        {/* Markets List Mode */}
        {isMarketsList && (
          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Active Kuru Spot Pairs</span>
              <span className="text-[10px] text-zinc-500">100+ On-Chain Markets</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.markets.map((m: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/40 hover:border-emerald-500/40 transition cursor-pointer flex flex-col justify-between"
                  onClick={() => onSelectAction?.(`Show order book for ${m.pair} on Kuru`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-zinc-900 dark:text-white">{m.pair}</span>
                    <span className="font-mono text-xs text-emerald-400 font-semibold">${m.lastPrice}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2">
                    <span>Spread: {m.spreadPercent}</span>
                    <span className="text-emerald-400 font-semibold text-[10px]">Trade ➔</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orderbook Mode */}
        {isOrderBook && (
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 text-xs text-zinc-400 pb-1 border-b border-zinc-800 font-medium px-2">
              <span className="text-left">Price ({quoteToken})</span>
              <span className="text-center">Size ({baseToken})</span>
              <span className="text-right">Total Depth</span>
            </div>

            {/* Asks (Red / Rose) */}
            <div className="space-y-1">
              {result.asks?.slice(0, 4).reverse().map((ask: any, idx: number) => (
                <div key={idx} className="grid grid-cols-3 font-mono text-xs hover:bg-rose-500/10 px-2 py-0.5 rounded transition">
                  <span className="text-left text-rose-400 font-medium">{ask.price}</span>
                  <span className="text-center text-zinc-300">{ask.size}</span>
                  <span className="text-right text-zinc-500">{ask.total}</span>
                </div>
              ))}
            </div>

            {/* Mid Price & Spread Indicator */}
            <div className="py-2 px-3 rounded-xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold">${result.midPrice}</span>
                <span className="text-[10px] text-zinc-400">(Mid Market)</span>
              </div>
              <div className="text-[10px] text-zinc-300 font-medium">
                Spread: <span className="text-emerald-400 font-semibold">{result.spread}</span> ({result.spreadPercent})
              </div>
            </div>

            {/* Bids (Green / Emerald) */}
            <div className="space-y-1">
              {result.bids?.slice(0, 4).map((bid: any, idx: number) => (
                <div key={idx} className="grid grid-cols-3 font-mono text-xs hover:bg-emerald-500/10 px-2 py-0.5 rounded transition">
                  <span className="text-left text-emerald-400 font-medium">{bid.price}</span>
                  <span className="text-center text-zinc-300">{bid.size}</span>
                  <span className="text-right text-zinc-500">{bid.total}</span>
                </div>
              ))}
            </div>

            {/* Dynamic Execution Actions */}
            <div className="pt-2 flex items-center gap-2">
              <Button
                size="sm"
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 h-auto rounded-xl shadow"
                onClick={() => onSelectAction?.(`Market buy 100 ${baseToken} on Kuru with ${quoteToken}`)}
              >
                Market Buy {baseToken}
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-2 h-auto rounded-xl shadow"
                onClick={() => onSelectAction?.(`Market sell 100 ${baseToken} on Kuru for ${quoteToken}`)}
              >
                Market Sell {baseToken}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-700 bg-zinc-800/40 text-zinc-200 hover:bg-zinc-700/60 text-xs py-2 h-auto rounded-xl"
                onClick={() => onSelectAction?.(`Place limit order on Kuru to buy 100 ${baseToken} at $${result.midPrice || "0.0240"}`)}
              >
                Set Limit
              </Button>
            </div>
          </div>
        )}

        {/* Execution Confirmation Mode (Placed or Filled) */}
        {isDone && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">
                  {isFilled ? "Order Executed & Filled Instantly!" : "Limit Order Active in CLOB"}
                </div>
                <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">
                  {result.message}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40">
              <div>
                <span className="text-zinc-400 block text-[10px]">PAIR</span>
                <span className="text-white font-semibold">{pair}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">EXECUTION TIME</span>
                <span className="text-emerald-400 font-semibold">{result.executionTimeMs || result.details?.latencyMs || 410}ms (Monad)</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">SLIPPAGE</span>
                <span className="text-zinc-200 font-semibold">{result.fill?.slippageRealized || "0.00% (Resting)"}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">SETTLEMENT</span>
                <span className="text-white font-semibold">{quoteToken === "AUSD" ? "Agora AUSD" : quoteToken}</span>
              </div>
            </div>

            {/* Explorer or Simulation Status */}
            {txHash && explorerUrl ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-400 font-mono">Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  View on MonadScan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Mode: <strong className="text-zinc-200">{result.mode || "Simulation (Pre-Flight Validated)"}</strong></span>
                <span className="text-emerald-400 font-mono">Block #{result.blockNumber}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
