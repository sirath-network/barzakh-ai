/**
 * Somnia Shannon Testnet & Mainnet Chain Definitions for KeeperHub
 *
 * Somnia is an ultra-high-throughput EVM Layer 1 blockchain capable of 400,000+ TPS
 * with sub-second finality.
 *
 * @see https://docs.somnia.network
 */

export interface ChainConfig {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  contracts?: {
    multicall3?: { address: string; blockCreated?: number };
    tusdc?: { address: string };
  };
  testnet: boolean;
}

export const somniaShannonTestnet: ChainConfig = {
  id: 50312,
  name: 'Somnia Shannon Testnet',
  network: 'somnia-shannon',
  nativeCurrency: {
    name: 'Somnia Testnet Token',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://dream-rpc.somnia.network'],
    },
    public: {
      http: ['https://dream-rpc.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Shannon Explorer',
      url: 'https://shannon-explorer.somnia.network',
    },
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1,
    },
    tusdc: {
      address: '0x0957C6D772843a30F28B7Cd436DE9c1d0EAf8517',
    },
  },
  testnet: true,
};

export const somniaMainnet: ChainConfig = {
  id: 5031,
  name: 'Somnia Mainnet',
  network: 'somnia-mainnet',
  nativeCurrency: {
    name: 'Somnia Token',
    symbol: 'STT',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://api.infra.mainnet.somnia.network'],
    },
    public: {
      http: ['https://api.infra.mainnet.somnia.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Somnia Explorer',
      url: 'https://somnia-explorer.io',
    },
  },
  testnet: false,
};

export const SOMNIA_CHAINS = [somniaShannonTestnet, somniaMainnet];
