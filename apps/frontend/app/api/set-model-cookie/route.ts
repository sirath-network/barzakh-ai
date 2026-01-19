import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

// Valid model names - must match models defined in packages/shared/src/lib/ai/models.ts
const VALID_MODELS = [
  "openai-gpt-4o",
  "openai-gpt-4.1",
  "anthropic-opus-4.5",
  "anthropic-haiku-4.5",
  "openai-gpt-5.2",
  "zai-glm-4.7",
  "openai-gpt-5.1",
  "google-gemini-3-flash",
  "google-gemini-2.5-flash-preview",
  "xai-grok-4.1-fast",

  "title-model",
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
