"use client";

import Link from "next/link";
import { Brain } from "lucide-react";
import { cn } from "@barzakh/shared/lib/utils/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Memory indicator button in the chat header.
 * - Completely transparent background by default, matching Ghost (Private) and adjacent icon buttons.
 * - Subtle circular hover background on mouseover (hover:bg-neutral-800/60).
 * - Symmetrical 36x36 (h-9 w-9 p-0) in icon-only mode.
 */
export function MemoryIndicator({
  isActive = true,
  memoryCount,
  showLabel = false,
  className,
}: {
  isActive?: boolean;
  memoryCount?: number;
  showLabel?: boolean;
  className?: string;
}) {
  if (!isActive) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/memory"
            aria-label="Walrus Memory Dashboard"
            className={cn(
              "group flex items-center justify-center rounded-full transition-all duration-200 select-none hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white",
              showLabel ? "h-9 px-3 gap-2 text-sm font-medium" : "h-9 w-9 p-0",
              className
            )}
          >
            <Brain className="w-4 h-4 flex-shrink-0" />
            {showLabel && <span>Memory</span>}
            {memoryCount !== undefined && memoryCount > 0 && (
              <span className="bg-zinc-800 text-zinc-300 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-mono">
                {memoryCount}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="max-w-xs bg-zinc-900 border border-zinc-800 text-zinc-200 shadow-xl"
        >
          <p className="text-xs">
            <strong className="text-zinc-100 font-semibold">
              Walrus Memory Active
            </strong>
            <br />
            <span className="text-zinc-400">
              This chatbot remembers you across sessions using decentralized
              Walrus Memory. Your preferences and context are stored securely
              on-chain and recalled automatically.
            </span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
