/**
 * Cronos AI Tools Index
 * 
 * Exports all Cronos-related AI tools for the hackathon:
 * - Market Data MCP (real-time prices)
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
    // Market Data
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
