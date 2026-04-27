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

// ============================================================================
// FAST-PATH: Deterministic URL construction for common query patterns.
// Bypasses the inner generateText() AI call (~15-20s savings) for:
//   - portfolio queries ("portfolio 0x...")
//   - transaction history ("transactions 0x...", "tx history 0x...")
//   - token positions ("token holdings 0x...", "positions 0x...")
// Falls through to the AI agent for complex/ambiguous queries.
// ============================================================================

// Supported chain name → Zerion chain ID mapping
const CHAIN_ALIAS_MAP: Record<string, string> = {
  ethereum: "ethereum", eth: "ethereum", mainnet: "ethereum",
  polygon: "polygon", matic: "polygon", poly: "polygon",
  base: "base",
  arbitrum: "arbitrum", arb: "arbitrum",
  optimism: "optimism", op: "optimism",
  bsc: "binance-smart-chain", bnb: "binance-smart-chain", "binance-smart-chain": "binance-smart-chain",
  avalanche: "avalanche", avax: "avalanche",
  fantom: "fantom", ftm: "fantom",
  gnosis: "gnosis", xdai: "gnosis",
  linea: "linea",
  blast: "blast",
  scroll: "scroll",
  zksync: "zksync-era", "zksync-era": "zksync-era",
  mantle: "mantle",
  celo: "celo",
  monad: "monad",
  berachain: "berachain", bera: "berachain",
  sonic: "sonic",
  abstract: "abstract",
  sei: "sei",
  solana: "solana", sol: "solana",
  mode: "mode",
};

interface FastPathResult {
  type: "portfolio" | "transactions" | "positions";
  address: string;
  chain?: string; // Zerion chain ID if specified
  pageSize?: number;
}

/**
 * Attempt to parse the user query into a deterministic API call.
 * Returns null if the query is too ambiguous for fast-path.
 */
function tryFastPath(query: string): FastPathResult | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // Extract EVM address
  const addrMatch = q.match(/\b(0x[a-fA-F0-9]{40})\b/);
  if (!addrMatch) return null; // No address → can't fast-path
  const address = addrMatch[1];

  // Extract chain if mentioned
  let chain: string | undefined;
  for (const [alias, zerionId] of Object.entries(CHAIN_ALIAS_MAP)) {
    // Match chain name as a word boundary
    const chainRegex = new RegExp(`\\b${alias}\\b`, "i");
    if (chainRegex.test(q)) {
      chain = zerionId;
      break;
    }
  }

  // Detect query type
  const isPortfolio = /\b(portfolio|net\s*worth|total\s*balance|holdings|overview|summary)\b/i.test(q);
  const isTransactions = /\b(transaction|tx|history|recent\s*activity|transfers?)\b/i.test(q);
  const isPositions = /\b(token|position|erc.?20|balances?|what\s+tokens?|token\s+holdings?)\b/i.test(q);

  // Extract page size for transactions
  let pageSize: number | undefined;
  const pageSizeMatch = q.match(/\b(\d+)\s*(transaction|tx|transfers?)/i) || q.match(/\b(show|get|fetch|provide)\s+(\d+)/i);
  if (pageSizeMatch) {
    const num = parseInt(pageSizeMatch[1] || pageSizeMatch[2]);
    if (!isNaN(num) && num > 0 && num <= 100) pageSize = num;
  }
  if (/\ball\s*(transaction|tx|transfers?|recent)/i.test(q)) pageSize = 100;

  if (isPortfolio) return { type: "portfolio", address, chain };
  if (isTransactions) return { type: "transactions", address, chain, pageSize };
  if (isPositions) return { type: "positions", address, chain };

  // Default: if we have an address and no specific type, default to portfolio
  // (most common case: "portfolio vitalik.eth" → pre-resolved to "portfolio 0x...")
  return { type: "portfolio", address, chain };
}

/**
 * Execute a fast-path Zerion API call without the inner AI agent.
 * Returns the raw JSON response or null on failure.
 */
async function executeFastPath(
  fp: FastPathResult,
  apiKey: string
): Promise<{ data: any; urls: string[] } | null> {
  const headers = {
    accept: "application/json",
    authorization: `Basic ${apiKey}`,
  };

  const urls: string[] = [];

  try {
    if (fp.type === "portfolio") {
      // Fetch portfolio summary + positions in parallel
      const portfolioUrl = `${zerionBaseURL}/v1/wallets/${fp.address}/portfolio?currency=usd`;
      const chainFilter = fp.chain ? `&filter[chain_ids]=${fp.chain}` : "";
      const positionsUrl = `${zerionBaseURL}/v1/wallets/${fp.address}/positions/?currency=usd&sort=-value&page[size]=30${chainFilter}`;

      urls.push(portfolioUrl, positionsUrl);
      console.log(`[FAST-PATH] portfolio: ${portfolioUrl}`);
      console.log(`[FAST-PATH] positions: ${positionsUrl}`);

      const [portfolioRes, positionsRes] = await Promise.all([
        fetch(portfolioUrl, { method: "GET", headers }),
        fetch(positionsUrl, { method: "GET", headers }),
      ]);

      if (!portfolioRes.ok) {
        // Check for "untrackable wallet address" — common for exchange hot wallets
        const errorBody = await portfolioRes.text().catch(() => "");
        console.error(`[FAST-PATH] Portfolio API error: ${portfolioRes.status} ${errorBody}`);

        if (portfolioRes.status === 400 && errorBody.includes("untrackable")) {
          // Return a structured error so the AI can explain it
          return {
            data: {
              __fastPath: true,
              __dataType: "error",
              __errorType: "untrackable_wallet",
              message: "This wallet address is flagged as untrackable by Zerion (typically exchange hot wallets like Binance, Coinbase, etc.). Portfolio data is not available through Zerion for this address. Try using Arkham Intelligence instead for exchange wallet analysis.",
            },
            urls,
          };
        }
        return null;
      }

      const portfolioJson = await portfolioRes.json();
      const positionsJson = positionsRes.ok ? await positionsRes.json() : null;

      return {
        data: {
          portfolio: portfolioJson,
          positions: positionsJson,
          __fastPath: true,
          __dataType: "portfolio",
        },
        urls,
      };
    }

    if (fp.type === "transactions") {
      const chainFilter = fp.chain ? `&filter[chain_ids]=${fp.chain}` : "";
      const pageSize = fp.pageSize || 10;
      const txUrl = `${zerionBaseURL}/v1/wallets/${fp.address}/transactions/?currency=usd&filter[trash]=only_non_trash&page[size]=${pageSize}${chainFilter}`;

      urls.push(txUrl);
      console.log(`[FAST-PATH] transactions: ${txUrl}`);

      const txRes = await fetch(txUrl, { method: "GET", headers });
      if (!txRes.ok) {
        console.error(`[FAST-PATH] Transactions API error: ${txRes.status}`);
        return null;
      }

      const txJson = await txRes.json();
      return {
        data: { ...txJson, __fastPath: true, __dataType: "transactions" },
        urls,
      };
    }

    if (fp.type === "positions") {
      const chainFilter = fp.chain ? `&filter[chain_ids]=${fp.chain}` : "";
      const posUrl = `${zerionBaseURL}/v1/wallets/${fp.address}/positions/?currency=usd&sort=-value&page[size]=50${chainFilter}`;

      urls.push(posUrl);
      console.log(`[FAST-PATH] positions: ${posUrl}`);

      const posRes = await fetch(posUrl, { method: "GET", headers });
      if (!posRes.ok) {
        console.error(`[FAST-PATH] Positions API error: ${posRes.status}`);
        return null;
      }

      const posJson = await posRes.json();
      return {
        data: { ...posJson, __fastPath: true, __dataType: "positions" },
        urls,
      };
    }
  } catch (err) {
    console.error("[FAST-PATH] Error:", err);
    return null;
  }

  return null;
}

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

      let fetchedData: any = null;
      let queriedAddress: string | null = null;

      // =================================================================
      // FAST-PATH: Try deterministic URL construction first.
      // If the query matches a known pattern (portfolio, transactions,
      // positions), we skip the inner AI agent entirely (~15-20s savings).
      // =================================================================
      const fastPath = tryFastPath(userQuery || "");
      if (fastPath) {
        const fpStart = Date.now();
        console.log(`[FAST-PATH] Detected ${fastPath.type} for ${fastPath.address}${fastPath.chain ? ` on ${fastPath.chain}` : ""}`);

        const fpResult = await executeFastPath(fastPath, apiKey);

        if (fpResult && fpResult.data) {
          const fpElapsed = Date.now() - fpStart;
          console.log(`[FAST-PATH] ✅ Completed in ${fpElapsed}ms (bypassed inner AI agent)`);
          queriedAddress = fastPath.address;
          fetchedData = fpResult.data;

          // Handle error responses from fast-path (e.g., untrackable wallets)
          if (fpResult.data.__dataType === "error") {
            console.log(`[FAST-PATH] Returning error: ${fpResult.data.__errorType}`);
            return {
              _fastPath: true,
              type: "error" as const,
              errorType: fpResult.data.__errorType,
              address: queriedAddress,
              message: fpResult.data.message,
            };
          }

          // Transform portfolio fast-path result to match expected UI format
          if (fastPath.type === "portfolio" && fpResult.data.portfolio?.data) {
            const portfolioAttr = fpResult.data.portfolio.data.attributes || {};
            const chainDistribution: { [key: string]: number } = {};
            if (portfolioAttr.positions_distribution_by_chain) {
              for (const [chain, value] of Object.entries(portfolioAttr.positions_distribution_by_chain)) {
                chainDistribution[chain] = typeof value === "number" ? value : 0;
              }
            }
            const typeDistribution = portfolioAttr.positions_distribution_by_type || {};

            // Build positions summary for the AI to narrate
            let positionsSummary = "";
            if (fpResult.data.positions?.data && Array.isArray(fpResult.data.positions.data)) {
              const topPositions = fpResult.data.positions.data
                .filter((pos: any) => (pos.attributes?.value || 0) > 0.10) // Hide dust/spam tokens
                .sort((a: any, b: any) => (b.attributes?.value || 0) - (a.attributes?.value || 0)) // Sort by value desc
                .slice(0, 15)
                .map((pos: any) => {
                  const attr = pos.attributes || {};
                  const fungible = attr.fungible_info || {};
                  const value = attr.value || 0;
                  const quantity = attr.quantity?.float || 0;
                  return `${fungible.symbol || "?"}: ${quantity.toLocaleString()} ($${value.toFixed(2)})`;
                });
              positionsSummary = `\nTop holdings: ${topPositions.join(", ")}`;
            }

            console.log("Captured portfolio data for UI");
            console.log("Returning structured portfolio data for UI");

            return {
              type: "portfolio" as const,
              id: queriedAddress || "",
              currency: "usd",
              attributes: {
                positions_distribution_by_type: {
                  wallet: typeDistribution.wallet || 0,
                  deposited: typeDistribution.deposited || typeDistribution.deposit || 0,
                  borrowed: typeDistribution.borrowed || typeDistribution.loan || 0,
                  locked: typeDistribution.locked || 0,
                  staked: typeDistribution.staked || 0,
                },
                // Filter out dust chains (< $0.10)
                positions_distribution_by_chain: Object.fromEntries(
                  Object.entries(chainDistribution)
                    .filter(([, v]) => (v as number) >= 0.10)
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                ),
                total: {
                  positions: portfolioAttr.total?.positions || null,
                },
                changes: {
                  absolute_1d: portfolioAttr.changes?.absolute_1d || 0,
                  percent_1d: portfolioAttr.changes?.percent_1d || 0,
                },
              },
              // Attach positions summary for the AI to narrate naturally
              _positionsSummary: positionsSummary,
              _totalValue: Object.values(typeDistribution).reduce((a: number, b: any) => a + (typeof b === "number" ? b : 0), 0),
            };
          }

          // For transactions fast-path, process through existing transaction transformer below
          if (fastPath.type === "transactions") {
            fetchedData = fpResult.data;
            // Fall through to the transaction transformation logic at the bottom
          }

          // For positions fast-path, return the data for the AI to narrate
          if (fastPath.type === "positions" && fpResult.data.data) {
            const positions = Array.isArray(fpResult.data.data) ? fpResult.data.data : [];
            const formatted = positions
              .filter((pos: any) => (pos.attributes?.value || 0) > 0.10) // Hide dust/spam
              .sort((a: any, b: any) => (b.attributes?.value || 0) - (a.attributes?.value || 0))
              .slice(0, 30)
              .map((pos: any) => {
                const attr = pos.attributes || {};
                const fungible = attr.fungible_info || {};
                const chain = pos.relationships?.chain?.data?.id || "unknown";
                return {
                  symbol: fungible.symbol || "?",
                  name: fungible.name || "Unknown",
                  chain,
                  value: attr.value || 0,
                  quantity: attr.quantity?.float || 0,
                  price: attr.price || 0,
                };
              });

            return {
              _fastPath: true,
              type: "positions",
              address: queriedAddress,
              totalPositions: positions.length,
              positions: formatted,
            };
          }
        } else {
          console.log("[FAST-PATH] ⚠️ Failed or no data, falling back to AI agent");
        }
      }

      // =================================================================
      // SLOW-PATH: Full inner AI agent (only for complex/ambiguous queries)
      // =================================================================
      const zerionOpenapidata = await loadOpenAPIFromJson(zerionJson);
      const zerionAllPathsAndDesc = await getAllPathsAndDesc(zerionOpenapidata);

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("xai-grok-4.1-fast"),
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
        - \`page[size]\`: results per page (default: 10 is auto-added if not specified)
        
        **⚠️ CRITICAL: PAGINATION BEHAVIOR:**
        - Default (no count specified): DON'T add page[size], system will auto-add 10
        - **DETECT NUMBER REQUESTS:** Look for patterns like:
          - "20 transactions", "at least 20", "show 50", "give me 30", "more transactions"
          - "provide at least X", "I want X", "fetch X", "get X transactions"
          - "all transactions" → use page[size]=100 (maximum)
        - **When user specifies a count or "all":** YOU MUST add \`page[size]=X\` explicitly in the URL!
        - Example: User says "provide at least 20" → URL must include \`page[size]=20\`
        - Example: User says "all recent transactions" → URL must include \`page[size]=100\`
        - Maximum: 100 per request

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

                // Auto-add defaults for transaction queries
                if (cleanUrl.includes('/transactions')) {
                  // Add trash filter to exclude spam/scam if not already present
                  if (!cleanUrl.includes('filter[trash]')) {
                    const separator = cleanUrl.includes('?') ? '&' : '?';
                    cleanUrl += `${separator}filter[trash]=only_non_trash`;
                    console.log("🗑️ Added trash filter to exclude spam transactions");
                  }

                  // Add default page size of 10 if not specified (for faster responses)
                  // Users can still request more transactions explicitly (e.g., "show 50 transactions")
                  if (!cleanUrl.includes('page[size]')) {
                    const separator = cleanUrl.includes('?') ? '&' : '?';
                    cleanUrl += `${separator}page[size]=10`;
                    console.log("📄 Added default page size of 10 for transactions");
                  }
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

                // Capture data based on endpoint type with priority:
                // 1. Portfolio data (highest priority - don't overwrite)
                // 2. Transactions (for transaction history)
                // 3. Positions are NOT captured for UI - they're token holdings, handled by AI agent
                if (json?.data) {
                  const isPortfolioUrl = url.includes('/portfolio') && !url.includes('/nft-portfolio');
                  const isTransactionsUrl = url.includes('/transactions');

                  // Extract address from URL
                  const walletMatch = url.match(/\/wallets\/([^/]+)/);
                  if (walletMatch && walletMatch[1]) {
                    queriedAddress = walletMatch[1];
                    console.log("Captured queried address:", queriedAddress);
                  }

                  // Portfolio takes priority - only capture if not already set or if this is portfolio
                  if (isPortfolioUrl) {
                    fetchedData = json;
                    (fetchedData as any).__dataType = 'portfolio';
                    console.log("Captured portfolio data for UI");
                  } else if (isTransactionsUrl && (fetchedData as any)?.__dataType !== 'portfolio') {
                    // Only capture transactions if we don't already have portfolio data
                    fetchedData = json;
                    (fetchedData as any).__dataType = 'transactions';
                    console.log("Captured transaction data for UI");
                  }
                  // Note: /positions/ data is NOT captured - it's handled by the AI agent response
                }

                // IMPORTANT: Limit data size to prevent token limit issues with large wallets
                // Return summarized data to the AI agent, but keep full data for UI rendering
                let filteredJson = json;
                if (Array.isArray(json?.data) && json.data.length > 0) {
                  const isPositionsUrl = url.includes('/positions');
                  const isTransactionsUrl = url.includes('/transactions');
                  const isNftUrl = url.includes('/nft-positions') || url.includes('/nft-collections');

                  // Limit positions (sort by value, take top items)
                  if (isPositionsUrl && json.data.length > 30) {
                    console.log(`📊 Filtering ${json.data.length} positions to top 30 by value`);
                    const sortedPositions = [...json.data].sort((a: any, b: any) => {
                      const aValue = a?.attributes?.value || 0;
                      const bValue = b?.attributes?.value || 0;
                      return bValue - aValue;
                    });
                    filteredJson = {
                      ...json,
                      data: sortedPositions.slice(0, 30),
                      _filtered: true,
                      _originalCount: json.data.length,
                      _summary: `Showing top 30 positions by value out of ${json.data.length} total`
                    };
                  }

                  // Limit transactions (recent first, max 20)
                  if (isTransactionsUrl && json.data.length > 20) {
                    console.log(`📊 Filtering ${json.data.length} transactions to 20`);
                    filteredJson = {
                      ...json,
                      data: json.data.slice(0, 20),
                      _filtered: true,
                      _originalCount: json.data.length
                    };
                  }

                  // Limit NFTs
                  if (isNftUrl && json.data.length > 20) {
                    console.log(`📊 Filtering ${json.data.length} NFTs to 20`);
                    filteredJson = {
                      ...json,
                      data: json.data.slice(0, 20),
                      _filtered: true,
                      _originalCount: json.data.length
                    };
                  }
                }

                return filteredJson; // Return filtered JSON to AI agent (UI uses fetchedData)
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
          // Check if this is portfolio data (not transactions)
          if ((fetchedData as any).__dataType === 'portfolio') {
            // Transform Zerion portfolio response to PortfolioData format
            const portfolioAttr = fetchedData.data.attributes || {};

            // Build positions_distribution_by_chain from the response
            const chainDistribution: { [key: string]: number } = {};
            if (portfolioAttr.positions_distribution_by_chain) {
              for (const [chain, value] of Object.entries(portfolioAttr.positions_distribution_by_chain)) {
                chainDistribution[chain] = typeof value === 'number' ? value : 0;
              }
            }

            // Build positions_distribution_by_type
            const typeDistribution = portfolioAttr.positions_distribution_by_type || {};

            console.log("Returning structured portfolio data for UI");
            return {
              type: "portfolio" as const,
              id: queriedAddress || fetchedData.data.id || "",
              currency: "usd",
              attributes: {
                positions_distribution_by_type: {
                  wallet: typeDistribution.wallet || 0,
                  deposited: typeDistribution.deposited || typeDistribution.deposit || 0,
                  borrowed: typeDistribution.borrowed || typeDistribution.loan || 0,
                  locked: typeDistribution.locked || 0,
                  staked: typeDistribution.staked || 0,
                },
                positions_distribution_by_chain: chainDistribution,
                total: {
                  positions: portfolioAttr.total?.positions || null,
                },
                changes: {
                  absolute_1d: portfolioAttr.changes?.absolute_1d || 0,
                  percent_1d: portfolioAttr.changes?.percent_1d || 0,
                },
              },
            };
          }

          // Only process as transaction history if data type is explicitly 'transactions'
          // This prevents positions data from being incorrectly displayed as transactions
          if ((fetchedData as any).__dataType !== 'transactions') {
            // No structured UI data to return - let AI agent response handle it
            return aiAgentResponse.text;
          }

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
              // Only generate explorer URL if we have a valid transaction hash (starts with 0x)
              explorerUrl: attr.hash && attr.hash.startsWith('0x')
                ? getTxExplorerUrl(chainIdString, attr.hash)
                : undefined,
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
