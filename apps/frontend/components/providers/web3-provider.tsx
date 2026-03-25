'use client';

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { type State, WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { connectors, supportedChains } from '@/lib/wagmi-client';
import { useTheme } from 'next-themes';
import { useMemo, useState, useEffect, useRef } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { DynamicWalletProvider } from './dynamic-wallet-provider';
import { OneChainWalletProvider } from './onechain-wallet-provider';
import { cookieStorage, createStorage } from 'wagmi';

interface Web3ProviderProps {
  children: React.ReactNode;
  initialState?: State;
}

// Build transports dynamically
const transports = Object.fromEntries(
  supportedChains.map((chain) => [chain.id, http()])
) as Record<number, ReturnType<typeof http>>;

// Client config with connectors (created once)
const clientConfig = createConfig({
  chains: supportedChains,
  connectors,
  transports,
  multiInjectedProviderDiscovery: false,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

function RainbowKitProviderWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  const theme = useMemo(() => {
    const baseTheme =
      resolvedTheme === 'dark'
        ? darkTheme({
          accentColor: '#6ea7daff',
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        })
        : lightTheme({
          accentColor: '#6ea7daff',
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
          overlayBlur: 'small',
        });

    return baseTheme;
  }, [resolvedTheme]);

  return (
    <RainbowKitProvider
      theme={theme}
      locale="en-US"
      appInfo={{
        appName: 'Barzakh AI',
        learnMoreUrl: 'https://chat.barzakh.tech',
      }}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}

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
            <RainbowKitProviderWrapper>
              <OneChainWalletProvider>
                {children}
              </OneChainWalletProvider>
            </RainbowKitProviderWrapper>
          ) : (
            <OneChainWalletProvider>
              {children}
            </OneChainWalletProvider>
          )}
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicWalletProvider>
  );
}