import { getZerionApiKey } from "@/lib/utils";
import { tool } from "ai";
import { z } from "zod";
import { etherscanBaseURL } from "./constant";

export const onChainQuery = tool({
  description:
    "Make fetch calls to the blockchain scan apis to get various onchain data.",
  parameters: z.object({
    url: z.string().describe("Api url to make fetch call"),
  }),
  execute: async ({ url }: { url: string }) => {
    try {
      console.log("EXECUTING API FETCH");
      console.log("url is ", url);
      let apiName = "";
      if (url.includes(etherscanBaseURL)) {
        apiName = "etherscan";
      } else {
        apiName = "zerion";
      }

      let apiKey;
      if (apiName === "etherscan") {
        apiKey = process.env.ETHERSCAN_API_KEY;
      } else {
        apiKey = getZerionApiKey();
      }
      if (!apiKey) {
        throw Error(apiName + " api key not found");
      }
      console.log("api key is ", apiName, " = ", apiKey);

      console.log("fetching data ------ ", url);

      let apiResult = undefined;

      if (apiName === "etherscan") {
        url = url.replace(/apikey=[^&]+/, `apikey=${apiKey}`);
        const response = await fetch(`${url}`);
        const t = await response.json();
        apiResult = t.result;
        console.log("apiResult ==== ", apiResult);
      } else {
        const options = {
          method: "GET",
          headers: {
            accept: "application/json",
            authorization: `Basic ${apiKey}`,
          },
        };
        console.log(options);
        const response = await fetch(url, options);
        apiResult = await response.json();
      }
      if (!apiResult) {
        //@ts-ignore
        return "No results found.";
      }
      return apiResult;
    } catch (error: any) {
      console.error("Error in onChainQuery while fetching "+url+" : ", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error in making api request.",
        error: error.message || "Unknown error",
      };
    }
  },
});
