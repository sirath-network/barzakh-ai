"use client";

import Image from "next/image";
import { Cpu, ShieldCheck, Check, ExternalLink, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComputeHedgeCardProps {
  result: any;
  toolCallId?: string;
  onSelectAction?: (promptText: string) => void;
}

export function ComputeHedgeCard({ result, onSelectAction }: ComputeHedgeCardProps) {
  const isContractsList = Array.isArray(result?.contracts);
  const isHedged = result?.status === "hedge_executed" || result?.status === "hedge_simulated";
  const isSlaVerified = result?.status === "verified";

  const txHash = result?.txHash || null;
  const explorerUrl = result?.explorerUrl || (txHash ? `https://monadscan.com/tx/${txHash}` : null);

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto my-3 px-1 sm:px-0 font-sans">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        {/* Header Banner */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="AI Compute Commodity"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                {isHedged || isSlaVerified ? (
                  <Check className="size-4 sm:size-5 text-emerald-400" />
                ) : (
                  <Cpu className="size-4 sm:size-5 text-cyan-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">GPU Compute Commodity</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    H100 / B200 Forward
                  </span>
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                  via Silicon Data Index (Monad) <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-mono font-bold text-cyan-300 block">Silicon Index</span>
              <span className="text-[10px] text-zinc-400">Settled in AUSD</span>
            </div>
          </div>
        </div>

        {/* Contracts List Mode */}
        {isContractsList && (
          <div className="p-4 space-y-3">
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Standardized GPU Capacity Units (Hourly)
            </div>
            <div className="space-y-2">
              {result.contracts.map((c: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl border border-zinc-700/40 bg-zinc-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-white">{c.name}</span>
                      <span className="block text-[11px] text-zinc-400">{c.hardwareSpec}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm font-bold text-cyan-300">${c.spotPriceAUSD} / hr</span>
                      <span className="block text-[10px] text-zinc-400">30d Fwd: ${c.forward30dPriceAUSD}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800">
                    <div>
                      <span className="text-zinc-500 block text-[9px]">CAPACITY / UTILIZATION</span>
                      <span className="text-zinc-200">{c.totalNetworkCapacityHours.toLocaleString()} hrs ({c.utilizationRate})</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block text-[9px]">SLA GUARANTEE</span>
                      <span className="text-emerald-400 font-semibold">{c.slaUptimeGuarantee}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8 rounded-xl shadow"
                      onClick={() => onSelectAction?.(`Hedge 500 hours of ${c.name} at $${c.spotPriceAUSD}/hr on Monad`)}
                    >
                      Hedge 500 hrs (${(c.spotPriceAUSD * 500).toFixed(0)} AUSD)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-zinc-700 bg-zinc-800/40 text-zinc-200 hover:bg-zinc-700 text-xs h-8 rounded-xl"
                      onClick={() => onSelectAction?.(`Verify DePIN GPU node delivery SLA for ${c.name} on Monad`)}
                    >
                      Verify SLA
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hedge Executed / Simulated Mode */}
        {isHedged && (
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
              <Check className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">Compute Capacity Forward Locked!</div>
                <p className="text-xs text-emerald-300/90 mt-0.5 leading-relaxed">{result.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-800/40 p-3 rounded-xl border border-zinc-700/40">
              <div>
                <span className="text-zinc-400 block text-[10px]">TIER</span>
                <span className="text-white font-semibold">{result.details?.hardware}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">HOURS RESERVED</span>
                <span className="text-cyan-300 font-semibold">{result.details?.hoursReserved}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">COMMITTED AUSD</span>
                <span className="text-white font-semibold">{result.details?.totalCommittedAUSD}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">SLA UNDERWRITING</span>
                <span className="text-emerald-400 font-semibold">99.9% Uptime Bond</span>
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
                <span className="text-emerald-400 font-mono">Block #{result.blockNumber}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
