'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useState, useEffect } from "react";
import { useTheme } from "next-themes";

// Dynamically import DynamicContextProvider with SSR disabled
const DynamicContextProviderAsync = dynamic(
    () => import('@dynamic-labs/sdk-react-core').then((mod) => mod.DynamicContextProvider),
    { ssr: false }
);

// Import wallet connectors - all chains unified under Dynamic
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { BitcoinWalletConnectors } from "@dynamic-labs/bitcoin";
import { TronWalletConnectors } from "@dynamic-labs/tron";

// Import FilterChain for chain-specific wallet tab filtering
import { FilterChain } from "@dynamic-labs/sdk-react-core";

interface DynamicWalletProviderProps {
    children: ReactNode;
}

// Suppress noisy DynamicWagmiConnector warnings during module load
if (typeof window !== 'undefined') {
    const originalWarn = console.warn;
    console.warn = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('[DynamicWagmiConnector] [WARN]: Chain')) {
            return;
        }
        originalWarn(...args);
    };
}

/**
 * Wallet list tab indices — used by relay-swap-approval.tsx to
 * programmatically switch to the correct chain tab before opening
 * the Dynamic auth modal via `setSelectedTabIndex`.
 *
 * IMPORTANT: Keep these in sync with the `tabs.items` order below!
 */
export const WALLET_TAB_INDEX = {
    ALL: 0,
    EVM: 1,
    SOLANA: 2,
    BITCOIN: 3,
} as const;

/**
 * DynamicWalletProvider
 * 
 * Unified wallet provider for ALL chains via Dynamic SDK:
 * - EVM (MetaMask, Rabby, Phantom, WalletConnect, etc.)
 * - Solana (Phantom, Solflare, etc.)
 * - Bitcoin (Xverse, Unisat, etc.)
 * - Tron (TronLink, etc.)
 * 
 * Also enables embedded wallets (MPC-based) for users without external wallets.
 * This replaces the previous split between RainbowKit (EVM) and Dynamic (non-EVM).
 */
export function DynamicWalletProvider({ children }: DynamicWalletProviderProps) {
    const [mounted, setMounted] = useState(false);
    const { resolvedTheme } = useTheme();
    const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
    const apiBaseUrl = process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL;

    useEffect(() => {
        setMounted(true);
    }, []);

    // If no environment ID is configured, just render children without Dynamic
    if (!environmentId) {
        console.warn('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is not set. Dynamic wallet connections disabled.');
        return <>{children}</>;
    }

    // During SSR, render children without Dynamic provider
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <DynamicContextProviderAsync
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            settings={{
                environmentId,
                apiBaseUrl,
                walletConnectors: [
                    EthereumWalletConnectors,
                    SolanaWalletConnectors,
                    BitcoinWalletConnectors,
                    TronWalletConnectors,
                ],
                // Connect-only mode - we use next-auth for authentication
                initialAuthenticationMode: "connect-only",
                // Embedded wallet creation is configured in the Dynamic Dashboard
                // (Settings → Embedded Wallets → Create on Login: Always)
                //
                // Wallet list tab views — allows relay-swap-approval to filter
                // wallets by source chain before opening the auth modal.
                // Tab index constants exported as WALLET_TAB_INDEX.
                overrides: {
                    views: [{
                        type: "wallet-list" as const,
                        tabs: {
                            items: [
                                { label: { text: "All" } },                                    // index 0
                                { label: { text: "EVM" }, walletsFilter: FilterChain("EVM") }, // index 1
                                { label: { text: "Solana" }, walletsFilter: FilterChain("SOL") }, // index 2
                                { label: { text: "Bitcoin" }, walletsFilter: FilterChain("BTC") }, // index 3
                            ],
                        },
                    }],
                },
            }}
        >
            {children as any}
        </DynamicContextProviderAsync>
    );
}
