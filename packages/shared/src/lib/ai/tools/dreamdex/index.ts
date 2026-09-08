// DreamDEX Event Contracts AI Tools for Somnia Network
// Barrel export for the DreamDEX/Somnia prediction market tool module

// === Market Discovery ===
export {
    getDreamDexMarkets,
    getDreamDexMarketDetails,
    getDreamDexMarketHistory,
} from "./dreamdex-markets";

// === Trading Engine ===
export {
    dreamDexMintTokens,
    dreamDexPlaceOrder,
    dreamDexCancelOrder,
    dreamDexCancelAllOrders,
    dreamDexRedeemWinnings,
} from "./dreamdex-trading";

// === Portfolio Tracker ===
export {
    getDreamDexPortfolio,
} from "./dreamdex-portfolio";

// === AI Prediction Oracle ===
export {
    getAIPredictionAnalysis,
} from "./dreamdex-oracle";

// === Somnia Chain & Wallet ===
export {
    getSomniaBalance,
    getSomniaNetworkStats,
} from "./somnia-chain";

// === SDK & API Clients ===
export {
    SOMNIA_TESTNET_CHAIN,
    SOMNIA_MAINNET_CHAIN,
    SOMNIA_TESTNET_EXPLORER,
    SOMNIA_MAINNET_EXPLORER,
    TUSDC_DECIMALS,
    formatPrice,
    toMillionths,
    formatUSDC,
    createSomniaClient,
} from "./sdk-client";

export {
    DreamDexApiClient,
    dreamDexApi,
    dreamDexApiMainnet,
} from "./api-client";

// Lazy dynamic bundle export (for dynamic imports if needed)
export const allDreamDexTools = {
    getDreamDexMarkets: () => import("./dreamdex-markets").then(m => m.getDreamDexMarkets),
    getDreamDexMarketDetails: () => import("./dreamdex-markets").then(m => m.getDreamDexMarketDetails),
    getDreamDexMarketHistory: () => import("./dreamdex-markets").then(m => m.getDreamDexMarketHistory),
    dreamDexMintTokens: () => import("./dreamdex-trading").then(m => m.dreamDexMintTokens),
    dreamDexPlaceOrder: () => import("./dreamdex-trading").then(m => m.dreamDexPlaceOrder),
    dreamDexCancelOrder: () => import("./dreamdex-trading").then(m => m.dreamDexCancelOrder),
    dreamDexCancelAllOrders: () => import("./dreamdex-trading").then(m => m.dreamDexCancelAllOrders),
    dreamDexRedeemWinnings: () => import("./dreamdex-trading").then(m => m.dreamDexRedeemWinnings),
    getDreamDexPortfolio: () => import("./dreamdex-portfolio").then(m => m.getDreamDexPortfolio),
    getAIPredictionAnalysis: () => import("./dreamdex-oracle").then(m => m.getAIPredictionAnalysis),
};
