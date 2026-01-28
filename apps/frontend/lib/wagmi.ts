import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { createConfig } from 'wagmi';
// All chains from viem/chains - includes 200+ EVM chains
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
  cronosTestnet, // For x402 payments
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
  monad, // High-throughput L1 EVM
  hyperEvm, // Hyperliquid EVM
  cronoszkEVM, // Cronos zkEVM
} from 'viem/chains';



// All supported chains for wallet connections
const supportedChains = [
  // Core chains
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
  cronosTestnet,
  cronoszkEVM,
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
  monad,
  hyperEvm,
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
