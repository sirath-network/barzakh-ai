import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPIFromJson,
} from "../../../utils/openapi";
import { multichainEnsLookup } from "../../../utils/multichain-ens-lookup";
import zerionJson from "./zerion-openapi.json";
import { zerionBaseURL } from "./constant";
import { getZerionApiKey } from "../../../utils/utils";

// Interface for UI compatibility
export interface EvmTransactionHistoryResponse {
  address?: string;
  network: string;
  chainId?: number;
  page?: number;
  limit?: number;
  transactionCount: number;
  transactions: any[]; // Using any[] for simplicity in this tool, or duplicate full EvmTransaction interface
  viewAllUrl?: string;
  explorerUrl?: string;
  note?: string;
  error?: string;
  raw?: any;
}

const explorerMap: Record<string, string> = {
  // Major Chains
  "ethereum": "https://etherscan.io",
  "bsc": "https://bscscan.com",
  "binance-smart-chain": "https://bscscan.com",
  "polygon": "https://polygonscan.com",
  "polygon-zkevm": "https://zkevm.polygonscan.com",
  "base": "https://basescan.org",
  "arbitrum": "https://arbiscan.io",
  "arbitrum-one": "https://arbiscan.io",
  "arbitrum-nova": "https://nova.arbiscan.io",
  "optimism": "https://optimistic.etherscan.io",
  "op": "https://optimistic.etherscan.io",
  "avalanche": "https://snowscan.xyz",

  // Layer 2s & Newer Chains
  "linea": "https://lineascan.build",
  "blast": "https://blastscan.io",
  "scroll": "https://scrollscan.com",
  "zksync-era": "https://explorer.zksync.io",
  "zksync": "https://explorer.zksync.io",
  "mantle": "https://mantlescan.xyz",
  "taiko": "https://taikoscan.io",
  "mode": "https://explorer.mode.network",
  "metis": "https://andromeda-explorer.metis.io",

  // Zerion-supported chains
  "abstract": "https://abscan.org",
  "apechain": "https://apescan.io",
  "aurora": "https://explorer.aurora.dev",
  "berachain": "https://berascan.com",
  "celo": "https://celoscan.io",
  "degen": "https://explorer.degen.tips",
  "fantom": "https://ftmscan.com",
  "gnosis": "https://gnosisscan.io",
  "xdai": "https://gnosisscan.io",
  "gravity": "https://explorer.gravity.xyz",
  "hyperevm": "https://hyperevmscan.io",
  "ink": "https://explorer.inkonchain.com",
  "katana": "https://katanascan.com",
  "lens": "https://explorer.lens.xyz",
  "monad": "https://monadscan.com",
  "plasma": "https://plasmascan.to",
  "soneium": "https://soneium.blockscout.com",
  "sonic": "https://sonicscan.org",
  "somnia": "https://explorer.somnia.network",
  "solana": "https://solscan.io",
  "unichain": "https://uniscan.xyz",
  "world": "https://worldscan.org",
  "xdc": "https://xdcscan.com",
  "zero-network": "https://explorer.zero.network",
  "zora": "https://explorer.zora.energy",
  "0g": "https://explorer.0g.ai",

  // Legacy/Other chains
  "bittorrent": "https://bttcscan.com",
  "fraxtal": "https://fraxscan.com",
  "memecore": "https://memecorescan.io",
  "moonbeam": "https://moonbeam.moonscan.io",
  "moonriver": "https://moonriver.moonscan.io",
  "opbnb": "https://opbnb.bscscan.com",
  "swellchain": "https://swellchainscan.io",
  "sei": "https://seiscan.io",
  "stable": "https://stablescan.xyz",
};

const getExplorerBaseUrl = (chain: string) => {
  return explorerMap[chain.toLowerCase()] || "https://etherscan.io";
};

const getTxExplorerUrl = (chain: string, hash: string) => {
  const base = getExplorerBaseUrl(chain);
  return `${base}/tx/${hash}`;
};


export const getEvmOnchainDataUsingZerion = tool({
  description: "PRIMARY TOOL for EVM wallet data. Get transaction history, token balances, portfolio, and NFTs from 45+ chains (Ethereum, Polygon, Base, Arbitrum, Berachain, Sonic, etc). ALWAYS use this FIRST for any wallet or transaction query!",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("user query ", userQuery);

      // Check for ENS name in userQuery and resolve it
      const ensRegex = /\b[a-zA-Z0-9-]+\.eth\b/g;
      const ensMatches = userQuery?.match(ensRegex);

      if (ensMatches && ensMatches.length > 0) {
        for (const ens of ensMatches) {
          try {
            console.log(`Resolving ENS: ${ens}`);
            const address = await multichainEnsLookup(ens);
            if (address && address !== "not found") {
              console.log(`Resolved ${ens} to ${address}`);
              // Replace ENS with address in the query to help the internal agent
              userQuery = userQuery?.replace(ens, address);
            }
          } catch (err) {
            console.error(`Failed to resolve ENS ${ens}:`, err);
          }
        }
        console.log("Updated user query with resolved addresses:", userQuery);
      }

      const apiKey = getZerionApiKey();
      if (!apiKey) {
        throw Error("zerion api key not found");
      }

      const zerionOpenapidata = await loadOpenAPIFromJson(zerionJson);
      const zerionAllPathsAndDesc = await getAllPathsAndDesc(zerionOpenapidata);

      let fetchedData: any = null;
      let queriedAddress: string | null = null;

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("google-gemini-2.5-flash-preview"),
        system: `You are an intelligent API assistant for Zerion blockchain data. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.

        ## 🚨 ABSOLUTE RULES (MUST FOLLOW):
        1. **NEVER call getPathParametersAndBaseUrl for /positions/ endpoint** - Build URL directly!
        2. **NEVER use strikethrough (~~text~~) or markdown to correct yourself** - Write clearly from start!
        3. **Be consistent with data** - Don't contradict yourself within response
        4. **Use plain ampersands (&)** - NOT HTML-encoded (&amp;)
        5. **ALWAYS include NFT summary** in comprehensive portfolio reports (use /nft-portfolio or /nft-collections)

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
        - ethereum, polygon, arbitrum, optimism, base, avalanche
        - binance-smart-chain (for BSC), fantom, gnosis (or xdai)
        - zksync-era, linea, blast, scroll, mantle
        - abstract, apechain, aurora, berachain, celo, degen
        - gravity, hyperevm, ink, katana, lens, monad
        - plasma, polygon-zkevm, soneium, sonic, somnia
        - solana, unichain, world, xdc, zero-network, zora, 0g

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
           const address = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
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
        **IMPORTANT**: When user asks for "complete report", "full analysis", or "portfolio summary":
        - You MUST fetch and include NFT data (use /nft-portfolio for summary or /nft-collections for top collections)
        - Make 2-3 FOCUSED API calls maximum (portfolio + positions + NFT portfolio/collections)
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
        2. Extract: address = 0xd8da..., chain = "base"
        3. Build URL directly: \`${zerionBaseURL}/v1/wallets/0xd8da.../positions/?filter[chain_ids]=base\`
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

                // Auto-add trash filter for transaction queries to exclude spam/scam
                if (cleanUrl.includes('/transactions') && !cleanUrl.includes('filter[trash]')) {
                  const separator = cleanUrl.includes('?') ? '&' : '?';
                  cleanUrl += `${separator}filter[trash]=only_non_trash`;
                  console.log("🗑️ Added trash filter to exclude spam transactions");
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

                // Capture data if it looks like transactions or portfolio
                if (json?.data && (url.includes('/transactions') || url.includes('/positions'))) {
                  fetchedData = json;

                  // Extract address from URL if possible to ensure we have the correct wallet context
                  // URL format: .../wallets/{address}/...
                  const walletMatch = url.match(/\/wallets\/([^/]+)/);
                  if (walletMatch && walletMatch[1]) {
                    queriedAddress = walletMatch[1];
                    console.log("Captured queried address:", queriedAddress);
                  }
                }

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

      // If we captured structured data, transform and return it for the UI
      if (fetchedData && fetchedData.data) {
        try {
          // Normalize Zerion response to EvmTransactionHistoryResponse
          const items = Array.isArray(fetchedData.data) ? fetchedData.data : [fetchedData.data];

          // Basic mapping - iterate over items to format
          const transactions = items.map((item: any) => {
            const attr = item.attributes || {};
            const transfers = attr.transfers || [];
            const approvals = attr.approvals || [];

            // Try to find the primary transfer details
            // Zerion transfers: [{ direction, quantity, fungible_info: { icon, symbol }, value }]

            // Determine direction based on operation type and transfers
            const operationType = attr.operation_type || '';
            let primaryDirection = 'OUT';

            // For receive operations, direction is IN
            if (operationType === 'receive' || transfers[0]?.direction === 'in') {
              primaryDirection = 'IN';
            }
            // For self-transfers
            if (transfers[0]?.direction === 'self') {
              primaryDirection = 'SELF';
            }

            const primaryTransfer = transfers[0];

            // Helper to clean up amounts
            const formatAmount = (val: string | number) => {
              if (!val) return "0";
              const num = typeof val === 'string' ? parseFloat(val) : val;
              if (isNaN(num)) return "0";

              // For large numbers (>= 1M), use abbreviations like Etherscan (e.g. 50.00 M)
              if (Math.abs(num) >= 1_000_000_000_000) {
                return (num / 1_000_000_000_000).toFixed(2).replace(/\.00$/, '') + " T";
              }
              if (Math.abs(num) >= 1_000_000_000) {
                return (num / 1_000_000_000).toFixed(2).replace(/\\.00$/, '') + " B";
              }
              if (Math.abs(num) >= 1_000_000) {
                return (num / 1_000_000).toFixed(2).replace(/\.00$/, '') + " M";
              }
              if (Math.abs(num) >= 1_000) {
                return (num / 1_000).toFixed(2).replace(/\.00$/, '') + " K";
              }

              // For other numbers, use commas and up to 6 decimal places
              return new Intl.NumberFormat('en-US', {
                maximumFractionDigits: 6,
                useGrouping: true // Ensure commas are used
              }).format(num);
            };

            // Extract sender/recipient from various possible Zerion response structures
            // Zerion uses sent_from/sent_to at the transaction level (required fields per OpenAPI spec)
            const getSenderAddress = () => {
              // Transaction-level addresses (from OpenAPI spec)
              if (attr.sent_from) return attr.sent_from;
              // Transfer-level addresses as fallback
              if (primaryTransfer?.sender) {
                return typeof primaryTransfer.sender === 'string'
                  ? primaryTransfer.sender
                  : primaryTransfer.sender;
              }
              // If direction is OUT, the sender is the queried wallet
              if (primaryDirection === 'OUT' && queriedAddress) return queriedAddress;
              return null;
            };

            const getRecipientAddress = () => {
              // Transaction-level addresses (from OpenAPI spec)
              if (attr.sent_to) return attr.sent_to;
              // Transfer-level addresses as fallback
              if (primaryTransfer?.recipient) {
                return typeof primaryTransfer.recipient === 'string'
                  ? primaryTransfer.recipient
                  : primaryTransfer.recipient;
              }
              // If direction is IN, the recipient is the queried wallet
              if (primaryDirection === 'IN' && queriedAddress) return queriedAddress;
              return null;
            };

            const sender = getSenderAddress() || 'Unknown';
            const recipient = getRecipientAddress() || 'Unknown';

            // Extract chain from relationships
            const chainIdString = item.relationships?.chain?.data?.id || 'ethereum';

            // Extract dApp info if available
            const dappName = attr.application_metadata?.name || null;
            const dappIcon = attr.application_metadata?.icon?.url || null;
            const methodName = attr.application_metadata?.method?.name || null;

            // Extract fee info
            const fee = attr.fee ? {
              value: attr.fee.value,
              symbol: attr.fee.fungible_info?.symbol || 'ETH',
              formatted: attr.fee.quantity?.numeric
                ? `${formatAmount(attr.fee.quantity.numeric)} ${attr.fee.fungible_info?.symbol || 'ETH'}`
                : null
            } : null;

            // Build token transfer info - handle multiple transfers for swaps
            let tokenTransfer = undefined;
            if (transfers.length > 0) {
              if (transfers.length === 1) {
                // Single transfer
                tokenTransfer = {
                  direction: primaryDirection,
                  amount: primaryTransfer.quantity?.numeric || '0',
                  symbol: primaryTransfer.fungible_info?.symbol || primaryTransfer.nft_info?.name || '?',
                  formatted: `${formatAmount(primaryTransfer.quantity?.numeric)} ${primaryTransfer.fungible_info?.symbol || primaryTransfer.nft_info?.name || '?'}`
                };
              } else if (operationType === 'trade' && transfers.length >= 2) {
                // For trades/swaps, show both sides
                const inTransfer = transfers.find((t: any) => t.direction === 'in');
                const outTransfer = transfers.find((t: any) => t.direction === 'out');
                tokenTransfer = {
                  direction: 'SWAP',
                  amount: outTransfer?.quantity?.numeric || '0',
                  symbol: outTransfer?.fungible_info?.symbol || '?',
                  formatted: `${formatAmount(outTransfer?.quantity?.numeric)} ${outTransfer?.fungible_info?.symbol || '?'} → ${formatAmount(inTransfer?.quantity?.numeric)} ${inTransfer?.fungible_info?.symbol || '?'}`
                };
              } else {
                // Multiple transfers - just show the first one with a note
                tokenTransfer = {
                  direction: primaryDirection,
                  amount: primaryTransfer.quantity?.numeric || '0',
                  symbol: primaryTransfer.fungible_info?.symbol || '?',
                  formatted: `${formatAmount(primaryTransfer.quantity?.numeric)} ${primaryTransfer.fungible_info?.symbol || '?'} (+${transfers.length - 1} more)`
                };
              }
            }

            // Handle approvals if no transfers (for approve/revoke operations)
            if (!tokenTransfer && approvals.length > 0) {
              const primaryApproval = approvals[0];
              tokenTransfer = {
                direction: operationType === 'revoke' ? 'REVOKE' : 'APPROVE',
                amount: primaryApproval.quantity?.numeric || 'unlimited',
                symbol: primaryApproval.fungible_info?.symbol || primaryApproval.nft_info?.name || '?',
                formatted: `${primaryApproval.fungible_info?.symbol || primaryApproval.nft_info?.name || 'Token'}`
              };
            }

            return {
              hash: attr.hash || item.id,
              timestamp: attr.mined_at,
              direction: primaryDirection,
              txType: operationType || 'Transaction',
              status: attr.status,
              from: sender,
              to: recipient,
              value: primaryTransfer?.value ? primaryTransfer?.value.toString() : '0',
              tokenTransfer,
              explorerUrl: getTxExplorerUrl(chainIdString, attr.hash || item.id),
              chain: chainIdString,
              // Additional metadata
              dappName,
              dappIcon,
              methodName,
              fee,
              blockNumber: attr.mined_at_block
            };
          });

          if (transactions.length > 0) {
            console.log("Returning structured Zerion data for UI");
            // Determine primary network for the whole card if possible, otherwise default to first tx's chain
            const primaryChain = transactions[0]?.chain || "evm";

            return {
              network: primaryChain,
              transactionCount: transactions.length,
              transactions: transactions,
              explorerUrl: getExplorerBaseUrl(primaryChain) + "/address/" + (queriedAddress || (transactions[0].from !== 'Unknown' ? transactions[0].from : transactions[0].to)),
              raw: fetchedData
            } as EvmTransactionHistoryResponse; // Cast to the defined interface
          }
        } catch (e) {
          console.error("Failed to transform Zerion data:", e);
        }
      }

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
