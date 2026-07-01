"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";

interface GradedSlabProps {
  imageUrl: string;
  name: string;
  set: string;
  grade: number;
  certNumber: string;
  ip: "Pokemon" | "OnePiece";
  grader: "PSA" | "BGS";
  size?: "sm" | "md" | "lg";
}

export const GradedSlab: React.FC<GradedSlabProps> = ({
  imageUrl,
  name,
  set,
  grade,
  certNumber,
  ip,
  grader,
  size = "md",
}) => {
  const isBeckett = grader === "BGS";

  // Size configurations
  const scale = size === "sm" ? "scale-90" : size === "lg" ? "scale-105" : "scale-100";
  const containerClasses = `
    relative flex flex-col items-center justify-between
    bg-gradient-to-b from-slate-900/60 to-slate-950/90
    border-2 border-slate-700/40 rounded-2xl p-2
    shadow-[0_15px_30px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.1)]
    overflow-hidden select-none select-none transition-all duration-300
    w-[170px] h-[260px] md:w-[190px] md:h-[290px]
    ${scale}
  `;

  return (
    <div className={containerClasses}>
      {/* Gloss reflection overlay representing the acrylic cover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-10 rounded-2xl" />
      
      {/* Specular glare edge */}
      <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none z-10" />

      {/* Graded Slab Label Header Container */}
      <div className="w-full relative z-20">
        {isBeckett ? (
          /* Beckett (BGS) Style Label: Shiny Gold/Bronze background with double borders */
          <div className="w-full bg-gradient-to-b from-[#e8c070] via-[#c69a47] to-[#aa7d2e] border border-[#7d5d21] rounded-md px-1 py-1 text-black flex items-center justify-between font-sans shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] h-9 overflow-hidden">
            {/* Beckett logo Symbol */}
            <div className="flex flex-col items-center justify-center font-serif leading-none pr-1 border-r border-[#7d5d21]/30">
              <span className="text-[9px] font-black leading-none italic">B</span>
              <span className="text-[4px] uppercase font-bold tracking-tighter leading-none">Beckett®</span>
            </div>

            {/* Card Info Details */}
            <div className="flex flex-col justify-center items-center flex-1 text-center px-1 scale-95 leading-[1.1] min-w-0">
              <span className="text-[6.5px] font-extrabold uppercase truncate w-full text-black/90">
                {ip === "Pokemon" ? "POKÉMON" : "ONE PIECE"}
              </span>
              <span className="text-[5.5px] font-black truncate w-full tracking-tighter text-black/85">
                {name.replace(/\(.*?\)/g, "").trim()}
              </span>
              <span className="text-[5px] text-black/70 truncate w-full leading-none">
                {set}
              </span>
            </div>

            {/* Grade box */}
            <div className="flex flex-col items-center justify-center pl-1 border-l border-[#7d5d21]/30 leading-none">
              <span className="text-[12px] font-black leading-none font-mono">{grade.toFixed(1)}</span>
              <span className="text-[4.5px] uppercase font-black tracking-tighter text-black/80">
                {grade >= 10 ? "PRISTINE" : "GEM MINT"}
              </span>
            </div>
          </div>
        ) : (
          /* PSA Style Label: Clean White background with Red borders */
          <div className="w-full bg-[#f8f9fa] border-2 border-[#d90429] rounded-md px-1.5 py-0.5 text-zinc-950 flex items-center justify-between font-sans shadow-sm h-9 overflow-hidden">
            {/* Left/Center Info Details */}
            <div className="flex flex-col justify-center items-start flex-1 min-w-0 leading-tight">
              <span className="text-[5.5px] text-zinc-400 font-bold uppercase tracking-tighter leading-none">
                PSA® GEM MT
              </span>
              <span className="text-[6px] font-extrabold truncate w-full text-zinc-900 leading-none mt-0.5">
                {name.replace(/\(.*?\)/g, "").trim()}
              </span>
              <span className="text-[5px] text-zinc-500 truncate w-full leading-none mt-0.5">
                {set}
              </span>
            </div>

            {/* Right Grade Box */}
            <div className="flex flex-col items-end justify-center pl-1 leading-none">
              <span className="text-[13px] font-black text-[#d90429] leading-none font-mono">
                {grade}
              </span>
              <span className="text-[4.5px] text-zinc-400 font-mono scale-90 leading-none mt-0.5">
                #{certNumber.substring(0, 6)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Graded Slab Card Body (Inner Recess with Card Image) */}
      <div className="flex-1 w-full mt-1.5 mb-1.5 rounded-lg bg-slate-950 border border-slate-800/80 p-1 flex items-center justify-center relative overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
        {/* Inner shadow/bevel overlay for slab card pocket */}
        <div className="absolute inset-0 border border-white/5 rounded-lg pointer-events-none z-10" />

        {/* Card Artwork Image */}
        <div className="relative w-full h-full flex items-center justify-center p-0.5">
          <img
            src={imageUrl}
            alt={name}
            className="object-contain w-full h-full max-h-[120px] md:max-h-[145px] drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
          />
        </div>
      </div>

      {/* Bottom Display Slab Stand */}
      <div className="w-full relative z-20">
        {/* Horizontal separator line */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-slate-700/60 to-transparent mb-1" />
        
        {/* Dark stand panel containing 'renaiss' logo */}
        <div className="w-full py-1.5 bg-black/40 border border-slate-800/40 rounded-lg flex items-center justify-center gap-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          <span className="size-1 rounded-full bg-emerald-400/90 shadow-[0_0_4px_#10b981]" />
          <span className="text-[6.5px] md:text-[7.5px] font-bold text-zinc-500 uppercase tracking-[0.2em] font-mono leading-none select-none">
            renaiss
          </span>
        </div>
      </div>
    </div>
  );
};
