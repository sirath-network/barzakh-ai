import { openai } from "@ai-sdk/openai";
import { createOpenAI } from "@ai-sdk/openai";
import { customProvider } from "ai";

// CometAPI provider (OpenAI-compatible)
// Custom fetch to normalize non-standard responses from some models (e.g., Gemini)
// that return `type: null` instead of `type: "function"` in tool_calls
const normalizedFetch: typeof fetch = async (url, options) => {
  const response = await fetch(url, options);

  // Only process streaming responses
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    return response;
  }

  const reader = response.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const transformedStream = new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            if (buffer.trim()) {
              controller.enqueue(encoder.encode(buffer));
            }
            controller.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep the last partial line in the buffer

          const transformedLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const jsonStr = line.slice(6);
                if (jsonStr.trim()) {
                  const parsed = JSON.parse(jsonStr);

                  // Normalize tool_calls: if type is null, set to "function"
                  if (parsed.choices) {
                    for (const choice of parsed.choices) {
                      if (choice.delta?.tool_calls) {
                        choice.delta.tool_calls.forEach((toolCall: any, index: number) => {
                          if (toolCall.type === null) {
                            toolCall.type = "function";
                          }
                          if (toolCall.index === undefined) {
                            toolCall.index = index;
                          }
                        });
                      }
                    }
                  }

                  transformedLines.push('data: ' + JSON.stringify(parsed));
                }
              } catch {
                // If parsing fails, pass through unchanged
                transformedLines.push(line);
              }
            } else {
              transformedLines.push(line);
            }
          }

          if (transformedLines.length > 0) {
            controller.enqueue(encoder.encode(transformedLines.join('\n') + '\n'));
          }
        }
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(transformedStream, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

const cometai = createOpenAI({
  baseURL: "https://api.cometapi.com/v1",
  apiKey: process.env.COMETAPI_API_KEY,
  fetch: normalizedFetch,
});

export const DEFAULT_CHAT_MODEL: string = "xai-grok-4.1-fast";

export const myProvider: any = customProvider({
  languageModels: {
    "openai-gpt-4o": openai("gpt-4o"),
    "openai-gpt-4.1": openai("gpt-4.1-2025-04-14"),
    "openai-gpt-5.1": cometai("gpt-5.1"),
    "openai-gpt-5.2": cometai("gpt-5.2"),
    "anthropic-opus-4.5": cometai("claude-opus-4-5-20251101-thinking"),
    "anthropic-haiku-4.5": cometai("claude-haiku-4-5-20251001"),
    "google-gemini-3-flash": cometai("gemini-3-flash"),
    "google-gemini-2.5-flash-preview": cometai("gemini-2.5-flash-preview-09-2025"),
    "xai-grok-4.1-fast": cometai("grok-4-1-fast-non-reasoning"),
    "zai-glm-4.7": cometai("glm-4.7"),

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
    id: "openai-gpt-4o",
    name: "GPT 4o",
    description: "Fast & efficient for everyday tasks",
  },
  {
    id: "openai-gpt-4.1",
    name: "GPT 4.1",
    description: "Enhanced reasoning & code generation",
  },
  {
    id: "openai-gpt-5.1",
    name: "GPT 5.1",
    description: "Next-gen intelligence & creativity",
  },
  {
    id: "openai-gpt-5.2",
    name: "GPT 5.2",
    description: "Advanced reasoning & analysis",
  },
  {
    id: "zai-glm-4.7",
    name: "GLM 4.7",
    description: "Strong multilingual capabilities",
  },
  {
    id: "xai-grok-4.1-fast",
    name: "Grok 4.1 Fast",
    description: "Real-time knowledge & witty responses",
  },
  {
    id: "google-gemini-2.5-flash-preview",
    name: "Gemini 2.5 Flash",
    description: "Fastest Gemini model for experimental tasks",
  },
  {
    id: "google-gemini-3-flash",
    name: "Gemini 3 Flash",
    description: "Latest Gemini model for quick responses",
  },

  {
    id: "anthropic-haiku-4.5",
    name: "Claude Haiku 4.5",
    description: "Lightning-fast Claude responses",
  },
  {
    id: "anthropic-opus-4.5",
    name: "Claude Opus 4.5 Thinking",
    description: "Deep thinking & extended reasoning",
  }
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
