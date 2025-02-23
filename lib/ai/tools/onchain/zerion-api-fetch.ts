import { getZerionApiKey } from "@/lib/utils";
import { tool } from "ai";
import { z } from "zod";

export const onchainApiFetch = tool({
  description:
    "Make fetch calls to the zerion apis to get various onchain data.",
  parameters: z.object({
    url: z
      .string()

      .describe("Api url to make fetch call"),
  }),
  execute: async ({ url }: { url: string }) => {
    const apiKey = getZerionApiKey();
    if (!apiKey) {
      throw Error("zerion api key not found");
    }
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${apiKey}`,
      },
    };

    try {
      console.log("fetching data ------ ", url);
      const response = await fetch(url, options);

      const apiResult = await response.json();
      if (!apiResult) {
        //@ts-ignore
        return "No results found.";
      }
      // console.log("portfoliodata", portfolioData[0])
      console.log("api result", apiResult);

      return apiResult;
    } catch (error: any) {
      console.error("Error in onchainApiFetch:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error in making api request.",
        error: error.message || "Unknown error",
      };
    }
  },
});
