/**
 * GOAT Network AI Tools Index
 * 
 * Exports all GOAT Network-related AI tools:
 * - Blockchain Tools (wallet, blocks, transactions, tokens, portfolio)
 * - Oracle & Bridge Tools
 * - GNS (.goat Name Service) Tools
 * - ERC-8004 Agent Identity & Reputation Tools
 */

// GOAT Blockchain Tools
export {
    getGoatBalance,
    getGoatTransaction,
    getGoatBlockInfo,
    getGoatGasPrice,
    getGoatNetworkStats,
    getGoatTokenBalance,
    getGoatPortfolio,
    getGoatTransactionHistory,
    getGoatOraclePrice,
    getGoatBridgeStatus,
} from "./goat-tools";

// GNS (.goat Name Service) Tools
export {
    gnsToAddress,
    gnsCheckAvailability,
    gnsReverseLookupTool,
} from "./gns-tools";

// ERC-8004 Agent Identity & Reputation Tools
export {
    getGoatAgentCard,
    getGoatAgentReputation,
} from "./erc8004-tools";

// Combined export of all GOAT tools for easy registration
export const allGoatTools = {
    // Blockchain Tools
    getGoatBalance: () => import("./goat-tools").then(m => m.getGoatBalance),
    getGoatTransaction: () => import("./goat-tools").then(m => m.getGoatTransaction),
    getGoatBlockInfo: () => import("./goat-tools").then(m => m.getGoatBlockInfo),
    getGoatGasPrice: () => import("./goat-tools").then(m => m.getGoatGasPrice),
    getGoatNetworkStats: () => import("./goat-tools").then(m => m.getGoatNetworkStats),
    getGoatTokenBalance: () => import("./goat-tools").then(m => m.getGoatTokenBalance),
    getGoatPortfolio: () => import("./goat-tools").then(m => m.getGoatPortfolio),
    getGoatTransactionHistory: () => import("./goat-tools").then(m => m.getGoatTransactionHistory),
    getGoatOraclePrice: () => import("./goat-tools").then(m => m.getGoatOraclePrice),
    getGoatBridgeStatus: () => import("./goat-tools").then(m => m.getGoatBridgeStatus),
    // GNS Tools
    gnsToAddress: () => import("./gns-tools").then(m => m.gnsToAddress),
    gnsCheckAvailability: () => import("./gns-tools").then(m => m.gnsCheckAvailability),
    gnsReverseLookupTool: () => import("./gns-tools").then(m => m.gnsReverseLookupTool),
    // ERC-8004 Tools
    getGoatAgentCard: () => import("./erc8004-tools").then(m => m.getGoatAgentCard),
    getGoatAgentReputation: () => import("./erc8004-tools").then(m => m.getGoatAgentReputation),
};
