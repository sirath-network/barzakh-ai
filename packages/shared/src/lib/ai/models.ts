import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

// CometAPI provider (OpenAI-compatible)
const cometai = createOpenAI({
  baseURL: "https://api.cometapi.com/v1",
  apiKey: process.env.COMETAPI_API_KEY,
});

export const DEFAULT_CHAT_MODEL: string = "chat-model-grok";

export const myProvider: any = customProvider({
  languageModels: {
    "chat-model-small": openai("gpt-4o"),
    "chat-model-large": openai("gpt-4.1-2025-04-14"),
    "chat-model-claude": cometai("claude-opus-4-5-20251101"),
    "chat-model-grok": cometai("grok-4-fast-reasoning"),
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
    name: "gpt-4o",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "chat-model-large",
    name: "gpt-4.1",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "chat-model-gigantic",
    name: "gpt-5",
    description: "Gigantic model for experimental tasks",
  },
  {
    id: "chat-model-glm",
    name: "glm-4.6",
    description: "GLM-4.6 model for experimental tasks",
  },
  {
    id: "chat-model-claude",
    name: "claude-opus-4-5",
    description: "Claude model for experimental tasks",
  },
  {
    id: "chat-model-grok",
    name: "grok-4-fast-reasoning",
    description: "Grok model for experimental tasks",
  },
];

interface ImagineModel {
  id: string;
  name: string;
  description: string;
}

export const imagineModels: Array<ImagineModel> = [
  {
    id: "gemini-3-pro-image",
    name: "Gemini 3 Pro Image",
    description:
      "Gemini 3 Pro Image via CometAPI for fast, high-fidelity generations.",
  },
];