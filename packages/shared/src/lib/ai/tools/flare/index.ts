/**
 * Flare Network AI Tools Index
 * 
 * Exports all Flare-related AI tools:
 * - Blockchain Tools (wallet, blocks, transactions, tokens)
 * - FTSO v2 Oracle Price Feeds
 * - FAssets / FXRP Integration
 * - FDC (Flare Data Connector) Attestation
 * - Confidential Compute (TEE)
 */

// Flare Blockchain & Oracle Tools
export {
    getFlareBalance,
    getFlareBlockInfo,
    getFlareTransaction,
    getFlareTokenBalance,
    getFlareGasPrice,
    getFlareNetworkStats,
    getFlareFtsoPrice,
    getFlareFtsoMultiPrices,
    getFlareFxrpInfo,
    getFlareFdcInfo,
    getFlarePortfolio,
} from "./flare-tools";

// Confidential Compute Tools
export {
    getFlareConfidentialStrategyInfo,
    submitConfidentialStrategy,
    getConfidentialPortfolioScore,
} from "./flare-confidential";

// Combined export of all Flare tools for easy registration
export const allFlareTools = {
    getFlareBalance: () => import("./flare-tools").then(m => m.getFlareBalance),
    getFlareBlockInfo: () => import("./flare-tools").then(m => m.getFlareBlockInfo),
    getFlareTransaction: () => import("./flare-tools").then(m => m.getFlareTransaction),
    getFlareTokenBalance: () => import("./flare-tools").then(m => m.getFlareTokenBalance),
    getFlareGasPrice: () => import("./flare-tools").then(m => m.getFlareGasPrice),
    getFlareNetworkStats: () => import("./flare-tools").then(m => m.getFlareNetworkStats),
    getFlareFtsoPrice: () => import("./flare-tools").then(m => m.getFlareFtsoPrice),
    getFlareFtsoMultiPrices: () => import("./flare-tools").then(m => m.getFlareFtsoMultiPrices),
    getFlareFxrpInfo: () => import("./flare-tools").then(m => m.getFlareFxrpInfo),
    getFlareFdcInfo: () => import("./flare-tools").then(m => m.getFlareFdcInfo),
    getFlarePortfolio: () => import("./flare-tools").then(m => m.getFlarePortfolio),
    
    // Confidential Compute Tools
    getFlareConfidentialStrategyInfo: () => import("./flare-confidential").then(m => m.getFlareConfidentialStrategyInfo),
    submitConfidentialStrategy: () => import("./flare-confidential").then(m => m.submitConfidentialStrategy),
    getConfidentialPortfolioScore: () => import("./flare-confidential").then(m => m.getConfidentialPortfolioScore),
};
