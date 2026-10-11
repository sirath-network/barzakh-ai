"use client";

import Image from "next/image";
import { ArrowRight, Check, ExternalLink, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuroraIntentCardProps {
  result: any;
  toolCallId?: string;
  onSelectAction?: (promptText: string) => void;
}

export function AuroraIntentCard({ result, onSelectAction }: AuroraIntentCardProps) {
  const isQuote = result?.status === "quote_ready";
  const isSettled = result?.status === "intent_settled" || result?.status === "intent_simulated";
  const txHash = result?.txHash || null;
  const explorerUrl = result?.explorerUrl || (txHash ? `https://monadscan.com/tx/${txHash}` : null);

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto my-3 px-1 sm:px-0 font-sans">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        {/* Header Banner */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="Aurora Intents"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                {isSettled ? (
                  <Check className="size-4 sm:size-5 text-emerald-400" />
                ) : (
                  <Globe className="size-4 sm:size-5 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">Aurora Intents</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    NEAR Intents Engine
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                  Zero-Slippage Cross-Chain Inflow <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-bold text-emerald-400 block">Any-Chain Deposit</span>
              <span className="text-[10px] text-zinc-400">Settles in AUSD</span>
            </div>
          </div>
        </div>

        {/* Quote Ready Mode */}
        {isQuote && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
              <div className="text-left">
                <span className="text-[10px] text-zinc-400 uppercase block font-mono">You Deposit</span>
                <span className="text-sm font-bold text-white font-mono">{result.sourceAmount}</span>
              </div>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 border border-white/10 text-emerald-400">
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase block font-mono">You Receive on Monad</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">{result.estimatedReceive}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40">
              <div>
                <span className="text-zinc-500 block text-[10px]">ROUTE</span>
                <span className="text-white font-semibold">{result.route}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">SETTLEMENT TIME</span>
                <span className="text-emerald-400 font-semibold">{result.estimatedSettlementTimeSeconds} Seconds</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">PRICE GUARANTEE</span>
                <span className="text-zinc-200 font-semibold">Yes (Solver Backed)</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">RELAYER FEE</span>
                <span className="text-zinc-200 font-semibold">{result.relayerFee}</span>
              </div>
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow mt-1"
              onClick={() => onSelectAction?.(`Execute Aurora Intent deposit for intent ${result.intentId} to fund Monad margin`)}
            >
              Deposit & Execute on Monad
            </Button>
          </div>
        )}

        {/* Settled / Simulated Mode */}
        {isSettled && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Cross-Chain Intent Fulfilled!</div>
                <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">{result.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40">
              <div>
                <span className="text-zinc-400 block text-[10px]">INTENT ID</span>
                <span className="text-white font-semibold truncate block">{result.intentId}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">PROTOCOL</span>
                <span className="text-emerald-400 font-semibold">{result.protocol}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">POST-ACTION</span>
                <span className="text-zinc-200 font-semibold">{result.postActionExecuted}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">SETTLEMENT</span>
                <span className="text-white font-semibold">Agora AUSD</span>
              </div>
            </div>

            {txHash && explorerUrl ? (
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-zinc-400 font-mono">Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                <a href={explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
                  View on MonadScan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>Mode: <strong className="text-zinc-200">{result.mode || "Simulation (Dry-Run)"}</strong></span>
                <span className="text-emerald-400 font-mono">Chain ID #143</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
