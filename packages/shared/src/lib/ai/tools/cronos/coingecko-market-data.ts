/**
 * CoinGecko Market Data Integration
 * 
 * Provides accurate cryptocurrency market data from CoinGecko API.
 * Aggregates data from 900+ exchanges for better price accuracy.
 * 
 * Free tier: 10-30 calls/minute (no API key required)
 * 
 * @see https://www.coingecko.com/en/api/documentation
 */

import { tool } from "ai";
import { z } from "zod";

// Base URL for CoinGecko API v3
const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

// Cache configuration: 5 minutes TTL
const CACHE_TTL = 5 * 60 * 1000;

// Response cache
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

const cache: Map<string, CacheEntry<any>> = new Map();

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data as T;
    }
    return null;
}

function setCache<T>(key: string, data: T): void {
    cache.set(key, { data, timestamp: Date.now() });
}

// Common token symbol to CoinGecko ID mapping
const TOKEN_ID_MAP: Record<string, string> = {
    // Cronos ecosystem
    "CRO": "crypto-com-chain",
    "WCRO": "wrapped-cro",
    "VVS": "vvs-finance",
    "TONIC": "tectonic",
    "FERRO": "ferro",
    "SINGLE": "single-finance",

    // Major cryptocurrencies
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "USDC": "usd-coin",
    "BNB": "binancecoin",
    "XRP": "ripple",
    "SOL": "solana",
    "ADA": "cardano",
    "DOGE": "dogecoin",
    "MATIC": "matic-network",
    "DOT": "polkadot",
    "AVAX": "avalanche-2",
    "SHIB": "shiba-inu",
    "LINK": "chainlink",
    "UNI": "uniswap",
    "ATOM": "cosmos",
    "LTC": "litecoin",
    "APT": "aptos",
    "ARB": "arbitrum",
    "OP": "optimism",
};

/**
 * Resolve a token symbol to CoinGecko ID
 */
function resolveTokenId(symbolOrId: string): string {
    const upper = symbolOrId.toUpperCase();
    return TOKEN_ID_MAP[upper] || symbolOrId.toLowerCase();
}

/**
 * Get simple token price from CoinGecko
 */
export const getCoinGeckoPrice = tool({
    description: "Get accurate cryptocurrency price from CoinGecko (aggregated from 900+ exchanges). More accurate than single-exchange data. Use for tokens like CRO, BTC, ETH, etc.",
    parameters: z.object({
        token: z.string().describe("Token symbol (e.g., 'CRO', 'BTC', 'ETH') or CoinGecko ID (e.g., 'crypto-com-chain')"),
        vsCurrency: z.string().optional().describe("Target currency for price (default: 'usd'). Supports: usd, eur, btc, eth, etc."),
    }),
    execute: async ({ token, vsCurrency = "usd" }) => {
        try {
            const tokenId = resolveTokenId(token);
            const cacheKey = `price_${tokenId}_${vsCurrency}`;

            // Check cache first
            const cached = getCached<any>(cacheKey);
            if (cached) {
                return { ...cached, source: "cache" };
            }

            const response = await fetch(
                `${COINGECKO_API_BASE}/simple/price?ids=${tokenId}&vs_currencies=${vsCurrency}&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true&include_last_updated_at=true`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data[tokenId]) {
                return {
                    error: `Token '${token}' not found. Try searching with searchCoinGeckoToken tool.`,
                    suggestion: "Use the token's full name or CoinGecko ID",
                };
            }

            const tokenData = data[tokenId];
            const result = {
                token: token.toUpperCase(),
                tokenId,
                price: tokenData[vsCurrency],
                priceFormatted: `$${tokenData[vsCurrency]?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`,
                change24h: tokenData[`${vsCurrency}_24h_change`],
                change24hFormatted: `${tokenData[`${vsCurrency}_24h_change`]?.toFixed(2)}%`,
                volume24h: tokenData[`${vsCurrency}_24h_vol`],
                marketCap: tokenData[`${vsCurrency}_market_cap`],
                lastUpdated: tokenData.last_updated_at
                    ? new Date(tokenData.last_updated_at * 1000).toISOString()
                    : new Date().toISOString(),
                source: "coingecko",
            };

            setCache(cacheKey, result);
            return result;
        } catch (error: any) {
            console.error("Error fetching CoinGecko price:", error);

            // Fallback to Crypto.com API for CRO
            if (token.toUpperCase() === "CRO") {
                try {
                    const fallbackResponse = await fetch(
                        "https://api.crypto.com/v2/public/get-ticker?instrument_name=CRO_USDT"
                    );
                    if (fallbackResponse.ok) {
                        const fallbackData = await fallbackResponse.json();
                        if (fallbackData.code === 0) {
                            const ticker = fallbackData.result.data;
                            return {
                                token: "CRO",
                                price: parseFloat(ticker.a),
                                priceFormatted: `$${parseFloat(ticker.a).toFixed(4)}`,
                                change24h: parseFloat(ticker.c),
                                source: "crypto.com (fallback)",
                                warning: "CoinGecko was unavailable, using Crypto.com API",
                            };
                        }
                    }
                } catch (e) {
                    // Fallback also failed
                }
            }

            return {
                error: "Failed to fetch price",
                details: error.message,
            };
        }
    },
});

/**
 * Get detailed market data from CoinGecko
 */
export const getCoinGeckoMarketData = tool({
    description: "Get comprehensive market data for a cryptocurrency from CoinGecko. Includes price, market cap, volume, supply, all-time high, and price changes.",
    parameters: z.object({
        token: z.string().describe("Token symbol (e.g., 'CRO', 'BTC') or CoinGecko ID"),
        vsCurrency: z.string().optional().describe("Target currency (default: 'usd')"),
    }),
    execute: async ({ token, vsCurrency = "usd" }) => {
        try {
            const tokenId = resolveTokenId(token);
            const cacheKey = `market_${tokenId}_${vsCurrency}`;

            const cached = getCached<any>(cacheKey);
            if (cached) {
                return { ...cached, source: "cache" };
            }

            const response = await fetch(
                `${COINGECKO_API_BASE}/coins/markets?vs_currency=${vsCurrency}&ids=${tokenId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d%2C30d`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data || data.length === 0) {
                return {
                    error: `Token '${token}' not found`,
                    suggestion: "Use searchCoinGeckoToken to find the correct token ID",
                };
            }

            const coin = data[0];
            const result = {
                token: coin.symbol.toUpperCase(),
                name: coin.name,
                tokenId: coin.id,

                // Price info
                price: coin.current_price,
                priceFormatted: `$${coin.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`,

                // Market cap & volume
                marketCap: coin.market_cap,
                marketCapFormatted: `$${(coin.market_cap / 1e9).toFixed(2)}B`,
                marketCapRank: coin.market_cap_rank,
                volume24h: coin.total_volume,
                volume24hFormatted: `$${(coin.total_volume / 1e6).toFixed(2)}M`,

                // Supply info
                circulatingSupply: coin.circulating_supply,
                totalSupply: coin.total_supply,
                maxSupply: coin.max_supply,

                // Price changes
                priceChange24h: coin.price_change_24h,
                priceChangePercent1h: coin.price_change_percentage_1h_in_currency,
                priceChangePercent24h: coin.price_change_percentage_24h,
                priceChangePercent7d: coin.price_change_percentage_7d_in_currency,
                priceChangePercent30d: coin.price_change_percentage_30d_in_currency,

                // All-time high
                ath: coin.ath,
                athFormatted: `$${coin.ath?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
                athChangePercent: coin.ath_change_percentage,
                athDate: coin.ath_date,

                // All-time low
                atl: coin.atl,
                atlChangePercent: coin.atl_change_percentage,
                atlDate: coin.atl_date,

                // High/Low
                high24h: coin.high_24h,
                low24h: coin.low_24h,

                lastUpdated: coin.last_updated,
                source: "coingecko",
            };

            setCache(cacheKey, result);
            return result;
        } catch (error: any) {
            console.error("Error fetching CoinGecko market data:", error);
            return {
                error: "Failed to fetch market data",
                details: error.message,
            };
        }
    },
});

/**
 * Get historical price data from CoinGecko
 */
export const getCoinGeckoHistoricalPrice = tool({
    description: "Get historical price chart data for a cryptocurrency. Useful for price trend analysis over days, weeks, or months.",
    parameters: z.object({
        token: z.string().describe("Token symbol (e.g., 'CRO', 'BTC') or CoinGecko ID"),
        days: z.number().min(1).max(365).describe("Number of days of historical data (1-365)"),
        vsCurrency: z.string().optional().describe("Target currency (default: 'usd')"),
    }),
    execute: async ({ token, days, vsCurrency = "usd" }) => {
        try {
            const tokenId = resolveTokenId(token);
            const cacheKey = `history_${tokenId}_${vsCurrency}_${days}`;

            const cached = getCached<any>(cacheKey);
            if (cached) {
                return { ...cached, source: "cache" };
            }

            const response = await fetch(
                `${COINGECKO_API_BASE}/coins/${tokenId}/market_chart?vs_currency=${vsCurrency}&days=${days}`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.prices || data.prices.length === 0) {
                return {
                    error: `No historical data found for '${token}'`,
                };
            }

            // Process price data
            const prices = data.prices.map(([timestamp, price]: [number, number]) => ({
                date: new Date(timestamp).toISOString().split('T')[0],
                timestamp,
                price,
            }));

            // Calculate price statistics
            const priceValues = prices.map((p: { price: number }) => p.price);
            const startPrice = priceValues[0];
            const endPrice = priceValues[priceValues.length - 1];
            const highPrice = Math.max(...priceValues);
            const lowPrice = Math.min(...priceValues);
            const changePercent = ((endPrice - startPrice) / startPrice) * 100;

            const result = {
                token: token.toUpperCase(),
                tokenId,
                period: `${days} days`,
                startDate: prices[0].date,
                endDate: prices[prices.length - 1].date,

                // Statistics
                startPrice,
                endPrice,
                highPrice,
                lowPrice,
                changePercent: changePercent.toFixed(2),
                changeDirection: changePercent >= 0 ? "up" : "down",

                // Sample data points (limit to 30 for readability)
                dataPoints: prices.length > 30
                    ? prices.filter((_: any, i: number) => i % Math.ceil(prices.length / 30) === 0)
                    : prices,
                totalDataPoints: prices.length,

                // Volume and market cap if available
                volumeData: data.total_volumes?.length
                    ? { first: data.total_volumes[0][1], last: data.total_volumes[data.total_volumes.length - 1][1] }
                    : null,

                source: "coingecko",
            };

            setCache(cacheKey, result);
            return result;
        } catch (error: any) {
            console.error("Error fetching historical price:", error);
            return {
                error: "Failed to fetch historical price data",
                details: error.message,
            };
        }
    },
});

/**
 * Get CRO price specifically - convenience tool
 */
export const getCoinGeckoCroPrice = tool({
    description: "Quick lookup for Cronos (CRO) token price and market data from CoinGecko. No parameters needed.",
    parameters: z.object({}),
    execute: async () => {
        try {
            const cacheKey = "cro_price_quick";

            const cached = getCached<any>(cacheKey);
            if (cached) {
                return { ...cached, source: "cache" };
            }

            const response = await fetch(
                `${COINGECKO_API_BASE}/coins/crypto-com-chain?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();

            const result = {
                token: "CRO",
                name: "Cronos",

                // Price in multiple currencies
                priceUSD: data.market_data.current_price.usd,
                priceUSDFormatted: `$${data.market_data.current_price.usd.toFixed(4)}`,
                priceBTC: data.market_data.current_price.btc,
                priceETH: data.market_data.current_price.eth,

                // Market data
                marketCap: data.market_data.market_cap.usd,
                marketCapFormatted: `$${(data.market_data.market_cap.usd / 1e9).toFixed(2)}B`,
                marketCapRank: data.market_cap_rank,
                volume24h: data.market_data.total_volume.usd,

                // Price changes
                priceChange24h: data.market_data.price_change_percentage_24h,
                priceChange7d: data.market_data.price_change_percentage_7d,
                priceChange30d: data.market_data.price_change_percentage_30d,

                // Supply
                circulatingSupply: data.market_data.circulating_supply,
                totalSupply: data.market_data.total_supply,

                // All-time high
                ath: data.market_data.ath.usd,
                athDate: data.market_data.ath_date.usd,
                athChangePercent: data.market_data.ath_change_percentage.usd,

                // High/Low
                high24h: data.market_data.high_24h.usd,
                low24h: data.market_data.low_24h.usd,

                // Chain info
                chain: {
                    name: "Cronos EVM",
                    chainId: 25,
                    testnetChainId: 338,
                },

                lastUpdated: data.last_updated,
                source: "coingecko",
            };

            setCache(cacheKey, result);
            return result;
        } catch (error: any) {
            console.error("Error fetching CRO price:", error);

            // Fallback to Crypto.com API
            try {
                const fallbackResponse = await fetch(
                    "https://api.crypto.com/v2/public/get-ticker?instrument_name=CRO_USDT"
                );
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.code === 0) {
                        const ticker = fallbackData.result.data;
                        return {
                            token: "CRO",
                            name: "Cronos",
                            priceUSD: parseFloat(ticker.a),
                            priceUSDFormatted: `$${parseFloat(ticker.a).toFixed(4)}`,
                            high24h: parseFloat(ticker.h),
                            low24h: parseFloat(ticker.l),
                            volume24h: parseFloat(ticker.v),
                            source: "crypto.com (fallback)",
                            warning: "CoinGecko was unavailable, using Crypto.com API",
                        };
                    }
                }
            } catch (e) {
                // Fallback also failed
            }

            return {
                error: "Failed to fetch CRO price",
                details: error.message,
            };
        }
    },
});

/**
 * Search for tokens on CoinGecko
 */
export const searchCoinGeckoToken = tool({
    description: "Search for a cryptocurrency on CoinGecko by name or symbol. Returns matching tokens with their CoinGecko IDs for use with other tools.",
    parameters: z.object({
        query: z.string().describe("Search query - token name or symbol (e.g., 'Cronos', 'CRO', 'VVS')"),
    }),
    execute: async ({ query }) => {
        try {
            const cacheKey = `search_${query.toLowerCase()}`;

            const cached = getCached<any>(cacheKey);
            if (cached) {
                return { ...cached, source: "cache" };
            }

            const response = await fetch(
                `${COINGECKO_API_BASE}/search?query=${encodeURIComponent(query)}`
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();

            if (!data.coins || data.coins.length === 0) {
                return {
                    query,
                    results: [],
                    message: `No tokens found matching '${query}'`,
                };
            }

            const result = {
                query,
                resultCount: data.coins.length,
                results: data.coins.slice(0, 10).map((coin: any) => ({
                    id: coin.id,
                    name: coin.name,
                    symbol: coin.symbol.toUpperCase(),
                    marketCapRank: coin.market_cap_rank,
                    thumb: coin.thumb,
                })),
                source: "coingecko",
            };

            setCache(cacheKey, result);
            return result;
        } catch (error: any) {
            console.error("Error searching CoinGecko:", error);
            return {
                error: "Failed to search tokens",
                details: error.message,
            };
        }
    },
});

// Export all CoinGecko market data tools
export const coinGeckoMarketDataTools = {
    getCoinGeckoPrice,
    getCoinGeckoMarketData,
    getCoinGeckoHistoricalPrice,
    getCoinGeckoCroPrice,
    searchCoinGeckoToken,
};
