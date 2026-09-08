import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { defineChain } from 'viem';
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
  cronosTestnet,
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
  cronoszkEVM,
  flare,
  flareTestnet,
} from 'viem/chains';

// GOAT Network Mainnet (Bitcoin-secured L2, Chain ID 2345)
export const goatNetwork = defineChain({
  id: 2345,
  name: 'GOAT Network',
  nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.goat.network'] },
    public: { http: ['https://rpc.goat.network'] },
  },
  blockExplorers: {
    default: { name: 'GOAT Explorer', url: 'https://explorer.goat.network' },
  },
});

// Somnia Shannon Testnet (DreamDEX Event Contracts, Chain ID 50312)
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  nativeCurrency: { name: 'Somnia Testnet Token', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Shannon Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
});

// Somnia Mainnet (Chain ID 5031)
export const somnia = defineChain({
  id: 5031,
  name: 'Somnia Mainnet',
  nativeCurrency: { name: 'Somnia Token', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://api.infra.mainnet.somnia.network'] },
    public: { http: ['https://api.infra.mainnet.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://somnia-explorer.io' },
  },
});

export const supportedChains = [
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
  flare,
  flareTestnet,
  goatNetwork,
  somniaTestnet,
  somnia,
] as const;

// WalletConnect projectId - Dynamic SDK uses this internally via dashboard config
export const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Build transports dynamically
const transports = Object.fromEntries(
  supportedChains.map((chain) => [chain.id, http()])
) as Record<number, ReturnType<typeof http>>;

// Server-safe config (no connectors - they're added client-side)
export const config = createConfig({
  chains: supportedChains,
  transports,
  multiInjectedProviderDiscovery: false, // Disable to prevent duplicate wallets
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});