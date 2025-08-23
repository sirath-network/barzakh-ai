import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

export const DEFAULT_CHAT_MODEL: string = "chat-model-gemini";

export const myProvider: any = customProvider({
  languageModels: {
    "chat-model-small": openai("gpt-4o"),
    "chat-model-large": openai("gpt-4.1-2025-04-14"),
    "chat-model-gemini": google("models/gemini-2.5-flash"),
    "chat-model-claude": anthropic("claude-3-5-haiku-latest"),
    "chat-model-reasoning": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/deepseek-r1-0528"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-4-turbo"),
    "block-model": openai("gpt-4o"),
  },
  imageModels: {
    "small-model": openai.image("dall-e-2"),
    "large-model": openai.image("dall-e-3"),
  },
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
    id: "chat-model-gemini",
    name: "gemini-2.5-flash",
    description: "Gemini model for experimental tasks",
  },
  {
    id: "chat-model-claude",
    name: "claude-3-5-haiku",
    description: "Claude model for experimental tasks",
  },
];