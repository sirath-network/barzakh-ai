'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit';
import { type ReactNode, useMemo } from 'react';

interface OneChainWalletProviderProps {
  children: ReactNode;
}

/**
 * OneChainWalletProvider
 * 
 * Wraps the OneChain dApp kit providers for Sui wallet connectivity.
 * Provides wallet connection, account detection, and transaction signing
 * capabilities for Sui-based operations.
 * 
 * Note: Uses a separate QueryClient instance to avoid conflicts with
 * the main application's React Query setup.
 */
export function OneChainWalletProvider({ children }: OneChainWalletProviderProps) {
  // Create a dedicated QueryClient for OneChain to avoid conflicts
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      }),
    []
  );

  // Initialize Sui client - detects chain based on environment
  // Defaults to testnet, respects NEXT_PUBLIC_SUI_NETWORK env var if set
  const suiNetwork = (process.env.NEXT_PUBLIC_SUI_NETWORK || 'testnet') as 'testnet' | 'mainnet' | 'devnet';
  const networks = useMemo(
    () => ({
      testnet: { url: 'https://fullnode.testnet.sui.io:443' },
      mainnet: { url: 'https://fullnode.mainnet.sui.io:443' },
      devnet: { url: 'https://fullnode.devnet.sui.io:443' },
    }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork={suiNetwork}>
        <WalletProvider>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
