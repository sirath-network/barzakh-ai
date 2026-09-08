import { createPublicClient, createWalletClient, http, defineChain, fallback } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export const SOMNIA_TESTNET_CHAIN = defineChain({
  id: 50312,
  name: 'Somnia Shannon Testnet',
  network: 'somnia-shannon',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: { http: ['https://dream-rpc.somnia.network'] },
    public: { http: ['https://dream-rpc.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Shannon Explorer', url: 'https://shannon-explorer.somnia.network' },
  },
});

export const SOMNIA_MAINNET_CHAIN = defineChain({
  id: 5031,
  name: 'Somnia Mainnet',
  network: 'somnia-mainnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: { http: ['https://api.infra.mainnet.somnia.network'] },
    public: { http: ['https://api.infra.mainnet.somnia.network'] },
  },
  blockExplorers: {
    default: { name: 'Somnia Explorer', url: 'https://somnia-explorer.io' },
  },
});

export const SOMNIA_TESTNET_EXPLORER = 'https://shannon-explorer.somnia.network';
export const SOMNIA_MAINNET_EXPLORER = 'https://somnia-explorer.io';
export const TUSDC_DECIMALS = 6;

export function createSomniaClient(privateKey: string, testnet: boolean = true) {
  try {
    let account;
    if (privateKey) {
      const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      account = privateKeyToAccount(formattedKey as `0x${string}`);
    }

    const chain = testnet ? SOMNIA_TESTNET_CHAIN : SOMNIA_MAINNET_CHAIN;
    
    // Multi-RPC failover pattern setup
    const rpcUrls = chain.rpcUrls.default.http;
    const transports = rpcUrls.map(url => http(url));
    const transport = fallback(transports);

    const publicClient = createPublicClient({
      chain,
      transport,
    });

    const clientObj: any = { publicClient };

    if (account) {
      const walletClient = createWalletClient({
        account,
        chain,
        transport,
      });
      clientObj.walletClient = walletClient;
      clientObj.account = account;
    }

    return clientObj;
  } catch (error) {
    console.error("Error creating Somnia client:", error);
    throw error;
  }
}

export function formatPrice(millionths: number): string {
  try {
    return (millionths / 1_000_000).toString();
  } catch (error) {
    console.error("Error formatting price:", error);
    return "0";
  }
}

export function toMillionths(probability: number): number {
  try {
    return Math.round(probability * 1_000_000);
  } catch (error) {
    console.error("Error converting to millionths:", error);
    return 0;
  }
}

export function formatUSDC(amount: bigint): string {
  try {
    const divisor = BigInt(10 ** TUSDC_DECIMALS);
    const wholeNumber = amount / divisor;
    const remainder = amount % divisor;
    
    // Format remainder to drop trailing zeros, or leave one zero if all zeros
    const remainderStr = remainder.toString().padStart(TUSDC_DECIMALS, '0').replace(/0+$/, '');
    
    return remainderStr.length > 0 ? `${wholeNumber.toString()}.${remainderStr}` : `${wholeNumber.toString()}.0`;
  } catch (error) {
     console.error("Error formatting USDC:", error);
     return "0";
  }
}
