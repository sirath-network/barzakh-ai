"use client";

import { AssistantAvatar } from "./assistant-avatar";
import { ThinkingAnimation } from "./thinking-animation";
import { motion } from "framer-motion";
import { cn } from "@javin/shared/lib/utils/utils";

export const ThinkingMessage = () => {
  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -5, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div
        className={cn(
          "flex flex-row md:items-start pl-0.5 gap-0 md:gap-4 w-full"
        )}
      >
        <AssistantAvatar />
        <div className="flex flex-col gap-4 w-full">
          <ThinkingAnimation />
        </div>
      </div>
    </motion.div>
  );
};
