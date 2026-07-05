"use client";

import React from "react";
import { MapPin, Landmark, Copy, Check, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { RenaissCard } from "@barzakh/shared/lib/ai/tools/renaiss/renaiss-tools";


interface CardDetailProps {
  result: {
    status: string;
    card?: RenaissCard & {
      priceDifferenceUsd?: number;
      premiumOrDiscountPercent?: number;
      marketCondition?: string;
      isUndervalued?: boolean;
      chain?: string;
      contractAddress?: string;
      explorerUrl?: string;
    };
    message?: string;
  };
}

export const RenaissCardDetail: React.FC<CardDetailProps> = ({ result }) => {
  const [copied, setCopied] = React.useState(false);

  if (!result || result.status === "error" || !result.card) {
    return (
      <div className="text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border/40 font-sans">
        {result?.message || "Collectible card details not found."}
      </div>
    );
  }

  const card = result.card;
  const isUndervalued = card.priceUsd > 0 && (card.isUndervalued ?? (card.priceUsd < card.fmvUsd));
  const premiumOrDiscount = card.priceUsd > 0 
    ? (card.premiumOrDiscountPercent ?? Number((((card.priceUsd - card.fmvUsd) / card.fmvUsd) * 100).toFixed(2)))
    : 0;
  
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (card.contractAddress) {
      navigator.clipboard.writeText(card.contractAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // SVG Chart points calculation for 4 price history points
  const history = card.priceHistory || [];
  const prices = history.map(h => h.price);
  const maxPrice = Math.max(...prices, card.fmvUsd) * 1.05;
  const minPrice = Math.min(...prices, card.priceUsd) * 0.95;
  const priceRange = maxPrice - minPrice;

  // Map 4 points to SVG coordinates (x: 0 to 200, y: 80 to 10)
  const chartPoints = history.map((pt, i) => {
    const x = (i / (history.length - 1)) * 260 + 20;
    const y = 80 - ((pt.price - minPrice) / priceRange) * 70;
    return { x, y, date: pt.date, price: pt.price };
  });

  const svgPath = chartPoints.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  return (
    <div className="w-full max-w-2xl mb-6 rounded-2xl bg-muted/30 border border-border/30 overflow-hidden shadow-md flex flex-col md:flex-row font-sans">
      {/* Left side: Premium Card Image */}
      <a
        href={card.cardUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="md:w-5/12 py-6 flex flex-col items-center justify-center relative border-b md:border-b-0 md:border-r border-border/20 cursor-pointer group/detail-slab"
      >
        <img
          src={card.imageUrl}
          alt={card.name}
          className="w-full h-auto max-h-[350px] object-contain drop-shadow-2xl rounded-sm mix-blend-lighten"
        />

        <span className="text-[10px] text-zinc-500 mt-4 font-mono select-all">
          PSA CERT #{card.certNumber}
        </span>
      </a>

      {/* Right side: Detailed Specs & History */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          {/* Card Meta */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1">
            {card.set}
          </div>
          <a
            href={card.cardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline block"
          >
            <h2 className="text-lg font-bold text-white leading-snug hover:text-zinc-200 transition-colors">
              {card.name}
            </h2>
          </a>
          <p className="text-xs text-zinc-400 mt-1">
            Rarity: <span className="text-zinc-200 font-semibold">{card.rarity}</span>
          </p>

          {/* Pricing Info */}
          <div className="grid grid-cols-2 gap-4 mt-5 bg-muted/20 p-3.5 rounded-xl border border-border/20">
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wide block">
                Listed Price
              </span>
              <span className="text-xl font-extrabold text-white">
                {card.priceUsd > 0 ? (
                  `$${card.priceUsd.toLocaleString()}`
                ) : (
                  <span className="text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-xs">
                    Unlisted
                  </span>
                )}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wide block">
                Fair Market Value (FMV)
              </span>
              <span className="text-lg font-bold text-zinc-400 block mt-0.5">
                ${card.fmvUsd.toLocaleString()}
              </span>
            </div>

            {/* Price evaluation badge */}
            <div className="col-span-2 border-t border-border/10 pt-2.5 flex items-center justify-between">
              <span className="text-[10px] font-medium text-zinc-500">Market Status</span>
              {card.priceUsd <= 0 ? (
                <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Vaulted (Unlisted)
                </span>
              ) : isUndervalued ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  <TrendingDown className="size-3.5" />
                  UNDERVALUED ({Math.abs(premiumOrDiscount)}% Discount)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  <TrendingUp className="size-3.5" />
                  PREMIUM ({premiumOrDiscount}% Over FMV)
                </span>
              )}
            </div>
          </div>

          {/* Custody Info */}
          <div className="mt-5 space-y-2.5 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-zinc-500 flex-shrink-0" />
              <span>Physical Vault Location: <strong className="text-zinc-200">{card.vaultLocation}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Landmark className="size-4 text-zinc-500 flex-shrink-0" />
              <span>Custody Status: <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-[10px]">VERIFIED VAULTED</span></span>
            </div>
          </div>
        </div>

        {/* Small trend chart */}
        <div className="mt-6 border-t border-border/20 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">Price History (USD)</span>
            <span className="text-[10px] text-zinc-500">Last 6 Months</span>
          </div>
          <div className="w-full bg-slate-950/40 rounded-xl p-3 border border-border/20">
            <svg viewBox="0 0 300 90" className="w-full overflow-visible">
              {/* Grid Lines */}
              <line x1="20" y1="10" x2="280" y2="10" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
              <line x1="20" y1="45" x2="280" y2="45" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
              <line x1="20" y1="80" x2="280" y2="80" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />

              {/* Price Line */}
              <path
                d={svgPath}
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Chart Points */}
              {chartPoints.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="3.5" className="fill-white stroke-slate-950 stroke-2" />
                  <text
                    x={pt.x}
                    y={pt.y - 8}
                    textAnchor="middle"
                    className="fill-zinc-300 font-mono text-[8px] font-bold"
                  >
                    ${pt.price >= 1000 ? `${(pt.price / 1000).toFixed(1)}k` : pt.price}
                  </text>
                  <text
                    x={pt.x}
                    y="90"
                    textAnchor="middle"
                    className="fill-zinc-500 font-mono text-[7px]"
                  >
                    {pt.date.substring(5)}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Action / Blockchain Footer */}
        {card.contractAddress && (
          <div className="mt-5 border-t border-border/20 pt-4 flex items-center justify-between gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span>NFT Contract:</span>
              <span className="font-mono text-zinc-200 font-medium select-all">
                {card.contractAddress.substring(0, 6)}...{card.contractAddress.substring(card.contractAddress.length - 4)}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 rounded bg-muted/40 hover:bg-muted/80 text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              </button>
            </div>

            <div className="flex items-center gap-3">
              {card.cardUrl && (
                <a
                  href={card.cardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-300 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  View on Renaiss
                  <ExternalLink className="size-3" />
                </a>
              )}

              {card.explorerUrl && (
                <a
                  href={card.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                >
                  BscScan Link
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
