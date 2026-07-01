"use client";

import React, { useState } from "react";
import { Package, Shield, HelpCircle, ArrowRight, Zap, RefreshCw, Layers } from "lucide-react";

interface Pack {
  slug: string;
  name: string;
  packType: string;
  stage: string;
  description: string;
  author: string;
  priceInUsdt: string;
  expectedValueInUsd: string;
  featuredCardFmvInUsd: string;
  recentOpenedPacks?: {
    collectibleTokenId: string;
    tier: string;
    fmv: string;
    pulledAtTimestamp: number;
  }[];
}

interface RenaissPacksProps {
  result: {
    status: string;
    packs?: Pack[];
    pack?: Pack;
    message?: string;
  };
}

export const RenaissPacks: React.FC<RenaissPacksProps> = ({ result }) => {
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);

  if (!result || result.status === "error" || (result.message && !result.packs && !result.pack)) {
    return (
      <div className="text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border/40 font-sans">
        <p>{result?.message || "Failed to load pack data."}</p>
      </div>
    );
  }

  // Determine if it is a single pack details query or a list
  const isSingle = !!result.pack;
  const pack = result.pack || selectedPack;
  const packs = result.packs || [];

  const getPackColor = (slug: string) => {
    switch (slug) {
      case "eden-pack":
        return {
          border: "border-amber-500/30 hover:border-amber-500/50",
          glow: "shadow-[0_8px_32px_rgba(245,158,11,0.08)]",
          accent: "text-amber-400",
          bg: "bg-amber-500/10",
        };
      case "omega":
        return {
          border: "border-fuchsia-500/30 hover:border-fuchsia-500/50",
          glow: "shadow-[0_8px_32px_rgba(217,70,239,0.08)]",
          accent: "text-fuchsia-400",
          bg: "bg-fuchsia-500/10",
        };
      case "renacrypt-pack":
        return {
          border: "border-emerald-500/30 hover:border-emerald-500/50",
          glow: "shadow-[0_8px_32px_rgba(16,185,129,0.08)]",
          accent: "text-emerald-400",
          bg: "bg-emerald-500/10",
        };
      default:
        return {
          border: "border-zinc-800 hover:border-zinc-700",
          glow: "shadow-md",
          accent: "text-zinc-400",
          bg: "bg-zinc-850",
        };
    }
  };

  const formatUsdt = (priceStr: string) => {
    try {
      const val = Number(BigInt(priceStr) / BigInt(1e18));
      return `${val.toLocaleString()} USDT`;
    } catch {
      return "0 USDT";
    }
  };

  const formatUsd = (centsStr: string) => {
    const cents = Number(centsStr);
    return `$${(cents / 100).toLocaleString()}`;
  };

  // Render single pack details
  if (isSingle && result.pack) {
    const p = result.pack;
    const colors = getPackColor(p.slug);
    return (
      <div className={`w-full max-w-2xl mb-6 rounded-2xl bg-[#09090b]/80 border ${colors.border} ${colors.glow} overflow-hidden font-sans p-6`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
              {p.author} • {p.packType}
            </span>
            <h2 className="text-xl font-extrabold text-white mt-1 flex items-center gap-2">
              <Package className={`size-5 ${colors.accent}`} />
              {p.name}
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wide">
            {p.stage}
          </span>
        </div>

        {/* Pricing Info */}
        <div className="grid grid-cols-3 gap-4 bg-zinc-950/40 p-4 rounded-xl border border-zinc-900 mb-6">
          <div>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Price</span>
            <span className="text-sm sm:text-base font-extrabold text-white mt-0.5 block">
              {formatUsdt(p.priceInUsdt)}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Expected Value</span>
            <span className="text-sm sm:text-base font-extrabold text-zinc-300 mt-0.5 block">
              {formatUsd(p.expectedValueInUsd)}
            </span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider block">Featured Card</span>
            <span className="text-sm sm:text-base font-extrabold text-amber-400 mt-0.5 block">
              {formatUsd(p.featuredCardFmvInUsd)}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="text-xs text-zinc-400 leading-relaxed mb-6 whitespace-pre-line border-b border-zinc-900 pb-5">
          {p.description}
        </div>

        {/* Recent Activity */}
        {p.recentOpenedPacks && p.recentOpenedPacks.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="size-3.5 text-amber-500" />
              Recent Gacha Pulls
            </h3>
            <div className="space-y-2">
              {p.recentOpenedPacks.slice(0, 5).map((pull, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/20 border border-zinc-900/60 hover:bg-zinc-950/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="size-2 rounded-full bg-emerald-500" />
                    <div>
                      <span className="text-[10px] font-bold text-zinc-200 block">
                        Cert Token #{pull.collectibleTokenId.substring(0, 8)}...{pull.collectibleTokenId.substring(pull.collectibleTokenId.length - 4)}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        {new Date(pull.pulledAtTimestamp * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-300 block">
                      ${(Number(pull.fmv) / 100).toLocaleString()}
                    </span>
                    <span className="text-[9px] text-zinc-500 uppercase font-bold">
                      {pull.tier}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render packs list
  return (
    <div className="w-full max-w-2xl mb-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 px-1">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Renaiss Infinite Gacha Pool
          </span>
        </div>
        <span className="text-xs text-zinc-500">{packs.length} Active Pools</span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4">
        {packs.map((p) => {
          const colors = getPackColor(p.slug);
          return (
            <div
              key={p.slug}
              className={`group flex flex-col rounded-2xl bg-[#09090b]/80 border ${colors.border} ${colors.glow} hover:bg-[#0c0c0e]/95 transition-all duration-300 overflow-hidden shadow-lg p-5`}
            >
              {/* Top Row */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                    {p.author} • {p.packType}
                  </span>
                  <h3 className="text-base font-extrabold text-white mt-0.5 group-hover:text-zinc-200 transition-colors">
                    {p.name}
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 uppercase tracking-wide">
                  {p.stage}
                </span>
              </div>

              {/* Description Snippet */}
              <p className="text-xs text-zinc-400 mt-2.5 line-clamp-2 leading-relaxed">
                {p.description}
              </p>

              {/* Pricing & EV Row */}
              <div className="grid grid-cols-3 gap-3 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900/60 mt-4">
                <div>
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block">Price</span>
                  <span className="text-xs font-extrabold text-white mt-0.5 block">
                    {formatUsdt(p.priceInUsdt)}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block">Expected Value</span>
                  <span className="text-xs font-bold text-zinc-300 mt-0.5 block">
                    {formatUsd(p.expectedValueInUsd)}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] uppercase font-bold text-zinc-500 tracking-wider block">Top Card FMV</span>
                  <span className="text-xs font-bold text-amber-400 mt-0.5 block">
                    {formatUsd(p.featuredCardFmvInUsd)}
                  </span>
                </div>
              </div>

              {/* Bottom Row / Info */}
              <div className="mt-4 flex items-center justify-between border-t border-zinc-900/40 pt-3 text-[10px]">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <Shield className="size-3.5 text-zinc-600" />
                  <span>ZK Merkle Fairness Verification Enabled</span>
                </div>
                
                <span className={`flex items-center gap-0.5 font-bold ${colors.accent} uppercase tracking-wider`}>
                  Details <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Disclaimer */}
      <div className="text-[10px] text-zinc-500 italic text-center mt-4">
        Card coverage is still growing. Some data may be missing or incomplete.
      </div>
    </div>
  );
};
