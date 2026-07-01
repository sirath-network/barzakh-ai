"use client";

import React from "react";
import { Wallet, Sparkles, ExternalLink } from "lucide-react";
import { RenaissCard } from "@barzakh/shared/lib/ai/tools/renaiss/renaiss-tools";


interface CollectionResultProps {
  result: {
    status: string;
    address: string;
    contractAddress?: string;
    chain?: string;
    onChainNftBalance?: number;
    isDemoWallet?: boolean;
    collection?: {
      totalCards: number;
      totalValueUsd: number;
      totalFmvUsd: number;
      cards: RenaissCard[];
    };
    message?: string;
  };
}

export const RenaissCollection: React.FC<CollectionResultProps> = ({ result }) => {
  if (!result || result.status === "error" || !result.collection) {
    return (
      <div className="text-muted-foreground p-4 bg-muted/30 rounded-xl border border-border/40 font-sans">
        {result?.message || "Collection details not found."}
      </div>
    );
  }

  const { address, onChainNftBalance = 0, isDemoWallet = false, collection } = result;
  const cards = collection.cards;

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="w-full max-w-2xl mb-6 font-sans">
      {/* Wallet / Collection Header Card */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 mb-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-300">
            <Wallet className="size-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Renaiss Vault Custodian
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-mono text-white font-bold select-all">
                {truncateAddress(address)}
              </span>
              {isDemoWallet && (
                <span className="text-[9px] font-bold text-zinc-300 bg-zinc-800 border border-zinc-700/50 px-2 py-0.5 rounded">
                  Demo Vault
                </span>
              )}
              {onChainNftBalance > 0 && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded">
                  {onChainNftBalance} on-chain NFTs
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats summary */}
        <div className="flex gap-4 sm:border-l border-border/20 sm:pl-6">
          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider block">
              Total Value (Est.)
            </span>
            <span className="text-base font-extrabold text-white">
              ${collection.totalValueUsd.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wider block">
              Vaulted Cards
            </span>
            <span className="text-base font-extrabold text-white text-right block sm:text-left">
              {collection.totalCards}
            </span>
          </div>
        </div>
      </div>

      {/* Cards list displayed as a grid matching Renaiss UI */}
      {cards.length === 0 ? (
        <div className="text-center p-8 bg-muted/20 rounded-2xl border border-border/20 flex flex-col items-center gap-2">
          <Sparkles className="size-8 text-muted-foreground/60" />
          <h3 className="text-sm font-semibold text-foreground">Empty Vault Collection</h3>
          <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
            This wallet doesn't hold any tokenized Renaiss cards yet. 
            Try checking one of our preconfigured demo vaults:
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs mt-3 font-mono text-xs">
            <div className="p-2 rounded bg-slate-900 border border-border/40 flex justify-between items-center text-muted-foreground">
              <span>Demo Vault 1:</span>
              <span className="text-zinc-400 select-all">0x39ba5db37996cba53d12275cd66b05fce14b8765</span>
            </div>
            <div className="p-2 rounded bg-slate-900 border border-border/40 flex justify-between items-center text-muted-foreground">
              <span>Demo Vault 2:</span>
              <span className="text-zinc-400 select-all">0x15b263cdcf21bb9cba53d12275cd66b05fce14b8765</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {cards.map((card, idx) => {
            // Mock listing status (alternate cards to show both states exactly like the Renaiss dashboard screenshot)
            const isListed = idx % 2 === 0;

            return (
              <a
                key={card.id}
                href={card.cardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col rounded-2xl bg-[#09090b]/80 border border-zinc-800/80 hover:border-zinc-700/80 hover:bg-[#0c0c0e]/95 transition-all duration-300 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] cursor-pointer"
              >
                {/* Graded Slab Image Section */}
                <div className="w-full py-4 flex items-center justify-center border-b border-zinc-900/60 relative overflow-hidden">
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    className="w-full h-auto max-h-[160px] object-contain drop-shadow-lg rounded-sm mix-blend-lighten"
                  />
                  
                  {/* External link indicator */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900/90 border border-zinc-800/50 p-1 rounded shadow">
                    <ExternalLink className="size-2.5 text-zinc-300" />
                  </div>
                </div>

                {/* Bottom card details resembling the Renaiss collection grid */}
                <div className="p-3 bg-zinc-950/20 flex flex-col justify-between flex-1">
                  <span className="text-[10px] md:text-[11px] font-bold text-white line-clamp-1 group-hover:text-zinc-200 transition-colors">
                    {card.grader} {card.grade} {card.name}
                  </span>

                  <div className="mt-3.5 flex items-center justify-between text-[9px] md:text-[10px]">
                    {isListed ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[8.5px] uppercase tracking-wide">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                          Listed
                        </span>
                        <span className="font-extrabold text-white">
                          ${card.priceUsd.toLocaleString()}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/50 text-zinc-400 font-bold text-[8.5px] uppercase tracking-wider">
                          unlisted
                        </span>
                        <span className="text-zinc-400 font-semibold">
                          FMV ${card.fmvUsd.toLocaleString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
