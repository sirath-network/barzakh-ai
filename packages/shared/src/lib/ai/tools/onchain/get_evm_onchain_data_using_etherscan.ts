import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPI,
} from "../../../utils/openapi";
import { etherscanBaseURL, defaultChainId } from "./constant";
import { groq } from "@ai-sdk/groq";
import { translateTransactions } from "../translate-transactions";

// Helper function to fetch supported chains
async function fetchSupportedChains() {
  try {
    const response = await fetch('https://api.etherscan.io/v2/chainlist');
    const data = await response.json();
    return data.result || [];
  } catch (error) {
    console.error("Failed to fetch chainlist, using default chains:", error);
    // Fallback to common chains if API fails
    return [
      { chainname: "Ethereum Mainnet", chainid: "1" },
      { chainname: "Polygon Mainnet", chainid: "137" },
      { chainname: "BNB Smart Chain Mainnet", chainid: "56" },
      { chainname: "Base Mainnet", chainid: "8453" },
      { chainname: "Arbitrum One Mainnet", chainid: "42161" },
      { chainname: "OP Mainnet", chainid: "10" },
      { chainname: "Avalanche C-Chain", chainid: "43114" },
    ];
  }
}

export const getEvmOnchainDataUsingEtherscan = tool({
  description:
    "Get real-time data from Ethereum-based blockchains using Etherscan API V2. Supports 67+ chains including Ethereum, Polygon, BSC, Base, Arbitrum, Optimism, Avalanche, and many more.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
    chainId: z.number().optional().describe("Chain ID for Etherscan API V2. If not specified, will be auto-detected from the query or default to 1 (Ethereum Mainnet)."),
  }),
  execute: async ({ userQuery, chainId }: { userQuery?: string; chainId?: number }) => {
    console.log("using etherscan ...");
    try {
      console.log("User query:", userQuery);
      
      const apiKey = process.env.ETHERSCAN_API_KEY;
      if (!apiKey) {
        throw new Error("Etherscan API key not found");
      }

      // Fetch all supported chains
      const supportedChains = await fetchSupportedChains();
      console.log(`Loaded ${supportedChains.length} supported chains`);

      // Smart chain detection from query if not explicitly provided
      let detectedChainId = chainId;
      
      if (!detectedChainId && userQuery) {
        const query = userQuery.toLowerCase();
        
        // Chain detection patterns
        if (query.includes('polygon') || query.includes('matic')) {
          detectedChainId = 137;
          console.log("🔍 Detected chain from query: Polygon (137)");
        } else if (query.includes('bsc') || query.includes('bnb') || query.includes('binance')) {
          detectedChainId = 56;
          console.log("🔍 Detected chain from query: BSC (56)");
        } else if (query.includes('base')) {
          detectedChainId = 8453;
          console.log("🔍 Detected chain from query: Base (8453)");
        } else if (query.includes('arbitrum')) {
          detectedChainId = 42161;
          console.log("🔍 Detected chain from query: Arbitrum (42161)");
        } else if (query.includes('optimism') || query.includes(' op ')) {
          detectedChainId = 10;
          console.log("🔍 Detected chain from query: Optimism (10)");
        } else if (query.includes('avalanche') || query.includes('avax')) {
          detectedChainId = 43114;
          console.log("🔍 Detected chain from query: Avalanche (43114)");
        } else if (query.includes('linea')) {
          detectedChainId = 59144;
          console.log("🔍 Detected chain from query: Linea (59144)");
        } else if (query.includes('blast')) {
          detectedChainId = 81457;
          console.log("🔍 Detected chain from query: Blast (81457)");
        } else if (query.includes('zksync')) {
          detectedChainId = 324;
          console.log("🔍 Detected chain from query: zkSync (324)");
        } else if (query.includes('scroll')) {
          detectedChainId = 534352;
          console.log("🔍 Detected chain from query: Scroll (534352)");
        } else if (query.includes('sonic')) {
          detectedChainId = 146;
          console.log("🔍 Detected chain from query: Sonic (146)");
        } else if (query.includes('berachain') || query.includes('bera')) {
          detectedChainId = 80094;
          console.log("🔍 Detected chain from query: Berachain (80094)");
        } else if (query.includes('unichain')) {
          detectedChainId = 130;
          console.log("🔍 Detected chain from query: Unichain (130)");
        } else if (query.includes('mantle')) {
          detectedChainId = 5000;
          console.log("🔍 Detected chain from query: Mantle (5000)");
        } else if (query.includes('sei')) {
          detectedChainId = 1329;
          console.log("🔍 Detected chain from query: Sei (1329)");
        }
      }

      // Use detected/provided chainId or default to Ethereum
      const activeChainId = detectedChainId || defaultChainId;
      console.log("Using Chain ID:", activeChainId);

      const etherscanOpenapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/PurrProof/etherscan-openapi/refs/heads/main/etherscan-openapi31-bundled.yml"
      );
      const etherscanAllPathsAndDesc = await getAllPathsAndDesc(
        etherscanOpenapidata
      );

      // Create chain information summary for AI
      const chainSummary = supportedChains
        .map((chain: any) => `${chain.chainname} (chainid: ${chain.chainid})`)
        .join(', ');

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("chat-model-large"),
        system: `You are an intelligent API assistant for Etherscan API V2. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.

              ## 🚨 ABSOLUTE RULES (MUST FOLLOW):
              1. **NEVER use strikethrough (~~text~~) to correct yourself** - This breaks the UI!
              2. **Be consistent with data** - Don't contradict yourself within response
              3. **Use plain ampersands (&)** - NOT HTML-encoded (&amp;)
              4. **Always include chainid parameter** for API V2

              ## Supported Chains (67+ networks):
              ${chainSummary}

              ## How to Process User Queries:
              1. **Determine the Chain**:
                 - IMPORTANT: Check if user mentions a specific chain in their query!
                 - If "Polygon" or "MATIC" mentioned → chainid=137
                 - If "BSC" or "BNB" or "Binance" mentioned → chainid=56
                 - If "Base" mentioned → chainid=8453
                 - If "Arbitrum" mentioned → chainid=42161
                 - If "Optimism" or "OP" mentioned → chainid=10
                 - If "Avalanche" or "AVAX" mentioned → chainid=43114
                 - If none mentioned → chainid=${activeChainId} (default)
                 - You MUST use the correct chainid based on what the user asks!
            
              2. **Match User Query to API Path**:  
                 - Analyze the user's question.  
                 - Select the API path whose description best matches the intent of the query.  
            
              3. **Retrieve Required Parameters**:  
                 - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters.  
                 - **IMPORTANT**: Use plain ampersands (&) NOT HTML-encoded (&amp;)
                 - Example: '/?module=account&action=balance' (correct)
                 - NOT: '/?module=account&amp;action=balance' (wrong)
                 - If any required parameters are missing, prompt the user for input.  
            
              4. **Construct and Execute API Call**:  
                 - **CRITICAL**: Use ONLY this base URL: ${etherscanBaseURL} (V2 format with /v2/api)
                 - **NEVER use**: https://api.etherscan.io/api (V1 - deprecated!)
                 - Always include chainid=${activeChainId} parameter in the URL (required for Etherscan API V2)
                 - Correct example: ${etherscanBaseURL}?chainid=${activeChainId}&module=account&action=balance&address=0x...
                 - Wrong example: https://api.etherscan.io/api?chainid=${activeChainId}&... (missing /v2/)
                 - Use the **makeApiCall** tool to fetch data.
                   
              ## **Final Response Format:**  
              - Always provide a **clear, structured, human-readable answer** to the user.
              - Mention which chain the data is from (e.g., "On Ethereum Mainnet...")
              - Do **not** return raw JSON unless explicitly requested.  
              - If no relevant data is found, respond appropriately instead of returning an empty result.
              - If the user asks about a different chain than ${activeChainId}, inform them which chain was queried.
              
              ## 🚫 STRICTLY FORBIDDEN:
              - ❌ **NEVER use strikethrough** (~~text~~) - This creates broken UI with red boxes!
              - ❌ **NEVER contradict yourself** within the same response
              - ❌ **NEVER use markdown formatting to "fix" mistakes** - Write correctly from the start
              - ✅ **Instead**: Use clear phrases like "To clarify:" or "More specifically:"
              - ✅ **Instead**: If data is unclear, explain the limitation honestly
              `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". Available API paths and descriptions: ${etherscanAllPathsAndDesc}. Base URL: ${etherscanBaseURL}. Active Chain ID: ${activeChainId}. Supported Chains: ${supportedChains.length} networks available.`
        ),
        tools: {
          getPathParametersAndBaseUrl: tool({
            description:
              "Retrieve all parameters required for a given API path. Use plain ampersands (&) not HTML-encoded (&amp;).",
            parameters: z.object({
              path: z
                .string()
                .describe(
                  "The API path with plain ampersands, e.g., '/?module=account&action=balance' (NOT &amp;)"
                ),
            }),
            execute: async ({ path }) => {
              console.log("Fetching parameters for path:", path);
              // Decode any HTML entities (like &amp; to &) that might have been generated
              const decodedPath = path
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"');
              
              if (path !== decodedPath) {
                console.log("Decoded HTML entities in path:", decodedPath);
              }
              
              const etherscanPathsDetails = await getPathDetails(
                etherscanOpenapidata,
                decodedPath
              );
              return etherscanPathsDetails;
            },
          }),
          makeApiCall: tool({
            description: "Fetch real-time blockchain data from etherscan API V2. URL must include chainid parameter.",
            parameters: z.object({
              url: z.string().describe("The full API query URL including chainid parameter."),
            }),
            execute: async ({ url }) => {
              try {
                // Decode HTML entities in URL (e.g., &amp; to &)
                let apiUrl = url
                  .replace(/&amp;/g, '&')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"');
                
                if (url !== apiUrl) {
                  console.log("Decoded HTML entities in URL");
                }
                
                // Fix V1 to V2 URL format (critical fix!)
                if (apiUrl.includes('api.etherscan.io/api?') && !apiUrl.includes('/v2/')) {
                  apiUrl = apiUrl.replace('api.etherscan.io/api?', 'api.etherscan.io/v2/api?');
                  console.log("⚠️ Corrected V1 URL to V2 format");
                }
                
                // Ensure chainid parameter is present (required for Etherscan API V2)
                if (!apiUrl.includes('chainid=')) {
                  // Add chainid if missing
                  const separator = apiUrl.includes('?') ? '&' : '?';
                  apiUrl = `${apiUrl}${separator}chainid=${activeChainId}`;
                  console.log(`Added missing chainid parameter: ${activeChainId}`);
                }
                
                const options = {
                  method: "GET",
                  headers: {
                    accept: "application/json",
                  },
                };
                const fullUrl = `${apiUrl}&apikey=${apiKey}`;
                console.log("fetching --- ", fullUrl);
                const response = await fetch(fullUrl, options);
                if (!response.ok)
                  throw new Error(
                    `API call failed with status ${response.status}`
                  );
                const json = await response.json();
                console.log("Fetched API response:", json);
                
                // Check for API Pro requirement error
                if (json.status === '0' && json.result && 
                    (json.result.includes('API Pro') || json.result.includes('upgrade to API Pro'))) {
                  console.error("⚠️ Etherscan API Pro subscription required for this endpoint");
                  return { 
                    error: "This Etherscan endpoint requires an API Pro subscription ($149/month). For token holdings queries, consider using the Zerion API instead, which is free and provides better data.",
                    details: json.result,
                    suggestion: "Use Zerion API for token holdings data (free and more detailed)"
                  };
                }
                
                // Check for V2 migration error
                if (json.status === '0' && json.result && json.result.includes('deprecated')) {
                  console.error("Etherscan API V1 deprecated error detected");
                  return { 
                    error: "Etherscan API V1 is deprecated. Please ensure chainid parameter is included.",
                    details: json.result 
                  };
                }
                
                return json; // Return parsed JSON data for further processing
              } catch (error) {
                console.error("Error fetching API data:", error);
                return { error: "Failed to fetch data from the API." };
              }
            },
          }),
        },
        maxSteps: 5,
      });

      return aiAgentResponse.text;
    } catch (error: any) {
      console.error("Error in getEvmOnchainDataUsingEtherscan:", error);
      return {
        success: false,
        message: "Error retrieving API data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
