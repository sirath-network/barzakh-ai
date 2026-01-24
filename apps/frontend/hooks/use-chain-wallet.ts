"use client";

import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useMemo } from "react";

// Chain IDs
export const SOLANA_CHAIN_ID = 792703809;
export const BITCOIN_CHAIN_ID = 8253038;
export const TRON_CHAIN_ID = 728126428;

export const NON_EVM_CHAINS = [
    SOLANA_CHAIN_ID,
    BITCOIN_CHAIN_ID,
    TRON_CHAIN_ID
];

export function isNonEvmChain(chainId: number): boolean {
    return NON_EVM_CHAINS.includes(chainId);
}

export function getNonEvmChainName(chainId: number): string | undefined {
    switch (chainId) {
        case SOLANA_CHAIN_ID: return "Solana";
        case BITCOIN_CHAIN_ID: return "Bitcoin";
        case TRON_CHAIN_ID: return "Tron";
        default: return undefined;
    }
}

export function useChainWallet(chainId?: number) {
    // Note: This hook assumes DynamicWalletProvider is mounted up the tree.
    // If the provider is missing (e.g. missing Env ID), this might throw.
    const context = useDynamicContext();
    const primaryWallet = context?.primaryWallet;

    return useMemo(() => {
        if (!chainId || !primaryWallet) return null;

        // If it's an EVM chain, we ignore Dynamic wallet (RainbowKit handles it)
        if (!isNonEvmChain(chainId)) return null;

        // Check if the connected primary wallet matches the requested chain
        if (chainId === SOLANA_CHAIN_ID && primaryWallet.chain === 'SOL') return primaryWallet;
        if (chainId === BITCOIN_CHAIN_ID && primaryWallet.chain === 'BTC') return primaryWallet;
        if (chainId === TRON_CHAIN_ID && primaryWallet.chain === 'TRON') return primaryWallet;

        return null;
    }, [primaryWallet, chainId]);
}
