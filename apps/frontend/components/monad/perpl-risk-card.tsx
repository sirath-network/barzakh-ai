"use client";

import { ShieldAlert, Check, ExternalLink, Activity } from "lucide-react";
import { MonadCard } from "./monad-card";
import styles from "./monad-card.module.css";
import { Button } from "@/components/ui/button";

interface PerplRiskCardProps {
  result: any;
  toolCallId?: string;
  onSelectAction?: (promptText: string) => void;
}

export function PerplRiskCard({ result, onSelectAction }: PerplRiskCardProps) {
  const isPositionsList = Array.isArray(result?.positions);
  const isOpened = result?.status === "position_opened";
  const isClosed = result?.status === "closed";
  const isRiskMetrics = !!result?.stressTestScenarios;
  const isMarketsList = Array.isArray(result?.markets);

  const txHash = result?.txHash || null;
  const explorerUrl = result?.explorerUrl || (txHash ? `https://monadscan.com/tx/${txHash}` : null);
  const healthLabel = result?.overallHealthFactor || result?.healthFactor || "2.45 (Safe)";

  return (
    <MonadCard
      title="Perpl Perpetuals"
      badge="Agora AUSD Margin"
      subtitle="via Perpl Engine (Monad)"
      metric={`Health: ${healthLabel}`}
      metricLabel="Sub-Second Risk"
      icon={isOpened || isClosed ? <Check className="size-5 text-emerald-400" /> : isRiskMetrics ? <ShieldAlert className="size-5 text-amber-400" /> : <Activity className="size-5 text-emerald-400" />}
    >
      {/* Markets Mode */}
      {isMarketsList && (
        <div className="p-3 sm:p-4 space-y-2.5">
          <div className={`${styles.row} text-xs font-semibold text-zinc-400 uppercase tracking-wider`}>
            <span>Perpl Futures Markets</span>
            <span className="text-[10px] text-zinc-500">Cross-Margin in AUSD</span>
          </div>
          <div className={`${styles.markets} gap-2`}>
            {result.markets.map((m: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-800/40 hover:border-emerald-500/40 transition cursor-pointer flex flex-col justify-between"
                onClick={() => onSelectAction?.(`Open 5x Long on ${m.pair} with 100 AUSD collateral on Perpl`)}
              >
                <div className={styles.row}>
                  <span className="font-bold text-sm text-zinc-900 dark:text-white">{m.pair}</span>
                  <span className="font-mono text-xs text-emerald-400 font-semibold">${m.markPrice}</span>
                </div>
                <div className={`${styles.row} text-[11px] text-zinc-400 mt-2`}>
                  <span>Funding: {m.fundingRate8h || "-0.003%"}</span>
                  <span className="text-emerald-400 font-semibold text-[10px]">Trade ➔</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positions List Mode */}
      {isPositionsList && (
        <div className="p-3 sm:p-4 space-y-3">
          <div className={`${styles.row} text-xs text-zinc-400 font-medium`}>
            <span>Active Positions ({result.positions.length})</span>
            <span className="text-emerald-400 font-mono">Unrealized PnL: {result.totalUnrealizedPnLAUSD || "+$35.00"} AUSD</span>
          </div>

          <div className="space-y-2">
            {result.positions.map((pos: any, idx: number) => {
              const isLong = pos.side === "LONG";
              return (
                <div key={idx} className="p-3 rounded-xl border border-zinc-700/40 bg-zinc-800/40 space-y-2">
                  <div className={styles.row}>
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">{pos.market}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${isLong ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                        {pos.leverage}x {pos.side}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {pos.unrealizedPnLPercent} (+${pos.unrealizedPnLAUSD} AUSD)
                    </span>
                  </div>

                  <div className={`${styles.positionDetails} gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800`}>
                    <div>
                      <span className="block text-[9px] text-zinc-500">ENTRY / MARK</span>
                      <span className="text-white">${pos.entryPrice} / ${pos.markPrice}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-500">LIQ PRICE</span>
                      <span className="text-rose-400 font-semibold">${pos.liquidationPrice}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] text-zinc-500">BUFFER</span>
                      <span className="text-emerald-400 font-semibold">{pos.distanceToLiquidationPercent}</span>
                    </div>
                  </div>

                  <div className={`${styles.actions} pt-1`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-zinc-700 bg-zinc-800/40 text-zinc-200 hover:bg-zinc-700 text-xs h-8 rounded-xl"
                      onClick={() => onSelectAction?.(`Stress test my portfolio risk and liquidation scenarios on Perpl`)}
                    >
                      Stress Test Risk
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs h-8 rounded-xl"
                      onClick={() => onSelectAction?.(`Close ${pos.market} position on Perpl and return AUSD margin`)}
                    >
                      Close Position
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Position Opened Mode */}
      {isOpened && (
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-white">Leveraged Position Active on Monad!</div>
              <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">{result.message}</p>
            </div>
          </div>

          <div className={`${styles.details} gap-2 text-xs font-mono bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40`}>
            <div>
              <span className="text-zinc-400 block text-[10px]">MARKET</span>
              <span className="text-white font-semibold">{result.details?.market}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">LEVERAGE</span>
              <span className="text-emerald-400 font-semibold">{result.details?.leverage}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">COLLATERAL</span>
              <span className="text-white font-semibold">{result.details?.collateralAllocated}</span>
            </div>
            <div>
              <span className="text-zinc-400 block text-[10px]">EST. LIQUIDATION</span>
              <span className="text-rose-400 font-semibold">{result.details?.estimatedLiquidationPrice}</span>
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
              <span className="text-emerald-400 font-mono">Block #{result.blockNumber}</span>
            </div>
          )}
        </div>
      )}

      {/* Risk Metrics & Stress Testing Mode */}
      {isRiskMetrics && (
        <div className="p-3 sm:p-4 space-y-3">
          <div className={`${styles.row} p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/40`}>
            <div>
              <span className="text-[10px] text-zinc-400 uppercase block">Cross-Margin Engine</span>
              <span className="text-sm font-bold text-white">Agora AUSD Collateral</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase block">Portfolio Health Factor</span>
              <span className="text-base font-mono font-bold text-emerald-400">{result.healthFactor} (Safe)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">Liquidation Stress Test Scenarios</span>
            <div className="space-y-1.5">
              {result.stressTestScenarios.map((sc: any, idx: number) => (
                <div key={idx} className={`${styles.scenario} p-2.5 rounded-xl border border-zinc-700/40 bg-zinc-800/40  text-xs font-mono`}>
                  <span className="text-zinc-200 font-medium">{sc.shock}</span>
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="text-zinc-400">Health: {sc.newHealthFactor}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sc.liquidationRisk === "LOW" ? "bg-emerald-500/20 text-emerald-400" : sc.liquidationRisk === "MODERATE" ? "bg-amber-500/20 text-amber-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {sc.liquidationRisk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {Array.isArray(result.recommendations) && (
            <div className="p-3 rounded-xl bg-zinc-800/30 border border-zinc-700/30 space-y-1 text-xs text-zinc-300">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Agent Recommendations:</span>
              {result.recommendations.map((rec: string, idx: number) => (
                <p key={idx} className="flex items-start gap-1.5">
                  <span className="text-emerald-400 shrink-0">•</span>
                  <span>{rec}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </MonadCard>
  );
}
