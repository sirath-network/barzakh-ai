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
const COMMON_CONTRACTS = {
  // Native EVM Tokens
  wsei: "0xE30feDd158A2e3b13e9badaeABaFc5516e95e8C7",
  isei: "0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423",
  // Bridged Tokens (with Pointers)
  "usdc.n": {
    pointer: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
    original: "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0"
  },
  usdt: "0x9151434b16b9763660705744891fA906F660EcC5",
  wbtc: "0x0555E30da8f98308EdB960aa94C0Db47230d2B9c",
  weth: "0x160345fC359604fC6e70E3c5fAcbdE5F7A9342d8",
  fastUSD: "0x37a4dD9CED2b19Cfe8FAC251cd727b5787E45269",
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

      let evmAddress: string | null = null;
      let seiAddress: string | null = null;

      // Step 1: Find any address in the query and get its associated pair.
      const addressRegex = /(0x[a-fA-F0-9]{40}|sei[a-z0-9]{39})/;
      const match = userQuery.match(addressRegex);

      if (match) {
        const foundAddress = match[0];
        console.log(`Found address in query: ${foundAddress}`);
        
        try {
            const assocUrl = `https://seitrace.com/insights/api/v2/addresses?chain_id=pacific-1&address=${foundAddress}`;
            const assocResponseStr = await makeSeiTraceApiRequest(assocUrl);
            const assocResponse = JSON.parse(assocResponseStr);

            if (assocResponse.association) {
                evmAddress = assocResponse.association.evm_hash;
                seiAddress = assocResponse.association.sei_hash;
                console.log(`Associated addresses found: EVM: ${evmAddress}, SEI: ${seiAddress}`);
            }
        } catch (e) {
            console.error("Could not fetch associated address. Proceeding with original address.", e);
        }

        // Fallback if association fails
        if (!evmAddress && !seiAddress) {
            if (foundAddress.startsWith('0x')) {
                evmAddress = foundAddress;
            } else {
                seiAddress = foundAddress;
            }
        }
      }

      const openapidata = await loadOpenAPIFromJson(seiTraceJson);
      const allPaths = await getAllPathDetails(openapidata);

      // Step 2: Ask the AI to build API calls using the addresses we found.
      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the full api path with query parameters"),
        system: `
          You are an expert at constructing API request paths. You have been provided with a user's query and a pair of associated addresses: one EVM (0x...) and one SEI (sei...).
          Your task is to construct the correct API calls to fulfill the user's request.
          Follow these rules strictly:
          1.  **Analyze Intent:** Determine if the user wants a "portfolio" (balances, holdings) or "history" (transactions, transfers). If no intent is clear, default to "portfolio".
          2.  **Use Correct Address Formats:** This is the most important rule.
              - For EVM-related endpoints (like /token/erc20/balances), you MUST use the provided EVM address. If no EVM address is available, you CANNOT call these endpoints.
              - For Native/Cosmos-related endpoints (like /token/cw20/balances, /token/native/balances), you MUST use the provided SEI address. If no SEI address is available, you CANNOT call these endpoints.
          3.  **Portfolio Discovery:** If the intent is "portfolio", construct calls to all relevant balance endpoints, respecting the address format rule above. Do not include optional parameters like 'token_contract_list'.
          4.  **Defaults:** Always use 'chain_id=pacific-1'.
          5.  **Output:** Return an array of **relative paths** only (e.g., /api/v2/...). Do not include the base URL.`,
        prompt: JSON.stringify({
          apiPaths: allPaths,
          commonContracts: COMMON_CONTRACTS,
          userQuery: userQuery,
          availableAddresses: {
            evmAddress,
            seiAddress
          }
        }),
      });

      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 5);
      console.log(`AI selected the following API endpoints: `, limitedApiEndpointsArray);

      // Step 3: Execute the generated API calls.
      const requests = limitedApiEndpointsArray.map(async (endpoint) => {
        // Sanitize the endpoint to ensure it's a relative path
        let path = endpoint;
        if (endpoint.startsWith('http')) {
            path = new URL(endpoint).pathname + new URL(endpoint).search;
        }
        const formattedEndpoint = path.startsWith('/') ? path : `/${path}`;
        const fullUrl = `https://seitrace.com/insights${formattedEndpoint}`;
        
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

    } catch (error: any) {
      console.error("Error in getSeiApiData:", error);
      return {
        success: false,
        message: "Error fetching Sei blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});