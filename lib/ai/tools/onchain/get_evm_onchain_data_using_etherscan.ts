import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import { getAllPathsAndDesc, loadOpenAPI } from "@/lib/utils/openapi";
import { etherscanBaseURL } from "./constant";
import { groq } from "@ai-sdk/groq";

export const getEvmOnchainDataUsingEtherscan = tool({
  description:
    "Get real-time data from Ethereum-based blockchains using Etherscan.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("User query:", userQuery);
      const apiKey = process.env.ETHERSCAN_API_KEY;
      if (!apiKey) {
        throw new Error("Etherscan API key not found");
      }

      const etherscanOpenapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/PurrProof/etherscan-openapi/refs/heads/main/etherscan-openapi31-bundled.yml"
      );
      const etherscanAllPaths = await getAllPathsAndDesc(etherscanOpenapidata);

      const apiEndpoint = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `
          You will return the api endpoint to call from the given list of available API endpoints, which can be helpful to answer the user's query. Do not modify them in any way. Provide the actual query URL by inserting appropriate values in placeholders. give only one url.
        `,
        prompt: JSON.stringify(
          `The list of API endpoints and their descriptions are ${etherscanAllPaths} and the user query is ${userQuery}`
        ),
      });

      // Only take 3 endpoints to avoid rate limiting
      console.log("AI-selected API endpoint:", apiEndpoint.steps[0].text);

      const options = {
        method: "GET",
        headers: { accept: "application/json" },
      };

      // Make API calls with the appended API key

      const fullUrl = `${etherscanBaseURL}${apiEndpoint.steps[0].text}&apikey=${apiKey}`;
      const response = await fetch(fullUrl, options);
      const json = await response.json();
      console.log("API Response:", json);

      console.log("summarizeing the response...");
      // summarize the response
      const { text } = await generateText({
        model: groq("llama-3.3-70b-versatile"),
        system: `you will be provided with the response from a ethereum based blockchain api. summarize the response. do not modify it in any way. only keep the part which can answer user query`,
        prompt: `User query was = ${userQuery}. The api response is = ${JSON.stringify(
          json
        )}.`,
      });

      console.log("summarised text --- ", text);

      return {
        success: true,
        results: text,
      };
    } catch (error: any) {
      console.error("Error in getEvmOnchainDataUsingEtherscan:", error);
      return {
        success: false,
        message: "Error retrieving API data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
