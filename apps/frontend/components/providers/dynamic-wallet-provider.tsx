'use client';

import dynamic from 'next/dynamic';
import { type ReactNode, useState, useEffect } from "react";

// Dynamically import DynamicContextProvider with SSR disabled
const DynamicContextProviderAsync = dynamic(
    () => import('@dynamic-labs/sdk-react-core').then((mod) => mod.DynamicContextProvider),
    { ssr: false }
);

// Import wallet connectors - these are safe to import statically
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { BitcoinWalletConnectors } from "@dynamic-labs/bitcoin";
import { TronWalletConnectors } from "@dynamic-labs/tron";

interface DynamicWalletProviderProps {
    children: ReactNode;
}

/**
 * DynamicWalletProvider
 * 
 * This provider enables wallet connections for non-EVM chains:
 * - Solana (Phantom, Solflare, etc.)
 * - Bitcoin (Xverse, Unisat, etc.)
 * - Tron (TronLink, etc.)
 * 
 * Note: EVM chains continue to use RainbowKit/Wagmi.
 * This provider is specifically for cross-chain swaps where
 * the source or destination is a non-EVM chain.
 */
export function DynamicWalletProvider({ children }: DynamicWalletProviderProps) {
    const [mounted, setMounted] = useState(false);
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
            settings={{
                environmentId,
                apiBaseUrl,
                walletConnectors: [
                    SolanaWalletConnectors,
                    BitcoinWalletConnectors,
                    TronWalletConnectors,
                ],
                // Connect-only mode - we don't need full authentication
                initialAuthenticationMode: "connect-only",
            }}
        >
            {children}
        </DynamicContextProviderAsync>
    );
}
