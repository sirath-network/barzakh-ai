import { tool } from "ai";
import { z } from "zod";

export const NADFUN_API_URL = "https://api.nadapp.net";

// ============================================================================
// Tool: Search Nad.fun Tokens
// ============================================================================

export const searchNadFunTokens = tool({
    description: "Search for tokens on nad.fun (Monad's bonding curve launchpad) by name, symbol, or address. Returns a list of matching tokens with their contract addresses, prices, and market info. Use this when the user asks to buy/sell a token but hasn't provided the exact address.",
    parameters: z.object({
        query: z.string().describe("Search query (token name, symbol, or address)"),
        limit: z.number().default(5).describe("Max number of results to return (default: 5)"),
    }),
    execute: async ({ query, limit }) => {
        try {
            const response = await fetch(`${NADFUN_API_URL}/search/${encodeURIComponent(query)}`, {
                headers: {
                    "accept": "application/json",
                    "user-agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
                }
            });

            if (!response.ok) {
                return {
                    status: "error",
                    error: `API request failed with status ${response.status}`,
                };
            }

            const data = await response.json();

            // The API returns { token_result: { tokens: [...] } }
            const tokens = data.token_result?.tokens || [];

            if (tokens.length === 0) {
                return {
                    status: "success",
                    message: `No tokens found matching "${query}".`,
                    results: [],
                };
            }

            // Map to a cleaner format for the AI
            const results = tokens.slice(0, limit).map((item: any) => {
                const info = item.token_info || {};
                const market = item.market_info || {};

                return {
                    name: info.name,
                    symbol: info.symbol,
                    address: info.token_id,
                    price_usd: market.price_usd ? `$${parseFloat(market.price_usd).toFixed(8)}` : "N/A",
                    market_cap_usd: market.market_cap ? `$${parseInt(market.market_cap).toLocaleString()}` : "N/A",
                    volume: market.volume ? parseFloat(market.volume).toLocaleString() : "0",
                    holder_count: market.holder_count,
                    description: info.description?.substring(0, 100) + (info.description?.length > 100 ? "..." : ""),
                    image: info.image_uri,
                    is_graduated: info.is_graduated,
                    url: `https://nad.fun/token/${info.token_id}`,
                    network: "Monad (Chain ID 143)",
                };
            });

            return {
                status: "success",
                count: results.length,
                results: results,
                note: "These tokens are EXCLUSIVE to Monad (Chain ID 143). When calling prepareRelayTransaction, you MUST set toChainId=143.",
            };

        } catch (error: any) {
            return {
                status: "error",
                error: "Failed to search nad.fun tokens",
                details: error.message,
            };
        }
    },
});
