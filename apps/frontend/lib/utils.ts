// 1. New import needed for 'cn' function
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Existing import for your function
import type { Message as DBMessage } from "@/lib/db/schema";
import type { CoreToolMessage, Message, ToolInvocation } from "ai";
import { addToolMessageToChat } from "@barzakh/shared/lib/utils/utils";

// 2. Add new 'cn' function here
/**
 * Safely combine class names for styling.
 * Prevents duplication and conflicts in Tailwind CSS classes.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function saveChatModelAsCookieClient(model: string) {
  if (typeof document !== "undefined") {
    document.cookie = `chat-model=${model}; path=/; max-age=31536000; SameSite=Lax`;
  }
}

// 3. Your convertToUIMessages function remains below (no need to change)
export function convertToUIMessages(
  messages: Array<DBMessage>
): Array<Message> {
  // Pass 1: Collect all tool results from any message in the chat
  // This makes tool-call and tool-result resolution immune to database row ordering (e.g. out-of-order timestamps)
  const toolResultsMap = new Map<string, any>();
  for (const message of messages) {
    if (message.role === "tool" && Array.isArray(message.content)) {
      for (const content of message.content as any[]) {
        if (content && content.type === "tool-result" && content.toolCallId) {
          toolResultsMap.set(content.toolCallId, content.result);
        }
      }
    } else if (Array.isArray(message.content)) {
      for (const content of message.content as any[]) {
        if (content && content.type === "tool-result" && content.toolCallId) {
          toolResultsMap.set(content.toolCallId, content.result);
        }
      }
    }
  }

  // Pass 2: Convert messages into UI messages
  const uiMessages: Array<Message> = [];

  for (const message of messages) {
    // Standalone tool messages have their results harvested into toolResultsMap
    // and attached directly to tool-call invocations.
    if (message.role === "tool") {
      continue;
    }

    let textContent = "";
    let reasoning: string | undefined = undefined;
    const toolInvocations: Array<ToolInvocation> = [];
    let hasImages = false;

    if (typeof message.content === "string") {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      // Check if the message contains images
      hasImages = message.content.some((content: any) => content && content.type === "image");

      if (hasImages) {
        // If message contains images, extract text content AND tool invocations
        const textParts: string[] = [];
        for (const content of message.content as any[]) {
          if (!content) continue;
          if (content.type === "text") {
            textParts.push(content.text);
          } else if (content.type === "tool-call") {
            const result = toolResultsMap.get(content.toolCallId);
            toolInvocations.push({
              state: result !== undefined ? "result" : "call",
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args || {},
              ...(result !== undefined ? { result } : {}),
            } as ToolInvocation);
          } else if (content.type === "tool-result") {
            toolInvocations.push({
              state: "result" as const,
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args || {},
              result: content.result,
            } as ToolInvocation);
          } else if (content.type === "reasoning") {
            reasoning = content.reasoning;
          }
        }

        // Join text parts intelligently - avoid creating split responses
        if (textParts.length > 1) {
          const combinedText = textParts.join(" ");
          const isLikelySplitResponse =
            combinedText.toLowerCase().includes("image") &&
            (combinedText.toLowerCase().includes("here") || combinedText.toLowerCase().includes("view")) &&
            combinedText.length < 500;

          if (isLikelySplitResponse) {
            textContent = "";
          } else {
            textContent = combinedText;
          }
        } else {
          textContent = textParts[0] || "";
        }
      } else {
        // For messages without images, extract text and tool invocations
        for (const content of message.content as any[]) {
          if (!content) continue;
          if (content.type === "text") {
            textContent += content.text;
          } else if (content.type === "tool-call") {
            const result = toolResultsMap.get(content.toolCallId);
            toolInvocations.push({
              state: result !== undefined ? "result" : "call",
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args || {},
              ...(result !== undefined ? { result } : {}),
            } as ToolInvocation);
          } else if (content.type === "tool-result") {
            toolInvocations.push({
              state: "result" as const,
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args || {},
              result: content.result,
            } as ToolInvocation);
          } else if (content.type === "reasoning") {
            reasoning = content.reasoning;
          }
        }
      }
    }

    // CORE FIX: For user messages with images, preserve the full content array
    // For other messages (especially assistant), use extracted text content
    const shouldPreserveContent =
      message.role === "user" &&
      hasImages &&
      Array.isArray(message.content);

    const uiMessage: Message = {
      id: message.id,
      role: message.role as Message["role"],
      content: (shouldPreserveContent
        ? (message.content as any[]).filter((part: any) =>
          // Keep image and text parts, exclude metadata
          (part.type === 'image' || (part.type === 'text' && !part.text.includes('[ORIGINAL_IMAGE_URLS_FOR_EDITING')))
        )
        : textContent) as any,
      reasoning,
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
    };

    uiMessages.push(uiMessage);
  }

  // Post-process: Merge consecutive assistant messages (e.g. tool invocation turn + commentary turn)
  // This ensures UI cards and assistant text descriptions remain united in a single message
  const mergedMessages: Array<Message> = [];

  for (let i = 0; i < uiMessages.length; i++) {
    const currentMessage = uiMessages[i];
    const prevMessage = mergedMessages[mergedMessages.length - 1];

    if (
      currentMessage.role === "assistant" &&
      prevMessage &&
      prevMessage.role === "assistant"
    ) {
      // Merge tool invocations if current has them
      if (currentMessage.toolInvocations && currentMessage.toolInvocations.length > 0) {
        prevMessage.toolInvocations = [
          ...(prevMessage.toolInvocations || []),
          ...currentMessage.toolInvocations,
        ];
      }

      // Merge text content
      const prevContent = typeof prevMessage.content === "string" ? prevMessage.content.trim() : "";
      const currentContent = typeof currentMessage.content === "string" ? currentMessage.content.trim() : "";

      if (currentContent) {
        if (prevContent) {
          if (!prevContent.includes(currentContent)) {
            prevMessage.content = `${prevContent}\n\n${currentContent}`;
          }
        } else {
          prevMessage.content = currentContent;
        }
      }

      // Keep the reasoning from the latest message if available
      if (currentMessage.reasoning && !prevMessage.reasoning) {
        prevMessage.reasoning = currentMessage.reasoning;
      }

      // Don't push currentMessage since it was merged
      continue;
    }

    // If not mergeable, add the message as is
    mergedMessages.push(currentMessage);
  }

  return mergedMessages;
}