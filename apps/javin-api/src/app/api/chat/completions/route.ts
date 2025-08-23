import { allTools, getGroupConfig } from "@javin/shared/src/lib/ai/prompts";
import { generateUUID } from "@javin/shared/src/lib/utils/utils";
import { openai } from "@ai-sdk/openai";
import { myProvider } from "@javin/shared/src/lib/ai/models";
import { smoothStream, streamText, generateText } from "ai";
import { PromptRequestSchema, ChatCompletionStreaming } from "./type";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const EXTERNALAPIKEY = process.env.SENTIENT_EXTERNAL_APIKEY;

    const authHeader = request.headers.get("Authorization");

    if (!authHeader || authHeader !== `Bearer ${EXTERNALAPIKEY}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const validatedData = PromptRequestSchema.parse(body);

    const {
      messages,
      selectedChatModel,
      group,
      max_tokens,
      temperature,
      stream: streaming,
    } = validatedData;

    // Detect if there is an image in the messages
    const hasImage = messages.some((message) =>
      Array.isArray(message.content)
        ? message.content.some((part) => part.type === "image")
        : false
    );

    const groupId = hasImage ? "multimodal" : group || "search";

    const languageModel = myProvider.languageModel(selectedChatModel);
    const model = selectedChatModel;

    const { tools: activeTools, systemPrompt } = await getGroupConfig(
      groupId as any // Cast to any to satisfy the type, since we added "multimodal"
    );

    // Prepend system prompt if it exists and is not already in messages
    if (systemPrompt && (!messages[0] || messages[0].role !== "system")) {
      messages.unshift({ role: "system", content: systemPrompt });
    }

    const StreamingTrue = streaming ?? true; // Default to streaming if not provided

    // The Vercel AI SDK (`ai` package) automatically handles the conversion of the
    // standardized `messages` array into the provider-specific format.
    // For example, it will transform the base64 data URI from an image part
    // into the format required by OpenAI, Anthropic, or Google's API.
    // No manual conversion is needed here.
    const system_fingerprint = process.env.VERCEL_GIT_COMMIT_SHA || "";

    // Build the options object for the AI SDK calls.
    const options: any = {
      model: languageModel,
      messages: messages,
      maxSteps: 10,
      experimental_activeTools: [...activeTools],
      tools: allTools,
      experimental_generateMessageId: generateUUID,
      temperature: temperature, // Initially set the temperature
      maxTokens: max_tokens,   // Initially set the max_tokens
    };

    // Aggressively remove temperature if it's 0 or not a positive number.
    // The OpenAI API throws an error for `temperature: 0` on some models.
    if (options.temperature == null || options.temperature <= 0) {
      delete options.temperature;
    }

    // Remove maxTokens if it's null or not a positive number.
    if (options.maxTokens == null || options.maxTokens <= 0) {
      delete options.maxTokens;
    }

    if (!StreamingTrue) {
      // NON STREAMING
      const result = await generateText(options);

      const responseMessage = {
        id: generateUUID(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: result.text,
              refusal: null,
              annotations: [],
            },
            logprobs: null,
            finish_reason: result.finishReason,
          },
        ],
        model,
        system_fingerprint: system_fingerprint,
        usage: { ...result.usage },
        service_tier: null,
      };

      return new Response(JSON.stringify(responseMessage), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // STREAMING
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the initial message with role
          const initialMessage: ChatCompletionStreaming = {
            id: generateUUID(),
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            system_fingerprint: system_fingerprint,
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                },
                finish_reason: null,
              },
            ],
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
          );

          const result = streamText({
            ...options,
            onChunk: async ({ chunk }) => {
              console.log("onChunk = ", chunk);
            },
            experimental_transform: smoothStream({ chunking: "word" }),
          });

          const streamId = generateUUID(); // Keep a consistent ID for the stream

          for await (const chunk of result.textStream) {
            console.log("chunk = ", chunk);
            const message: ChatCompletionStreaming = {
              id: streamId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              system_fingerprint: system_fingerprint,
              choices: [
                {
                  index: 0,
                  delta: {
                    content: chunk,
                  },
                  finish_reason: null,
                },
              ],
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
            );
          }

          // Send the final chunk with finish_reason
          const stopMessage: ChatCompletionStreaming = {
            id: streamId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            system_fingerprint: system_fingerprint,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop",
              },
            ],
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(stopMessage)}\n\n`)
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: error.errors }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
