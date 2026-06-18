import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPI,
} from "../../../utils/openapi";
import { etherscanBaseURL, defaultChainId } from "./constant";

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
      { chainname: "Mantle Mainnet", chainid: "5000" },
      { chainname: "Linea Mainnet", chainid: "59144" },
      { chainname: "Blast Mainnet", chainid: "81457" },
      { chainname: "Scroll Mainnet", chainid: "534352" },
      { chainname: "Sonic Mainnet", chainid: "146" },
      { chainname: "Berachain Mainnet", chainid: "80094" },
      { chainname: "Sei Mainnet", chainid: "1329" },
      { chainname: "Gnosis", chainid: "100" },
    ];
  }
}

export const getEvmOnchainDataUsingEtherscan = tool({
  description:
    "FALLBACK ONLY - Use for contract ABIs, source code, verification status, and block/log queries. DO NOT USE for transaction history or token balances - use getEvmOnchainDataUsingZerion instead! Supports 68+ chains via Etherscan API V2.",
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

        // Comprehensive chain detection patterns for all 68 Etherscan V2 supported chains
        const chainPatterns: [RegExp, number, string][] = [
          // Ethereum
          [/\b(ethereum|eth mainnet)\b/i, 1, "Ethereum Mainnet"],
          [/\bsepolia\b/i, 11155111, "Sepolia Testnet"],
          [/\bholesky\b/i, 17000, "Holesky Testnet"],
          [/\bhoodi\b(?!.*frax)(?!.*taiko)/i, 560048, "Hoodi Testnet"],

          // BNB/BSC
          [/\b(bsc|bnb|binance)\b/i, 56, "BNB Smart Chain"],
          [/\b(bsc|bnb|binance).*testnet\b/i, 97, "BNB Testnet"],
          [/\bopbnb\b/i, 204, "opBNB Mainnet"],
          [/\bopbnb.*testnet\b/i, 5611, "opBNB Testnet"],

          // Polygon
          [/\b(polygon|matic)\b(?!.*amoy)/i, 137, "Polygon Mainnet"],
          [/\b(polygon|matic).*amoy\b/i, 80002, "Polygon Amoy Testnet"],

          // Base
          [/\bbase\b(?!.*sepolia)/i, 8453, "Base Mainnet"],
          [/\bbase.*sepolia\b/i, 84532, "Base Sepolia"],

          // Arbitrum
          [/\barbitrum\b(?!.*nova)(?!.*sepolia)/i, 42161, "Arbitrum One"],
          [/\barbitrum.*nova\b/i, 42170, "Arbitrum Nova"],
          [/\barbitrum.*sepolia\b/i, 421614, "Arbitrum Sepolia"],

          // Linea
          [/\blinea\b(?!.*sepolia)/i, 59144, "Linea Mainnet"],
          [/\blinea.*sepolia\b/i, 59141, "Linea Sepolia"],

          // Blast
          [/\bblast\b(?!.*sepolia)/i, 81457, "Blast Mainnet"],
          [/\bblast.*sepolia\b/i, 168587773, "Blast Sepolia"],

          // Optimism
          [/\b(optimism|op mainnet)\b(?!.*sepolia)/i, 10, "OP Mainnet"],
          [/\b(optimism|op).*sepolia\b/i, 11155420, "OP Sepolia"],

          // Avalanche
          [/\b(avalanche|avax)\b(?!.*fuji)/i, 43114, "Avalanche C-Chain"],
          [/\b(avalanche|avax).*fuji\b/i, 43113, "Avalanche Fuji"],

          // BitTorrent
          [/\b(bittorrent|bttc)\b(?!.*testnet)/i, 199, "BitTorrent Chain"],
          [/\b(bittorrent|bttc).*testnet\b/i, 1029, "BitTorrent Testnet"],

          // Celo
          [/\bcelo\b(?!.*sepolia)/i, 42220, "Celo Mainnet"],
          [/\bcelo.*sepolia\b/i, 11142220, "Celo Sepolia"],

          // Fraxtal
          [/\b(fraxtal|frax)\b(?!.*hoodi)/i, 252, "Fraxtal Mainnet"],
          [/\bfrax.*hoodi\b/i, 2523, "Fraxtal Hoodi"],

          // Gnosis
          [/\b(gnosis|xdai)\b/i, 100, "Gnosis"],

          // Mantle
          [/\bmantle\b(?!.*sepolia)/i, 5000, "Mantle Mainnet"],
          [/\bmantle.*sepolia\b/i, 5003, "Mantle Sepolia"],

          // Memecore
          [/\bmemecore\b(?!.*testnet)/i, 4352, "Memecore Mainnet"],
          [/\bmemecore.*testnet\b/i, 43521, "Memecore Testnet"],

          // Moonbeam/Moonriver
          [/\bmoonbeam\b/i, 1284, "Moonbeam"],
          [/\bmoonriver\b/i, 1285, "Moonriver"],
          [/\bmoonbase\b/i, 1287, "Moonbase Alpha"],

          // Scroll
          [/\bscroll\b(?!.*sepolia)/i, 534352, "Scroll Mainnet"],
          [/\bscroll.*sepolia\b/i, 534351, "Scroll Sepolia"],

          // Taiko
          [/\btaiko\b(?!.*hoodi)/i, 167000, "Taiko Mainnet"],
          [/\btaiko.*hoodi\b/i, 167013, "Taiko Hoodi"],

          // XDC
          [/\bxdc\b(?!.*apothem)/i, 50, "XDC Mainnet"],
          [/\b(xdc.*apothem|apothem)\b/i, 51, "XDC Apothem"],

          // ApeChain
          [/\bapechain\b(?!.*curtis)/i, 33139, "ApeChain Mainnet"],
          [/\b(apechain.*curtis|curtis)\b/i, 33111, "ApeChain Curtis"],

          // World
          [/\bworld\b(?!.*sepolia)/i, 480, "World Mainnet"],
          [/\bworld.*sepolia\b/i, 4801, "World Sepolia"],

          // Sonic
          [/\bsonic\b(?!.*testnet)/i, 146, "Sonic Mainnet"],
          [/\bsonic.*testnet\b/i, 14601, "Sonic Testnet"],

          // Unichain
          [/\bunichain\b(?!.*sepolia)/i, 130, "Unichain Mainnet"],
          [/\bunichain.*sepolia\b/i, 1301, "Unichain Sepolia"],

          // Abstract
          [/\babstract\b(?!.*sepolia)/i, 2741, "Abstract Mainnet"],
          [/\babstract.*sepolia\b/i, 11124, "Abstract Sepolia"],

          // Berachain
          [/\b(berachain|bera)\b(?!.*bepolia|.*testnet)/i, 80094, "Berachain Mainnet"],
          [/\b(berachain|bera).*(bepolia|testnet)\b/i, 80069, "Berachain Bepolia"],

          // Swellchain
          [/\b(swellchain|swell)\b(?!.*testnet)/i, 1923, "Swellchain Mainnet"],
          [/\b(swellchain|swell).*testnet\b/i, 1924, "Swellchain Testnet"],

          // Monad (Mainnet only)
          [/\bmonad\b/i, 143, "Monad Mainnet"],

          // HyperEVM
          [/\bhyperevm\b/i, 999, "HyperEVM Mainnet"],

          // Katana
          [/\bkatana\b(?!.*bokuto)/i, 747474, "Katana Mainnet"],
          [/\b(katana.*bokuto|bokuto)\b/i, 737373, "Katana Bokuto"],

          // Sei
          [/\bsei\b(?!.*testnet)/i, 1329, "Sei Mainnet"],
          [/\bsei.*testnet\b/i, 1328, "Sei Testnet"],

          // Stable
          [/\bstable\b(?!.*testnet)/i, 988, "Stable Mainnet"],
          [/\bstable.*testnet\b/i, 2201, "Stable Testnet"],

          // Plasma
          [/\bplasma\b(?!.*testnet)/i, 9745, "Plasma Mainnet"],
          [/\bplasma.*testnet\b/i, 9746, "Plasma Testnet"],
        ];

        // Check each pattern
        for (const [pattern, chainId, chainName] of chainPatterns) {
          if (pattern.test(query)) {
            detectedChainId = chainId;
            console.log(`🔍 Detected chain from query: ${chainName} (${chainId})`);
            break;
          }
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
        model: myProvider.languageModel("openai-gpt-4o"),
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
