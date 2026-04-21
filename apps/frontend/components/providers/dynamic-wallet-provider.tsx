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
            }}
        >
            {children}
        </DynamicContextProviderAsync>
    );
}
