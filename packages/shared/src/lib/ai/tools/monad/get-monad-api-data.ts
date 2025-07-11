import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathDetails,
  getAllPaths,
  getAllPathsAndDesc,
  getPathDetails,
  getPathInfo,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "../../../utils/openapi";
import { makeBlockscoutApiRequest } from "../../../utils/make-blockscout-api-request";
import monadJson from "./monad-opanapi.json";
import { makeBlockVisionApiRequest } from "@javin/shared/lib/utils/make-blockvision-api-request";

export const getMonadApiData = tool({
  description: "Get real-time Monad blockchain data.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({
    userQuery,
    limit,
  }: {
    userQuery?: string;
    limit?: number;
  }) => {
    try {
      console.log("user prompt is -- ", userQuery);
      const openapidata = await loadOpenAPIFromJson(monadJson);
      const allPaths = await getAllPathDetails(openapidata);
      
      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the api path"),
        system: `\n
        You will return the array of the paths to call in the given list of available api paths, which can be helpful to answer user query. 
        Return only the path portion (like '/v2/monad/account/tokens') without the base URL. 
        Do not include 'https://api.blockvision.org' in your responses.
        Do not modify it in any way. Give the actual query path of the api, do not clip the path, 
        by inserting appropriate values in placeholders. Do not give more than 5 apis.`,
        prompt: JSON.stringify(
          `The list the api path details are ${JSON.stringify(
            allPaths
          )} and user Query is ${userQuery}`
        ),
      });
      
      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 5);

      console.log(`AI selected the api endpoints as `, limitedApiEndpointsArray);

      const requests = limitedApiEndpointsArray.map(async (endpoint) => {
        // Ensure the endpoint starts with a slash
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        
        // Remove any base URL if it was included in the endpoint
        const cleanEndpoint = formattedEndpoint.replace(/^https?:\/\/api\.blockvision\.org/i, '');
        
        // Create the full URL
        const fullUrl = `https://api.blockvision.org${cleanEndpoint}`;
        
        console.log("Making request to:", fullUrl);
        return await makeBlockVisionApiRequest(fullUrl);
      });

      const results = await Promise.all(requests);
      return results;
    } catch (error: any) {
      console.error("Error in getMonadApiData:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching Monad blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});