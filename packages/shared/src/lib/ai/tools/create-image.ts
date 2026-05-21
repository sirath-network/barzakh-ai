import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { fetchImageAsBase64 } from "../utils/fetch-image-as-base64";

// Default image model from the imagineModels registry
const DEFAULT_IMAGE_MODEL = imagineModels[0]?.id ?? "gpt-image-2";
const DEFAULT_AZURE_FOUNDRY_ENDPOINT =
  "https://siraths-resource.services.ai.azure.com/openai/v1";
const DEFAULT_AZURE_IMAGE_SIZE = "1024x1024";
const AZURE_GPT_IMAGE_2_MIN_PIXELS = 655_360;
const AZURE_GPT_IMAGE_2_MAX_PIXELS = 8_294_400;
const AZURE_GPT_IMAGE_2_MAX_EDGE = 3_840;
const AZURE_GPT_IMAGE_2_MAX_ASPECT_RATIO = 3;

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

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function isEnvEnabled(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes" || value === "on";
}

function normalizeAzureImageSize(requestedSize: unknown, fallback: string): string {
  if (typeof requestedSize !== "string" || requestedSize.trim().length === 0) {
    return fallback;
  }

  const normalized = requestedSize.trim().toLowerCase().replace(/[×]/g, "x");
  const match = normalized.match(/^(\d{2,5})x(\d{2,5})$/);

  if (!match) {
    console.warn(
      `[createImage] Invalid Azure image size "${requestedSize}". Expected WIDTHxHEIGHT, falling back to ${fallback}.`
    );
    return fallback;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);
  const pixels = width * height;
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);
  const aspectRatio = longEdge / shortEdge;
  const isValid =
    width % 16 === 0 &&
    height % 16 === 0 &&
    longEdge <= AZURE_GPT_IMAGE_2_MAX_EDGE &&
    pixels >= AZURE_GPT_IMAGE_2_MIN_PIXELS &&
    pixels <= AZURE_GPT_IMAGE_2_MAX_PIXELS &&
    aspectRatio <= AZURE_GPT_IMAGE_2_MAX_ASPECT_RATIO;

  if (!isValid) {
    console.warn(
      `[createImage] Azure image size "${requestedSize}" is outside GPT-Image-2 limits. Both edges must be multiples of 16, long edge <= ${AZURE_GPT_IMAGE_2_MAX_EDGE}, aspect ratio <= ${AZURE_GPT_IMAGE_2_MAX_ASPECT_RATIO}:1, and pixel count between ${AZURE_GPT_IMAGE_2_MIN_PIXELS} and ${AZURE_GPT_IMAGE_2_MAX_PIXELS}. Falling back to ${fallback}.`
    );
    return fallback;
  }

  return `${width}x${height}`;
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
 * Azure AI Foundry image generation configuration.
 * The endpoint is the OpenAI-compatible v1 base URL, for example:
 * https://siraths-resource.services.ai.azure.com/openai/v1
 */
function getAzureImageConfig(): {
  endpoint: string;
  apiKey: string;
  model: string;
  quality: "low" | "medium" | "high";
  size: string;
  timeoutMs: number;
  defaultImageCount: number;
  stream: boolean;
  partialImages: number;
} {
  const endpoint = (
    process.env.AZURE_FOUNDRY_ENDPOINT || DEFAULT_AZURE_FOUNDRY_ENDPOINT
  ).replace(/\/$/, "");
  const apiKey = process.env.AZURE_FOUNDRY_API_KEY;
  const model = process.env.AZURE_FOUNDRY_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const requestedQuality = process.env.AZURE_FOUNDRY_IMAGE_QUALITY;
  const quality =
    requestedQuality === "medium" || requestedQuality === "high"
      ? requestedQuality
      : "low";
  const size = normalizeAzureImageSize(
    process.env.AZURE_FOUNDRY_IMAGE_SIZE,
    DEFAULT_AZURE_IMAGE_SIZE
  );
  const timeoutMs = Number(process.env.AZURE_FOUNDRY_IMAGE_TIMEOUT_MS) || 600_000;
  const defaultImageCount = 1;
  const stream = isEnvEnabled(process.env.AZURE_FOUNDRY_IMAGE_STREAM);
  const partialImages = clampInteger(
    process.env.AZURE_FOUNDRY_IMAGE_PARTIAL_IMAGES,
    0,
    3,
    2
  );

  if (!apiKey) {
    throw new Error("AZURE_FOUNDRY_API_KEY environment variable is not set");
  }

  return {
    endpoint,
    apiKey,
    model,
    quality,
    size,
    timeoutMs,
    defaultImageCount,
    stream,
    partialImages,
  };
}

let azureNetworkingConfigured = false;

async function configureAzureFetchNetworking(): Promise<void> {
  if (azureNetworkingConfigured) return;
  azureNetworkingConfigured = true;

  try {
    const net = await import("node:net");
    const desiredTimeout =
      Number(process.env.AZURE_FOUNDRY_CONNECT_ATTEMPT_TIMEOUT_MS) || 5_000;
    const currentTimeout = net.getDefaultAutoSelectFamilyAttemptTimeout?.();

    if (typeof currentTimeout === "number" && currentTimeout < desiredTimeout) {
      net.setDefaultAutoSelectFamilyAttemptTimeout?.(desiredTimeout);
      console.log(
        `[createImage] Raised Node autoSelectFamily attempt timeout from ${currentTimeout}ms to ${desiredTimeout}ms for Azure image fetches`
      );
    }
  } catch {
    // The Node networking workaround is best-effort. Non-Node runtimes should continue normally.
  }
}

type AzureImageData = {
  url?: string;
  b64_json?: string;
  image_base64?: string;
};

function extractAzureImageUrls(data: unknown): string[] {
  const responseData = (data as { data?: AzureImageData[] })?.data;
  if (!Array.isArray(responseData)) {
    return [];
  }

  return responseData
    .map((item) => {
      if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
      if (item?.image_base64) return `data:image/png;base64,${item.image_base64}`;
      if (item?.url) return item.url;
      return null;
    })
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}

async function fetchAzureJson(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<unknown> {
  await configureAzureFetchNetworking();

  const started = Date.now();
  console.log(`[createImage] Azure image request started: ${url}`);

  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const elapsedMs = Date.now() - started;
  const responseText = await response.text();
  console.log(
    `[createImage] Azure image request completed in ${elapsedMs}ms with status ${response.status}`
  );

  if (!response.ok) {
    throw new Error(
      `Azure image generation failed (${response.status} ${response.statusText}): ${responseText}`
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Azure image generation returned non-JSON response: ${responseText}`);
  }
}

function azureImageHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

type AzureImageStreamEvent = {
  type?: string;
  b64_json?: string;
  image_base64?: string;
  partial_image_index?: number;
  data?: AzureImageData[];
};

type AzurePartialImageCallback = (
  imageUrl: string,
  partialImageIndex: number
) => void | Promise<void>;

function parseSseDataBlocks(buffer: string): { blocks: string[]; remainder: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  const remainder = parts.pop() ?? "";
  const blocks = parts
    .map((part) =>
      part
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n")
    )
    .filter(Boolean);

  return { blocks, remainder };
}

function extractImagesFromStreamEvent(event: AzureImageStreamEvent): string[] {
  if (Array.isArray(event.data)) {
    return extractAzureImageUrls({ data: event.data });
  }

  if (event.b64_json) return [`data:image/png;base64,${event.b64_json}`];
  if (event.image_base64) return [`data:image/png;base64,${event.image_base64}`];
  return [];
}

async function fetchAzureImageStream(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  onPartialImage?: AzurePartialImageCallback
): Promise<unknown> {
  await configureAzureFetchNetworking();

  const started = Date.now();
  console.log(`[createImage] Azure streaming image request started: ${url}`);

  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Azure streaming image generation failed (${response.status} ${response.statusText}): ${responseText}`
    );
  }

  if (!response.body) {
    throw new Error("Azure streaming image generation returned no response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const finalImages: string[] = [];
  const partialImages = new Map<number, string>();
  let buffer = "";
  let partialCount = 0;

  const handleDataBlock = async (dataBlock: string): Promise<void> => {
    if (!dataBlock || dataBlock === "[DONE]") return;

    try {
      const event = JSON.parse(dataBlock) as AzureImageStreamEvent;
      const images = extractImagesFromStreamEvent(event);
      if (images.length === 0) return;

      if (event.type === "image_generation.partial_image") {
        partialCount += images.length;
        const index = event.partial_image_index ?? partialCount;
        const partialImageUrl = images[images.length - 1];
        partialImages.set(index, partialImageUrl);
        console.log(
          `[createImage] Azure image partial ${index} received after ${Date.now() - started}ms`
        );
        if (partialImageUrl && onPartialImage) {
          await onPartialImage(partialImageUrl, index);
        }
        return;
      }

      finalImages.push(...images);
    } catch (error) {
      console.warn(
        "[createImage] Failed to parse Azure image stream event:",
        stringifyError(error)
      );
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseDataBlocks(buffer);
    buffer = parsed.remainder;
    for (const block of parsed.blocks) {
      await handleDataBlock(block);
    }
  }

  buffer += decoder.decode();
  const parsed = parseSseDataBlocks(`${buffer}\n\n`);
  for (const block of parsed.blocks) {
    await handleDataBlock(block);
  }

  const elapsedMs = Date.now() - started;
  console.log(
    `[createImage] Azure streaming image request completed in ${elapsedMs}ms with ${partialCount} partial image(s) and ${finalImages.length} final image(s)`
  );

  const images = finalImages.length > 0 ? finalImages : Array.from(partialImages.values());
  return { data: images.map((url) => ({ url })) };
}

/**
 * Generate or edit an image using Azure AI Foundry gpt-image deployments.
 */
async function generateAzureImage(
  prompt: string,
  model?: string,
  input_image_urls?: string[],
  numberOfImages?: number,
  sizeOverride?: string,
  onPartialImage?: AzurePartialImageCallback
): Promise<string[]> {
  const {
    endpoint,
    apiKey,
    model: configuredModel,
    quality,
    size,
    timeoutMs,
    defaultImageCount,
    stream,
    partialImages,
  } = getAzureImageConfig();
  const selectedModel = model || configuredModel;
  const sanitizedPrompt = sanitizePrompt(prompt);
  const inputImageUrls = input_image_urls ?? [];
  const imageCount = clampInteger(numberOfImages, 1, 10, defaultImageCount);
  const selectedSize = normalizeAzureImageSize(sizeOverride, size);

  const generationBody = {
    model: selectedModel,
    prompt: sanitizedPrompt,
    n: imageCount,
    size: selectedSize,
    quality,
    output_format: "png",
    ...(stream ? { stream: true, partial_images: partialImages } : {}),
  };

  const responseData = inputImageUrls.length > 0
    ? await generateAzureImageEdit(
        endpoint,
        apiKey,
        timeoutMs,
        selectedModel,
        quality,
        selectedSize,
        imageCount,
        stream,
        partialImages,
        sanitizedPrompt,
        inputImageUrls
      )
    : stream
      ? await fetchAzureImageStream(
          `${endpoint}/images/generations`,
          {
            method: "POST",
            headers: azureImageHeaders(apiKey),
            body: JSON.stringify(generationBody),
          },
          timeoutMs
        )
      : await fetchAzureJson(
          `${endpoint}/images/generations`,
          {
            method: "POST",
            headers: azureImageHeaders(apiKey),
            body: JSON.stringify(generationBody),
          },
          timeoutMs
        );

  const imageUrls = extractAzureImageUrls(responseData);
  if (imageUrls.length === 0) {
    throw new Error("Azure image generation succeeded but no image data was returned");
  }

  const requestedImageUrls = imageUrls.slice(0, imageCount);
  if (imageUrls.length > imageCount) {
    console.warn(
      `[createImage] Azure returned ${imageUrls.length} final image(s) for n=${imageCount}; using only the first ${requestedImageUrls.length}.`
    );
  }

  return requestedImageUrls;
}

async function generateAzureImageEdit(
  endpoint: string,
  apiKey: string,
  timeoutMs: number,
  model: string,
  quality: "low" | "medium" | "high",
  size: string,
  imageCount: number,
  stream: boolean,
  partialImages: number,
  prompt: string,
  inputImageUrls: string[]
): Promise<unknown> {
  const fetchedImages = await Promise.all(
    inputImageUrls.map((url) => fetchImageAsBase64(url))
  );
  const base64Images = fetchedImages.filter(
    (item): item is { base64: string; mimeType: string } =>
      item !== null && !!item.base64
  );

  if (base64Images.length === 0) {
    throw new Error("Failed to process input images for Azure image editing");
  }

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", String(imageCount));
  form.append("size", size);
  form.append("quality", quality);
  form.append("output_format", "png");
  if (stream) {
    form.append("stream", "true");
    form.append("partial_images", String(partialImages));
  }

  base64Images.forEach(({ base64, mimeType }, index) => {
    const bytes = Buffer.from(base64, "base64");
    const blob = new Blob([bytes], { type: mimeType || "image/png" });
    const extension = extensionMap[mimeType] ?? "png";
    // Azure image edits expect file inputs using array form syntax.
    // Repeating the plain "image" field causes duplicate_parameter when more
    // than one reference image is provided.
    form.append("image[]", blob, `input-${index + 1}.${extension}`);
  });

  if (stream) {
    return fetchAzureImageStream(
      `${endpoint}/images/edits`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: form,
      },
      timeoutMs
    );
  }

  await configureAzureFetchNetworking();
  const started = Date.now();
  console.log(`[createImage] Azure image edit request started: ${endpoint}/images/edits`);

  const response = await fetch(`${endpoint}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
    signal: AbortSignal.timeout(timeoutMs),
  });

  const elapsedMs = Date.now() - started;
  const responseText = await response.text();
  console.log(
    `[createImage] Azure image edit request completed in ${elapsedMs}ms with status ${response.status}`
  );

  if (!response.ok) {
    throw new Error(
      `Azure image editing failed (${response.status} ${response.statusText}): ${responseText}`
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error(`Azure image editing returned non-JSON response: ${responseText}`);
  }
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
        "Optional override for the image model. Only 'gpt-image-2' is supported."
      ),
    input_images: z
      .array(z.string().url())
      .optional()
      .describe(
        "An array of image URLs to be used as input for editing or combining."
      ),
    numberOfImages: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe(
        "Number of images to generate in this single Azure batch request. Use 1-10; omit it for the default of 1."
      ),
    size: z
      .string()
      .regex(/^\d{2,5}[x×]\d{2,5}$/)
      .optional()
      .describe(
        "Optional output resolution as WIDTHxHEIGHT, for example 1024x1024, 1536x1024, 1024x1536, or any GPT-Image-2-valid multiple-of-16 size up to 4K. Defaults to AZURE_FOUNDRY_IMAGE_SIZE or 1024x1024."
      ),
  }),
  execute: async ({ prompt, model, input_images, numberOfImages, size }) => {
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
      const imageDataUrls = await generateAzureImage(
        prompt,
        model && validModelIds.includes(selectedModelId) ? selectedModelId : undefined,
        normalizedInputImages,
        numberOfImages,
        size
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