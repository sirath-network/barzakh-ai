import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

// OpenRouter provider (OpenAI-compatible)
const openrouter = createOpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  // OpenRouter recommends identifying your app
  headers: {
    "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://app.sirath.network",
    "X-Title": process.env.OPENROUTER_APP_TITLE || "Barzakh AI",
  },
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

    // --- OpenAI Added ---
    "openai-gpt-5.5": openrouter("openai/gpt-5.5"),
    "openai/gpt-5.5": openrouter("openai/gpt-5.5"),
    "openai-gpt-5.6-sol": openrouter("openai/gpt-5.6-sol"),
    "openai/gpt-5.6-sol": openrouter("openai/gpt-5.6-sol"),
    "openai-gpt-5.6-terra": openrouter("openai/gpt-5.6-terra"),
    "openai/gpt-5.6-terra": openrouter("openai/gpt-5.6-terra"),
    "openai-gpt-5.6-luna": openrouter("openai/gpt-5.6-luna"),
    "openai/gpt-5.6-luna": openrouter("openai/gpt-5.6-luna"),
    "openai-gpt-5.6-luna-pro": openrouter("openai/gpt-5.6-luna-pro"),
    "openai/gpt-5.6-luna-pro": openrouter("openai/gpt-5.6-luna-pro"),
    "openai-gpt-5.6-sol-pro": openrouter("openai/gpt-5.6-sol-pro"),
    "openai/gpt-5.6-sol-pro": openrouter("openai/gpt-5.6-sol-pro"),

    // --- Anthropic Added ---
    "anthropic-sonnet-5": openrouter("anthropic/claude-sonnet-5"),
    "anthropic/claude-sonnet-5": openrouter("anthropic/claude-sonnet-5"),
    "anthropic-opus-4.8": openrouter("anthropic/claude-opus-4.8"),
    "anthropic/claude-opus-4.8": openrouter("anthropic/claude-opus-4.8"),
    "anthropic-opus-5": openrouter("anthropic/claude-opus-5"),
    "anthropic/claude-opus-5": openrouter("anthropic/claude-opus-5"),
    "anthropic-fable-5": openrouter("anthropic/claude-fable-5"),
    "anthropic/claude-fable-5": openrouter("anthropic/claude-fable-5"),
    "anthropic-fable-5.1": openrouter("anthropic/claude-fable-5.1"),
    "anthropic/claude-fable-5.1": openrouter("anthropic/claude-fable-5.1"),

    // --- Google Added ---
    "google-gemini-3.5-flash": openrouter("google/gemini-3.5-flash"),
    "google/gemini-3.5-flash": openrouter("google/gemini-3.5-flash"),
    "google-gemini-3.6-flash": openrouter("google/gemini-3.6-flash"),
    "google/gemini-3.6-flash": openrouter("google/gemini-3.6-flash"),
    "google-gemini-3.7-flash": openrouter("google/gemini-3.7-flash"),
    "google/gemini-3.7-flash": openrouter("google/gemini-3.7-flash"),
    "google-gemini-3.8-flash": openrouter("google/gemini-3.8-flash"),
    "google/gemini-3.8-flash": openrouter("google/gemini-3.8-flash"),

    // --- xAI Added ---
    "xai-grok-4.3": openrouter("x-ai/grok-4.3"),
    "x-ai/grok-4.3": openrouter("x-ai/grok-4.3"),
    "xai-grok-4.5": openrouter("x-ai/grok-4.5"),
    "x-ai/grok-4.5": openrouter("x-ai/grok-4.5"),
    "xai-grok-4.6": openrouter("x-ai/grok-4.6"),
    "x-ai/grok-4.6": openrouter("x-ai/grok-4.6"),

    // --- Moonshot (Kimi) Added ---
    "kimi-k3": openrouter("moonshotai/kimi-k3"),
    "moonshotai/kimi-k3": openrouter("moonshotai/kimi-k3"),

    // --- Qwen Added ---
    "qwen-3.7-max": openrouter("qwen/qwen3.7-max"),
    "qwen/qwen3.7-max": openrouter("qwen/qwen3.7-max"),
    "qwen-3.8-max": openrouter("qwen/qwen3.8-max"),
    "qwen/qwen3.8-max": openrouter("qwen/qwen3.8-max"),

    // --- Z-AI (GLM) Added ---
    "zai-glm-5.2": openrouter("z-ai/glm-5.2"),
    "z-ai/glm-5.2": openrouter("z-ai/glm-5.2"),
    "zai-glm-5.3-flash": openrouter("z-ai/glm-5.3-flash"),
    "z-ai/glm-5.3-flash": openrouter("z-ai/glm-5.3-flash"),

    // --- DeepSeek Added ---
    "deepseek-chat-v3.1": openrouter("deepseek/deepseek-chat-v3.1"),
    "deepseek/deepseek-chat-v3.1": openrouter("deepseek/deepseek-chat-v3.1"),
    "deepseek-v3.2": openrouter("deepseek/deepseek-v3.2"),
    "deepseek/deepseek-v3.2": openrouter("deepseek/deepseek-v3.2"),
    "deepseek-v4-pro-0813": openrouter("deepseek/deepseek-v4-pro-0813"),
    "deepseek/deepseek-v4-pro-0813": openrouter("deepseek/deepseek-v4-pro-0813"),
    "deepseek-r1-0528": openrouter("deepseek/deepseek-r1-0528"),
    "deepseek/deepseek-r1-0528": openrouter("deepseek/deepseek-r1-0528"),
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
  {
    id: "openai-gpt-5.5",
    name: "GPT 5.5",
    description: "Cutting-edge intelligence for deep reasoning and code",
  },
  {
    id: "openai-gpt-5.6-sol",
    name: "GPT 5.6 Sol",
    description: "High-throughput reasoning engine optimized for performance",
  },
  {
    id: "openai-gpt-5.6-terra",
    name: "GPT 5.6 Terra",
    description: "Grounded intelligence with comprehensive domain knowledge",
  },
  {
    id: "openai-gpt-5.6-luna",
    name: "GPT 5.6 Luna",
    description: "Fast and fluid reasoning for interactive tasks",
  },
  {
    id: "openai-gpt-5.6-luna-pro",
    name: "GPT 5.6 Luna Pro",
    description: "Advanced Luna variant for multi-step reasoning",
  },
  {
    id: "openai-gpt-5.6-sol-pro",
    name: "GPT 5.6 Sol Pro",
    description: "Maximum compute Sol model for intensive analysis",
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
  {
    id: "anthropic-sonnet-5",
    name: "Claude Sonnet 5",
    description: "Next-gen Sonnet with state-of-the-art reasoning & coding",
  },
  {
    id: "anthropic-opus-4.8",
    name: "Claude Opus 4.8",
    description: "Deep thinking flagship for complex analytical problems",
  },
  {
    id: "anthropic-opus-5",
    name: "Claude Opus 5",
    description: "Pinnacle intelligence and frontier comprehension",
  },
  {
    id: "anthropic-fable-5",
    name: "Claude Fable 5",
    description: "Creative generation and expressive synthesis",
  },
  {
    id: "anthropic-fable-5.1",
    name: "Claude Fable 5.1",
    description: "Enhanced creative storytelling and nuanced writing",
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
  {
    id: "google-gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    description: "Ultrafast multimodal performance and efficiency",
  },
  {
    id: "google-gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    description: "High-speed multimodal intelligence with large context",
  },
  {
    id: "google-gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    description: "Next-gen hybrid speed and advanced reasoning",
  },
  {
    id: "google-gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    description: "State-of-the-art efficiency and instant responsiveness",
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
  {
    id: "xai-grok-4.3",
    name: "Grok 4.3",
    description: "Real-time knowledge and witty analytical reasoning",
  },
  {
    id: "xai-grok-4.5",
    name: "Grok 4.5",
    description: "Enhanced real-time knowledge and frontier understanding",
  },
  {
    id: "xai-grok-4.6",
    name: "Grok 4.6",
    description: "Apex Grok model for deep conversational intelligence",
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
  {
    id: "kimi-k3",
    name: "Kimi K3",
    description: "Breakthrough long-context reasoning with deep thinking",
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
  {
    id: "qwen-3.7-max",
    name: "Qwen 3.7 Max",
    description: "Flagship multi-modal reasoning and comprehensive knowledge",
  },
  {
    id: "qwen-3.8-max",
    name: "Qwen 3.8 Max",
    description: "Frontier open architecture with ultra-large context intelligence",
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
  {
    id: "zai-glm-5.2",
    name: "GLM 5.2",
    description: "High-capability multilingual reasoning and synthesis",
  },
  {
    id: "zai-glm-5.3-flash",
    name: "GLM 5.3 Flash",
    description: "Lightning-fast multilingual responses and efficiency",
  },

  // --- DeepSeek ---
  {
    id: "deepseek-chat-v3.1",
    name: "DeepSeek Chat V3.1",
    description: "Fast and cost-efficient conversational assistant",
  },
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    description: "Balanced reasoning and strong multilingual performance",
  },
  {
    id: "deepseek-v4-pro-0813",
    name: "DeepSeek V4 Pro",
    description: "Next-gen MoE architecture for deep coding and math",
  },
  {
    id: "deepseek-r1-0528",
    name: "DeepSeek R1",
    description: "Frontier reinforcement-learned reasoning model",
  },
];

// ──────────────────────────────────────────────────
// Tier-based model access control
// ──────────────────────────────────────────────────

export type SubscriptionTier = "free" | "pro" | "ultimate" | "guest";

/**
 * Models available on the FREE tier.
 * Curated for cost-efficiency while still impressive.
 */
const FREE_TIER_MODELS: readonly string[] = [
  "openai-gpt-4o",
  "openai-gpt-4.1",
  "anthropic-haiku-4.5",
  "google-gemini-2.5-flash-preview",
  "google-gemini-3-flash",
  "google-gemini-3.5-flash",
  "google-gemini-3.6-flash",
  "google-gemini-3.7-flash",
  "google-gemini-3.8-flash",
  "google-gemma-4-31b-it",
  "xai-grok-4.1-fast",
  "kimi-k2-thinking",
  "qwen-3.5-flash",
  "zai-glm-4.7",
  "zai-glm-5.3-flash",
  "deepseek-chat-v3.1",
] as const;

/**
 * Models available on the PRO tier (includes all free models).
 */
const PRO_TIER_MODELS: readonly string[] = [
  ...FREE_TIER_MODELS,
  "openai-gpt-5.1",
  "openai-gpt-5.2",
  "openai-gpt-5.3-codex",
  "openai-gpt-5.4",
  "openai-gpt-5.5",
  "openai-gpt-5.6-sol",
  "openai-gpt-5.6-terra",
  "openai-gpt-5.6-luna",
  "openai-gpt-5.6-luna-pro",
  "openai-gpt-5.6-sol-pro",
  "anthropic-sonnet-4.6",
  "anthropic-opus-4.6",
  "anthropic-opus-4.7",
  "anthropic-sonnet-5",
  "anthropic-opus-4.8",
  "anthropic-opus-5",
  "anthropic-fable-5",
  "anthropic-fable-5.1",
  "google-gemini-3.1-pro-preview",
  "xai-grok-4.20",
  "xai-grok-4.3",
  "xai-grok-4.5",
  "xai-grok-4.6",
  "kimi-k2.5",
  "kimi-k2.6",
  "kimi-k3",
  "qwen-3.5-plus",
  "qwen-3.6-plus",
  "qwen-3.7-max",
  "qwen-3.8-max",
  "zai-glm-5.1",
  "zai-glm-5.2",
  "deepseek-v3.2",
  "deepseek-v4-pro-0813",
  "deepseek-r1-0528",
] as const;

/**
 * Get the list of allowed model IDs for a given subscription tier.
 * Returns undefined for ultimate (all models allowed).
 */
export function getModelsForTier(tier: SubscriptionTier): readonly string[] | undefined {
  switch (tier) {
    case "guest":
    case "free":
      return FREE_TIER_MODELS;
    case "pro":
      return PRO_TIER_MODELS;
    case "ultimate":
      return undefined; // Ultimate has access to ALL models
    default:
      return FREE_TIER_MODELS;
  }
}

/**
 * Check if a specific model is available for a given tier.
 */
export function isModelAvailableForTier(modelId: string, tier: SubscriptionTier): boolean {
  const allowedModels = getModelsForTier(tier);
  if (!allowedModels) return true; // Ultimate: all models
  return allowedModels.includes(modelId);
}

/**
 * Get the fallback model for a tier when the requested model isn't available.
 */
export function getFallbackModelForTier(tier: SubscriptionTier): string {
  return DEFAULT_CHAT_MODEL; // google-gemini-2.5-flash-preview
}

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
