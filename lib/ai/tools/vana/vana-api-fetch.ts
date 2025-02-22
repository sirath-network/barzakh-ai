import { tool } from "ai";
import { z } from "zod";

export const vanaApiFetch = tool({
  description: "Make fetch calls to the vana apis to get various onchain data.",
  parameters: z.object({
    url: z
      .string()

      .describe("Api url to make fetch call"),
  }),
  execute: async ({ url }: { url: string }) => {
    const apiKey = process.env.CREDITCOIN_BLOCKSCOUT_API_KEY;
    if (!apiKey) {
      throw Error("blockscout api key not found");
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
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      return `Failed to fetch wallet portfolio. Error: ${error}`;
    }
  },
});
