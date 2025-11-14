import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPIFromJson,
} from "../../../utils/openapi";
import zerionJson from "./zerion-openapi.json";
import { zerionBaseURL } from "./constant";
import { getZerionApiKey } from "../../../utils/utils";
export const getEvmOnchainDataUsingZerion = tool({
  description: "Get real-time data from Ethereum based blockchains.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("user query ", userQuery);
      const apiKey = getZerionApiKey();
      if (!apiKey) {
        throw Error("zerion api key not found");
      }

      const zerionOpenapidata = await loadOpenAPIFromJson(zerionJson);
      const zerionAllPathsAndDesc = await getAllPathsAndDesc(zerionOpenapidata);

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("chat-model-grok"),
        system: `You are an intelligent API assistant for Zerion blockchain data. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.

        ## 🚨 ABSOLUTE RULES (MUST FOLLOW):
        1. **NEVER call getPathParametersAndBaseUrl for /positions/ endpoint** - Build URL directly!
        2. **NEVER use strikethrough (~~text~~) or markdown to correct yourself** - Write clearly from start!
        3. **Be consistent with data** - Don't contradict yourself within response
        4. **Use plain ampersands (&)** - NOT HTML-encoded (&amp;)

        ## 🎯 CRITICAL: ENDPOINT SELECTION GUIDE

        ### 📊 Portfolio Overview (Summary Only)
        **Endpoint:** \`/v1/wallets/{address}/portfolio\`
        **Use When:** User asks for "total balance", "portfolio value", "net worth"
        **Returns:** Summary statistics, total values by chain/type
        **Parameters:** 
        - \`currency\` (optional, default: usd)
        - NO filter[positions] parameter (will cause 400 error!)

        ### 💰 Individual Token Holdings (Direct API Call)
        **⚠️ IMPORTANT:** The \`/v1/wallets/{address}/positions/\` endpoint is NOT in the OpenAPI spec, 
        but it EXISTS and WORKS. You must construct the URL directly without using getPathParametersAndBaseUrl.
        
        **Endpoint:** \`/v1/wallets/{address}/positions/\`
        **Use When:** User asks for "token holdings", "ERC-20 tokens", "what tokens", "token balances"
        **Returns:** Individual token positions with prices and values
        
        **How to Use:**
        1. Do NOT call getPathParametersAndBaseUrl for this endpoint
        2. Build the URL directly: \`${zerionBaseURL}/v1/wallets/{address}/positions/\`
        3. Add optional query parameters:
           - \`filter[chain_ids]=arbitrum\` (or ethereum, polygon, base, etc.)
           - \`filter[position_types]=wallet\` (IMPORTANT: use deposit NOT deposited, loan NOT borrowed, wallet, locked, staked, reward, investment)
           - \`sort=-value\` (sort by value descending)
           - \`page[size]=100\` (max results per page)
           - \`currency=usd\` (price currency)
        
        **CRITICAL - Correct position_types values:**
        ✅ CORRECT: deposit, loan, wallet, locked, staked, reward, investment
        ❌ WRONG: deposited, borrowed (these will cause 400 error!)
        
        **Example URLs (Build Directly):**
        ✅ CORRECT: \`${zerionBaseURL}/v1/wallets/0x123.../positions/?filter[chain_ids]=base&currency=usd\`
        ✅ CORRECT: \`${zerionBaseURL}/v1/wallets/0x123.../positions/?filter[chain_ids]=ethereum,polygon\`
        ✅ CORRECT: \`${zerionBaseURL}/v1/wallets/0x123.../positions/\` (all chains)
        ❌ WRONG: Using getPathParametersAndBaseUrl for /positions/ → Will fail!
        ❌ WRONG: \`${zerionBaseURL}/v1/wallets/{address}/portfolio?filter[positions]=all\` (400 ERROR!)

        ### 🖼️ NFT Holdings
        **Endpoint:** \`/v1/wallets/{address}/nft-positions/\`
        **Use When:** User asks for "NFTs", "collectibles", "NFT holdings"
        **Parameters:**
        - \`filter[chain_ids]\`: filter by chains
        - \`sort\`: -floor_price, created_at
        - \`include\`: nfts, nft_collections

        ### 📜 Transaction History
        **Endpoint:** \`/v1/wallets/{address}/transactions/\`
        **Use When:** User asks for "transactions", "transaction history", "recent activity"
        **Parameters:**
        - \`filter[chain_ids]\`: filter by chains
        - \`filter[operation_types]\`: trade, send, receive, etc.
        - \`page[size]\`: results per page

        ### 🔗 Supported Chain IDs
        Use these exact values for \`filter[chain_ids]\`:
        - ethereum
        - polygon
        - arbitrum
        - optimism
        - base
        - avalanche
        - binance-smart-chain (for BSC)
        - zksync-era
        - linea
        - blast
        - scroll
        - mantle

        ## 📋 Query Processing Steps:

        1. **Analyze User Intent**:
           - Does user want SUMMARY → use \`/portfolio\`
           - Does user want TOKEN LIST → use \`/positions/\` (BUILD URL DIRECTLY!)
           - Does user want NFTs → use \`/nft-positions/\`
           - Does user want HISTORY → use \`/transactions/\`

        2. **Extract Chain Information**:
           - Look for chain names in query (e.g., "on Arbitrum", "Polygon tokens", "Base")
           - If found, add \`filter[chain_ids]=<chain-id>\` parameter
           - If no chain specified, omit filter to get all chains

        3. **Build URL (CRITICAL):**
           
           **FOR /positions/ ENDPOINT (TOKEN HOLDINGS):**
           ⚠️ Build URL DIRECTLY - DO NOT use getPathParametersAndBaseUrl!
           Example:
           \`\`\`
           const address = "0x710e86fa6D521934864A10C2b1f5a03c3221Ac02";
           const chain = "base"; // extracted from query
           const url = "${zerionBaseURL}/v1/wallets/" + address + "/positions/?filter[chain_ids]=" + chain + "&currency=usd";
           \`\`\`
           Then call: makeApiCall with this URL
           
           **FOR OTHER ENDPOINTS (portfolio, nft-positions, transactions):**
           You CAN use getPathParametersAndBaseUrl if needed
           
        4. **Execute API Call**:
           - Use **makeApiCall** tool with the complete URL
           - Handle errors gracefully

        ## 🎨 Final Response Format:
        - Provide **clear, structured, human-readable answers**
        - Format token amounts with proper decimals and USD values
        - Group results by chain if multi-chain data
        - Do **not** return raw JSON unless explicitly requested
        - If no data found, provide a helpful message
        
        ## 🚫 STRICTLY FORBIDDEN:
        - ❌ **NEVER use strikethrough** (~~text~~) - This creates broken, confusing responses
        - ❌ **NEVER contradict yourself** - If tokens show $0, don't mention a different total
        - ❌ **NEVER use markdown formatting to "fix" mistakes** - Write correctly from the start
        - ✅ **Instead**: Use clear language like "These tokens are unpriced" or "Data shows:"
        - ✅ **Instead**: If you need to clarify, say "To clarify:" or "More specifically:"
        
        ## 📋 For Comprehensive Reports:
        **IMPORTANT**: When user asks for "complete report" or "full analysis":
        - Make 2-3 FOCUSED API calls maximum (portfolio + positions + NFT portfolio)
        - DON'T try to call every single endpoint
        - Prioritize most important data: portfolio summary, top token holdings, NFT summary
        - You can mention "For detailed transaction history, ask separately" to avoid overload
        - This prevents 413 Payload Too Large errors

        ## ⚠️ COMMON MISTAKES TO AVOID:
        ❌ Using getPathParametersAndBaseUrl for \`/positions/\` → NOT IN OPENAPI SPEC, WILL FAIL!
        ❌ Using \`filter[positions]\` on \`/portfolio\` endpoint → 400 ERROR
        ❌ Using wrong position_types: "deposited" → use "deposit", "borrowed" → use "loan"
        ❌ Using HTML-encoded URLs: &amp; → use plain &
        ❌ Using wrong chain IDs (use "base" not "Base", "binance-smart-chain" not "bsc")
        ❌ Forgetting the trailing \`/\` on \`/positions/\` endpoint
        ❌ Making too many API calls for comprehensive reports (causes 413 error)
        
        ## ✅ CORRECT FLOW FOR TOKEN HOLDINGS:
        1. User asks: "Show ERC-20 tokens on Base"
        2. Extract: address = 0x710e..., chain = "base"
        3. Build URL directly: \`${zerionBaseURL}/v1/wallets/0x710e.../positions/?filter[chain_ids]=base\`
        4. Call makeApiCall with this URL
        5. Parse and format the response
        `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". 
          
          Base URL: ${zerionBaseURL}
          
          Main Endpoints Available:
          - /v1/wallets/{address}/portfolio (summary)
          - /v1/wallets/{address}/positions/ (token holdings - build URL directly!)
          - /v1/wallets/{address}/nft-positions/ (NFTs)
          - /v1/wallets/{address}/nft-portfolio (NFT summary)
          - /v1/wallets/{address}/transactions/ (transaction history)
          
          IMPORTANT TIPS:
          1. For comprehensive reports, make FOCUSED queries rather than trying to get everything at once
          2. Use correct position_types: deposit, loan, wallet, locked, staked, reward, investment
          3. Use plain & NOT &amp; in URLs
          4. For /positions/ endpoint, build URL directly without getPathParametersAndBaseUrl`
        ),
        tools: {
          getPathParametersAndBaseUrl: tool({
            description:
              "Retrieve all parameters required for a given API path.",
            parameters: z.object({
              path: z
                .string()
                .describe(
                  "The API path, e.g., '/v1/wallets/{address}/charts/{chart_period}'"
                ),
            }),
            execute: async ({ path }) => {
              console.log("Fetching parameters for path:", path);
              
              // Special handling for /positions/ endpoint - NOT in OpenAPI spec
              if (path.includes('/positions/')) {
                return {
                  error: "🚨 STOP! The /positions/ endpoint is NOT in the OpenAPI spec.",
                  instruction: "You MUST build the URL directly without this tool.",
                  example: `${zerionBaseURL}/v1/wallets/{address}/positions/?filter[chain_ids]=polygon&currency=usd`,
                  template: "Just call makeApiCall with the URL above (replace {address} with actual address)"
                };
              }
              
              const zerionPathsDetails = await getPathDetails(
                zerionOpenapidata,
                path
              );
              return zerionPathsDetails;
            },
          }),
          makeApiCall: tool({
            description: "Fetch real-time blockchain data from Zerion API. IMPORTANT: Use plain ampersands (&) in URLs, NOT HTML-encoded (&amp;).",
            parameters: z.object({
              url: z.string().describe("The full API query URL with plain ampersands (&)."),
            }),
            execute: async ({ url }) => {
              try {
                // Decode HTML entities in URL (e.g., &amp; to &)
                let cleanUrl = url
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"');
                
                if (url !== cleanUrl) {
                  console.log("⚠️ Decoded HTML entities in URL");
                }
                
                console.log("fetching --- ", cleanUrl);
                const options = {
                  method: "GET",
                  headers: {
                    accept: "application/json",
                    authorization: `Basic ${apiKey}`,
                  },
                };
                const response = await fetch(cleanUrl, options);
                
                if (!response.ok) {
                  // Try to get error details from response body
                  let errorDetails = "";
                  try {
                    const errorJson = await response.json();
                    errorDetails = JSON.stringify(errorJson);
                  } catch (e) {
                    errorDetails = await response.text();
                  }
                  
                  console.error(`❌ Zerion API Error ${response.status}:`, errorDetails);
                  throw new Error(
                    `API call failed with status ${response.status}. Details: ${errorDetails}`
                  );
                }
                
                const json = await response.json();
                console.log("✅ Fetched API response successfully");
                return json; // Return parsed JSON data for further processing
              } catch (error: any) {
                console.error("Error fetching API data:", error);
                return { 
                  error: "Failed to fetch data from the API.", 
                  details: error.message 
                };
              }
            },
          }),
        },
        maxSteps: 5,
      });

      return aiAgentResponse.text;
    } catch (error: any) {
      console.error("Error in getEvmOnchainDataUsingZerion:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
