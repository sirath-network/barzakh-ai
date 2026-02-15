import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

// OpenRouter provider (OpenAI-compatible)
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const DEFAULT_CHAT_MODEL: string = "google-gemini-2.5-flash-preview";

export const myProvider: any = customProvider({
  languageModels: {
    "openai-gpt-4o": openrouter("openai/gpt-4o"),
    "openai-gpt-4.1": openrouter("openai/gpt-4.1"),
    "openai-gpt-5.1": openrouter("openai/gpt-5.1"),
    "openai-gpt-5.2": openrouter("openai/gpt-5.2"),
    "anthropic-opus-4.6": openrouter("anthropic/claude-opus-4.6"),
    "anthropic-haiku-4.5": openrouter("anthropic/claude-haiku-4.5"),
    "google-gemini-3-flash": openrouter("google/gemini-3-flash-preview"),
    "google-gemini-2.5-flash-preview": openrouter("google/gemini-2.5-flash"),
    "xai-grok-4.1-fast": openrouter("x-ai/grok-4.1-fast"),
    "zai-glm-4.7": openrouter("z-ai/glm-4.7"),
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
    id: "openai-gpt-4o",
    name: "GPT 4o",
    description: "Fast & efficient for everyday tasks",
  },
  {
    id: "openai-gpt-4.1",
    name: "GPT 4.1",
    description: "Enhanced reasoning & code generation",
  },
  {
    id: "openai-gpt-5.1",
    name: "GPT 5.1",
    description: "Next-gen intelligence & creativity",
  },
  {
    id: "openai-gpt-5.2",
    name: "GPT 5.2",
    description: "Advanced reasoning & analysis",
  },
  {
    id: "zai-glm-4.7",
    name: "GLM 4.7",
    description: "Strong multilingual capabilities",
  },
  {
    id: "xai-grok-4.1-fast",
    name: "Grok 4.1 Fast",
    description: "Real-time knowledge & witty responses",
  },
  {
    id: "google-gemini-2.5-flash-preview",
    name: "Gemini 2.5 Flash",
    description: "Fastest Gemini model for experimental tasks",
  },
  {
    id: "google-gemini-3-flash",
    name: "Gemini 3 Flash",
    description: "Latest Gemini model for quick responses",
  },

  {
    id: "anthropic-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "Lightning-fast Claude responses",
  },
  {
    id: "anthropic-opus-4.6",
    name: "Claude Opus 4.6 Thinking",
    description: "Deep thinking & extended reasoning",
  }
];

interface ImagineModel {
  id: string;
  name: string;
  description: string;
}

export const imagineModels: Array<ImagineModel> = [
  {
    id: "google/gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    description:
      "Gemini 2.5 Flash Image via OpenRouter for fast, high-fidelity generations.",
  },
];
