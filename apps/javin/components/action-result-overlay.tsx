"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

const pathVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { type: "spring", duration: 0.7, bounce: 0 },
      opacity: { duration: 0.01 },
      delay: i * 0.1,
    },
  }),
};

interface ActionResultOverlayProps {
  status: "success" | "error" | "idle";
  title?: string; 
  message: string;
  children?: ReactNode; 
}

export function ActionResultOverlay({
  status,
  title, 
  message,
  children, 
}: ActionResultOverlayProps) {
  const isVisible = status === "success" || status === "error";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-card-foreground shadow-xl"
          >
            {/* Animated Icon */}
            <motion.div variants={itemVariants}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <motion.circle
                  cx="40"
                  cy="40"
                  r="38"
                  className="stroke-foreground/10"
                  strokeWidth="3"
                />
                
                {status === "success" ? (
                  <motion.path
                    d="M28 41.9333L36.8 50L52 32"
                    className="stroke-foreground"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={pathVariants}
                    custom={0}
                  />
                ) : (
                  <>
                    <motion.path
                      d="M28 28L52 52"
                      className="stroke-foreground"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      variants={pathVariants}
                      custom={0}
                    />
                    <motion.path
                      d="M52 28L28 52"
                      className="stroke-foreground"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      variants={pathVariants}
                      custom={1}
                    />
                  </>
                )}
              </svg>
            </motion.div>

            {/* Text Content */}
            <motion.div variants={itemVariants} className="text-center">
              {/* */}
              <h2 className="text-2xl font-bold capitalize">{title || status}</h2>
              <p className="mt-2 text-muted-foreground">{message}</p>
            </motion.div>

            {/* */}
            {children && (
              <motion.div variants={itemVariants} className="w-full pt-2">
                {children}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}