/**
 * Cronos Market Data MCP Integration
 * 
 * Provides real-time cryptocurrency market data from Crypto.com Market Data MCP Server.
 * Free to use, no API key required.
 * 
 * @see https://mcp.crypto.com/docs
 */

import { tool } from "ai";
import { z } from "zod";

// Base URL for Crypto.com Market Data API (public, no auth required)
const CRYPTO_COM_API_BASE = "https://api.crypto.com/v2";

/**
 * Common token symbol to CoinGecko ID mapping (for fallback)
 */
const COINGECKO_ID_MAP: Record<string, string> = {
    "CRO": "crypto-com-chain",
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "USDT": "tether",
    "USDC": "usd-coin",
    "VVS": "vvs-finance",
    "BNB": "binancecoin",
    "SOL": "solana",
    "DOGE": "dogecoin",
    "MATIC": "matic-network",
};

/**
 * Get real-time cryptocurrency price data
 */
export const getCryptoPrice = tool({
    description: "Get real-time cryptocurrency prices from Crypto.com. Supports all major cryptocurrencies including CRO, BTC, ETH, USDC, etc.",
    parameters: z.object({
        symbol: z.string().describe("Trading pair symbol, e.g., 'CRO_USDT', 'BTC_USDT', 'ETH_USDT'. Use _USDT suffix for USD prices."),
    }),
    execute: async ({ symbol }) => {
        // Extract base token from pair (e.g., "CRO_USDT" -> "CRO")
        const baseToken = symbol.toUpperCase().replace("/", "_").split("_")[0];

        try {
            // Normalize symbol format
            const normalizedSymbol = symbol.toUpperCase().replace("/", "_");

            // Use AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const response = await fetch(
                `${CRYPTO_COM_API_BASE}/public/get-ticker?instrument_name=${normalizedSymbol}`,
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Failed to fetch price: ${response.status}`);
            }

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(data.message || "API error");
            }

            const ticker = data.result.data;

            // Safe timestamp handling
            let timestamp: string;
            try {
                timestamp = ticker.t ? new Date(ticker.t).toISOString() : new Date().toISOString();
            } catch (e) {
                timestamp = new Date().toISOString();
            }

            return {
                symbol: ticker.i,
                price: ticker.a, // Best ask price
                bid: ticker.b,   // Best bid price
                high24h: ticker.h,
                low24h: ticker.l,
                volume24h: ticker.v,
                priceChange24h: ticker.c,
                timestamp,
                source: "crypto.com",
            };
        } catch (error: any) {
            console.error("Error fetching crypto price from Crypto.com, trying CoinGecko fallback:", error.message);

            // Fallback to CoinGecko
            try {
                const coinGeckoId = COINGECKO_ID_MAP[baseToken] || baseToken.toLowerCase();
                const fallbackResponse = await fetch(
                    `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
                );

                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData[coinGeckoId]) {
                        const tokenData = fallbackData[coinGeckoId];
                        return {
                            symbol: `${baseToken}_USDT`,
                            price: tokenData.usd,
                            priceChange24h: tokenData.usd_24h_change,
                            volume24h: tokenData.usd_24h_vol,
                            timestamp: new Date().toISOString(),
                            source: "coingecko (fallback)",
                        };
                    }
                }
            } catch (fallbackError) {
                console.error("CoinGecko fallback also failed:", fallbackError);
            }

            return {
                error: "Failed to fetch cryptocurrency price",
                details: error.message,
                suggestion: "Try using getCoinGeckoPrice tool for more reliable pricing",
            };
        }
    },
});

/**
 * Get market data for multiple cryptocurrencies
 */
export const getMarketOverview = tool({
    description: "Get market overview with prices for multiple cryptocurrencies at once. Returns top cryptocurrencies by volume.",
    parameters: z.object({
        limit: z.number().optional().describe("Number of results to return (default: 10, max: 50)"),
    }),
    execute: async ({ limit = 10 }) => {
        try {
            const response = await fetch(`${CRYPTO_COM_API_BASE}/public/get-tickers`);

            if (!response.ok) {
                throw new Error(`Failed to fetch market data: ${response.status}`);
            }

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(data.message || "API error");
            }

            // Filter for USDT pairs and sort by volume
            const usdtPairs = data.result.data
                .filter((t: any) => t.i.endsWith("_USDT"))
                .sort((a: any, b: any) => parseFloat(b.v) - parseFloat(a.v))
                .slice(0, Math.min(limit, 50));

            return {
                count: usdtPairs.length,
                markets: usdtPairs.map((t: any) => ({
                    symbol: t.i.replace("_USDT", ""),
                    price: t.a,
                    change24h: t.c,
                    volume24h: t.v,
                    high24h: t.h,
                    low24h: t.l,
                })),
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error fetching market overview:", error);
            return {
                error: "Failed to fetch market overview",
                details: error.message,
            };
        }
    },
});

/**
 * Get CRO (Cronos) specific market data
 */
export const getCronosMarketData = tool({
    description: "Get Cronos (CRO) specific market data including price, volume, and market statistics from Crypto.com.",
    parameters: z.object({}),
    execute: async () => {
        try {
            // Fetch CRO/USDT pair
            const response = await fetch(
                `${CRYPTO_COM_API_BASE}/public/get-ticker?instrument_name=CRO_USDT`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch CRO data: ${response.status}`);
            }

            const data = await response.json();

            if (data.code !== 0) {
                throw new Error(data.message || "API error");
            }

            const ticker = data.result.data;

            // Also fetch candlestick data for trend analysis
            const candleResponse = await fetch(
                `${CRYPTO_COM_API_BASE}/public/get-candlestick?instrument_name=CRO_USDT&timeframe=1D`
            );

            let trend = null;
            if (candleResponse.ok) {
                const candleData = await candleResponse.json();
                if (candleData.code === 0 && candleData.result.data.length > 0) {
                    const candles = candleData.result.data.slice(-7); // Last 7 days
                    const firstClose = parseFloat(candles[0].c);
                    const lastClose = parseFloat(candles[candles.length - 1].c);
                    trend = {
                        weeklyChange: (((lastClose - firstClose) / firstClose) * 100).toFixed(2) + "%",
                        direction: lastClose > firstClose ? "up" : "down",
                    };
                }
            }

            // Safe timestamp handling
            let timestamp: string;
            try {
                timestamp = ticker.t ? new Date(ticker.t).toISOString() : new Date().toISOString();
            } catch (e) {
                timestamp = new Date().toISOString();
            }

            return {
                symbol: "CRO",
                name: "Cronos",
                price: ticker.a,
                priceUSD: `$${parseFloat(ticker.a).toFixed(4)}`,
                bid: ticker.b,
                ask: ticker.a,
                high24h: ticker.h,
                low24h: ticker.l,
                volume24h: ticker.v,
                priceChange24h: ticker.c,
                priceChangePercent24h: `${((parseFloat(ticker.c) / parseFloat(ticker.a)) * 100).toFixed(2)}%`,
                trend,
                timestamp,
                chain: {
                    name: "Cronos EVM",
                    chainId: 25,
                    testnetChainId: 338,
                    nativeToken: "CRO",
                },
            };
        } catch (error: any) {
            console.error("Error fetching Cronos market data:", error);
            return {
                error: "Failed to fetch Cronos (CRO) market data",
                details: error.message,
            };
        }
    },
});

/**
 * Convert between cryptocurrencies
 */
export const convertCrypto = tool({
    description: "Convert between cryptocurrency amounts using live exchange rates from Crypto.com.",
    parameters: z.object({
        fromSymbol: z.string().describe("Source cryptocurrency symbol (e.g., 'CRO', 'ETH', 'BTC')"),
        toSymbol: z.string().describe("Target cryptocurrency symbol (e.g., 'USDT', 'USDC', 'BTC')"),
        amount: z.number().describe("Amount to convert"),
    }),
    execute: async ({ fromSymbol, toSymbol, amount }) => {
        try {
            const from = fromSymbol.toUpperCase();
            const to = toSymbol.toUpperCase();

            // Get both prices in USDT for conversion
            let fromPrice = 1;
            let toPrice = 1;

            if (from !== "USDT") {
                const fromResponse = await fetch(
                    `${CRYPTO_COM_API_BASE}/public/get-ticker?instrument_name=${from}_USDT`
                );
                if (fromResponse.ok) {
                    const fromData = await fromResponse.json();
                    if (fromData.code === 0) {
                        fromPrice = parseFloat(fromData.result.data.a);
                    }
                }
            }

            if (to !== "USDT") {
                const toResponse = await fetch(
                    `${CRYPTO_COM_API_BASE}/public/get-ticker?instrument_name=${to}_USDT`
                );
                if (toResponse.ok) {
                    const toData = await toResponse.json();
                    if (toData.code === 0) {
                        toPrice = parseFloat(toData.result.data.a);
                    }
                }
            }

            const usdtValue = amount * fromPrice;
            const convertedAmount = usdtValue / toPrice;

            return {
                from: {
                    symbol: from,
                    amount: amount,
                    priceUSD: fromPrice,
                },
                to: {
                    symbol: to,
                    amount: convertedAmount,
                    priceUSD: toPrice,
                },
                rate: fromPrice / toPrice,
                usdValue: usdtValue,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error("Error converting crypto:", error);
            return {
                error: "Failed to convert cryptocurrency",
                details: error.message,
            };
        }
    },
});

// Export all market data tools
export const cronosMarketDataTools = {
    getCryptoPrice,
    getMarketOverview,
    getCronosMarketData,
    convertCrypto,
};
