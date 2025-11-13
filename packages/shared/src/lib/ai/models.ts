import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

// CometAPI provider (OpenAI-compatible)
const cometai = createOpenAI({
  baseURL: "https://api.cometapi.com/v1",
  apiKey: process.env.COMETAPI_API_KEY,
});

export const DEFAULT_CHAT_MODEL: string = "chat-model-grok";

export const myProvider: any = customProvider({
  languageModels: {
    "chat-model-small": openai("gpt-4o"),
    "chat-model-large": openai("gpt-4.1-2025-04-14"),
    "chat-model-llama": fireworks("accounts/fireworks/models/llama-v3p1-8b-instruct"),
    "chat-model-claude": anthropic("claude-3-5-haiku-latest"),
    "chat-model-grok": cometai("grok-4-fast-reasoning"),
    "chat-model-doubao": cometai("Doubao-1.5-lite-32k"),
    "chat-model-reasoning": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/deepseek-r1-0528"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-4-turbo"),
    "block-model": openai("gpt-4o"),
  },
  imageModels: {},
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model-small",
    name: "gpt-4o",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "chat-model-large",
    name: "gpt-4.1",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "chat-model-reasoning",
    name: "deepseek-r1",
    description: "Deepseek model for experimental tasks",
  },
  {
    id: "chat-model-llama",
    name: "llama-instruct",
    description: "Llama model for experimental tasks",
  },
  {
    id: "chat-model-claude",
    name: "claude-3-5-haiku",
    description: "Claude model for experimental tasks",
  },
  {
    id: "chat-model-grok",
    name: "grok-4-fast-reasoning",
    description: "Grok model for experimental tasks",
  },
  {
    id: "chat-model-doubao",
    name: "Doubao-1.5-lite-32k",
    description: "Doubao model for experimental tasks",
  },
];

interface ImagineModel {
  id: string;
  name: string;
  description: string;
}

export const imagineModels: Array<ImagineModel> = [
  {
    id: "gemini-2-5-flash-image",
    name: "Gemini 2.5 Flash Image (Nano Banana)",
    description:
      "Gemini 2.5 Flash Image via CometAPI for fast, high-fidelity generations.",
  },
];