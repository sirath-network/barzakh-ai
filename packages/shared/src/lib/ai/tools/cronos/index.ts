/**
 * Cronos AI Tools Index
 * 
 * Exports all Cronos-related AI tools for the hackathon:
 * - Market Data MCP (real-time prices)
 * - CoinGecko Market Data (aggregated, accurate prices)
 * - Cronos Blockchain Tools (wallet, blocks, transactions)
 * - VVS Finance DEX (swaps, liquidity)
 */

// Market Data from Crypto.com MCP
export {
    getCryptoPrice,
    getMarketOverview,
    getCronosMarketData,
    convertCrypto,
    cronosMarketDataTools,
} from "./market-data-mcp";

// CoinGecko Market Data (more accurate, aggregated from 900+ exchanges)
export {
    getCoinGeckoPrice,
    getCoinGeckoMarketData,
    getCoinGeckoHistoricalPrice,
    getCoinGeckoCroPrice,
    searchCoinGeckoToken,
    coinGeckoMarketDataTools,
} from "./coingecko-market-data";

// Cronos Blockchain Tools
export {
    getCronosBalance,
    getCronosBlockInfo,
    getCronosTransaction,
    getCronosTokenBalance,
    getCronosGasPrice,
    getCronosTransactionHistory,
    cronosBlockchainTools,
} from "./cronos-tools";

// VVS Finance DEX Tools
export {
    getVVSSwapQuote,
    getVVSTokenList,
    getVVSPoolInfo,
    vvsSwapTools,
} from "./vvs-swap";

// Combined export of all Cronos tools for easy registration
export const allCronosTools = {
    // CoinGecko Market Data (aggregated, more accurate)
    getCoinGeckoPrice: () => import("./coingecko-market-data").then(m => m.getCoinGeckoPrice),
    getCoinGeckoMarketData: () => import("./coingecko-market-data").then(m => m.getCoinGeckoMarketData),
    getCoinGeckoHistoricalPrice: () => import("./coingecko-market-data").then(m => m.getCoinGeckoHistoricalPrice),
    getCoinGeckoCroPrice: () => import("./coingecko-market-data").then(m => m.getCoinGeckoCroPrice),
    searchCoinGeckoToken: () => import("./coingecko-market-data").then(m => m.searchCoinGeckoToken),

    // Crypto.com Market Data
    getCryptoPrice: () => import("./market-data-mcp").then(m => m.getCryptoPrice),
    getMarketOverview: () => import("./market-data-mcp").then(m => m.getMarketOverview),
    getCronosMarketData: () => import("./market-data-mcp").then(m => m.getCronosMarketData),
    convertCrypto: () => import("./market-data-mcp").then(m => m.convertCrypto),

    // Blockchain
    getCronosBalance: () => import("./cronos-tools").then(m => m.getCronosBalance),
    getCronosBlockInfo: () => import("./cronos-tools").then(m => m.getCronosBlockInfo),
    getCronosTransaction: () => import("./cronos-tools").then(m => m.getCronosTransaction),
    getCronosTokenBalance: () => import("./cronos-tools").then(m => m.getCronosTokenBalance),
    getCronosGasPrice: () => import("./cronos-tools").then(m => m.getCronosGasPrice),
    getCronosTransactionHistory: () => import("./cronos-tools").then(m => m.getCronosTransactionHistory),

    // DEX
    getVVSSwapQuote: () => import("./vvs-swap").then(m => m.getVVSSwapQuote),
    getVVSTokenList: () => import("./vvs-swap").then(m => m.getVVSTokenList),
    getVVSPoolInfo: () => import("./vvs-swap").then(m => m.getVVSPoolInfo),
};

