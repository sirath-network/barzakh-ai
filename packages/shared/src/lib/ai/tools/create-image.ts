import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { fetchImageAsBase64 } from "../utils/fetch-image-as-base64";

// Default image model from the imagineModels registry
const DEFAULT_IMAGE_MODEL =
  imagineModels[0]?.id ?? "google/gemini-3.1-flash-image-preview";
const OPENROUTER_GEMINI_ENDPOINT =
  "https://openrouter.ai/api/v1/chat/completions";

function getFrontendUrl(): string {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.AUTH_URL) {
    return process.env.AUTH_URL;
  }
  return "http://localhost:3000";
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  try {
    return new Error(
      typeof error === "string" ? error : JSON.stringify(error)
    );
  } catch {
    return new Error("Unknown error");
  }
}

const extensionMap: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

/**
 * Persist a data URL image to R2 storage via the persist-image API endpoint
 * This replaces the previous Vercel Blob implementation
 */
async function persistDataUrlToBlob(
  dataUrl: string,
  index: number
): Promise<string> {
  const frontendUrl = getFrontendUrl();

  try {
    // Use the persist-image API which handles R2 uploads
    const response = await fetch(`${frontendUrl}/api/persist-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrls: [dataUrl],
        internalRequest: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`persist-image API failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const persistedUrls: string[] = Array.isArray(data?.persistedUrls)
      ? data.persistedUrls
      : [];

    if (persistedUrls.length > 0 && persistedUrls[0]) {
      return persistedUrls[0];
    }

    throw new Error("persist-image API returned no URLs");
  } catch (error) {
    console.error("Failed to persist data URL via persist-image API:", error);
    // Return original data URL as fallback
    return dataUrl;
  }
}

// Function to persist generated images to permanent storage
async function persistGeneratedImages(imageUrls: string[]): Promise<string[]> {
  try {
    const requiresPersistence = imageUrls.some(
      (url) =>
        typeof url === "string" &&
        !url.includes("r2.barzakh.tech") &&
        !url.includes(".r2.cloudflarestorage.com") &&
        !url.includes("blob.vercel-storage.com")
    );

    if (!requiresPersistence) {
      return imageUrls;
    }

    const results: Array<string | null> = new Array(imageUrls.length).fill(
      null
    );
    const httpUrls: string[] = [];
    const httpIndices: number[] = [];

    for (let index = 0; index < imageUrls.length; index++) {
      const url = imageUrls[index];
      if (!url) {
        continue;
      }

      if (url.includes("r2.barzakh.tech") || url.includes(".r2.cloudflarestorage.com") || url.includes("blob.vercel-storage.com")) {
        results[index] = url;
        continue;
      }

      if (url.startsWith("data:")) {
        try {
          const persisted = await persistDataUrlToBlob(url, index);
          results[index] = persisted;
        } catch (error) {
          console.error("Failed to persist data URL image:", error);
          results[index] = url;
        }
        continue;
      }

      httpUrls.push(url);
      httpIndices.push(index);
    }

    if (httpUrls.length > 0) {
      const frontendUrl = getFrontendUrl();
      const response = await fetch(`${frontendUrl}/api/persist-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrls: httpUrls,
          internalRequest: true,
        }),
      });

      if (response.ok) {
        try {
          const data = await response.json();
          const persistedUrls: string[] = Array.isArray(data?.persistedUrls)
            ? data.persistedUrls
            : [];

          persistedUrls.forEach((persistedUrl, idx) => {
            const targetIndex = httpIndices[idx];
            if (targetIndex !== undefined) {
              results[targetIndex] = persistedUrl || httpUrls[idx];
            }
          });
        } catch (error) {
          console.error("Failed to parse persist-image response:", error);
          httpIndices.forEach((targetIndex, idx) => {
            results[targetIndex] = httpUrls[idx];
          });
        }
      } else {
        console.error(
          "persist-image endpoint returned non-200 response:",
          response.status,
          response.statusText
        );
        httpIndices.forEach((targetIndex, idx) => {
          results[targetIndex] = httpUrls[idx];
        });
      }
    }

    return results.map((url, index) => url ?? imageUrls[index]);
  } catch (error) {
    console.error("Failed to persist images:", error);
    return imageUrls;
  }
}

// Function to validate and prioritize image URLs
function validateImageUrls(urls: string[]): { validUrls: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const r2Urls = urls.filter(url => url.includes('r2.barzakh.tech') || url.includes('.r2.cloudflarestorage.com'));
  const vercelBlobUrls = urls.filter(url => url.includes('blob.vercel-storage.com'));
  const googleAUrls = urls.filter(url =>
    url.includes('generativelanguage.googleapis.com') ||
    url.includes('generative-ai-image-store.googleapis.com')
  );
  const gswUrls = urls.filter(url => url.includes('r2.gsw.io'));
  const whatzUrls = urls.filter(url => url.includes('r2.src.whatz.ai'));

  // Prioritize R2 URLs (primary storage)
  if (r2Urls.length > 0) {
    return { validUrls: r2Urls, warnings: [] };
  }

  // Then Cloudflare R2 Storage URL (legacy)
  if (vercelBlobUrls.length > 0) {
    return { validUrls: vercelBlobUrls, warnings: [] };
  }

  if (gswUrls.length > 0) {
    return { validUrls: gswUrls, warnings: [] };
  }

  if (whatzUrls.length > 0) {
    return { validUrls: whatzUrls, warnings: [] };
  }

  if (googleAUrls.length > 0) {
    warnings.push("Google AI URLs detected - these may expire quickly");
  }

  return { validUrls: urls, warnings };
}

// Function to sanitize prompts for content moderation
function sanitizePrompt(prompt: string): string {
  // Replace potentially problematic terms with more appropriate alternatives
  const replacements: Record<string, string> = {
    'defiled': 'weathered',
    'bloodstained': 'battle-worn',
    'twisted': 'distorted',
    'crimson': 'red',
    'blackened': 'dark',
    'blood': 'battle',
    'defile': 'weather',
    'twist': 'distort',
    'cracked and defiled': 'weathered and aged',
    'bloodstained blade': 'battle-worn sword',
    'twisted shapes': 'distorted forms',
    'crimson torches': 'red torches',
    'blackened steel': 'dark steel'
  };

  let sanitized = prompt;
  for (const [problematic, replacement] of Object.entries(replacements)) {
    sanitized = sanitized.replace(new RegExp(problematic, 'gi'), replacement);
  }

  return sanitized;
}

/**
 * Get OpenRouter endpoint and API key for Gemini image generation.
 */
function getOpenRouterImageConfig(): { endpoint: string; apiKey: string } {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  return { endpoint: OPENROUTER_GEMINI_ENDPOINT, apiKey };
}

/**
 * Generate or edit an image using Gemini via OpenRouter's chat completions endpoint.
 */
async function generateOpenRouterImage(
  prompt: string,
  input_image_urls?: string[]
): Promise<string[]> {
  const { endpoint, apiKey } = getOpenRouterImageConfig();
  const sanitizedPrompt = sanitizePrompt(prompt);
  return generateImageWithEditing(sanitizedPrompt, input_image_urls ?? [], endpoint, apiKey);
}

/**
 * Create/edit/combine images using OpenRouter chat completions with image modality.
 */
async function generateImageWithEditing(
  prompt: string,
  inputImageUrls: string[],
  endpoint: string,
  apiKey: string
): Promise<string[]> {
  // Convert input images to base64
  const fetchedImages = await Promise.all(
    inputImageUrls.map((url) => fetchImageAsBase64(url))
  );
  const base64Images = fetchedImages.filter(
    (item): item is { base64: string; mimeType: string } =>
      item !== null && !!item.base64
  );

  // Build messages array for chat completions format
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text: prompt },
  ];

  // Add input images as base64 data URLs
  for (const { base64, mimeType } of base64Images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${mimeType};base64,${base64}` },
    });
  }

  const chatUrl = endpoint;
  const maxRetries = 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }

      const response = await fetch(chatUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_IMAGE_MODEL,
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
          max_tokens: 4096,
        }),
        signal: AbortSignal.timeout(90000),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gemini image generation failed (${response.status} ${response.statusText}): ${errorText}`
        );
      }

      const data = await response.json();
      const choices = Array.isArray(data?.choices) ? data.choices : [];

      for (const choice of choices) {
        const message = choice?.message;

        // Check for images array in message
        if (Array.isArray(message?.images) && message.images.length > 0) {
          for (const image of message.images) {
            if (image?.image_url?.url) return [image.image_url.url];
            if (image?.imageUrl?.url) return [image.imageUrl.url];
          }
        }

        const msgContent = message?.content;
        if (typeof msgContent === "string") {
          // Raw base64 data
          if (msgContent.startsWith("iVBOR") || msgContent.startsWith("/9j/")) {
            return [`data:image/png;base64,${msgContent}`];
          }
          if (msgContent.startsWith("data:image/")) {
            return [msgContent];
          }
          // Extract image URLs from markdown
          const imageUrlMatch = msgContent.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
          if (imageUrlMatch?.[1]) return [imageUrlMatch[1]];
          const directUrlMatch = msgContent.match(/(https?:\/\/[^\s"<>]+\.(?:png|jpg|jpeg|gif|webp))/i);
          if (directUrlMatch?.[1]) return [directUrlMatch[1]];
        }

        // Check multimodal content with image parts
        if (Array.isArray(msgContent)) {
          for (const part of msgContent) {
            if (part?.type === "image_url" && part?.image_url?.url) {
              return [part.image_url.url];
            }
            if (part?.type === "image" && part?.data) {
              const mimeType = part.mime_type ?? "image/png";
              return [`data:${mimeType};base64,${part.data}`];
            }
          }
        }
      }

      throw new Error(
        "Image editing succeeded but no image data was returned"
      );
    } catch (error) {
      const normalizedError = toError(error);
      lastError = normalizedError;
      const message = normalizedError.message || "";
      const isRetryable =
        normalizedError.name === "AbortError" ||
        message.includes("429") ||
        message.includes("timeout") ||
        message.includes("temporarily");

      if (attempt === maxRetries - 1 || !isRetryable) {
        throw normalizedError;
      }
    }
  }

  throw lastError ?? new Error("Image editing failed");
}

export const createImage = tool({
  description:
    "Create or edit an image from a prompt. For editing or combining, provide one or more input image URLs.",
  parameters: z.object({
    prompt: z.string().describe("The prompt to create or edit the image from."),
    model: z
      .string()
      .optional()
      .describe(
        "Optional override for the image model. Only 'google/gemini-3.1-flash-image-preview' is supported."
      ),
    input_images: z
      .array(z.string().url())
      .optional()
      .describe(
        "An array of image URLs to be used as input for editing or combining."
      ),
  }),
  execute: async ({ prompt, model, input_images }) => {
    const selectedModelId = model ?? DEFAULT_IMAGE_MODEL;
    const validModelIds = imagineModels.map((m) => m.id);
    if (!validModelIds.includes(selectedModelId)) {
      console.warn(
        `Unsupported imagine model "${selectedModelId}" requested. Falling back to ${DEFAULT_IMAGE_MODEL}.`
      );
    }

    let normalizedInputImages = input_images;
    if (normalizedInputImages && normalizedInputImages.length > 0) {
      const { validUrls } = validateImageUrls(normalizedInputImages);
      normalizedInputImages = validUrls;
    }

    try {
      const imageDataUrls = await generateOpenRouterImage(
        prompt,
        normalizedInputImages
      );
      const persistedUrls = await persistGeneratedImages(imageDataUrls);

      return {
        imageUrls: persistedUrls,
      };
    } catch (error) {
      const normalizedError = toError(error);
      console.error("Error in createImage:", normalizedError);
      const message = normalizedError.message || "";

      if (message.includes("Failed to process input images")) {
        throw new Error(
          "Unable to access the provided image for editing. The image may be from a private source or no longer accessible. Please try uploading the image again or generate a new image instead."
        );
      } else if (message.includes("timed out")) {
        throw new Error(
          "Image generation timed out. This may be due to content moderation or server issues. Please try a simpler, more appropriate prompt or try again later."
        );
      } else if (message.includes("Content Moderated")) {
        throw new Error(
          "Image generation was blocked by content moderation. The prompt may contain inappropriate content. Please try a different, more appropriate prompt."
        );
      } else if (message.includes("401")) {
        throw new Error(
          "Unable to access the attached image. The image may require authentication or the domain is not supported. Please try uploading the image again or use a different image source."
        );
      } else if (message.includes("ETIMEDOUT") || message.includes("timeout")) {
        throw new Error(
          "Network timeout when accessing the attached image. This may be due to network connectivity issues or the image service being temporarily unavailable. Please try again later or upload a different image."
        );
      }

      throw normalizedError;
    }
  },
});