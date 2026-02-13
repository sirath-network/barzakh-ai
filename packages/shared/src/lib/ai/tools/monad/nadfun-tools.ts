import { tool } from "ai";
import { z } from "zod";

export const NADFUN_API_URL = "https://api.nadapp.net";

// ============================================================================
// Tool: Search Nad.fun Tokens
// ============================================================================

export const searchNadFunTokens = tool({
    description: "Search for tokens on nad.fun (Monad's bonding curve launchpad) by name, symbol, or address. Returns a list of matching tokens sorted by relevance (graduated tokens first, then by volume) with contract addresses, prices, market info, images, and holder counts. Use this when the user asks to buy/sell a token but hasn't provided the exact address.",
    parameters: z.object({
        query: z.string().describe("Search query (token name, symbol, or address)"),
        limit: z.number().default(100).describe("Max number of results to return (default: 100)"),
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

            // The API returns { token_result: { tokens: [...], total_count }, account_result: { ... } }
            const tokens = data.token_result?.tokens || [];
            const totalCount = data.token_result?.total_count || 0;

            if (tokens.length === 0) {
                return {
                    status: "success",
                    message: `No tokens found matching "${query}".`,
                    results: [],
                    total_count: 0,
                    query: query,
                };
            }

            // Sort by relevance: graduated tokens first, then by volume (descending)
            const sorted = [...tokens].sort((a: any, b: any) => {
                const aGrad = a.token_info?.is_graduated ? 1 : 0;
                const bGrad = b.token_info?.is_graduated ? 1 : 0;
                if (bGrad !== aGrad) return bGrad - aGrad;

                const aVol = parseFloat(a.market_info?.volume || "0");
                const bVol = parseFloat(b.market_info?.volume || "0");
                return bVol - aVol;
            });

            // Map to a richer format for the AI
            const results = sorted.slice(0, limit).map((item: any) => {
                const info = item.token_info || {};
                const market = item.market_info || {};
                const priceUsd = parseFloat(market.price_usd || "0");
                const totalSupply = parseFloat(market.total_supply || "0") / 1e18;
                const marketCapUsd = priceUsd * totalSupply;
                const volumeRaw = parseFloat(market.volume || "0") / 1e18;
                const createdAt = info.created_at ? new Date(info.created_at * 1000).toISOString().split("T")[0] : "N/A";

                return {
                    name: info.name,
                    symbol: info.symbol,
                    address: info.token_id,
                    image_uri: info.image_uri,
                    price_usd: priceUsd > 0 ? `$${priceUsd.toFixed(8)}` : "N/A",
                    market_cap_usd: marketCapUsd > 0 ? `$${marketCapUsd.toFixed(2)}` : "N/A",
                    volume_mon: volumeRaw > 0 ? `${volumeRaw.toFixed(2)} MON` : "0",
                    holder_count: market.holder_count || 0,
                    is_graduated: info.is_graduated || false,
                    market_type: market.market_type || "CURVE",
                    description: info.description?.substring(0, 120) + (info.description?.length > 120 ? "..." : ""),
                    created_at: createdAt,
                    url: `https://nad.fun/tokens/${info.token_id}`,
                    network: "Monad (Chain ID 143)",
                };
            });

            return {
                status: "success",
                count: results.length,
                total_available: totalCount,
                query: query,
                results: results,
                note: `Found ${totalCount} tokens matching "${query}". Showing top ${results.length} sorted by relevance (graduated first, then by volume). These tokens are EXCLUSIVE to Monad (Chain ID 143). When presenting results to the user, show the token image, name, symbol, price, market cap, and holder count. When calling prepareRelayTransaction, you MUST set toChainId=143.`,
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

// ============================================================================
// Tool: Get Nad.fun Token Info (Agent API)
// ============================================================================

export const getNadFunTokenInfo = tool({
    description: "Get detailed information about a specific token on nad.fun (Monad's token launchpad) by its contract address. Returns name, symbol, description, image, graduation status, and creator. Use this when you already have a token address and need metadata.",
    parameters: z.object({
        tokenAddress: z.string().describe("The token contract address (0x...)"),
    }),
    execute: async ({ tokenAddress }) => {
        try {
            const response = await fetch(`${NADFUN_API_URL}/agent/token/${tokenAddress}`, {
                headers: {
                    "accept": "application/json",
                    "user-agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
                },
            });

            if (!response.ok) {
                return {
                    status: "error",
                    error: `Token not found or API error (${response.status})`,
                };
            }

            const data = await response.json();
            const info = data.token_info || {};

            return {
                status: "success",
                token: {
                    name: info.name,
                    symbol: info.symbol,
                    address: info.token_id,
                    description: info.description,
                    image: info.image_uri,
                    is_graduated: info.is_graduated,
                    creator: info.creator,
                    url: `https://nad.fun/tokens/${info.token_id}`,
                },
                network: "Monad (Chain ID 143)",
                note: "This token is EXCLUSIVE to Monad. When trading via Relay, use toChainId=143.",
            };
        } catch (error: any) {
            return {
                status: "error",
                error: "Failed to fetch token info from nad.fun",
                details: error.message,
            };
        }
    },
});

// ============================================================================
// Tool: Get Nad.fun Market Data (Agent API)
// ============================================================================

export const getNadFunMarketData = tool({
    description: "Get live market data for a token on nad.fun (Monad's token launchpad). Returns current price in USD, market cap, trading volume, holder count, and all-time high. Use this when the user asks about a nad.fun token's price or market stats.",
    parameters: z.object({
        tokenAddress: z.string().describe("The token contract address (0x...)"),
    }),
    execute: async ({ tokenAddress }) => {
        try {
            const response = await fetch(`${NADFUN_API_URL}/agent/market/${tokenAddress}`, {
                headers: {
                    "accept": "application/json",
                    "user-agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
                },
            });

            if (!response.ok) {
                return {
                    status: "error",
                    error: `Market data not found or API error (${response.status})`,
                };
            }

            const data = await response.json();
            const market = data.market_info || {};

            return {
                status: "success",
                market: {
                    market_type: market.market_type,
                    price_usd: market.price_usd ? `$${parseFloat(market.price_usd).toFixed(8)}` : "N/A",
                    market_cap: market.market_cap ? `$${parseInt(market.market_cap).toLocaleString()}` : "N/A",
                    volume: market.volume ? parseFloat(market.volume).toLocaleString() : "0",
                    holder_count: market.holder_count || 0,
                    ath_price: market.ath_price ? `$${parseFloat(market.ath_price).toFixed(8)}` : "N/A",
                },
                network: "Monad (Chain ID 143)",
            };
        } catch (error: any) {
            return {
                status: "error",
                error: "Failed to fetch market data from nad.fun",
                details: error.message,
            };
        }
    },
});

// ============================================================================
// Tool: Get Nad.fun Holdings (Agent API)
// ============================================================================

export const getNadFunHoldings = tool({
    description: "Get a user's token holdings on nad.fun (Monad's token launchpad). Returns all nad.fun tokens held by the wallet with balances, prices, and market info. Use this when the user asks about their nad.fun portfolio or wants to check balances before selling.",
    parameters: z.object({
        walletAddress: z.string().describe("The wallet address to check holdings for (0x...)"),
        page: z.number().default(1).describe("Page number (default: 1)"),
        limit: z.number().default(20).describe("Max tokens per page (default: 20)"),
    }),
    execute: async ({ walletAddress, page, limit }) => {
        try {
            const response = await fetch(
                `${NADFUN_API_URL}/agent/holdings/${walletAddress}?page=${page}&limit=${limit}`,
                {
                    headers: {
                        "accept": "application/json",
                        "user-agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
                    },
                }
            );

            if (!response.ok) {
                return {
                    status: "error",
                    error: `Holdings not found or API error (${response.status})`,
                };
            }

            const data = await response.json();
            const tokens = data.tokens || [];

            if (tokens.length === 0) {
                return {
                    status: "success",
                    message: "No nad.fun token holdings found for this wallet.",
                    holdings: [],
                    total_count: 0,
                };
            }

            const holdings = tokens.map((item: any) => {
                const info = item.token_info || {};
                const balance = item.balance_info || {};
                const market = item.market_info || {};

                return {
                    name: info.name,
                    symbol: info.symbol,
                    address: info.token_id,
                    balance: balance.balance,
                    balance_usd: balance.balance_usd ? `$${parseFloat(balance.balance_usd).toFixed(2)}` : "N/A",
                    price_usd: market.price_usd ? `$${parseFloat(market.price_usd).toFixed(8)}` : "N/A",
                    is_graduated: info.is_graduated,
                    url: `https://nad.fun/tokens/${info.token_id}`,
                };
            });

            return {
                status: "success",
                total_count: data.total_count || holdings.length,
                holdings,
                network: "Monad (Chain ID 143)",
            };
        } catch (error: any) {
            return {
                status: "error",
                error: "Failed to fetch holdings from nad.fun",
                details: error.message,
            };
        }
    },
});
