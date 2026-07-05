"use client";

import React, { useState } from "react";
import { Gem, Tag, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { RenaissCard } from "@barzakh/shared/lib/ai/tools/renaiss/renaiss-tools";


interface CardGridProps {
  result: {
    status: string;
    count?: number;
    cards?: RenaissCard[];
    message?: string;
  };
}

const ITEMS_PER_PAGE = 4;

export const RenaissCardGrid: React.FC<CardGridProps> = ({ result }) => {
  const [currentPage, setCurrentPage] = useState(1);

  if (!result || result.status === "error" || !result.cards || result.cards.length === 0) {
    return (
      <div className="text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border/40 font-sans">
        <p>{result?.message || "No collectible cards found."}</p>
        <p className="text-[10px] text-zinc-500 mt-2 italic">
          Card coverage is still growing. Some data may be missing or incomplete.
        </p>
      </div>
    );
  }

  const cards = result.cards;
  const totalPages = Math.ceil(cards.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const visibleCards = cards.slice(startIndex, endIndex);

  return (
    <div className="w-full max-w-2xl mb-6 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Gem className="size-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Renaiss Vault Marketplace
          </span>
        </div>
        <span className="text-xs text-zinc-500">
          Showing {startIndex + 1}–{Math.min(endIndex, cards.length)} of {cards.length}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleCards.map((card) => {
          const isUndervalued = card.priceUsd > 0 && card.priceUsd < card.fmvUsd;
          const discountPercent = isUndervalued
            ? Math.round(((card.fmvUsd - card.priceUsd) / card.fmvUsd) * 100)
            : 0;

          return (
            <div
              key={card.id}
              className="group flex flex-col rounded-2xl bg-[#09090b]/80 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-[#0c0c0e]/95 transition-all duration-300 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
            >
              {/* Graded Slab Image Section */}
              <a
                href={card.cardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 sm:py-4 flex items-center justify-center border-b border-zinc-900/60 relative overflow-hidden group/link cursor-pointer"
              >
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-auto object-contain max-h-[180px] sm:max-h-[250px] px-2 drop-shadow-2xl rounded-sm mix-blend-lighten"
                  />
                ) : (
                  <div className="w-full h-[140px] sm:h-[180px] flex items-center justify-center text-zinc-600 text-xs font-medium">
                    <Gem className="size-8 text-zinc-700" />
                  </div>
                )}
                {/* External link indicator */}
                <div className="absolute bottom-2.5 right-2.5 opacity-0 group-hover/link:opacity-100 transition-opacity bg-zinc-900/90 border border-zinc-800/50 p-1.5 rounded-lg shadow-md">
                  <ExternalLink className="size-3 text-zinc-300" />
                </div>
              </a>

              {/* Card Info Section */}
              <div className="flex flex-col flex-1 p-3.5 sm:p-4 justify-between bg-zinc-950/20">
                <div>
                  <a
                    href={card.cardUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline block"
                  >
                    <h3 className="text-xs sm:text-[13px] font-bold text-white leading-snug line-clamp-2 group-hover:text-zinc-200 transition-colors">
                      {card.name}
                    </h3>
                  </a>
                  <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-1 font-medium">
                    {card.set} • {card.rarity}
                  </p>
                </div>

                {/* Pricing Block */}
                <div className="mt-3.5 sm:mt-4 flex items-end justify-between border-t border-zinc-900/60 pt-3">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">
                      Listed Price
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-white">
                      {card.priceUsd > 0 ? (
                        `$${card.priceUsd.toLocaleString()}`
                      ) : (
                        <span className="text-amber-500 font-semibold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] sm:text-xs">
                          Unlisted
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[8px] sm:text-[9px] text-zinc-500 block uppercase font-bold tracking-wider">
                      Est. Value (FMV)
                    </span>
                    <span className="text-xs font-bold text-zinc-400">
                      ${card.fmvUsd.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Undervalued / Deal badge */}
                {isUndervalued && (
                  <div className="mt-2.5 w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[9px] sm:text-[10px] font-bold text-emerald-400 shadow-[0_2px_8px_rgba(16,185,129,0.05)]">
                    <Tag className="size-3" />
                    UNDERVALUED BY {discountPercent}% (${(card.fmvUsd - card.priceUsd).toLocaleString()} discount)
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 px-1 border-t border-zinc-900/60 pt-3">
        <div className="text-[10px] text-zinc-500 italic order-last sm:order-first text-center sm:text-left">
          Card coverage is still growing. Some data may be missing or incomplete.
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center sm:justify-end gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-850 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs text-zinc-400 font-medium px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800/80 hover:bg-zinc-850 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
