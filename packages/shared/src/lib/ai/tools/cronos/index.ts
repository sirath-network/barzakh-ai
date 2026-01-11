/**
 * Cronos AI Tools Index
 * 
 * Exports all Cronos-related AI tools for the hackathon:
 * - Market Data MCP (real-time prices)
 * - CoinGecko Market Data (aggregated, accurate prices)
 * - Cronos Blockchain Tools (wallet, blocks, transactions)
 * - Relay Protocol (cross-chain swaps)
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
    getCronosTokenList,
    getCronosPortfolio,
    cronosBlockchainTools,
} from "./cronos-tools";

// VVS Finance DEX removed - using Relay Protocol for all swaps

// x402 Payment Tools (AI-initiated subscription payments)
export {
    initiateX402Payment,
    getSubscriptionInfo,
    getCurrentSubscriptionStatus,
    x402TransferTools,
} from "./x402-transfer";

// Crypto.com AI Agent SDK (Natural Language Blockchain Queries)
export {
    queryCryptoComAI,
    getCryptoComChainStats,
    analyzeWalletWithAI,
    cryptoComAIAgentTools,
} from "./ai-agent-sdk";

// Cronos zkEVM Direct Tools (bypasses AI Agent SDK for reliability)
export {
    getZkEVMBalance,
    getZkEVMTransactionHistory,
    getZkEVMTransaction,
    getZkEVMTokenBalance,
    getZkEVMGasPrice,
    getZkEVMTokenTransfers,
    getZkEVMInternalTxList,
    getZkEVMContractABI,
    getZkEVMContractSource,
    getZkEVMTokenSupply,
    getZkEVMBlockInfo,
    getZkEVMTokenList,
    getZkEVMPortfolio,
    cronosZkEVMTools,
} from "./cronos-zkevm-tools";

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

    // Blockchain (Cronos EVM)
    getCronosBalance: () => import("./cronos-tools").then(m => m.getCronosBalance),
    getCronosBlockInfo: () => import("./cronos-tools").then(m => m.getCronosBlockInfo),
    getCronosTransaction: () => import("./cronos-tools").then(m => m.getCronosTransaction),
    getCronosTokenBalance: () => import("./cronos-tools").then(m => m.getCronosTokenBalance),
    getCronosGasPrice: () => import("./cronos-tools").then(m => m.getCronosGasPrice),
    getCronosTransactionHistory: () => import("./cronos-tools").then(m => m.getCronosTransactionHistory),
    getCronosTokenList: () => import("./cronos-tools").then(m => m.getCronosTokenList),
    getCronosPortfolio: () => import("./cronos-tools").then(m => m.getCronosPortfolio),

    // Cronos zkEVM (Direct API)
    getZkEVMBalance: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMBalance),
    getZkEVMTransactionHistory: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMTransactionHistory),
    getZkEVMTransaction: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMTransaction),
    getZkEVMTokenBalance: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMTokenBalance),
    getZkEVMGasPrice: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMGasPrice),
    getZkEVMTokenTransfers: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMTokenTransfers),
    getZkEVMInternalTxList: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMInternalTxList),
    getZkEVMContractABI: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMContractABI),
    getZkEVMContractSource: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMContractSource),
    getZkEVMTokenSupply: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMTokenSupply),
    getZkEVMBlockInfo: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMBlockInfo),
    getZkEVMTokenList: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMTokenList),
    getZkEVMPortfolio: () => import("./cronos-zkevm-tools").then(m => m.getZkEVMPortfolio),


    // x402 Payment Tools
    initiateX402Payment: () => import("./x402-transfer").then(m => m.initiateX402Payment),
    getSubscriptionInfo: () => import("./x402-transfer").then(m => m.getSubscriptionInfo),

    // Crypto.com AI Agent SDK
    queryCryptoComAI: () => import("./ai-agent-sdk").then(m => m.queryCryptoComAI),
    getCryptoComChainStats: () => import("./ai-agent-sdk").then(m => m.getCryptoComChainStats),
    analyzeWalletWithAI: () => import("./ai-agent-sdk").then(m => m.analyzeWalletWithAI),
};

