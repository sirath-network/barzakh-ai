import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

const sanitizeAzureFoundryFetch: typeof fetch = async (input, init) => {
  if (typeof init?.body === "string") {
    try {
      const body = JSON.parse(init.body);

      // Azure Foundry's gpt-5.5 only accepts its default temperature.
      // The AI SDK currently normalizes omitted temperatures to 0, so strip it
      // before the request reaches Azure instead of setting an unsupported value.
      if (body?.temperature === 0) {
        delete body.temperature;
        return fetch(input, { ...init, body: JSON.stringify(body) });
      }
    } catch {
      // Non-JSON bodies should pass through unchanged.
    }
  }

  return fetch(input, init);
};

// Azure AI Foundry provider (OpenAI-compatible)
const azureFoundry = createOpenAI({
  baseURL: process.env.AZURE_FOUNDRY_ENDPOINT || "https://siraths-resource.services.ai.azure.com/openai/v1",
  apiKey: process.env.AZURE_FOUNDRY_API_KEY,
  fetch: sanitizeAzureFoundryFetch,
});

export const DEFAULT_CHAT_MODEL: string = "gpt-5.3-chat";

export const myProvider: any = customProvider({
  languageModels: {
    "gpt-4.1": azureFoundry("gpt-4.1"),
    "gpt-4o": azureFoundry("gpt-4o"),
    "gpt-4o-mini": azureFoundry("gpt-4o-mini"),
    "gpt-5.3-chat": azureFoundry("gpt-5.3-chat"),
    "gpt-5.3-codex": azureFoundry("gpt-5.3-codex"),
    "gpt-5.4": azureFoundry("gpt-5.4"),
    "gpt-5.4-nano": azureFoundry("gpt-5.4-nano"),
    "gpt-5.4-mini": azureFoundry("gpt-5.4-mini"),
    "gpt-5.4-pro": azureFoundry("gpt-5.4-pro"),
    "gpt-5.5": azureFoundry("gpt-5.5"),
    "model-router": azureFoundry("model-router"),
    "deepseek-v3.2": azureFoundry("DeepSeek-V3.2"),
    "deepseek-v4-flash": azureFoundry("DeepSeek-V4-Flash"),
    "kimi-k2.5": azureFoundry("Kimi-K2.5"),
    "kimi-k2.6": azureFoundry("Kimi-K2.6"),
    "grok-4-1-fast-non-reasoning": azureFoundry("grok-4-1-fast-non-reasoning"),
    "grok-4-1-fast-reasoning": azureFoundry("grok-4-1-fast-reasoning"),
    "grok-4-20-non-reasoning": azureFoundry("grok-4-20-non-reasoning"),
    "grok-4-20-reasoning": azureFoundry("grok-4-20-reasoning"),
    "grok-4.3": azureFoundry("grok-4.3"),
  },
  imageModels: {},
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  // --- Azure Model Router ---
  {
    id: "model-router",
    name: "BZKH v1",
    description: "Auto-selects the best model for your task",
  },

  // --- OpenAI ---
  {
    id: "gpt-4o-mini",
    name: "GPT 4o Mini",
    description: "Lightweight & cost-effective",
  },
  {
    id: "gpt-4o",
    name: "GPT 4o",
    description: "Fast & efficient for everyday tasks",
  },
  {
    id: "gpt-4.1",
    name: "GPT 4.1",
    description: "Latest GPT 4.1 with improved coding & instruction following",
  },
  {
    id: "gpt-5.3-chat",
    name: "GPT 5.3",
    description: "Conversational GPT 5.3 model",
  },
  {
    id: "gpt-5.3-codex",
    name: "GPT 5.3 Codex",
    description: "Code-focused GPT 5.3 model",
  },
  {
    id: "gpt-5.4-nano",
    name: "GPT 5.4 Nano",
    description: "Ultra-fast GPT 5.4 model for lightweight tasks",
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT 5.4 Mini",
    description: "Fast GPT 5.4 intelligence for everyday tasks",
  },
  {
    id: "gpt-5.4",
    name: "GPT 5.4",
    description: "Advanced general-purpose reasoning",
  },
  {
    id: "gpt-5.4-pro",
    name: "GPT 5.4 Pro",
    description: "Premium reasoning for advanced workloads",
  },
  {
    id: "gpt-5.5",
    name: "GPT 5.5",
    description: "Flagship intelligence for complex reasoning",
  },

  // --- DeepSeek ---
  {
    id: "deepseek-v3.2",
    name: "DeepSeek V3.2",
    description: "High-throughput reasoning and chat model",
  },
  {
    id: "deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    description: "Fast DeepSeek model for responsive generation",
  },

  // --- Moonshot (Kimi) ---
  {
    id: "kimi-k2.5",
    name: "Kimi K2.5",
    description: "Long-context AI model for knowledge-heavy tasks",
  },
  {
    id: "kimi-k2.6",
    name: "Kimi K2.6",
    description: "Flagship long-context AI architecture",
  },

  // --- xAI (Grok) ---
  {
    id: "grok-4-1-fast-non-reasoning",
    name: "Grok 4.1 Fast",
    description: "Fast Grok responses for general chat",
  },
  {
    id: "grok-4-1-fast-reasoning",
    name: "Grok 4.1 Fast Reasoning",
    description: "Fast Grok reasoning for complex questions",
  },
  {
    id: "grok-4-20-non-reasoning",
    name: "Grok 4.20 Fast",
    description: "Real-time knowledge & rapid responses",
  },
  {
    id: "grok-4-20-reasoning",
    name: "Grok 4.20 Reasoning",
    description: "Deep reasoning & extended thinking",
  },
  {
    id: "grok-4.3",
    name: "Grok 4.3",
    description: "Latest xAI flagship with advanced reasoning",
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
  "model-router",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4.1",
] as const;

/**
 * Models available on the PRO tier (includes all free models).
 */
const PRO_TIER_MODELS: readonly string[] = [
  "gpt-4.1",
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-5.3-chat",
  "gpt-5.3-codex",
  "gpt-5.4",
  "gpt-5.4-nano",
  "gpt-5.4-mini",
  "gpt-5.4-pro",
  "gpt-5.5",
  "model-router",
  "deepseek-v3.2",
  "deepseek-v4-flash",
  "kimi-k2.5",
  "kimi-k2.6",
  "grok-4-1-fast-non-reasoning",
  "grok-4-1-fast-reasoning",
  "grok-4-20-non-reasoning",
  "grok-4-20-reasoning",
  "grok-4.3",
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
  return DEFAULT_CHAT_MODEL; // gpt-5.5
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
