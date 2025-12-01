import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { http } from 'wagmi';
import { createConfig } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

// Define Cronos Testnet chain
export const cronosTestnet = defineChain({
  id: 338,
  name: 'Cronos Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Test CRO',
    symbol: 'TCRO',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-t3.cronos.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Cronos Explorer', url: 'https://explorer.cronos.org/testnet' },
  },
  testnet: true,
});

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com/
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Create a minimal SSR-safe config for server-side rendering
// This avoids initializing WalletConnect and other browser-dependent connectors on the server
const createWagmiConfig = () => {
  // On server, create a minimal config without connectors that need browser APIs
  if (typeof window === 'undefined') {
    return createConfig({
      chains: [cronosTestnet],
      transports: {
        [cronosTestnet.id]: http(),
      },
      ssr: true,
    });
  }

  // On client, use the full RainbowKit config with all connectors
  return getDefaultConfig({
    appName: 'Barzakh AI',
    projectId,
    chains: [cronosTestnet],
    ssr: true,
  });
};

export const config = createWagmiConfig();
