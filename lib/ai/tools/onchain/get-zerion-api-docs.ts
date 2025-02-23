import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import { getAllPaths, getPathInfo, loadOpenAPIFromJson } from "@/lib/utils/openapi";
import zerionJson from "./zerion-openapi.json";

export const getOnchainApiFetch = tool({
  description: "Get real-time Zerion Blockscout API documentation.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      const openapidata = await loadOpenAPIFromJson(zerionJson);
      const allPaths = await getAllPaths(openapidata);

      const response = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `\n
        You will just return the name of the api endpoint in the given list of api endpoint and their summary, which can be helpfull to answers user query. Do not modify it in any way.`,
        prompt: JSON.stringify(
          `The list of api endpoints and their summary are ${allPaths} and user Query is ${userQuery}`
        ),
      });
      const apiEndpointName = response.steps[0].text;
      console.log(
        `AI selected the api endpoint as https://api.zerion.io${apiEndpointName}`
      );

      const apiEndpointInfo = await getPathInfo(openapidata, apiEndpointName);
      // console.log("apiEndpointInfo is -------- ", apiEndpointInfo);
      const apiEndpointInfoString = JSON.stringify(apiEndpointInfo);
      // console.log("apiEndpointInfoString -------- ", apiEndpointInfoString);

      return {
        success: true,
        message: `The API endpoint you should call is: https://api.zerion.io${apiEndpointName}.`,
        endpoint: `https://api.zerion.io${apiEndpointName}`,
        details: apiEndpointInfoString,
      };
    } catch (error: any) {
      console.error("Error in getOnchainApiFetch:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
