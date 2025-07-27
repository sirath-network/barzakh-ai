import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathDetails,
  loadOpenAPIFromJson,
} from "../../../utils/openapi";
import { makeSeiTraceApiRequest } from "../../../utils/make-seitrace-api-request";
import seiTraceJson from "./seitrace-opanapi.json";

// A list of common token contract addresses on the Sei network.
// This gives the AI the necessary "knowledge" to answer queries about specific tokens.
const COMMON_CONTRACTS = {
  usdc: "0xe15fC38F6D8c56aF07bbCBe3BAf5708A2Bf42392",
  usdt: "0x9151434b16b9763660705744891fA906F660EcC5",
  // Add other common contract addresses here as needed
};

export const getSeiApiData = tool({
  description: "Get real-time Sei Chain blockchain data from Seitrace.",
  parameters: z.object({
    userQuery: z.string().describe("The user's query."),
    limit: z.number().optional().default(5),
  }),
  execute: async ({ userQuery, limit }: { userQuery: string; limit?: number }) => {
    try {
      console.log("getSeiApiData called with query: ", userQuery);

      const openapidata = await loadOpenAPIFromJson(seiTraceJson);
      const allPaths = await getAllPathDetails(openapidata);

      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the full api path with query parameters"),
        system: `
          You are an expert at constructing API request paths from an OpenAPI specification.
          Your task is to return an array of complete API request paths based on a user query and a list of common contracts.
          Follow these rules strictly:
          1.  **Identify Entities:** Analyze the user's query to extract key entities:
              - **Wallet Addresses:** Look for 'sei...' or '0x...' addresses that are likely user wallets.
              - **Token Mentions:** Look for token names or symbols (e.g., "USDC", "Tether").
              - **Direct Contract Addresses:** Recognize if a '0x...' address is explicitly referred to as a contract.

          2.  **Consult Common Contracts:** Use the provided list of common contracts to find the 'contract_address' if a token name is mentioned in the query.

          3.  **Construct API Paths:** For each potential API path from the spec, you must determine if you have the required parameters.
              - An endpoint like '/token/erc20/transfers' requires **both** a 'contract_address' and a 'wallet_address'.
              - An endpoint like '/addresses' only requires an 'address'.
              - **Crucially, do not use a wallet address to fill a 'contract_address' parameter.**

          4.  **Build the Full URL:**
              - If the query is "USDC transfers for 0x123...", you must find the USDC contract address from the common list and build the path like: '/api/v2/token/erc20/transfers?chain_id=pacific-1&contract_address=[USDC_ADDRESS]&wallet_address=0x123...'
              - If the query is "details for wallet 0x123...", build the path: '/api/v2/addresses?chain_id=pacific-1&address=0x123...'
              - **If an endpoint requires a 'contract_address' and one cannot be found (either directly in the query or from the common list), YOU MUST NOT generate a path for that endpoint.**

          5.  **Defaults:** Always use 'chain_id=pacific-1' for the chain ID.

          6.  **Output:** Return only the path and query string. Do not include the base URL. Limit the response to a maximum of 5 paths.`,
        prompt: JSON.stringify({
          apiPaths: allPaths,
          commonContracts: COMMON_CONTRACTS,
          userQuery: userQuery,
        }),
      });

      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 5);
      console.log(`AI selected the following API endpoints: `, limitedApiEndpointsArray);

      const requests = limitedApiEndpointsArray.map(async (endpoint) => {
        const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const fullUrl = `https://seitrace.com/insights${formattedEndpoint}`;
        
        console.log("Making request to:", fullUrl);
        const response = await makeSeiTraceApiRequest(fullUrl);
        
        let responseObject;
        try {
          responseObject = JSON.parse(response);
        } catch (e) {
          console.warn(`Could not parse response as JSON: "${response}". Wrapping it in a message object.`);
          return JSON.stringify({ message: response, items: [] });
        }

        if (responseObject && responseObject.items && Array.isArray(responseObject.items)) {
          responseObject.items = responseObject.items.slice(0, limit);
        }
        
        return JSON.stringify(responseObject);
      });

      const results = await Promise.all(requests);
      return results;

    } catch (error: any)
     {
      console.error("Error in getSeiApiData:", error);
      return {
        success: false,
        message: "Error fetching Sei blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});