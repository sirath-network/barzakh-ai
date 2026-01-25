"use client";

import { motion, AnimatePresence } from "@/lib/framer-motion";
import { useEffect, useState } from "react";

interface ThinkingAnimationProps {
    statusText?: string;
}

// Komponen animasi 'Thinking' yang diperbaiki
export const ThinkingAnimation = ({ statusText }: ThinkingAnimationProps) => {
    // Keep track of the last non-empty status to prevent flickering back to generic "Thinking"
    // when a tool finishes but the LLM is still preparing the response
    const [lastValidStatus, setLastValidStatus] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (statusText) {
            setLastValidStatus(statusText);
        }
    }, [statusText]);

    // Use dynamic status text if provided, otherwise fallback to last valid status, then "Processing"
    const displayText = statusText || lastValidStatus || "Processing";
    const containerVariants = {
        hidden: {
            opacity: 0,
            y: 2,
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0,
                staggerChildren: 0,
            },
        },
    };

    const textVariants = {
        hidden: {
            opacity: 0,
            x: -5,
        },
        visible: {
            opacity: 1,
            x: 0,
            transition: {
                duration: 0,
            },
        },
    };

    const dotsContainerVariants = {
        hidden: {
            opacity: 0,
        },
        visible: {
            opacity: 1,
            transition: {
                duration: 0,
                staggerChildren: 0.08,
            },
        },
    };

    const dotVariants = {
        hidden: {
            opacity: 0.3,
            scale: 0.7,
        },
        visible: {
            opacity: [0.3, 1, 0.3],
            scale: [0.7, 1, 0.7],
            transition: {
                duration: 1.4,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
    };

    return (
        <motion.div
            className="flex items-center gap-3 py-3 px-1"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{
                opacity: 0,
                y: -5,
                transition: { duration: 0.25, ease: "easeIn" }
            }}
        >
            {/* Text di sebelah kiri */}
            <AnimatePresence mode="wait">
                <motion.span
                    key={displayText}
                    className="text-sm font-medium text-muted-foreground select-none leading-none"
                    variants={textVariants}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 5 }}
                    transition={{ duration: 0.2 }}
                >
                    {displayText}
                </motion.span>
            </AnimatePresence>

            {/* Dots animation di sebelah kanan dengan baseline alignment */}
            <motion.div
                className="flex items-center gap-1 h-[14px]"
                variants={dotsContainerVariants}
                style={{ alignItems: 'center' }}
            >
                <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                    variants={dotVariants}
                    style={{ transformOrigin: 'center center' }}
                />
                <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                    variants={dotVariants}
                    style={{ transformOrigin: 'center center' }}
                />
                <motion.div
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
                    variants={dotVariants}
                    style={{ transformOrigin: 'center center' }}
                />
            </motion.div>
        </motion.div>
    );
};
