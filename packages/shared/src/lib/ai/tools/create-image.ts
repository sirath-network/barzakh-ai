import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { fetchImageAsBase64 } from "../utils/fetch-image-as-base64";
import { put } from "@vercel/blob";

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

async function persistDataUrlToBlob(
  dataUrl: string,
  index: number
): Promise<string> {
  const [header, data] = dataUrl.split(",");
  if (!header || !data) {
    throw new Error("Invalid data URL");
  }

  const mimeMatch = header.match(/data:([^;]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const extension = extensionMap[mimeType] || "png";
  const buffer = Buffer.from(data, "base64");

  const filename = `ai-generated-${Date.now()}-${index}.${extension}`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: mimeType,
    cacheControlMaxAge: 31536000,
  });

  return blob.url;
}

// Function to persist generated images to permanent storage
async function persistGeneratedImages(imageUrls: string[]): Promise<string[]> {
  try {
    const requiresPersistence = imageUrls.some(
      (url) =>
        typeof url === "string" &&
        !url.includes("r2.barzakh.tech") &&
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

      if (url.includes("r2.barzakh.tech") || url.includes("blob.vercel-storage.com")) {
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
  const r2Urls = urls.filter(url => url.includes('r2.barzakh.tech'));
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

const COMET_GEMINI_ENDPOINT =
  process.env.COMETAPI_IMAGE_ENDPOINT ||
  "https://api.cometapi.com/v1beta/models/gemini-2.5-flash-image:generateContent";

async function generateGeminiImage(
  prompt: string,
  input_image_urls?: string[]
): Promise<string[]> {
  const apiKey = process.env.COMETAPI_API_KEY;
  if (!apiKey) {
    throw new Error("COMETAPI_API_KEY environment variable is not set");
  }

  const sanitizedPrompt = sanitizePrompt(prompt);
  const parts: Array<
    | {
        text: string;
      }
    | {
        inline_data: {
          mime_type: string;
          data: string;
        };
      }
  > = [
    {
      text: sanitizedPrompt,
    },
  ];

  if (input_image_urls && input_image_urls.length > 0) {
    const base64Images = await Promise.all(
      input_image_urls.map((url) => fetchImageAsBase64(url))
    );

    const validImages = base64Images.filter(
      (item): item is { base64: string; mimeType: string } =>
        item !== null && !!item.base64
    );

    if (validImages.length > 0) {
      validImages.forEach(({ base64, mimeType }) => {
        parts.push({
          inline_data: {
            mime_type: mimeType,
            data: base64,
          },
        });
      });
    } else {
      parts[0] = {
        text: `Note: Unable to access the original image for editing. Generating a new image based on the request: "${sanitizedPrompt}"`,
      };
    }
  }

  const maxImages = Math.max(
    1,
    Number(process.env.COMETAPI_IMAGE_COUNT || "1")
  );
  const imagePromises = Array.from({ length: maxImages }, async (_, index) => {
    if (index > 0) {
      const delay = index * 3000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const aspectRatio = process.env.COMETAPI_IMAGE_ASPECT_RATIO;
    const generationConfig: Record<string, any> = {
      responseModalities: ["IMAGE"],
    };

    if (aspectRatio) {
      generationConfig.imageConfig = {
        aspectRatio,
      };
    }

    const requestBody = {
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig,
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

        const response = await fetch(COMET_GEMINI_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: apiKey,
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
        const candidates = Array.isArray(data?.candidates)
          ? data.candidates
          : [];

        for (const candidate of candidates) {
          const parts = extractCandidateParts(candidate);
          const inlinePart = parts.find(
            (part: any) =>
              part?.inline_data?.data || part?.inlineData?.data
          );

          if (inlinePart) {
            const inlineData = inlinePart.inline_data ?? inlinePart.inlineData;
            if (inlineData?.data) {
              const mimeType = inlineData.mime_type ?? inlineData.mimeType ?? "image/png";
              const base64 = inlineData.data;
              return `data:${mimeType};base64,${base64}`;
            }
          }
        }

        console.error(
          "Gemini image generation returned no inline image data",
          JSON.stringify(data)
        );

        throw new Error(
          "Gemini image generation succeeded but no image data was returned"
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
    const selectedModelId = model ?? "gemini-3-pro-image";
    if (selectedModelId !== "gemini-3-pro-image") {
      console.warn(
        `Unsupported imagine model "${selectedModelId}" requested. Falling back to gemini-3-pro-image.`
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