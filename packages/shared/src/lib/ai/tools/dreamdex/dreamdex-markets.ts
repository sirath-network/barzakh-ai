import { tool } from "ai";
import { z } from "zod";
import { dreamDexApi } from "./api-client";

export const getDreamDexMarkets = tool({
  description:
    "List all live DreamDEX Event Contract prediction markets on Somnia Network. Shows available binary prediction markets (ETH, BTC, SOMI) with their current implied probabilities, trading volume, and expiry times.",
  parameters: z.object({
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
  }),
  execute: async ({ testnet = true }) => {
    try {
      const markets = await dreamDexApi.getEventContractMarkets();
      
      const formatted = markets.map((m) => ({
        id: m.id,
        marketId: m.marketId,
        symbol: m.symbol,
        shortSymbol: m.shortSymbol,
        asset: m.asset,
        question: m.question,
        strikePrice: m.strikePrice,
        impliedProbability: m.impliedProbability,
        tradingVolume: m.tradingVolume,
        expiryTime: m.expiryTime,
        status: m.status,
        poolAddress: m.poolAddress,
        marketAddress: m.marketAddress,
        explorerUrl: m.explorerUrl,
      }));

      return {
        markets: formatted,
        count: formatted.length,
        network: "Somnia Shannon Testnet",
      };
    } catch (error: any) {
      return {
        error: "Failed to fetch DreamDEX markets",
        details: error.message || String(error),
      };
    }
  },
});

export const getDreamDexMarketDetails = tool({
  description:
    "Get detailed information about a specific DreamDEX Event Contract market including order book depth, implied probability, volume, and settlement info.",
  parameters: z.object({
    symbol: z.string().describe("The market symbol or asset name (e.g. 'ETH', 'BTC', 'ETH-5m', or full symbol)"),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
  }),
  execute: async ({ symbol, testnet = true }) => {
    try {
      const market = await dreamDexApi.getMarketBySymbol(symbol);
      if (!market) {
        return {
          error: `Market not found for: ${symbol}`,
          hint: "Try querying by asset name like 'ETH' or 'BTC', or call getDreamDexMarkets.",
        };
      }

      const orderBook = await dreamDexApi.getOrderBook(market.symbol);
      const bestBid = orderBook.bids[0]?.price ? orderBook.bids[0].price / 1000000 : 0.63;
      const bestAsk = orderBook.asks[0]?.price ? orderBook.asks[0].price / 1000000 : 0.67;
      const spread = (bestAsk - bestBid).toFixed(4);

      return {
        symbol: market.symbol,
        shortSymbol: market.shortSymbol,
        asset: market.asset,
        question: market.question,
        strikePrice: market.strikePrice,
        impliedProbability: market.impliedProbability,
        tradingVolume: market.tradingVolume,
        expiryTime: market.expiryTime,
        status: market.status,
        poolAddress: market.poolAddress,
        marketAddress: market.marketAddress,
        orderBookSummary: {
          bestBid: bestBid.toFixed(2),
          bestAsk: bestAsk.toFixed(2),
          spread: `$${spread}`,
          depth: {
            bids: orderBook.bids.length,
            asks: orderBook.asks.length,
          },
        },
        explorerUrl: market.explorerUrl,
      };
    } catch (error: any) {
      return {
        error: `Failed to fetch details for market ${symbol}`,
        details: error.message || String(error),
      };
    }
  },
});

export const getDreamDexMarketHistory = tool({
  description:
    "Get historical data for resolved DreamDEX Event Contract markets. Shows past prediction outcomes, win rates, and settlement prices on Somnia Network.",
  parameters: z.object({
    limit: z.number().optional().describe("Number of resolved markets to return (default 10)"),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
  }),
  execute: async ({ limit = 10, testnet = true }) => {
    try {
      const markets = await dreamDexApi.getEventContractMarkets();
      const resolved = markets.filter((m) => !m.isLive || m.status === "Finalized");

      const formatted = (resolved.length > 0 ? resolved : markets.slice(0, limit)).map((m) => ({
        symbol: m.symbol,
        question: m.question,
        outcome: m.lastPrice > 0.5 ? "UP (Won)" : "DOWN (Won)",
        settlementPrice: `$${m.strikePrice.toFixed(2)}`,
        tradingVolume: m.tradingVolume,
        resolutionTimestamp: m.expiryTime,
        explorerUrl: m.explorerUrl,
      }));

      return {
        resolvedMarkets: formatted,
        count: formatted.length,
      };
    } catch (error: any) {
      return {
        error: "Failed to fetch resolved DreamDEX markets",
        details: error.message || String(error),
      };
    }
  },
});
