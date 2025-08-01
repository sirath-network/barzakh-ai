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

      const today = new Date();
      const oneMonthAgoDate = new Date(today);
      oneMonthAgoDate.setMonth(today.getMonth() - 1);

      const to_date = today.toISOString().split('T')[0];
      const from_date = oneMonthAgoDate.toISOString().split('T')[0];

      let evmAddress: string | null = null;
      let seiAddress: string | null = null;

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

      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-gemini"),
        output: "array",
        schema: z.string().describe("the full api path with query parameters"),
        system: `
          You are an expert at constructing API request paths. You have been provided with a user's query and a pair of associated addresses: one EVM (0x...) and one SEI (sei...).
          Your task is to construct the correct API calls to fulfill the user's request.
          Follow these rules strictly:
          1.  **Analyze Intent:** Determine if the user wants a "portfolio" (balances, holdings) or "history" (transactions, transfers). If no intent is clear, default to "portfolio".
          2.  **Use Correct Address Formats (General Rule):** For EVM endpoints (e.g., /token/erc20/...) use the EVM address. For Native/Cosmos endpoints (e.g., /token/cw20/...) use the SEI address.
          3.  **Transaction History Address Priority:** For the /api/v2/addresses/transactions endpoint, you MUST use the EVM (0x...) address if it is available. Only use the SEI (sei...) address for this endpoint if the EVM address is not found.
          4.  **Portfolio Discovery:** If the intent is "portfolio", construct calls to all relevant balance endpoints, respecting the address format rule above. Do not include optional parameters.
          5.  **Defaults:** Always use 'chain_id=pacific-1'.
          6.  **Date Range for Recent History:** If the user's query contains words like "recent", "last month", or "latest transactions", and the intent is "history", you MUST add from_date and to_date query parameters to the /api/v2/addresses/transactions call. Use the provided dates.
          7.  **Output:** Return an array of **relative paths** only (e.g., /api/v2/...). Do not include the base URL.`,
        prompt: JSON.stringify({
          apiPaths: allPaths,
          commonContracts: COMMON_CONTRACTS,
          userQuery: userQuery,
          availableAddresses: {
            evmAddress,
            seiAddress
          },
          dateContext: {
            from_date: from_date,
            to_date: to_date
          }
        }),
      });

      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 5);
      console.log(`AI selected the following API endpoints: `, limitedApiEndpointsArray);

      const requests = limitedApiEndpointsArray.map(async (endpoint) => {
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