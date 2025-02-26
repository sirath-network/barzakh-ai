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

export const getOnchainApiDoc = tool({
  description:
    "Get real-time Ethereum and Zerion Blockscout API documentation.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    console.log("EXECUTING GET API DOCS");
    try {
      console.log("user query ", userQuery);
      const zerionOpenapidata = await loadOpenAPIFromJson(zerionJson);
      const zerionAllPaths = await getAllPaths(zerionOpenapidata);

      const etherscanOpenapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/PurrProof/etherscan-openapi/refs/heads/main/etherscan-openapi31-bundled.yml"
      );
      const etherscanAllPaths = await getAllPaths(etherscanOpenapidata);
      console.log("etherscanAllPaths is ", etherscanAllPaths);
      console.log("zerionAllPaths is ", zerionAllPaths);

      const prompt = JSON.stringify(
        `The list of api endpoints and their summary for the api provider zerion is ${zerionAllPaths} and for the api provider etherscan is ${etherscanAllPaths} and user Query is ${userQuery}`
      );
      const { object } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        system: `You will just return the name of the api and its respective endpoint in the given list of api endpoint and their summary, which can be helpfull to answers user query. Do not modify it in any way. only give one api endpoint at a time`,
        prompt: prompt,
        schema: z.object({
          apiProvider: z.enum(["zerion", "etherscan"]),
          apiPath: z.string(),
        }),
      });
      console.log("OBJECT IS ", object);
      let apiEndpointName = object.apiPath;
      console.log("apiEndpointName is ", apiEndpointName);
      if (apiEndpointName.startsWith('"') && apiEndpointName.endsWith('"')) {
        apiEndpointName = apiEndpointName.slice(1, -1);
      }
      let baseUrl = "";
      switch (object.apiProvider) {
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
        object.apiProvider === "zerion"
          ? zerionOpenapidata
          : etherscanOpenapidata,
        apiEndpointName
      );
      // console.log("apiEndpointInfo is -------- ", apiEndpointInfo);
      const apiEndpointInfoString = JSON.stringify(apiEndpointInfo);
      console.log("apiEndpointInfoString -------- ", apiEndpointInfoString);
      // console.log("api details length ", apiEndpointInfoString.length);

      return {
        success: true,
        endpoint: `The API endpoint you should call is: ${baseUrl}${apiEndpointName}`,
        baseUrl: baseUrl,
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
