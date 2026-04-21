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
    "xai-grok-4.20": openrouter("x-ai/grok-4.20"),
    "openai-gpt-5.3-codex": openrouter("openai/gpt-5.3-codex"),
    "openai-gpt-5.4": openrouter("openai/gpt-5.4"),
    "anthropic-sonnet-4.6": openrouter("anthropic/claude-sonnet-4.6"),
    "anthropic-opus-4.7": openrouter("anthropic/claude-opus-4.7"),
    "google-gemini-3.1-pro-preview": openrouter("google/gemini-3.1-pro-preview"),
    "google-gemma-4-31b-it": openrouter("google/gemma-4-31b-it"),
    "zai-glm-5.1": openrouter("z-ai/glm-5.1"),
    "kimi-k2-thinking": openrouter("moonshotai/kimi-k2-thinking"),
    "kimi-k2.5": openrouter("moonshotai/kimi-k2.5"),
    "kimi-k2.6": openrouter("moonshotai/kimi-k2.6"),
    "qwen-3.5-flash": openrouter("qwen/qwen3.5-flash-02-23"),
    "qwen-3.5-plus": openrouter("qwen/qwen3.5-plus-02-15"),
    "qwen-3.6-plus": openrouter("qwen/qwen3.6-plus"),
  },
  imageModels: {},
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  // --- OpenAI ---
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
    id: "openai-gpt-5.3-codex",
    name: "GPT 5.3 Codex",
    description: "Next-gen coding and mathematical intelligence",
  },
  {
    id: "openai-gpt-5.4",
    name: "GPT 5.4",
    description: "Apex intelligence for ultra-complex reasoning",
  },

  // --- Anthropic ---
  {
    id: "anthropic-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "Lightning-fast Claude responses",
  },
  {
    id: "anthropic-sonnet-4.6",
    name: "Claude Sonnet 4.6",
    description: "Optimal balance of intelligence and performance",
  },
  {
    id: "anthropic-opus-4.6",
    name: "Claude Opus 4.6 Thinking",
    description: "Deep thinking & extended reasoning",
  },
  {
    id: "anthropic-opus-4.7",
    name: "Claude Opus 4.7",
    description: "Maximum depth and nuanced reasoning",
  },

  // --- Google ---
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
    id: "google-gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    description: "Advanced multimodal intelligence",
  },
  {
    id: "google-gemma-4-31b-it",
    name: "Gemma 4 31B",
    description: "Latest powerful and efficient open model",
  },

  // --- xAI ---
  {
    id: "xai-grok-4.1-fast",
    name: "Grok 4.1 Fast",
    description: "Real-time knowledge & witty responses",
  },
  {
    id: "xai-grok-4.20",
    name: "Grok 4.20",
    description: "Peak real-time reasoning and witty interaction",
  },

  // --- Moonshot (Kimi) ---
  {
    id: "kimi-k2-thinking",
    name: "Kimi K2 Thinking",
    description: "High-performance thinking with long memory",
  },
  {
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    description: "Advanced long-context reasoning",
  },
  {
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    description: "Flagship long-context AI architecture",
  },

  // --- Qwen ---
  {
    id: "qwen-3.5-flash",
    name: "Qwen 3.5 Flash",
    description: "Ultrafast high-performance efficiency",
  },
  {
    id: "qwen-3.5-plus",
    name: "Qwen 3.5 Plus",
    description: "Advanced intelligence for complex tasks",
  },
  {
    id: "qwen-3.6-plus",
    name: "Qwen 3.6 Plus",
    description: "Latest flagship for all-round excellence",
  },

  // --- Z-AI (GLM) ---
  {
    id: "zai-glm-4.7",
    name: "GLM 4.7",
    description: "Strong multilingual capabilities",
  },
  {
    id: "zai-glm-5.1",
    name: "GLM 5.1",
    description: "Frontier multilingual reasoning model",
  },
];

interface ImagineModel {
  id: string;
  name: string;
  description: string;
}

export const imagineModels: Array<ImagineModel> = [
  {
    id: "google/gemini-3.1-flash-image-preview",
    name: "Gemini 3.1 Flash Image Preview",
    description:
      "Gemini 3.1 Flash Image Preview via OpenRouter for fast, high-fidelity generations.",
  },
];
