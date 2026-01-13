/**
 * Mantle Network AI Tools Index
 * 
 * Exports all Mantle-related AI tools:
 * - Blockchain Tools (wallet, blocks, transactions, tokens)
 * - Portfolio Analysis
 * - Contract Verification
 * - L2 Rollup Info
 */

// Mantle Blockchain Tools
export {
    getMantleBalance,
    getMantleBlockInfo,
    getMantleTransaction,
    getMantleTokenBalance,
    getMantleGasPrice,
    getMantleTransactionHistory,
    getMantleTokenTransfers,
    getMantleTokenList,
    getMantlePortfolio,
    getMantleContractABI,
    getMantleContractSource,
    getMantleRollupInfo,
    mantleBlockchainTools,
} from "./mantle-tools";

// Combined export of all Mantle tools for easy registration
export const allMantleTools = {
    // Blockchain Tools
    getMantleBalance: () => import("./mantle-tools").then(m => m.getMantleBalance),
    getMantleBlockInfo: () => import("./mantle-tools").then(m => m.getMantleBlockInfo),
    getMantleTransaction: () => import("./mantle-tools").then(m => m.getMantleTransaction),
    getMantleTokenBalance: () => import("./mantle-tools").then(m => m.getMantleTokenBalance),
    getMantleGasPrice: () => import("./mantle-tools").then(m => m.getMantleGasPrice),
    getMantleTransactionHistory: () => import("./mantle-tools").then(m => m.getMantleTransactionHistory),
    getMantleTokenTransfers: () => import("./mantle-tools").then(m => m.getMantleTokenTransfers),
    getMantleTokenList: () => import("./mantle-tools").then(m => m.getMantleTokenList),
    getMantlePortfolio: () => import("./mantle-tools").then(m => m.getMantlePortfolio),
    getMantleContractABI: () => import("./mantle-tools").then(m => m.getMantleContractABI),
    getMantleContractSource: () => import("./mantle-tools").then(m => m.getMantleContractSource),
    getMantleRollupInfo: () => import("./mantle-tools").then(m => m.getMantleRollupInfo),
};
