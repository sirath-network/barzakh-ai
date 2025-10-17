import { allTools, getGroupConfig } from "@barzakh/shared/src/lib/ai/prompts";
import { generateUUID } from "@barzakh/shared/src/lib/utils/utils";
import { openai } from "@ai-sdk/openai";
import { myProvider } from "@barzakh/shared/src/lib/ai/models";
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

    const lastMessage = messages[messages.length - 1];
    let userWantsToCreateOrEditImage = false;
    if (lastMessage.role === "user") {
      let textContent = "";
      if (typeof lastMessage.content === "string") {
        textContent = lastMessage.content;
      } else if (Array.isArray(lastMessage.content)) {
        // Find the first text part and use its content.
        const textPart = lastMessage.content.find(
          (part) => part.type === "text"
        );
        if (textPart && "text" in textPart) {
          textContent = textPart.text;
        }
      }

      if (textContent) {
        const lowerCaseContent = textContent.toLowerCase();
        userWantsToCreateOrEditImage =
          lowerCaseContent.includes("create an image") ||
          lowerCaseContent.includes("generate an image") ||
          lowerCaseContent.includes("draw") ||
          lowerCaseContent.includes("imagine") ||
          lowerCaseContent.includes("edit") ||
          lowerCaseContent.includes("combine") ||
          lowerCaseContent.includes("modify") ||
          lowerCaseContent.includes("change") ||
          lowerCaseContent.includes("add") ||
          lowerCaseContent.includes("remove") ||
          lowerCaseContent.includes("regenerate") ||
          lowerCaseContent.includes("make it") ||
          lowerCaseContent.includes("turn it into") ||
          lowerCaseContent.includes("transform");
      }
    }

    let groupId;
    // Prioritize 'imagine' group if the user intends to create/edit an image,
    // or if an image is provided with an editing-related prompt.
    if (group === "imagine" || userWantsToCreateOrEditImage || (hasImage && userWantsToCreateOrEditImage)) {
      groupId = "imagine";
    } else if (hasImage) {
      groupId = "multimodal";
    } else {
      groupId = group || "search";
    }

    const languageModel = myProvider.languageModel(selectedChatModel);
    const model = selectedChatModel;

    const { tools: activeTools, systemPrompt } = await getGroupConfig(
      groupId as any
    );

    // Prepend system prompt if it exists and is not already in messages
    if (systemPrompt && (!messages[0] || messages[0].role !== "system")) {
      messages.unshift({ role: "system", content: systemPrompt });
    }

    // Add image URL extraction hint for imagine group
    if (groupId === "imagine" && hasImage) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === "user" && Array.isArray(lastMessage.content)) {
        const imageUrls = lastMessage.content
          .filter((part: any) => part.type === "image" && part.image)
          .map((part: any) => part.image);
        
        // Extract original Vercel Blob URLs from the message text
        const textParts = lastMessage.content.filter((part: any) => part.type === "text");
        let originalVercelUrls: string[] = [];
        
        for (const textPart of textParts) {
          if (textPart.text && textPart.text.includes('[ORIGINAL_IMAGE_URLS_FOR_EDITING:')) {
            const match = textPart.text.match(/\[ORIGINAL_IMAGE_URLS_FOR_EDITING: ([^\]]+)\]/);
            if (match) {
              originalVercelUrls = match[1].split(', ').filter(url => url.trim());
              console.log("🔗 Found original Vercel Blob URLs in message:", originalVercelUrls);
              break;
            }
          }
        }
        
        console.log("Image URLs received in API:", imageUrls);
        console.log("Image URL sources:", imageUrls.map(url => {
          if (url.includes('blob.vercel-storage.com')) return 'Vercel Blob Storage';
          if (url.includes('generativelanguage.googleapis.com')) return 'Google AI';
          if (url.includes('storage.googleapis.com')) return 'Google Cloud Storage';
          return 'Unknown';
        }));
        
        if (imageUrls.length > 0) {
          // Check if URLs are from Vercel Blob Storage (which should be persistent)
          const vercelBlobUrls = imageUrls.filter(url => url.includes('blob.vercel-storage.com'));
          const googleAUrls = imageUrls.filter(url => url.includes('generativelanguage.googleapis.com'));
          
          if (vercelBlobUrls.length > 0) {
            console.log("✅ Found Vercel Blob Storage URLs - these should be persistent for editing");
            console.log("Vercel Blob URLs:", vercelBlobUrls);
            const imageHint = `Available images for editing (persistent Vercel Blob URLs): ${vercelBlobUrls.join(", ")}. Use these URLs in the input_images parameter when calling createImage. These URLs are persistent and should work for editing.`;
            messages.push({ role: "system", content: imageHint });
          } else if (googleAUrls.length > 0 && originalVercelUrls.length > 0) {
            console.log("⚠️ Google AI URLs detected, but original Vercel Blob URLs found");
            console.log("Google AI URLs:", googleAUrls);
            console.log("Original Vercel Blob URLs:", originalVercelUrls);
            console.log("✅ Using original Vercel Blob URLs for editing instead of converted Google AI URLs");
            const imageHint = `Available images for editing (original Vercel Blob URLs): ${originalVercelUrls.join(", ")}. Use these URLs in the input_images parameter when calling createImage. These are the original URLs before Google AI conversion and should work for editing.`;
            messages.push({ role: "system", content: imageHint });
          } else if (googleAUrls.length > 0) {
            console.log("⚠️ Warning: Only Google AI URLs found - these may expire quickly");
            console.log("Google AI URLs:", googleAUrls);
            console.log("⚠️ This suggests the AI SDK converted Vercel Blob URLs to Google AI URLs");
            const imageHint = `Available images for editing (may expire): ${googleAUrls.join(", ")}. Use these URLs in the input_images parameter when calling createImage. Note: These URLs may expire quickly, so editing might not work. For better results, please upload images directly to the chat.`;
            messages.push({ role: "system", content: imageHint });
          } else {
            console.log("Other image URLs found:", imageUrls);
            const imageHint = `Available images for editing: ${imageUrls.join(", ")}. Use these URLs in the input_images parameter when calling createImage.`;
            messages.push({ role: "system", content: imageHint });
          }
        }
      }
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
