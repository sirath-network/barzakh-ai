import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

// Valid model names - must match models defined in packages/shared/src/lib/ai/models.ts
const VALID_MODELS = [
  "openai-gpt-4o",
  "openai-gpt-4.1",
  "openai-gpt-5.1",
  "openai-gpt-5.2",
  "openai-gpt-5.3-codex",
  "openai-gpt-5.4",
  "anthropic-haiku-4.5",
  "anthropic-sonnet-4.6",
  "anthropic-opus-4.6",
  "anthropic-opus-4.7",
  "google-gemini-2.5-flash-preview",
  "google-gemini-3-flash",
  "google-gemini-3.1-pro-preview",
  "google-gemma-4-31b-it",
  "xai-grok-4.1-fast",
  "xai-grok-4.20",
  "kimi-k2-thinking",
  "kimi-k2.5",
  "kimi-k2.6",
  "qwen-3.5-flash",
  "qwen-3.5-plus",
  "qwen-3.6-plus",
  "zai-glm-4.7",
  "zai-glm-5.1",
  "zai-glm-5.2",
  "zai-glm-5.3-flash",
  "openai-gpt-5.5",
  "openai-gpt-5.6-sol",
  "openai-gpt-5.6-terra",
  "openai-gpt-5.6-luna",
  "openai-gpt-5.6-luna-pro",
  "openai-gpt-5.6-sol-pro",
  "anthropic-sonnet-5",
  "anthropic-opus-4.8",
  "anthropic-opus-5",
  "anthropic-fable-5",
  "anthropic-fable-5.1",
  "google-gemini-3.5-flash",
  "google-gemini-3.6-flash",
  "google-gemini-3.7-flash",
  "google-gemini-3.8-flash",
  "xai-grok-4.3",
  "xai-grok-4.5",
  "xai-grok-4.6",
  "kimi-k3",
  "qwen-3.7-max",
  "qwen-3.8-max",
  "deepseek-chat-v3.1",
  "deepseek-v3.2",
  "deepseek-v4-pro-0813",
  "deepseek-r1-0528",

  // OpenRouter direct slug aliases
  "openai/gpt-5.5",
  "openai/gpt-5.6-sol",
  "openai/gpt-5.6-terra",
  "openai/gpt-5.6-luna",
  "openai/gpt-5.6-luna-pro",
  "openai/gpt-5.6-sol-pro",
  "anthropic/claude-sonnet-5",
  "anthropic/claude-opus-4.8",
  "anthropic/claude-opus-5",
  "anthropic/claude-fable-5",
  "anthropic/claude-fable-5.1",
  "google/gemini-3.5-flash",
  "google/gemini-3.6-flash",
  "google/gemini-3.7-flash",
  "google/gemini-3.8-flash",
  "x-ai/grok-4.3",
  "x-ai/grok-4.5",
  "x-ai/grok-4.6",
  "moonshotai/kimi-k3",
  "qwen/qwen3.7-max",
  "qwen/qwen3.8-max",
  "z-ai/glm-5.2",
  "z-ai/glm-5.3-flash",
  "deepseek/deepseek-chat-v3.1",
  "deepseek/deepseek-v3.2",
  "deepseek/deepseek-v4-pro-0813",
  "deepseek/deepseek-r1-0528",
];

export async function POST(request: Request) {
  // SECURITY: Require authentication
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { model } = await request.json();

  // SECURITY: Validate model value to prevent injection
  if (!model || typeof model !== "string" || !VALID_MODELS.includes(model)) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
  return NextResponse.json({ success: true });
}
