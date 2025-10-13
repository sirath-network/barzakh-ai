import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";

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
  const otherUrls = urls.filter(url => 
    !url.includes('blob.vercel-storage.com') && 
    !url.includes('generativelanguage.googleapis.com') && 
    !url.includes('generative-ai-image-store.googleapis.com') &&
    !url.includes('r2.gsw.io') &&
    !url.includes('r2.src.whatz.ai')
  );

  if (vercelBlobUrls.length > 0) {
    console.log("✅ Prioritizing Vercel Blob Storage URLs for editing");
    return { validUrls: vercelBlobUrls, warnings: [] };
  }

  if (gswUrls.length > 0) {
    console.log("✅ Found GSW URLs - these should be accessible for editing");
    return { validUrls: gswUrls, warnings: [] };
  }

  if (whatzUrls.length > 0) {
    console.log("✅ Found Whatz AI URLs - these should be accessible for editing");
    return { validUrls: whatzUrls, warnings: [] };
  }

  if (googleAUrls.length > 0) {
    warnings.push("Google AI URLs detected - these may expire quickly and cause editing to fail");
  }

  if (otherUrls.length > 0) {
    warnings.push("Unknown URL types detected - editing may not work reliably");
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
  console.log("Original prompt:", prompt);
  console.log("Sanitized prompt:", sanitizedPrompt);
  
  const requestBody: { prompt: string; input_images?: string[] } = { 
    prompt: sanitizedPrompt
  };

  if (input_image_urls && input_image_urls.length > 0) {
    try {
      const base64Images = await Promise.all(
        input_image_urls.map(async (url) => {
          try {
            console.log(`Attempting to fetch image from: ${url}`);
            // Try direct fetch first
            let response;
            try {
              response = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (compatible; BarzakhAI/1.0)',
                  'Accept': 'image/*',
                },
                timeout: 15000, // Increased to 15 second timeout
              });
            } catch (directFetchError) {
              // If direct fetch fails, try using the internal proxy
              console.log(`Direct fetch failed, trying internal proxy for: ${url}`);
              console.log(`Direct fetch error:`, directFetchError);
              
              // Check if it's a timeout error
              if (directFetchError.message?.includes('ETIMEDOUT') || directFetchError.message?.includes('fetch failed')) {
                console.warn(`Network timeout when fetching ${url} - this may be due to network connectivity issues`);
              }
              
              try {
                const proxyUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/proxy-image`;
                response = await fetch(proxyUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ imageUrl: url }),
                  timeout: 20000, // Even longer timeout for proxy
                });
              } catch (proxyError) {
                console.error(`Proxy also failed for ${url}:`, proxyError);
                
                // Provide more specific error messages based on the error type
                if (directFetchError.message?.includes('ETIMEDOUT')) {
                  throw new Error(`Network timeout when accessing image: ${url}. This may be due to network connectivity issues or the image service being temporarily unavailable.`);
                } else if (directFetchError.message?.includes('fetch failed')) {
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
            console.log(`Successfully converted image to base64, size: ${base64.length} chars`);
            return `data:${contentType};base64,${base64}`;
          } catch (fetchError) {
            console.error(`Failed to fetch image from ${url}:`, fetchError);
            // If it's a network error, try to continue without this image
            if (fetchError.message.includes('ENOTFOUND') || fetchError.message.includes('fetch failed')) {
              console.warn(`Skipping inaccessible image: ${url}`);
              return null; // Return null to filter out later
            }
            throw fetchError;
          }
        })
      );
      
      // Filter out null values (failed fetches)
      const validImages = base64Images.filter(img => img !== null);
      
      if (validImages.length === 0) {
        console.warn("No images could be fetched, proceeding without input images");
        console.log("This will generate a new image based on the prompt instead of editing the original");
        
        // If we had input images but couldn't fetch any, add a note to the prompt
        if (input_image_urls && input_image_urls.length > 0) {
          console.log("Adding note to prompt about image accessibility issue");
          requestBody.prompt = `Note: Unable to access the original image for editing. Generating a new image based on the request: "${requestBody.prompt}"`;
        }
      } else {
        requestBody.input_images = validImages;
        console.log(`Using ${validImages.length} input images for generation`);
      }
    } catch (error) {
      console.error("Error processing input images:", error);
      
      // If we had input images but couldn't process any, modify the prompt to inform the user
      if (input_image_urls && input_image_urls.length > 0) {
        const errorReason = error.message.includes('404') 
          ? "the attached image is no longer accessible (it may have expired or been deleted)"
          : error.message.includes('403')
          ? "the attached image is private or requires authentication"
          : error.message.includes('401')
          ? "the attached image requires authentication or the proxy is not configured for this domain"
          : "unable to access the attached image for editing";
        
        console.warn(`Image editing failed: ${errorReason}. Generating new image instead.`);
        
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
      
      // Don't throw error, just proceed without input images
      console.warn("Proceeding with image generation without input images");
    }
  }

  // Generate 4 images by making 4 separate API calls with delays
  const imagePromises = Array.from({ length: 4 }, async (_, index) => {
    console.log(`Generating image ${index + 1}/4...`);
    
    // Add delay between API calls to prevent rate limiting
    if (index > 0) {
      const delay = index * 3500; // 3.5 seconds delay between each call
      console.log(`Waiting ${delay}ms before generating image ${index + 1}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    // Retry logic for API calls
    const maxRetries = 3;
    let lastError;
    
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        if (retry > 0) {
          console.log(`Retrying image ${index + 1} generation (attempt ${retry + 1}/${maxRetries})...`);
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

        console.log(`Flux request ${index + 1} submitted with ID:`, requestId);

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
              console.log(`Flux returned URL for image ${index + 1}:`, imageData);
              return imageData;
            } else if (imageData) {
              const base64Data = imageData.startsWith("data:")
                ? imageData
                : `data:image/jpeg;base64,${imageData}`;
              console.log(`Flux returned base64 data for image ${index + 1}, length:`, base64Data.length);
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
          if (pollResult.status === "Content Moderated") {
            console.warn(`Content moderation triggered for image ${index + 1} - prompt may contain inappropriate content`);
            // Continue polling but note the moderation
          }

          console.log(
            `Flux status for image ${index + 1}: ${pollResult.status}, attempt ${attempts + 1}/60`
          );
        }

        // Check if we had content moderation issues after timeout
        if (pollResult?.status === "Content Moderated") {
          throw new Error(`Image ${index + 1} generation was blocked by content moderation. The prompt may contain inappropriate content. Please try a different, more appropriate prompt.`);
        }
        
        throw new Error(`Flux generation timed out after 60 attempts for image ${index + 1}`);
        
      } catch (error) {
        lastError = error;
        console.warn(`Image ${index + 1} generation attempt ${retry + 1} failed:`, error.message);
        
        // If it's a network error and we have retries left, continue
        if (retry < maxRetries - 1 && (
          error.message.includes('fetch failed') || 
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('timeout')
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
        console.error(`Image ${index + 1} generation failed:`, result.reason);
        return null;
      }
    })
    .filter(Boolean); // Remove null values
    
  if (imageUrls.length === 0) {
    throw new Error('All image generation attempts failed. Please try again with a different prompt.');
  }
  
  console.log(`Successfully generated ${imageUrls.length} out of 4 images`);
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
    console.log("createImage tool called with:", { prompt, model, input_images });
    
    // Check if we received Google AI URLs (which suggests conversion happened)
    if (input_images && input_images.length > 0) {
      const hasGoogleAUrls = input_images.some(url => url.includes('generativelanguage.googleapis.com'));
      
      if (hasGoogleAUrls) {
        console.warn("⚠️ Google AI URLs detected - this suggests the AI SDK converted Vercel Blob URLs");
        console.warn("⚠️ This is a known issue with some AI models - they may convert image URLs to their own format");
        console.warn("⚠️ These URLs may not be accessible for editing due to authentication issues");
      }
    }
    
    // Validate and prioritize image URLs
    if (input_images && input_images.length > 0) {
      const { validUrls, warnings } = validateImageUrls(input_images);
      
      // Log warnings
      warnings.forEach(warning => console.warn("⚠️", warning));
      
      // Use validated URLs
      input_images = validUrls;
      
      if (validUrls.length === 0) {
        console.warn("No valid image URLs found for editing");
      }
    }
    
    let selectedModelId = model || "flux-model";

    const modelExists = imagineModels.some((m) => m.id === selectedModelId);

    if (!modelExists) {
      console.log(
        `Model ${selectedModelId} not found. Falling back to flux-model.`
      );
      selectedModelId = "flux-model";
    }

    try {
      // Handle Flux Kontext Max model
      if (selectedModelId === "flux-model") {
        const imageUrls = await generateFluxImage(prompt, input_images);
        return {
          imageUrls: imageUrls,
        };
      }

      // Handle other models using AI SDK (fallback) - note: they may not support image editing
      if (input_images && input_images.length > 0) {
        console.warn(
          `Model ${selectedModelId} does not support image editing. The input images will be ignored.`
        );
      }

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
          console.log(`Unknown model ${selectedModelId}, using flux-model.`);
          const imageUrls = await generateFluxImage(prompt, input_images);
          return {
            imageUrls: imageUrls,
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
            n: 4,
            size: "1024x1024",
          }),
        }
      );

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        const imageUrls = data.data.map((item: any) => item.url);
        return {
          imageUrls: imageUrls,
        };
      }

      throw new Error("Failed to generate image with OpenAI");
    } catch (error) {
      console.error("Error in createImage:", error);
      
      // Provide more specific error messages
      if (error.message.includes("Failed to process input images")) {
        throw new Error("Unable to access the provided image for editing. The image may be from a private source or no longer accessible. Please try uploading the image again or generate a new image instead.");
      } else if (error.message.includes("timed out")) {
        throw new Error("Image generation timed out. This may be due to content moderation or server issues. Please try a simpler, more appropriate prompt or try again later.");
      } else if (error.message.includes("Content Moderated")) {
        throw new Error("Image generation was blocked by content moderation. The prompt may contain inappropriate content. Please try a different, more appropriate prompt.");
      } else if (error.message.includes("401")) {
        throw new Error("Unable to access the attached image. The image may require authentication or the domain is not supported. Please try uploading the image again or use a different image source.");
      } else if (error.message.includes("ETIMEDOUT") || error.message.includes("timeout")) {
        throw new Error("Network timeout when accessing the attached image. This may be due to network connectivity issues or the image service being temporarily unavailable. Please try again later or upload a different image.");
      } else {
        throw error;
      }
    }
  },
});