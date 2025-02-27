import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPaths,
  getPathInfo,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "@/lib/utils/openapi";
import zerionJson from "./zerion-openapi.json";
import { etherscanBaseURL, zerionBaseURL } from "./constant";
import { fetchApi } from "./api-fetch";

export const getOnchainApiData = tool({
  description: "Get real-time data from Ethereum based blockchains.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("EXECUTING GET API DOCS");
      console.log("user query ", userQuery);
      const zerionOpenapidata = await loadOpenAPIFromJson(zerionJson);
      const zerionAllPaths = await getAllPaths(zerionOpenapidata);
      console.log("zerionAllPaths is ", zerionAllPaths);

      const etherscanOpenapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/PurrProof/etherscan-openapi/refs/heads/main/etherscan-openapi31-bundled.yml"
      );
      const etherscanAllPaths = await getAllPaths(etherscanOpenapidata);
      console.log("etherscanAllPaths is ", etherscanAllPaths);

      const { object } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        system: `there are 2 different api providers to fetch information about ethereum based blockchain. one is zerion and other is etherscan. you will just return the name of the api provider and its respective endpoint path in the given list of endpoint path and their summary, which can be helpfull to answers user query. do not modify it in any way.`,
        prompt: `The list of api endpoints and their summary for the api provider zerion is ${zerionAllPaths} and for the api provider etherscan is ${etherscanAllPaths} and user Query is ${userQuery}`,
        output: "array",
        schema: z.object({
          apiProvider: z.enum(["zerion", "etherscan"]),
          apiPath: z.string(),
        }),
      });
      console.log("OBJECT IS ", object);

      const allResponses = await Promise.all(
        object.map(async (obj) => {
          let apiEndpointName = obj.apiPath;
          console.log("apiEndpointName is ", apiEndpointName);
          if (
            apiEndpointName.startsWith('"') &&
            apiEndpointName.endsWith('"')
          ) {
            apiEndpointName = apiEndpointName.slice(1, -1);
          }
          let baseUrl = "";
          switch (obj.apiProvider) {
            case "etherscan":
              baseUrl = etherscanBaseURL;
              break;
            case "zerion":
              baseUrl = zerionBaseURL;
              break;
            default:
              break;
          }
          console.log(
            `AI selected the api endpoint as ${baseUrl}${apiEndpointName}`
          );

          const apiEndpointInfo = await getPathInfo(
            obj.apiProvider === "zerion"
              ? zerionOpenapidata
              : etherscanOpenapidata,
            apiEndpointName
          );
          // console.log("apiEndpointInfo is -------- ", apiEndpointInfo);
          const apiEndpointInfoString = JSON.stringify(apiEndpointInfo);
          console.log("apiEndpointInfoString -------- ", apiEndpointInfoString);
          const { object: urlToCall } = await generateObject({
            model: myProvider.languageModel("chat-model-small"),
            system: `you will be provided with the openapi spec of an api. use the spec to the best of your knowledge to return a url which will fetch the neccesary information which is requested in the user query`,
            prompt: `The api openapi spec = ${apiEndpointInfoString}. User query = ${userQuery}`,
            schema: z.object({
              apiUrl: z.string(),
            }),
          });

          const result = await fetchApi({
            url: urlToCall.apiUrl,
            apiProvider: obj.apiProvider,
          });

          return { apiEndpointName: apiEndpointName, result: result };
        })
      );

      console.log("allResponses is ", allResponses);
    //   const allResponsesString = JSON.stringify(allResponses);

      return {
        success: true,
        result: allResponses,
      };
    } catch (error: any) {
      console.error("Error in getOnchainApiData:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
