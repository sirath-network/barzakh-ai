import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";

// Function to persist generated images to permanent storage
async function persistGeneratedImages(imageUrls: string[]): Promise<string[]> {
  try {
    // Skip if already Vercel Blob URLs
    const needsPersistence = imageUrls.some(url => !url.includes('blob.vercel-storage.com'));
    if (!needsPersistence) {
      return imageUrls;
    }

    // Get the frontend URL (default to localhost in development)
    let frontendUrl: string;
    if (process.env.FRONTEND_URL) {
      frontendUrl = process.env.FRONTEND_URL;
    } else if (process.env.VERCEL_URL) {
      frontendUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      frontendUrl = 'http://localhost:3000';
    }
    
    const response = await fetch(`${frontendUrl}/api/persist-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        imageUrls,
        internalRequest: true, // Flag this as an internal backend request
      }),
    });

    if (!response.ok) {
      return imageUrls;
    }

    const data = await response.json();
    
    if (data.success && data.persistedUrls) {
      return data.persistedUrls;
    }

    return imageUrls;
  } catch (error) {
    console.error('Failed to persist images:', error);
    return imageUrls;
  }
}

// Function to validate and prioritize image URLs
function validateImageUrls(urls: string[]): { validUrls: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const vercelBlobUrls = urls.filter(url => url.includes('blob.vercel-storage.com'));
  const googleAUrls = urls.filter(url => 
    url.includes('generativelanguage.googleapis.com') || 
    url.includes('generative-ai-image-store.googleapis.com')
  );
  const gswUrls = urls.filter(url => url.includes('r2.gsw.io'));
  const whatzUrls = urls.filter(url => url.includes('r2.src.whatz.ai'));

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

// Custom Flux Kontext Max implementation
async function generateFluxImage(
  prompt: string,
  input_image_urls?: string[]
): Promise<string[]> {
  const API_KEY = process.env.FIREWORKS_API_KEY;

  if (!API_KEY) {
    throw new Error("FIREWORKS_API_KEY environment variable is not set");
  }

  // Sanitize the prompt to avoid content moderation issues
  const sanitizedPrompt = sanitizePrompt(prompt);
  
  const requestBody: { prompt: string; input_images?: string[] } = { 
    prompt: sanitizedPrompt
  };

  if (input_image_urls && input_image_urls.length > 0) {
    try {
      const base64Images = await Promise.all(
        input_image_urls.map(async (url) => {
          try {
            // Try direct fetch first
            let response;
            try {
              // Create AbortController for timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
              
              response = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; BarzakhAI/1.0)',
                  'Accept': 'image/*',
                },
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
            } catch (directFetchError) {
              // If direct fetch fails, try using the internal proxy
              
              try {
                // Get the frontend URL (same logic as persistGeneratedImages)
                let frontendUrl: string;
                if (process.env.FRONTEND_URL) {
                  frontendUrl = process.env.FRONTEND_URL;
                } else if (process.env.VERCEL_URL) {
                  frontendUrl = `https://${process.env.VERCEL_URL}`;
                } else if (process.env.NEXTAUTH_URL) {
                  frontendUrl = process.env.NEXTAUTH_URL;
                } else {
                  frontendUrl = 'http://localhost:3000';
                }
                
                const proxyUrl = `${frontendUrl}/api/proxy-image`;
                
                // Create AbortController for proxy timeout
                const proxyController = new AbortController();
                const proxyTimeoutId = setTimeout(() => proxyController.abort(), 20000); // 20 second timeout
                
                response = await fetch(proxyUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    imageUrl: url,
                    internalRequest: true, // Flag this as an internal backend request
                  }),
                  signal: proxyController.signal,
                });
                
                clearTimeout(proxyTimeoutId);
              } catch (proxyError) {
                console.error(`Proxy also failed for ${url}:`, proxyError);
                
                // Provide more specific error messages based on the error type
                if (directFetchError instanceof Error && directFetchError.message?.includes('ETIMEDOUT')) {
                  throw new Error(`Network timeout when accessing image: ${url}. This may be due to network connectivity issues or the image service being temporarily unavailable.`);
                } else if (directFetchError instanceof Error && directFetchError.message?.includes('fetch failed')) {
                  throw new Error(`Failed to fetch image: ${url}. The image may be inaccessible or the network connection failed.`);
                } else {
                  throw new Error(`Image URL is not accessible: ${url}. The image may have expired or be from a private source.`);
                }
              }
            }
            
            if (!response.ok) {
              if (response.status === 404) {
                throw new Error(`Image not found (404). The image URL may have expired or been deleted: ${url}`);
              } else if (response.status === 403) {
                throw new Error(`Access denied (403). The image may be private or require authentication: ${url}`);
              } else if (response.status === 401) {
                throw new Error(`Unauthorized (401). The image requires authentication or the proxy is not configured for this domain: ${url}`);
              } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
            }
            
            const contentType = response.headers.get("content-type") || "image/jpeg";
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString("base64");
            return `data:${contentType};base64,${base64}`;
          } catch (fetchError) {
            console.error(`Failed to fetch image from ${url}:`, fetchError);
            return null; // Return null to filter out later
          }
        })
      );
      
      // Filter out null values (failed fetches)
      const validImages = base64Images.filter(img => img !== null);
      
      if (validImages.length === 0) {
        // If we had input images but couldn't fetch any, add a note to the prompt
        if (input_image_urls && input_image_urls.length > 0) {
          requestBody.prompt = `Note: Unable to access the original image for editing. Generating a new image based on the request: "${requestBody.prompt}"`;
        }
      } else {
        requestBody.input_images = validImages;
      }
    } catch (error) {
      console.error("Error processing input images:", error);
      
      // If we had input images but couldn't process any, modify the prompt to inform the user
      if (input_image_urls && input_image_urls.length > 0) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorReason = errorMessage.includes('404') 
          ? "the attached image is no longer accessible (it may have expired or been deleted)"
          : errorMessage.includes('403')
          ? "the attached image is private or requires authentication"
          : errorMessage.includes('401')
          ? "the attached image requires authentication or the proxy is not configured for this domain"
          : "unable to access the attached image for editing";
        
        // Check if this looks like a generated image
        const isGoogleAIImage = input_image_urls.some(url => url.includes('generativelanguage.googleapis.com') || url.includes('generative-ai-image-store.googleapis.com'));
        const isGoogleCloudImage = input_image_urls.some(url => url.includes('storage.googleapis.com'));
        const isVercelBlobImage = input_image_urls.some(url => url.includes('blob.vercel-storage.com'));
        
        let additionalNote = "";
        if (isGoogleAIImage) {
          additionalNote = " This appears to be a Google AI generated image that may have expired. For better image editing, please upload images directly to the chat instead of using generated images.";
        } else if (isGoogleCloudImage) {
          additionalNote = " This appears to be a Google Cloud Storage image that may have expired.";
        } else if (isVercelBlobImage) {
          additionalNote = " This appears to be a Vercel Blob Storage image that may have expired.";
        }
        
        requestBody.prompt = `Note: ${errorReason}${additionalNote} 

Since the original image cannot be accessed for editing, I'll generate a new image based on your request: "${requestBody.prompt}"

For better image editing results in the future, please:
1. Upload images directly to the chat (drag & drop or click to upload)
2. Avoid using previously generated images for editing, as they may expire quickly
3. Use fresh, directly uploaded images for the best editing experience`;
      }
    }
  }

  // Generate 2 images by making 2 separate API calls with delays
  const imagePromises = Array.from({ length: 2 }, async (_, index) => {
    
    // Add delay between API calls to prevent rate limiting
    if (index > 0) {
      const delay = index * 5000; // 5 seconds delay between each call
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Retry logic for API calls
    const maxRetries = 3;
    let lastError;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        if (retry > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retry)); // Exponential backoff
        }
        
        // Step 1: Submit the generation request
        const response = await fetch(
          "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-max",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(30000), // 30 second timeout
          }
        );

        const result = await response.json();
        const requestId = result.request_id;

        if (!requestId) {
          throw new Error(`No request ID returned from Flux API for image ${index + 1}`);
        }

        // Step 2: Poll for the result
        const resultEndpoint =
          "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-max/get_result";

        let pollResult;
        for (let attempts = 0; attempts < 60; attempts++) {
          // Reduced timeout to 60 seconds for better UX
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const resultResponse = await fetch(resultEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "image/jpeg",
              Authorization: `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({ id: requestId }),
            signal: AbortSignal.timeout(10000), // 10 second timeout for polling
          });

          pollResult = await resultResponse.json();

          if (["Ready", "Complete", "Finished"].includes(pollResult.status)) {
            const imageData = pollResult.result?.sample;

            if (typeof imageData === "string" && imageData.startsWith("http")) {
              return imageData;
            } else if (imageData) {
              const base64Data = imageData.startsWith("data:")
                ? imageData
                : `data:image/jpeg;base64,${imageData}`;
              return base64Data;
            } else {
              throw new Error(`No image data received from Flux API for image ${index + 1}`);
            }
          }

          if (["Failed", "Error"].includes(pollResult.status)) {
            throw new Error(
              `Flux generation failed for image ${index + 1}: ${pollResult.details || "Unknown error"}`
            );
          }

          // Check for content moderation issues
        }

        // Check if we had content moderation issues after timeout
        if (pollResult?.status === "Content Moderated") {
          throw new Error(`Image ${index + 1} generation was blocked by content moderation. The prompt may contain inappropriate content. Please try a different, more appropriate prompt.`);
        }
        
        throw new Error(`Flux generation timed out after 60 attempts for image ${index + 1}`);
        
      } catch (error) {
        lastError = error;
        
        // If it's a network error and we have retries left, continue
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (retry < maxRetries - 1 && (
          errorMessage.includes('fetch failed') || 
          errorMessage.includes('ETIMEDOUT') ||
          errorMessage.includes('timeout')
        )) {
          continue;
        }
        
        // If it's not a network error or we're out of retries, throw
        throw error;
      }
    }
    
    // If we get here, all retries failed
    throw lastError || new Error(`Failed to generate image ${index + 1} after ${maxRetries} attempts`);
  });

  // Wait for all 4 images to be generated with partial success handling
  const results = await Promise.allSettled(imagePromises);
  const imageUrls = results
    .map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return null;
      }
    })
    .filter(Boolean); // Remove null values
    
  if (imageUrls.length === 0) {
    throw new Error('All image generation attempts failed. Please try again with a different prompt.');
  }
  
  return imageUrls;
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
        "The model to use for creating the image. Defaults to 'flux-model'."
      ),
    input_images: z
      .array(z.string().url())
      .optional()
      .describe(
        "An array of image URLs to be used as input for editing or combining."
      ),
  }),
  execute: async ({ prompt, model, input_images }) => {
    
    // Check if we received Google AI URLs (which suggests conversion happened)
    if (input_images && input_images.length > 0) {
      const hasGoogleAUrls = input_images.some(url => url.includes('generativelanguage.googleapis.com'));
    }
    
    // Validate and prioritize image URLs
    if (input_images && input_images.length > 0) {
      const { validUrls, warnings } = validateImageUrls(input_images);
      
      // Use validated URLs
      input_images = validUrls;
    }
    
    let selectedModelId = model || "flux-model";

    const modelExists = imagineModels.some((m) => m.id === selectedModelId    );

    if (!modelExists) {
      selectedModelId = "flux-model";
    }

    try {
      // Handle Flux Kontext Max model
      if (selectedModelId === "flux-model") {
        const imageUrls = await generateFluxImage(prompt, input_images);
        
        // Persist temporary images to permanent storage
        const persistedUrls = await persistGeneratedImages(imageUrls);
        
        return {
          imageUrls: persistedUrls,
        };
      }

      // Handle other models using AI SDK (fallback) - note: they may not support image editing

      let imageModel;

      switch (selectedModelId) {
        case "sdxl-model":
          imageModel = fireworks.image("stable-diffusion-xl-base-1.0");
          break;
        case "large-model":
          imageModel = openai.image("dall-e-3");
          break;
        case "small-model":
          imageModel = openai.image("dall-e-2");
          break;
        default:
          const imageUrls = await generateFluxImage(prompt, input_images);
          
          // Persist temporary images to permanent storage
          const persistedUrls = await persistGeneratedImages(imageUrls);
          
          return {
            imageUrls: persistedUrls,
          };
      }

      // For non-flux models, use the direct API approach
      const response = await fetch(
        `https://api.openai.com/v1/images/generations`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: selectedModelId === "large-model" ? "dall-e-3" : "dall-e-2",
            prompt: prompt,
            n: 2,
            size: "1024x1024",
          }),
        }
      );

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const imageUrls = data.data.map((item: any) => item.url);
        
        // Persist temporary images to permanent storage
        const persistedUrls = await persistGeneratedImages(imageUrls);
        
        return {
          imageUrls: persistedUrls,
        };
      }

      throw new Error("Failed to generate image with OpenAI");
    } catch (error) {
      console.error("Error in createImage:", error);
      
      // Provide more specific error messages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("Failed to process input images")) {
        throw new Error("Unable to access the provided image for editing. The image may be from a private source or no longer accessible. Please try uploading the image again or generate a new image instead.");
      } else if (errorMessage.includes("timed out")) {
        throw new Error("Image generation timed out. This may be due to content moderation or server issues. Please try a simpler, more appropriate prompt or try again later.");
      } else if (errorMessage.includes("Content Moderated")) {
        throw new Error("Image generation was blocked by content moderation. The prompt may contain inappropriate content. Please try a different, more appropriate prompt.");
      } else if (errorMessage.includes("401")) {
        throw new Error("Unable to access the attached image. The image may require authentication or the domain is not supported. Please try uploading the image again or use a different image source.");
      } else if (errorMessage.includes("ETIMEDOUT") || errorMessage.includes("timeout")) {
        throw new Error("Network timeout when accessing the attached image. This may be due to network connectivity issues or the image service being temporarily unavailable. Please try again later or upload a different image.");
      } else {
        throw error;
      }
    }
  },
});