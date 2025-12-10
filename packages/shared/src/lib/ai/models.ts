import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

// CometAPI provider (OpenAI-compatible)
const cometai = createOpenAI({
  baseURL: "https://api.cometapi.com/v1",
  apiKey: process.env.COMETAPI_API_KEY,
});

export const DEFAULT_CHAT_MODEL: string = "chat-model-small";

export const myProvider: any = customProvider({
  languageModels: {
    "chat-model-small": openai("gpt-4o"),
    "chat-model-large": openai("gpt-4.1-2025-04-14"),
    "chat-model-claude": cometai("claude-opus-4-5-20251101-thinking"),
    "chat-model-grok": cometai("grok-4-1-fast-non-reasoning"),
    "chat-model-glm": cometai("glm-4.6"),
    "chat-model-gigantic": cometai("gpt-5"),
    "title-model": openai("gpt-4-turbo"),
    "block-model": openai("gpt-4o"),
  },
  imageModels: {},
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model-small",
    name: "GPT 4o",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "chat-model-large",
    name: "GPT 4.1",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "chat-model-gigantic",
    name: "GPT 5",
    description: "Gigantic model for experimental tasks",
  },
  {
    id: "chat-model-glm",
    name: "GLM 4.6",
    description: "GLM-4.6 model for experimental tasks",
  },
  {
    id: "chat-model-grok",
    name: "Grok 4.1 Fast",
    description: "Grok model for experimental tasks",
  },
  {
    id: "chat-model-claude",
    name: "Claude Opus 4.5 Thinking",
    description: "Claude model for experimental tasks",
  },
];

interface ImagineModel {
  id: string;
  name: string;
  description: string;
}

export const imagineModels: Array<ImagineModel> = [
  {
    id: "gemini-2.5-flash-image",
    name: "Gemini 2.5 Flash Image",
    description:
      "Gemini 2.5 Flash Image via CometAPI for fast, high-fidelity generations.",
  },
];