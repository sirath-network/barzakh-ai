import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import { getAllPaths, getPathInfo, loadOpenAPI } from "@/lib/utils/openapi";
import { makeBlockscoutApiRequest } from "@/lib/utils/make-blockscout-api-request";

export const getVanaApiDoc = tool({
  description: "Get real-time Vana Blockscout API documentation.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      const openapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/blockscout/blockscout-api-v2-swagger/main/swagger.yaml"
      );
      const allPaths = await getAllPaths(openapidata);
      console.log("use prompt is -- ", userQuery);
      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the api endpoint"),
        system: `\n
        You will return the array of the  api endpoints in the given list of available api endpoints, which can be helpfull to answers user query. Do not modify it in any way.`,
        prompt: JSON.stringify(
          `The list of api endpoints and their summary are ${allPaths} and user Query is ${userQuery}`
        ),
      });
      console.log(`AI selected the api endpoints as `, apiEndpointsArray);

      // the apiEndpointsArray is like
      // apiEndpointsArray = [
      //   '/addresses/0x7492933BB94F79df306FeB86A4ed1927a0a51B31/token-balances',
      //   '/addresses/0x7492933BB94F79df306FeB86A4ed1927a0a51B31/tokens'
      // ]

      // make the api calls
      const requests = apiEndpointsArray.map((endpoint) => {
        const fullUrl = `https://api.vanascan.io/api/v2${endpoint}`;
        makeBlockscoutApiRequest(fullUrl);
      });
      const results = await Promise.all(requests);
      return results;
    } catch (error: any) {
      console.error("Error in getVanaApiDoc:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
