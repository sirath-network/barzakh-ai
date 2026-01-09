import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { defineChain } from 'viem';
import { http } from 'wagmi';
import { createConfig } from 'wagmi';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';
// All chains supported by Relay Protocol (from viem/chains)
import {
  mainnet,
  optimism,
  arbitrum,
  arbitrumNova,
  base,
  polygon,
  polygonZkEvm,
  avalanche,
  bsc,
  zkSync,
  linea,
  scroll,
  blast,
  manta,
  mode,
  zora,
  gnosis,
  celo,
  cronos,
  mantle,
  metis,
  taiko,
  bob,
  boba,
  worldchain,
  ink,
  lisk,
  sei,
  sonic,
  ronin,
  abstract,
  berachain,
  morph,
  apeChain,
  shape,
  gravity,
  cyber,
  redstone,
  soneium,
  xai,
  flowMainnet,
  story,
  hemi,
  zircuit,
  superseed,
  unichain,
} from 'viem/chains';

// Define Cronos Testnet chain (for x402 payments)
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

// All supported chains for wallet connections
// Cronos Testnet for x402 payments + all Relay Protocol supported chains
const supportedChains = [
  cronosTestnet,
  // Relay Protocol chains
  mainnet,
  optimism,
  arbitrum,
  arbitrumNova,
  base,
  polygon,
  polygonZkEvm,
  avalanche,
  bsc,
  zkSync,
  linea,
  scroll,
  blast,
  manta,
  mode,
  zora,
  gnosis,
  celo,
  cronos,
  mantle,
  metis,
  taiko,
  bob,
  boba,
  worldchain,
  ink,
  lisk,
  sei,
  sonic,
  ronin,
  abstract,
  berachain,
  morph,
  apeChain,
  shape,
  gravity,
  cyber,
  redstone,
  soneium,
  xai,
  flowMainnet,
  story,
  hemi,
  zircuit,
  superseed,
  unichain,
] as const;

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com/
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Create a minimal SSR-safe config for server-side rendering
// This avoids initializing WalletConnect and other browser-dependent connectors on the server
const createWagmiConfig = () => {
  // Build transports object dynamically from supported chains
  const transports = Object.fromEntries(
    supportedChains.map((chain) => [chain.id, http()])
  ) as any;

  // On server, create a minimal config without connectors that need browser APIs
  if (typeof window === 'undefined') {
    return createConfig({
      chains: supportedChains,
      transports,
      ssr: true,
    });
  }

  // On client, use the full RainbowKit config with all connectors
  return getDefaultConfig({
    appName: 'Barzakh AI',
    projectId,
    chains: supportedChains,
    ssr: true,
  });
};

export const config = createWagmiConfig();
