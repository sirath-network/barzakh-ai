import { tool } from "ai";
import { z } from "zod";
import { imagineModels } from "../models";
import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";

// Custom Flux Kontext Pro implementation
async function generateFluxImage(prompt: string): Promise<string> {
  const API_KEY = process.env.FIREWORKS_API_KEY;
  
  if (!API_KEY) {
    throw new Error("FIREWORKS_API_KEY environment variable is not set");
  }

  // Step 1: Submit the generation request
  const response = await fetch("https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-pro", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      prompt: prompt
    }),
  });

  const result = await response.json();
  const requestId = result.request_id;
  
  if (!requestId) {
    throw new Error("No request ID returned from Flux API");
  }

  console.log("Flux request submitted with ID:", requestId);

  // Step 2: Poll for the result
  const resultEndpoint = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-kontext-pro/get_result";
  
  for (let attempts = 0; attempts < 60; attempts++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const resultResponse = await fetch(resultEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "image/jpeg",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({ id: requestId })
    });

    const pollResult = await resultResponse.json();
    
    if (['Ready', 'Complete', 'Finished'].includes(pollResult.status)) {
      const imageData = pollResult.result?.sample;
      
      if (typeof imageData === 'string' && imageData.startsWith('http')) {
        // Return the URL directly
        console.log('Flux returned URL:', imageData);
        return imageData;
      } else if (imageData) {
        // Handle base64 data - ensure proper formatting
        const base64Data = imageData.startsWith('data:') ? imageData : `data:image/jpeg;base64,${imageData}`;
        console.log('Flux returned base64 data, length:', base64Data.length);
        return base64Data;
      } else {
        throw new Error("No image data received from Flux API");
      }
    }
    
    if (['Failed', 'Error'].includes(pollResult.status)) {
      throw new Error(`Flux generation failed: ${pollResult.details || 'Unknown error'}`);
    }
    
    console.log(`Flux status: ${pollResult.status}, attempt ${attempts + 1}/60`);
  }
  
  throw new Error("Flux generation timed out after 60 attempts");
}

export const createImage = tool({
  description: "Create an image from a prompt.",
  parameters: z.object({
    prompt: z.string().describe("The prompt to create the image from."),
    model: z
      .string()
      .optional()
      .describe(
        "The model to use for creating the image. Defaults to 'flux-model'."
      ),
  }),
  execute: async ({ prompt, model }) => {
    let selectedModelId = model || "flux-model";

    const modelExists = imagineModels.some((m) => m.id === selectedModelId);

    if (!modelExists) {
      console.log(
        `Model ${selectedModelId} not found. Falling back to flux-model.`
      );
      selectedModelId = "flux-model";
    }

    try {
      // Handle Flux Kontext Pro model
      if (selectedModelId === "flux-model") {
        const imageUrl = await generateFluxImage(prompt);
        return {
          imageUrl: imageUrl,
        };
      }

      // Handle other models using AI SDK (fallback)
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
          const imageUrl = await generateFluxImage(prompt);
          return {
            imageUrl: imageUrl,
          };
      }

      // For non-flux models, use the direct API approach
      const response = await fetch(`https://api.openai.com/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModelId === "large-model" ? "dall-e-3" : "dall-e-2",
          prompt: prompt,
          n: 1,
          size: "1024x1024"
        })
      });

      const data = await response.json();
      
      if (data.data && data.data[0]) {
        return {
          imageUrl: data.data[0].url,
        };
      }

      throw new Error("Failed to generate image with OpenAI");

    } catch (error) {
      console.error("Error in createImage:", error);
      throw error;
    }
  },
});