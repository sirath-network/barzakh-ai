import { z } from "zod";

export type TextCompletionStreaming = {
  id: string;
  object: "text_completion";
  created: number;
  choices: {
    index: number;
    logprobs: number | null;
    finish_reason: "stop" | null; // Allows both "stop" and null
    text: string | null; // Allows both string and null
  }[];
  model: string;
  system_fingerprint: string;
};

export const PromptRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  max_tokens: z.number().int().positive(),
  temperature: z.number().min(0).max(1),
  stream: z.boolean(),
});

export type PromptRequest = z.infer<typeof PromptRequestSchema>;
