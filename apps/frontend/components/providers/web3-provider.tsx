'use client';

import { type State, WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config, supportedChains } from '@/lib/wagmi';
import { useMemo, useState, useEffect } from 'react';
import { DynamicWalletProvider } from './dynamic-wallet-provider';
import { cookieStorage, createStorage } from 'wagmi';

// Dynamically import DynamicWagmiConnector (client-only, bridges Dynamic ↔ wagmi)
import dynamic from 'next/dynamic';
const DynamicWagmiConnectorAsync = dynamic(
    () => import('@dynamic-labs/wagmi-connector').then((mod) => mod.DynamicWagmiConnector),
    { ssr: false }
);

interface Web3ProviderProps {
  children: React.ReactNode;
  initialState?: State;
}

// Build transports dynamically
const transports = Object.fromEntries(
  supportedChains.map((chain) => [chain.id, http()])
) as Record<number, ReturnType<typeof http>>;

// Client config WITHOUT connectors — Dynamic SDK manages connector injection
const clientConfig = createConfig({
  chains: supportedChains,
  transports,
  multiInjectedProviderDiscovery: false,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  const [mounted, setMounted] = useState(false);

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

  // Use server config during SSR, client config after mount
  const activeConfig = mounted ? clientConfig : config;

  return (
    <DynamicWalletProvider>
      <WagmiProvider config={activeConfig} initialState={initialState}>
        <QueryClientProvider client={queryClient}>
          {mounted ? (
            <DynamicWagmiConnectorAsync>
              {children}
            </DynamicWagmiConnectorAsync>
          ) : (
            children
          )}
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicWalletProvider>
  );
}