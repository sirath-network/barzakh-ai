/**
 * Relay Protocol AI Tools Index
 *
 * Exports all Relay Protocol tools for cross-chain swaps and bridging.
 */

// Individual tool exports
export {
    getRelaySupportedChains,
    getRelayQuote,
    getRelayBridgeQuote,
    prepareRelayTransaction,
    relayTools,
} from "./relay-crosschain";

// Combined export for easy registration
export const allRelayTools = {
    getRelaySupportedChains: () =>
        import("./relay-crosschain").then((m) => m.getRelaySupportedChains),
    getRelayQuote: () =>
        import("./relay-crosschain").then((m) => m.getRelayQuote),
    getRelayBridgeQuote: () =>
        import("./relay-crosschain").then((m) => m.getRelayBridgeQuote),
    prepareRelayTransaction: () =>
        import("./relay-crosschain").then((m) => m.prepareRelayTransaction),
};
