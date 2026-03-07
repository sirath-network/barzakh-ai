/**
 * Yellow Network Configuration
 *
 * Configuration constants and client factory for the Nitrolite SDK v0.5.3.
 * Uses NitroliteClient with viem for state channel operations (ERC-7824).
 *
 * @see https://github.com/erc7824/nitrolite
 */

import type { Address } from "viem";

// =============================================================================
// ENVIRONMENT CONFIGURATION
// =============================================================================

/** Agent private key for signing state channel operations server-side */
export const YELLOW_AGENT_PRIVATE_KEY = process.env
    .YELLOW_AGENT_PRIVATE_KEY as `0x${string}` | undefined;

// =============================================================================
// CONTRACT ADDRESSES
// =============================================================================

/**
 * Nitrolite custody & adjudicator contract addresses per chain.
 * These are the ChannelHub/Custody contracts where funds are locked.
 */
export const YELLOW_CONTRACT_ADDRESSES: Record<
    number,
    { custody: Address; adjudicator: Address }
> = {
    // Base Sepolia (testnet)
    84532: {
        custody: "0x0000000000000000000000000000000000000000" as Address,
        adjudicator: "0x0000000000000000000000000000000000000000" as Address,
    },
    // Base (mainnet)
    8453: {
        custody: "0x0000000000000000000000000000000000000000" as Address,
        adjudicator: "0x0000000000000000000000000000000000000000" as Address,
    },
};

// =============================================================================
// SUPPORTED ASSETS — token contract addresses per chain
// =============================================================================

export const YELLOW_TOKEN_ADDRESSES: Record<number, Record<string, Address>> = {
    // Base
    8453: {
        USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" as Address,
        WETH: "0x4200000000000000000000000000000000000006" as Address,
    },
    // Base Sepolia (testnet)
    84532: {
        USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
        WETH: "0x4200000000000000000000000000000000000006" as Address,
    },
};

/** Asset metadata */
export const YELLOW_SUPPORTED_ASSETS: Record<
    string,
    { symbol: string; name: string; decimals: number }
> = {
    usdc: { symbol: "USDC", name: "USD Coin", decimals: 6 },
    weth: { symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    eth: { symbol: "ETH", name: "Ethereum", decimals: 18 },
    usdt: { symbol: "USDT", name: "Tether", decimals: 6 },
};

// =============================================================================
// SUPPORTED CHAINS
// =============================================================================

/** Chains where Yellow Network Nitrolite contracts are deployed */
export const YELLOW_SUPPORTED_CHAINS: Record<
    number,
    { name: string; rpcUrl: string }
> = {
    8453: {
        name: "Base",
        rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    },
    84532: {
        name: "Base Sepolia",
        rpcUrl:
            process.env.BASE_SEPOLIA_RPC_URL ||
            "https://sepolia.base.org",
    },
};

// =============================================================================
// CHANNEL STATUS TYPES
// =============================================================================

/**
 * Channel status enum matching the Nitrolite SDK ChannelStatus.
 * VOID=0, INITIAL=1, ACTIVE=2, DISPUTE=3, FINAL=4
 */
export type YellowChannelStatus = "void" | "initial" | "active" | "dispute" | "final";

export const CHANNEL_STATUS_LABELS: Record<YellowChannelStatus, string> = {
    void: "No Channel",
    initial: "Initializing",
    active: "Active",
    dispute: "Under Dispute",
    final: "Finalized",
};

export const CHANNEL_STATUS_FROM_INT: Record<number, YellowChannelStatus> = {
    0: "void",
    1: "initial",
    2: "active",
    3: "dispute",
    4: "final",
};

// =============================================================================
// CHALLENGE DURATION
// =============================================================================

/** Default challenge duration in seconds (1 hour) */
export const DEFAULT_CHALLENGE_DURATION = 3600n;

// =============================================================================
// HELPER: Parse amount to bigint with decimals
// =============================================================================

export function parseAmount(amount: string, decimals: number): bigint {
    const parts = amount.split(".");
    const whole = parts[0] || "0";
    let fraction = parts[1] || "";

    // Pad or truncate fraction to match decimals
    if (fraction.length > decimals) {
        fraction = fraction.slice(0, decimals);
    } else {
        fraction = fraction.padEnd(decimals, "0");
    }

    return BigInt(whole + fraction);
}

export function formatAmount(amount: bigint, decimals: number): string {
    const str = amount.toString().padStart(decimals + 1, "0");
    const whole = str.slice(0, str.length - decimals) || "0";
    const fraction = str.slice(str.length - decimals);
    // Remove trailing zeros from fraction
    const trimmed = fraction.replace(/0+$/, "");
    return trimmed ? `${whole}.${trimmed}` : whole;
}
