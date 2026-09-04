'use client';

import { type State, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { SolanaWalletConnectors } from '@dynamic-labs/solana';
import { TronWalletConnectors } from '@dynamic-labs/tron';

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

interface Web3ProviderProps {
  children: React.ReactNode;
  initialState?: State;
}

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const environmentId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
  const apiBaseUrl = process.env.NEXT_PUBLIC_DYNAMIC_API_BASE_URL;

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
      })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR / pre-mount / missing environmentId fallback
  if (!mounted || !environmentId) {
    if (!environmentId && mounted) {
      console.warn('NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is not set. Dynamic wallet connections disabled.');
    }
    return (
      <WagmiProvider config={config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    );
  }

  // Client-side: full provider stack
  // DynamicContextProvider > WagmiProvider > QueryClientProvider > DynamicWagmiConnector
  return (
    <DynamicContextProvider
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      settings={{
        environmentId,
        apiBaseUrl,
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
          TronWalletConnectors,
        ],
        initialAuthenticationMode: 'connect-only',
      }}
    >
      <WagmiProvider config={config} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            {children}
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}