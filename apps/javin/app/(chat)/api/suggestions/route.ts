import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);

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
    // 2. Get headers directly from the request object
    const acceptLanguage = request.headers.get("accept-language");

    // Ambil bahasa utama dari header (misal: "id-ID,id;q=0.9,en-US;q=0.8" -> "id")
    const mainLang = acceptLanguage ? acceptLanguage.split(",")[0].split("-")[0] : "en";

    // Jika bahasa default adalah Inggris, langsung kembalikan
    if (mainLang === "en") {
      return NextResponse.json(BASE_SUGGESTIONS);
    }
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Translate the following JSON array of objects into the language with code "${mainLang}".
      Do not change the keys ("title", "subtitle"). Only translate the string values.
      Return ONLY the translated JSON array, without any extra text or markdown formatting.

      Original JSON:
      ${JSON.stringify(BASE_SUGGESTIONS, null, 2)}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Membersihkan response AI dari format markdown jika ada
    const cleanedJsonText = responseText.replace(/```json\n|```/g, "").trim();
    const translatedSuggestions = JSON.parse(cleanedJsonText);

    return NextResponse.json(translatedSuggestions);

  } catch (error) {
    console.error("Error translating suggestions:", error);
    // Jika gagal, kembalikan saran original agar aplikasi tidak crash
    return NextResponse.json(BASE_SUGGESTIONS);
  }
}