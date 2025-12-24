"use client";

import { AssistantAvatar } from "./assistant-avatar";
import { ThinkingAnimation } from "./thinking-animation";
import { motion } from "@/lib/framer-motion";
import { cn } from "@barzakh/shared/lib/utils/utils";
import type { Message } from "ai";
import { generateStatusFromMessage } from "@/lib/status-generator";

interface ThinkingMessageProps {
  messages?: Message[];
}

export const ThinkingMessage = ({ messages = [] }: ThinkingMessageProps) => {
  // Generate status from the last assistant message with pending tools
  const getStatusText = (): string | undefined => {
    if (!messages || messages.length === 0) {
      return undefined;
    }

    // Find the last assistant message (which might be newly created)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const assistantMessage = messages[i];

        // Check if this message has pending tools
        const pendingTools = assistantMessage.toolInvocations?.filter(
          (tool) => tool.state === "call" || tool.state === "partial-call"
        );

        if (pendingTools && pendingTools.length > 0) {
          // Find the user prompt that triggered this
          let userPrompt: string | undefined;
          for (let j = i - 1; j >= 0; j--) {
            if (messages[j].role === 'user') {
              const content = messages[j].content;
              if (typeof content === 'string') {
                userPrompt = content;
              } else if (Array.isArray(content)) {
                userPrompt = (content as any[])
                  .filter(part => part.type === 'text')
                  .map(part => part.text)
                  .join(' ');
              }
              break;
            }
          }

          const status = generateStatusFromMessage(assistantMessage, userPrompt);
          return status || undefined;
        }
      }
    }

    return undefined;
  };

  const statusText = getStatusText();
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
          <ThinkingAnimation statusText={statusText} />
        </div>
      </div>
    </motion.div>
  );
};
