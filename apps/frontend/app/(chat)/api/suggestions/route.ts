import { NextRequest, NextResponse } from "next/server";
import { myProvider } from "@barzakh/shared/lib/ai/models";
import { generateText } from "ai";
import { auth } from "@/app/(auth)/auth";

const BASE_SUGGESTIONS = [
  {
    title: "Compare the advantages of React and Vue",
    subtitle: "Start a technical analysis",
  },
  {
    title: "Create a social media content plan for 1 week",
    subtitle: "For creative ideas",
  },
  {
    title: "Explain the concept of machine learning with an analogy",
    subtitle: "Understand complex topics",
  },
  {
    title: "Give ideas for healthy and practical breakfast recipes",
    subtitle: "Kitchen inspiration",
  },
];

// 1. Add the `request: NextRequest` parameter to the function
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require authentication to prevent AI resource abuse
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get headers directly from the request object
    const acceptLanguage = request.headers.get("accept-language");

    // Get main language from header (e.g., "id-ID,id;q=0.9,en-US;q=0.8" -> "id")
    const mainLang = acceptLanguage ? acceptLanguage.split(",")[0].split("-")[0] : "en";

    // If default language is English, return immediately
    if (mainLang === "en") {
      return NextResponse.json(BASE_SUGGESTIONS);
    }

    const result = await generateText({
      model: myProvider.languageModel("chat-model-large"),
      prompt: `
        Translate the following JSON array of objects into the language with code "${mainLang}".
        Do not change the keys ("title", "subtitle"). Only translate the string values.
        Return ONLY the translated JSON array, without any extra text or markdown formatting.

        Original JSON:
        ${JSON.stringify(BASE_SUGGESTIONS, null, 2)}
      `,
    });
    const responseText = result.text;

    // Clean AI response from markdown format if exists
    const cleanedJsonText = responseText.replace(/```json\n|```/g, "").trim();
    const translatedSuggestions = JSON.parse(cleanedJsonText);

    return NextResponse.json(translatedSuggestions);

  } catch (error) {
    console.error("Error translating suggestions:", error);
    // If it fails, return original suggestions to prevent app crash
    return NextResponse.json(BASE_SUGGESTIONS);
  }
}