"use client";

import Image from "next/image";
import { Sparkles, TrendingUp, TrendingDown, CheckCircle2, ExternalLink } from "lucide-react";

interface DreamDexAnalysisCardProps {
  result: any;
  onSelectAction?: (promptText: string) => void;
}

export function DreamDexAnalysisCard({ result, onSelectAction }: DreamDexAnalysisCardProps) {
  if (!result) return null;

  const dispatchAction = (promptText: string) => {
    if (onSelectAction) {
      onSelectAction(promptText);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("barzakh:send-prompt", { detail: { prompt: promptText } }));
    }
  };

  const marketSymbol = result.marketSymbol || result.symbol || "ETH-UP-1h";
  const question = result.question || `Will ${marketSymbol} settle UP?`;
  const convictionScore = typeof result.convictionScore === "number" ? result.convictionScore : 50;
  const conviction = result.conviction || (convictionScore >= 60 ? "Lean Up" : convictionScore <= 40 ? "Lean Down" : "Neutral");
  const reasoning: string[] = Array.isArray(result.reasoning) ? result.reasoning : [];
  const riskLevel = result.riskLevel || "Medium";
  const suggestedAction = result.suggestedAction || "";
  const explorerUrl = result.explorerUrl || `https://shannon-explorer.somnia.network`;

  const isBullish = convictionScore >= 55;
  const isBearish = convictionScore <= 45;

  const convictionColor = isBullish
    ? "text-emerald-400"
    : isBearish
    ? "text-rose-400"
    : "text-amber-400";

  const convictionBg = isBullish
    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
    : isBearish
    ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
    : "bg-amber-500/10 border-amber-500/25 text-amber-400";

  return (
    <div className="w-full max-w-lg sm:max-w-xl mx-auto my-3 px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        {/* Header Banner */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="AI Prediction Analysis"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                <Sparkles className="size-4 sm:size-5 text-zinc-200" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  AI Market Conviction
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                  <span className="font-mono text-zinc-300 font-semibold">{marketSymbol}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs text-zinc-300 font-medium shrink-0">
              <span>Somnia Shannon</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-4 space-y-3">
          {/* Question & Market Info */}
          <div className="p-3 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60">
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">Target Question</span>
            <p className="text-xs sm:text-sm font-medium text-white mt-1 leading-snug">
              {question}
            </p>
          </div>

          {/* Conviction Score Card */}
          <div className="p-3.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] text-zinc-400 font-medium">AI Conviction Score</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-2xl sm:text-3xl font-mono font-bold ${convictionColor}`}>
                    {convictionScore}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">/ 100</span>
                </div>
              </div>

              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-flex items-center gap-1 ${convictionBg}`}>
                  {isBullish ? <TrendingUp className="size-3.5" /> : isBearish ? <TrendingDown className="size-3.5" /> : null}
                  {conviction}
                </span>
                <span className="block text-[10px] text-zinc-400 mt-1 font-mono">
                  Risk: <strong className="text-zinc-300">{riskLevel}</strong>
                </span>
              </div>
            </div>

            {/* Visual Gauge Meter */}
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden flex gap-0.5 p-0.5">
                <div
                  className="h-full bg-rose-400 rounded-l-full transition-all duration-500"
                  style={{ width: `${Math.min(convictionScore, 45)}%` }}
                />
                <div
                  className="h-full bg-amber-400 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(convictionScore - 45, 10))}%` }}
                />
                <div
                  className="h-full bg-emerald-400 rounded-r-full transition-all duration-500"
                  style={{ width: `${Math.max(0, convictionScore - 55)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400 font-mono px-0.5">
                <span>0 Down</span>
                <span>50 Neutral</span>
                <span>100 Up</span>
              </div>
            </div>
          </div>

          {/* Reasoning Points */}
          {reasoning.length > 0 && (
            <div className="p-3 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 space-y-2">
              <span className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-zinc-400" /> Key Analysis & Reasoning
              </span>
              <ul className="space-y-1.5">
                {reasoning.map((item, idx) => (
                  <li key={idx} className="text-[11px] sm:text-xs text-zinc-300 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggested Action */}
          {suggestedAction && (
            <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/80 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Suggested Strategy</span>
              <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                {suggestedAction}
              </p>
            </div>
          )}

          {/* Quick Action Trading Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-sm transition-all duration-150 active:scale-95 cursor-pointer"
              onClick={() => dispatchAction(`Put 10 tUSDC on UP for ${marketSymbol}`)}
            >
              <TrendingUp className="size-3.5 shrink-0 text-emerald-600" />
              <span className="truncate">Bet UP (10 tUSDC)</span>
            </button>
            <button
              type="button"
              className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer"
              onClick={() => dispatchAction(`Put 10 tUSDC on DOWN for ${marketSymbol}`)}
            >
              <TrendingDown className="size-3.5 shrink-0 text-rose-400" />
              <span className="truncate">Bet DOWN (10 tUSDC)</span>
            </button>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noreferrer"
              title="View on Somnia Explorer"
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
