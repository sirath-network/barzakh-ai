// 1. Import baru yang dibutuhkan untuk fungsi 'cn'
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Import yang sudah ada untuk fungsi Anda
import type { Message as DBMessage } from "@/lib/db/schema";
import type { CoreToolMessage, Message, ToolInvocation } from "ai";
import { addToolMessageToChat } from "@barzakh/shared/lib/utils/utils";

// 2. Tambahkan fungsi 'cn' yang baru di sini
/**
 * Menggabungkan class names dengan aman untuk styling.
 * Mencegah duplikasi dan konflik pada class Tailwind CSS.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 3. Fungsi convertToUIMessages milik Anda tetap ada di bawahnya (tidak perlu diubah)
export function convertToUIMessages(
  messages: Array<DBMessage>
): Array<Message> {
  return messages.reduce((chatMessages: Array<Message>, message) => {
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
      content: shouldPreserveContent 
        ? message.content.filter((part: any) => 
            // Keep image and text parts, exclude metadata
            (part.type === 'image' || (part.type === 'text' && !part.text.includes('[ORIGINAL_IMAGE_URLS_FOR_EDITING')))
          )
        : textContent, // For assistant/other messages, use extracted text
      reasoning,
      toolInvocations,
    };

    chatMessages.push(uiMessage);

    return chatMessages;
  }, []);
}