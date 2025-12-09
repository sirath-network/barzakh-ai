'use client';

import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { type State, WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from '@/lib/wagmi';
import { useTheme } from 'next-themes';
import { useMemo, useState, useEffect } from 'react';
import '@rainbow-me/rainbowkit/styles.css';

interface Web3ProviderProps {
  children: React.ReactNode;
  initialState?: State;
}

function RainbowKitProviderWrapper({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();

  const theme = useMemo(() => {
    const baseTheme = resolvedTheme === 'dark'
      ? darkTheme({
        accentColor: '#ef4444', // Red accent to match app theme
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
        overlayBlur: 'small',
      })
      : lightTheme({
        accentColor: '#ef4444',
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
        learnMoreUrl: 'https://barzakh.framer.ai',
      }}
      modalSize="compact"
    >
      {children}
    </RainbowKitProvider>
  );
}

export function Web3Provider({ children, initialState }: Web3ProviderProps) {
  const [mounted, setMounted] = useState(false);

  // Create query client inside component to avoid SSR issues
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent refetching on window focus in development
        refetchOnWindowFocus: false,
        // Prevent retries that could cause multiple WalletConnect inits
        retry: false,
      },
    },
  }));

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {mounted && (
          <RainbowKitProviderWrapper>
            {children}
          </RainbowKitProviderWrapper>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
