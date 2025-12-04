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
  const uiMessages = messages.reduce((chatMessages: Array<Message>, message) => {
    if (message.role === "tool") {
      return addToolMessageToChat({
        toolMessage: message as CoreToolMessage,
        messages: chatMessages,
      });
    }

    let textContent = "";
    let reasoning: string | undefined = undefined;
    const toolInvocations: Array<ToolInvocation> = [];
    let hasImages = false;

    if (typeof message.content === "string") {
      textContent = message.content;
    } else if (Array.isArray(message.content)) {
      // Check if the message contains images
      hasImages = message.content.some((content: any) => content.type === "image");
      
      if (hasImages) {
        // If message contains images, extract text content AND tool invocations
        const textParts: string[] = [];
        for (const content of message.content) {
          if (content.type === "text") {
            textParts.push(content.text);
          } else if (content.type === "tool-call") {
            toolInvocations.push({
              state: "call",
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args,
            });
          } else if (content.type === "tool-result") {
            toolInvocations.push({
              state: "result",
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args || {},
              result: content.result,
            });
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
        // For messages without images, use the original logic
        for (const content of message.content) {
          if (content.type === "text") {
            textContent += content.text;
          } else if (content.type === "tool-call") {
            toolInvocations.push({
              state: "call",
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args,
            });
          } else if (content.type === "tool-result") {
            toolInvocations.push({
              state: "result" as const,
              toolCallId: content.toolCallId,
              toolName: content.toolName,
              args: content.args || {},
              result: content.result,
            });
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
        : textContent) as any, // For assistant/other messages, use extracted text
      reasoning,
      toolInvocations,
    };

    chatMessages.push(uiMessage);

    return chatMessages;
  }, []);
  
  // Post-process: Merge consecutive assistant messages with tool invocations
  // This fixes the issue where after page refresh, sources are displayed separately
  const mergedMessages: Array<Message> = [];
  
  for (let i = 0; i < uiMessages.length; i++) {
    const currentMessage = uiMessages[i];
    
    // If this is an assistant message with tool invocations
    if (
      currentMessage.role === "assistant" && 
      currentMessage.toolInvocations && 
      currentMessage.toolInvocations.length > 0
    ) {
      // Check if the previous message in mergedMessages is also an assistant with tools
      const prevMessage = mergedMessages[mergedMessages.length - 1];
      
      if (
        prevMessage && 
        prevMessage.role === "assistant" && 
        prevMessage.toolInvocations && 
        prevMessage.toolInvocations.length > 0
      ) {
        // Merge tool invocations into the previous message
        prevMessage.toolInvocations = [
          ...prevMessage.toolInvocations,
          ...currentMessage.toolInvocations,
        ];
        
        // Append content if the current message has meaningful content
        if (currentMessage.content && typeof currentMessage.content === "string" && currentMessage.content.trim()) {
          if (typeof prevMessage.content === "string") {
            prevMessage.content = prevMessage.content + "\n\n" + currentMessage.content;
          } else {
            prevMessage.content = currentMessage.content;
          }
        }
        
        // Keep the reasoning from the latest message if available
        if (currentMessage.reasoning) {
          prevMessage.reasoning = currentMessage.reasoning;
        }
        
        // Don't push the current message as it's been merged
        continue;
      }
    }
    
    // If not mergeable, add the message as is
    mergedMessages.push(currentMessage);
  }
  
  return mergedMessages;
}