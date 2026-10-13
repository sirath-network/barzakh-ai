"use client";

import { ArrowRight, Check, ExternalLink, Globe } from "lucide-react";
import { MonadCard } from "./monad-card";
import styles from "./monad-card.module.css";
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
    <MonadCard
      title="Aurora Intents"
      badge="NEAR Intents Engine"
      subtitle="Zero-Slippage Cross-Chain Inflow"
      metric="Any-Chain Deposit"
      metricLabel="Settles in AUSD"
      icon={isSettled ? <Check className="size-5 text-emerald-400" /> : <Globe className="size-5 text-emerald-400" />}
    >
      {/* Quote Ready Mode */}
      {isQuote && (
        <div className="p-3 sm:p-4 space-y-3">
          <div className={`${styles.transfer} p-3.5 rounded-xl bg-zinc-800/60 border border-zinc-700/40`}>
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

          <div className={`${styles.details} gap-2 text-xs font-mono bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40`}>
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
            className="w-full min-h-11 h-auto whitespace-normal bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2.5 rounded-xl shadow mt-1"
            onClick={() => onSelectAction?.(`Execute Aurora Intent deposit for intent ${result.intentId} to fund Monad margin`)}
          >
            Deposit & Execute on Monad
          </Button>
        </div>
      )}

      {/* Settled / Simulated Mode */}
      {isSettled && (
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">Cross-Chain Intent Fulfilled!</div>
              <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">{result.message}</p>
            </div>
          </div>

          <div className={`${styles.details} gap-2 text-xs font-mono bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40`}>
            <div>
              <span className="text-zinc-400 block text-[10px]">INTENT ID</span>
              <span className="text-white font-semibold block">{result.intentId}</span>
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
            <div className={`${styles.row} pt-1`}>
              <span className="text-[11px] text-zinc-400 font-mono">Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
              <a href={explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold">
                View on MonadScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className={`${styles.row} p-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 text-[11px] text-zinc-400`}>
              <span>Mode: <strong className="text-zinc-200">{result.mode || "Simulation (Dry-Run)"}</strong></span>
              <span className="text-emerald-400 font-mono">Chain ID #143</span>
            </div>
          )}
        </div>
      )}
    </MonadCard>
  );
}
