import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

// CometAPI provider (OpenAI-compatible)
const cometai = createOpenAI({
  baseURL: "https://api.cometapi.com/v1",
  apiKey: process.env.COMETAPI_API_KEY,
});

export const DEFAULT_CHAT_MODEL: string = "chat-model-gigantic";

export const myProvider: any = customProvider({
  languageModels: {
    "chat-model-small": openai("gpt-4o"),
    "chat-model-large": openai("gpt-4.1-2025-04-14"),
    "chat-model-gigantic": cometai("gpt-5.1"),
    "chat-model-colossal": cometai("gpt-5.2"),
    "chat-model-claude": cometai("claude-opus-4-5-20251101-thinking"),
    "chat-model-glm": cometai("glm-4.7"),
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
    name: "GPT 5.1",
    description: "Gigantic model for experimental tasks",
  },
  {
    id: "chat-model-colossal",
    name: "GPT 5.2",
    description: "Colossal model for experimental tasks",
  },
  {
    id: "chat-model-glm",
    name: "GLM 4.7",
    description: "GLM model for experimental tasks",
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
