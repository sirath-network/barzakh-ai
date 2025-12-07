import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

// Valid model names - must match models defined in packages/shared/src/lib/ai/models.ts
const VALID_MODELS = [
  "chat-model-small",
  "chat-model-large",
  "chat-model-claude",
  "chat-model-grok",
  "chat-model-glm",
  "chat-model-gigantic",
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
