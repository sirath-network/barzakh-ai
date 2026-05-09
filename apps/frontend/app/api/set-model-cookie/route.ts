import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

// Valid model names - must match models defined in packages/shared/src/lib/ai/models.ts
const VALID_MODELS = [
  "gpt-5.5",
  "gpt-5.4",
  "gpt-5.4-pro",
  "gpt-5.4-mini",
  "gpt-5.4-nano",
  "gpt-5.3-chat",
  "gpt-5.3-codex",
  "gpt-4o",
  "gpt-4o-mini",
  "deepseek-v3.2",
  "deepseek-v4-flash",
  "grok-4-20-reasoning",
  "grok-4-20-non-reasoning",
  "grok-4-1-fast-reasoning",
  "grok-4-1-fast-non-reasoning",
  "model-router",
  "kimi-k2.5",
  "kimi-k2.6",
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
