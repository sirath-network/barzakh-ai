// import { FinishReason } from "ai";
import { z } from "zod";

export interface ChatCompletionStreaming {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

const MessageContentPartSchema = z.union([
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("image"),
    image: z.string(), // Can be a URL or a base64 data URI
    mimeType: z.string().optional(),
  }),
]);

const CoreMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.union([z.string(), z.array(MessageContentPartSchema)]),
});

export const PromptRequestSchema = z.object({
  selectedChatModel: z.string(),
  messages: z.array(CoreMessageSchema),
  group: z.string().optional(),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
});

export type PromptRequest = z.infer<typeof PromptRequestSchema>;
