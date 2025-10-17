import { FinishReason, LanguageModelUsage } from "ai";
import { z } from "zod";

export type ChoiceType = {
  index: number;
  logprobs: null;
  finish_reason: FinishReason | null; // null only if streaming still going on
  text: string | null;
};

export type TextCompletion = {
  id: string;
  object: "text_completion";
  created: number;
  model: string;
  system_fingerprint: string;
  choices: ChoiceType[];
  usage: LanguageModelUsage;
};

export type TextCompletionStreaming = {
  id: string;
  object: "text_completion";
  created: number;
  choices: ChoiceType[];
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
