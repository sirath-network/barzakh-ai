import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { fetchImageAsBase64 } from "../utils/fetch-image-as-base64";

// Default image model from the imagineModels registry
const DEFAULT_IMAGE_MODEL = imagineModels[0]?.id ?? "google/gemini-3.1-flash-image-preview";

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

function extractCandidateParts(candidate: any): any[] {
  if (!candidate) {
    return [];
  }

  const possibleCollections = [
    candidate.parts,
    candidate.content?.parts,
    candidate.content,
  ];

  for (const collection of possibleCollections) {
    if (Array.isArray(collection)) {
      // Some responses nest parts arrays inside content arrays
      const flattened = collection.flatMap((item: any) => {
        if (Array.isArray(item?.parts)) {
          return item.parts;
        }
        return item;
      });

      return flattened.filter(Boolean);
    }
  }

  return [];
}

const OPENROUTER_GEMINI_ENDPOINT =
  process.env.OPENROUTER_IMAGE_ENDPOINT ||
  "https://openrouter.ai/api/v1/chat/completions";

async function generateGeminiImage(
  prompt: string,
  input_image_urls?: string[]
): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const sanitizedPrompt = sanitizePrompt(prompt);

  // Convert input images to base64 if provided (OpenRouter/Google can't fetch private URLs)
  let base64Images: Array<{ base64: string; mimeType: string }> = [];
  if (input_image_urls && input_image_urls.length > 0) {
    const fetchedImages = await Promise.all(
      input_image_urls.map((url) => fetchImageAsBase64(url))
    );
    base64Images = fetchedImages.filter(
      (item): item is { base64: string; mimeType: string } =>
        item !== null && !!item.base64
    );
  }

  const maxImages = Math.max(
    1,
    Number(process.env.OPENROUTER_IMAGE_COUNT || "1")
  );
  const imagePromises = Array.from({ length: maxImages }, async (_, index) => {
    if (index > 0) {
      const delay = index * 3000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Build messages array for OpenRouter chat completions format
    const messages: Array<{
      role: string;
      content: Array<{ type: string; text?: string; image_url?: { url: string } }>;
    }> = [
        {
          role: "user",
          content: [
            { type: "text", text: base64Images.length > 0 ? sanitizedPrompt : sanitizedPrompt },
          ],
        },
      ];

    // Add input images as base64 data URLs
    if (base64Images.length > 0) {
      for (const { base64, mimeType } of base64Images) {
        messages[0].content.push({
          type: "image_url",
          image_url: { url: `data:${mimeType};base64,${base64}` },
        });
      }
    }

    const requestBody = {
      model: DEFAULT_IMAGE_MODEL,
      messages,
      modalities: ["image", "text"],
      max_tokens: 4096,
    };

    const maxRetries = 3;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }

        const response = await fetch(OPENROUTER_GEMINI_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Gemini image generation failed (${response.status} ${response.statusText}): ${errorText}`
          );
        }

        const data = await response.json();

        // OpenRouter returns images in message.images array
        const choices = Array.isArray(data?.choices) ? data.choices : [];

        for (const choice of choices) {
          const message = choice?.message;

          // Check for images array in message (OpenRouter image generation format)
          if (Array.isArray(message?.images) && message.images.length > 0) {
            for (const image of message.images) {
              if (image?.image_url?.url) {
                return image.image_url.url;
              }
              // Also check for imageUrl (camelCase variant)
              if (image?.imageUrl?.url) {
                return image.imageUrl.url;
              }
            }
          }

          const content = message?.content;
          if (typeof content === "string") {
            // Check if content is raw base64 image data (PNG starts with iVBOR, JPEG with /9j/)
            if (content.startsWith("iVBOR") || content.startsWith("/9j/")) {
              return `data:image/png;base64,${content}`;
            }

            // Check if content already is a data URL
            if (content.startsWith("data:image/")) {
              return content;
            }

            // Extract image URLs from markdown format ![...](url)
            const imageUrlMatch = content.match(/!\[.*?\]\((https?:\/\/[^)]+)\)/);
            if (imageUrlMatch && imageUrlMatch[1]) {
              return imageUrlMatch[1];
            }
            // Also check for direct URL in content
            const directUrlMatch = content.match(/(https?:\/\/[^\s"<>]+\.(?:png|jpg|jpeg|gif|webp))/i);
            if (directUrlMatch && directUrlMatch[1]) {
              return directUrlMatch[1];
            }
          }

          // Check for multimodal content with image parts
          if (Array.isArray(content)) {
            for (const part of content) {
              if (part?.type === "image_url" && part?.image_url?.url) {
                return part.image_url.url;
              }
              // Handle base64 image data if present
              if (part?.type === "image" && part?.data) {
                const mimeType = part.mime_type ?? "image/png";
                return `data:${mimeType};base64,${part.data}`;
              }
            }
          }
        }

        console.error(
          "OpenRouter image generation returned no image data",
          JSON.stringify(data)
        );

        throw new Error(
          "Image generation succeeded but no image data was returned"
        );
      } catch (error) {
        const normalizedError = toError(error);
        lastError = normalizedError;
        const originalName =
          error instanceof Error ? error.name : normalizedError.name;
        const message = normalizedError.message || "";
        const isRetryable =
          originalName === "AbortError" ||
          message.includes("429") ||
          message.includes("timeout") ||
          message.includes("temporarily");

        if (attempt === maxRetries - 1 || !isRetryable) {
          throw normalizedError;
        }
      }
    }

    throw lastError ?? new Error("Gemini image generation failed");
  });

  const results = await Promise.allSettled(imagePromises);
  const errors: string[] = [];
  const images = results
    .map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      const reason = stringifyError(result.reason);
      errors.push(reason);
      console.error("Gemini image generation attempt failed:", reason);
      return null;
    })
    .filter((value): value is string => typeof value === "string");

  if (images.length === 0) {
    const detail = errors.length > 0 ? ` Details: ${errors.join(" | ")}` : "";
    throw new Error(`All Gemini image generation attempts failed.${detail}`);
  }

  return images;
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
        "Optional override for the image model. Only 'gemini-3-pro-image' is supported."
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
      const imageDataUrls = await generateGeminiImage(
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