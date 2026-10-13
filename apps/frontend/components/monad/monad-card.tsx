"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import styles from "./monad-card.module.css";

interface MonadCardProps {
  title: string;
  badge: string;
  subtitle: string;
  metric: ReactNode;
  metricLabel: string;
  icon: ReactNode;
  tone?: "emerald" | "cyan";
  children: ReactNode;
}

export function MonadCard({ title, badge, subtitle, metric, metricLabel, icon, tone = "emerald", children }: MonadCardProps) {
  return (
    <div className={`${styles.container} w-full min-w-0 max-w-lg mx-auto my-3 font-sans`}>
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        <div className={`${styles.header} relative w-full`}>
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt=""
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/60 to-zinc-900/20" />
          <div className={`${styles.headerContent} relative flex gap-3 p-3 sm:p-4`}>
            <div className="flex min-w-0 flex-1 items-start gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold leading-snug text-white">{title}</h3>
                <span className={`inline-block max-w-full mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${tone === "cyan" ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"}`}>
                  {badge}
                </span>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                  {subtitle}{" "}
                  <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </p>
              </div>
            </div>
            <div className={styles.metric}>
              <span className={`block text-xs font-mono font-bold ${tone === "cyan" ? "text-cyan-300" : "text-emerald-400"}`}>{metric}</span>
              <span className="text-[10px] text-zinc-400">{metricLabel}</span>
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
