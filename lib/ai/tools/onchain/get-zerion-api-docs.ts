import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPaths,
  getPathInfo,
  loadOpenAPIFromJson,
} from "@/lib/utils/openapi";
import zerionJson from "./zerion-openapi.json";

export const getOnchainApiDoc = tool({
  description: "Get real-time Zerion Blockscout API documentation.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      const openapidata = await loadOpenAPIFromJson(zerionJson);
      const allPaths = await getAllPaths(openapidata);
      console.log("user query ", userQuery);
      const response = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `\n
        You will just return the name of the api endpoint in the given list of api endpoint and their summary, which can be helpfull to answers user query. Do not modify it in any way. only give one api endpoint at a time`,
        prompt: JSON.stringify(
          `The list of api endpoints and their summary are ${allPaths} and user Query is ${userQuery}`
        ),
      });
      let apiEndpointName = response.steps[0].text;
      if (apiEndpointName.startsWith('"') && apiEndpointName.endsWith('"')) {
        apiEndpointName = apiEndpointName.slice(1, -1);
      }
      console.log(
        `AI selected the api endpoint as https://api.zerion.io${apiEndpointName}`
      );

      const apiEndpointInfo = await getPathInfo(openapidata, apiEndpointName);
      // console.log("apiEndpointInfo is -------- ", apiEndpointInfo);
      const apiEndpointInfoString = JSON.stringify(apiEndpointInfo);
      // console.log("apiEndpointInfoString -------- ", apiEndpointInfoString);
      // console.log("api details length ", apiEndpointInfoString.length);

      return {
        success: true,
        endpoint: `The API endpoint you should call is: https://api.zerion.io${apiEndpointName}`,
        baseUrl: "https://api.zerion.io",
        detailsAboutEndpoint: apiEndpointInfoString,
      };
    } catch (error: any) {
      console.error("Error in getOnchainApiDoc:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
