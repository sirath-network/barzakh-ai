"use client";

import { motion, AnimatePresence } from "@/lib/framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@barzakh/shared/lib/utils/utils";

interface ThinkingAnimationProps {
    statusText?: string;
}

export const ThinkingAnimation = ({ statusText }: ThinkingAnimationProps) => {
    // Keep track of the last non-empty status
    const [lastValidStatus, setLastValidStatus] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (statusText) {
            setLastValidStatus(statusText);
        }
    }, [statusText]);

    const displayText = statusText || lastValidStatus || "Thinking";

    return (
        <div className="flex items-center h-8 gap-3 px-1">
            <AnimatePresence mode="wait">
                <motion.div
                    key={displayText}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.3 }}
                    className="relative overflow-hidden"
                >
                    <span
                        className={cn(
                            "text-sm font-medium bg-clip-text text-transparent bg-[length:200%_auto] tracking-tight",
                            // Light mode: Medium Gray -> Black -> Medium Gray
                            "bg-gradient-to-r from-gray-500 via-gray-900 to-gray-500",
                            // Dark mode: Zinc 500 -> White -> Zinc 500
                            "dark:from-zinc-500 dark:via-white dark:to-zinc-500",
                            "animate-shimmer"
                        )}
                        style={{
                            backgroundSize: "200% 100%",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            animation: "shimmer 1.5s linear infinite",
                            willChange: "background-position"
                        }}
                    >
                        {displayText}
                    </span>
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        @keyframes shimmer {
                            0% {
                                background-position: 200% center;
                            }
                            100% {
                                background-position: -200% center;
                            }
                        }
                    `}} />
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
