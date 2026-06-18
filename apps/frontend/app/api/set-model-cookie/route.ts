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
