/**
 * Monad Network Ecosystem & DeFi Constants
 * 
 * High-performance EVM Layer 1 with 10,000 TPS, 400ms blocks, 800ms finality.
 * Official Hackathon integrations for Kuru (Spot CLOB), Perpl (Perps),
 * Agora (AUSD), Aurora Intents, Envio, and ERC-8004.
 */

import { defineChain } from "viem";

export const MONAD_CHAIN_ID = 143;
export const MONAD_TESTNET_CHAIN_ID = 10143;

// Live QuickNode Monad Endpoints
export const MONAD_MAINNET_RPC = 
  process.env.MONAD_MAINNET_RPC || 
  "https://frosty-wider-model.monad-mainnet.quiknode.pro/8ad1cd28acdbdf04fe47d1367499597b49f7b783/";

export const MONAD_TESTNET_RPC = 
  process.env.MONAD_TESTNET_RPC || 
  "https://palpable-white-valley.monad-testnet.quiknode.pro/2a0491f01044b9547f4a100fb6e5394568788555/";

export const monadMainnet = defineChain({
  id: MONAD_CHAIN_ID,
  name: "Monad Mainnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [MONAD_MAINNET_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "MonadScan",
      url: "https://monadscan.com",
    },
  },
});

export const MONAD_EXPLORER_MAINNET = "https://monadscan.com";
export const MONAD_EXPLORER_TESTNET = "https://testnet.monadexplorer.com";

// Agora AUSD (Native High-Speed Stablecoin on Monad Mainnet)
export const AGORA_AUSD_ADDRESS = (process.env.AGORA_AUSD_ADDRESS || "0x00000000efe302beaa2b3e6e1b18d08d69a9012a") as `0x${string}`;

// Native WMON
export const WMON_ADDRESS = (process.env.WMON_ADDRESS || "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701") as `0x${string}`;

// Public REST APIs
export const KURU_API_URL = "https://api.kuru.io/api/v1";
export const PERPL_API_URL = "https://app.perpl.xyz/api/v1/pub/context";

// Kuru Spot CLOB Addresses on Monad Mainnet
export const KURU_ROUTER_ADDRESS = (process.env.KURU_ROUTER_ADDRESS || "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7") as `0x${string}`;

export const KURU_MARKETS: Record<string, {
  marketAddress: `0x${string}`;
  baseSymbol: string;
  quoteSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
  pricePrecision: bigint;
  sizePrecision: bigint;
  tickSize: string;
  minSize: string;
}> = {
  "MON/USDC": {
    marketAddress: "0x065c9d28e428a0db40191a54d33d5b7c71a9c394",
    baseSymbol: "MON",
    quoteSymbol: "USDC",
    baseDecimals: 18,
    quoteDecimals: 6,
    pricePrecision: 100000000n,
    sizePrecision: 10000000000n,
    tickSize: "0.000001",
    minSize: "0.0002",
  },
  "MON/AUSD": {
    marketAddress: "0x065c9d28e428a0db40191a54d33d5b7c71a9c394", // Mainnet primary MON pool
    baseSymbol: "MON",
    quoteSymbol: "AUSD",
    baseDecimals: 18,
    quoteDecimals: 6,
    pricePrecision: 100000000n,
    sizePrecision: 10000000000n,
    tickSize: "0.000001",
    minSize: "0.0002",
  },
  "WETH/USDC": {
    marketAddress: "0xa6afd386135b7d41a6c40c525abc4a1019b0d132",
    baseSymbol: "WETH",
    quoteSymbol: "USDC",
    baseDecimals: 18,
    quoteDecimals: 6,
    pricePrecision: 10000n,
    sizePrecision: 10000000000n,
    tickSize: "0.01",
    minSize: "0.000002",
  },
  "cbBTC/USDC": {
    marketAddress: "0x40c49f171202f91ff5d2fae34c22dd2bfdd22af0",
    baseSymbol: "cbBTC",
    quoteSymbol: "USDC",
    baseDecimals: 8,
    quoteDecimals: 6,
    pricePrecision: 10000n,
    sizePrecision: 100000000n,
    tickSize: "0.01",
    minSize: "0.000125",
  },
  "COMPUTE/AUSD": {
    marketAddress: "0x065c9d28e428a0db40191a54d33d5b7c71a9c394", // Standardized compute pair
    baseSymbol: "COMPUTE",
    quoteSymbol: "AUSD",
    baseDecimals: 18,
    quoteDecimals: 6,
    pricePrecision: 100000000n,
    sizePrecision: 10000000000n,
    tickSize: "0.01",
    minSize: "0.1",
  },
};

// Perpl Perpetuals Engine Addresses on Monad Mainnet
export const PERPL_CLEARINGHOUSE_ADDRESS = (process.env.PERPL_CLEARINGHOUSE_ADDRESS || "0x34b6552d57a35a1d042ccae1951bd1c370112a6f") as `0x${string}`;

export const PERPL_MARKETS: Record<string, {
  marketId: number;
  pair: string;
  name: string;
  priceDecimals: number;
  sizeDecimals: number;
  maxLeverage: number;
  initialMarginBps: number;
  maintenanceMarginBps: number;
}> = {
  "MON": {
    marketId: 10,
    pair: "MON/USD",
    name: "MON",
    priceDecimals: 6,
    sizeDecimals: 0,
    maxLeverage: 10,
    initialMarginBps: 1000,
    maintenanceMarginBps: 2000,
  },
  "MON-PERP": {
    marketId: 10,
    pair: "MON/USD",
    name: "MON",
    priceDecimals: 6,
    sizeDecimals: 0,
    maxLeverage: 10,
    initialMarginBps: 1000,
    maintenanceMarginBps: 2000,
  },
  "BTC": {
    marketId: 1,
    pair: "BTC/USD",
    name: "BTC",
    priceDecimals: 1,
    sizeDecimals: 5,
    maxLeverage: 66,
    initialMarginBps: 1500,
    maintenanceMarginBps: 2500,
  },
  "BTC-PERP": {
    marketId: 1,
    pair: "BTC/USD",
    name: "BTC",
    priceDecimals: 1,
    sizeDecimals: 5,
    maxLeverage: 66,
    initialMarginBps: 1500,
    maintenanceMarginBps: 2500,
  },
  "ETH": {
    marketId: 2,
    pair: "ETH/USD",
    name: "ETH",
    priceDecimals: 2,
    sizeDecimals: 4,
    maxLeverage: 50,
    initialMarginBps: 2000,
    maintenanceMarginBps: 3000,
  },
  "ETH-PERP": {
    marketId: 2,
    pair: "ETH/USD",
    name: "ETH",
    priceDecimals: 2,
    sizeDecimals: 4,
    maxLeverage: 50,
    initialMarginBps: 2000,
    maintenanceMarginBps: 3000,
  },
  "SOL": {
    marketId: 3,
    pair: "SOL/USD",
    name: "SOL",
    priceDecimals: 3,
    sizeDecimals: 3,
    maxLeverage: 20,
    initialMarginBps: 2500,
    maintenanceMarginBps: 3500,
  },
  "SOL-PERP": {
    marketId: 3,
    pair: "SOL/USD",
    name: "SOL",
    priceDecimals: 3,
    sizeDecimals: 3,
    maxLeverage: 20,
    initialMarginBps: 2500,
    maintenanceMarginBps: 3500,
  },
  "COMPUTE-PERP": {
    marketId: 99,
    pair: "H100-GPU/USD",
    name: "COMPUTE",
    priceDecimals: 4,
    sizeDecimals: 2,
    maxLeverage: 10,
    initialMarginBps: 1000,
    maintenanceMarginBps: 2000,
  },
};

// ERC-8004 Trustless Agent Standard on Monad
export const ERC8004_MONAD_IDENTITY_REGISTRY = (process.env.ERC8004_MONAD_IDENTITY_REGISTRY || "0x8004111111111111111111111111111111118004") as `0x${string}`;
export const ERC8004_MONAD_REPUTATION_REGISTRY = (process.env.ERC8004_MONAD_REPUTATION_REGISTRY || "0x8004222222222222222222222222222222228004") as `0x${string}`;

// Envio HyperSync Endpoint
export const ENVIO_MONAD_HYPERSYNC = "https://monad.hypersync.xyz";
