import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { fetchImageAsBase64 } from "../utils/fetch-image-as-base64";

const DEFAULT_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview";
const DEFAULT_OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1";

function getImageConfig() {
  const endpoint = (process.env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_ENDPOINT).replace(/\/$/, "");
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const timeoutMs = Number(process.env.OPENROUTER_IMAGE_TIMEOUT_MS) || 300_000;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }
  return { endpoint, apiKey, model, timeoutMs };
}

/**
 * Persist base64 or temporary image URLs to permanent R2 storage.
 */
async function persistGeneratedImages(imageUrls: string[]): Promise<string[]> {
  const results: string[] = [];

  for (const url of imageUrls) {
    if (url.startsWith("https://r2.sirath.network") || url.includes(".r2.cloudflarestorage.com")) {
      results.push(url);
      continue;
    }

    if (url.startsWith("data:")) {
      try {
        // Upload base64 to R2 via persist-image API
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const response = await fetch(`${frontendUrl}/api/persist-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrls: [url],
            internalRequest: true,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.persistedUrls?.[0]) {
            results.push(data.persistedUrls[0]);
            continue;
          }
        } else {
          console.error(`[createImage] Failed to persist base64 image. Status: ${response.status}. Response text:`, await response.text());
        }
      } catch (e) {
        console.error("[createImage] Failed to persist base64 image:", e);
      }
    }

    // Fallback: return original (will show warning)
    results.push(url);
  }

  return results;
}

async function generateOpenRouterImage(
  prompt: string,
  input_image_urls?: string[]
): Promise<string[]> {
  const config = getImageConfig();

  let content: any;

  if (input_image_urls && input_image_urls.length > 0) {
    const imageParts = await Promise.all(
      input_image_urls.map(async (url) => {
        const result = await fetchImageAsBase64(url);
        if (!result) {
          throw new Error(`Failed to fetch or convert image: ${url}`);
        }
        return {
          type: "image_url",
          image_url: {
            url: `data:${result.mimeType};base64,${result.base64}`,
          },
        };
      })
    );

    content = [...imageParts, { type: "text", text: prompt }];
  } else {
    content = prompt;
  }

  const body: any = {
    model: config.model,
    messages: [
      {
        role: "user",
        content,
      },
    ],
    max_tokens: 2048,
  };

  if (!config.model.includes("gemini")) {
    body.modalities = ["image", "text"];
  }

  const response = await fetch(`${config.endpoint}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://app.sirath.network",
      "X-Title": process.env.OPENROUTER_APP_TITLE || "Barzakh AI",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`OpenRouter image generation failed (${response.status}): ${text}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`OpenRouter returned non-JSON: ${text}`);
  }

  const message = data?.choices?.[0]?.message;
  const images = message?.images || [];

  if (images.length === 0) {
    throw new Error("OpenRouter did not return any images.");
  }

  const rawUrls = images.map((img: any) => img.image_url?.url).filter(Boolean);

  // Persist to R2 so we don't return expiring base64 URLs
  const persistedUrls = await persistGeneratedImages(rawUrls);

  return persistedUrls;
}

export const createImage = tool({
  description: "Generate or edit an image. Supports iterative editing when input_images are provided.",
  parameters: z.object({
    prompt: z.string().describe("The prompt describing the desired image or edit."),
    input_images: z
      .array(z.string().url())
      .optional()
      .describe("Optional array of image URLs to edit or use as reference. Use the latest generated image for iterative edits."),
  }),
  execute: async ({ prompt, input_images }) => {
    try {
      const imageUrls = await generateOpenRouterImage(prompt, input_images);
      return { imageUrls };
    } catch (error: any) {
      console.error("[createImage] Error:", error);
      throw new Error(error.message || "Image generation failed");
    }
  },
});
