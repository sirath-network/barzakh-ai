"use client";

import { motion } from "framer-motion";

// Komponen animasi 'Thinking' yang diperbaiki
export const ThinkingAnimation = () => {
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
        <div className="flex items-center gap-3 py-3 px-1">
            <motion.div 
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
            <span className="text-sm font-medium text-muted-foreground select-none leading-none">
                <motion.span 
                    variants={textVariants}
                >
                    Thinking
                </motion.span>
            </span>
            
            {/* Dots animation di sebelah kanan dengan baseline alignment */}
            <div className="flex items-center gap-1 h-[14px]" style={{ alignItems: 'center' }}>
                <motion.div
                    variants={dotsContainerVariants}
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60">
                        <motion.div
                            variants={dotVariants}
                            style={{ transformOrigin: 'center center' }}
                        />
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60">
                        <motion.div
                            variants={dotVariants}
                            style={{ transformOrigin: 'center center' }}
                        />
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60">
                        <motion.div
                            variants={dotVariants}
                            style={{ transformOrigin: 'center center' }}
                        />
                    </div>
                </motion.div>
            </div>
            </motion.div>
        </div>
    );
};
