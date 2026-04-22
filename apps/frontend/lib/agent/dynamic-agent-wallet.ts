/**
 * Agent Wallet Service (Self-Hosted)
 * 
 * Server-side service for autonomous AI execution using the USER's embedded wallet.
 * This completely removes the Dynamic SDK dependency and uses purely self-hosted 
 * agent wallets managed via viem.
 */

import type { TransactionSerializable } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getAgentPrivateKey } from "./agent-wallet-store";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Delegation credentials */
export interface DelegationCredentials {
  walletId: string;
  walletApiKey: string;
  keyShare?: unknown;
  walletAddress: string;
  chain: "evm" | "svm";
  userId: string;
  delegatedAt: Date;
  revokedAt?: Date;
}

// ─── Core Signing Operations ────────────────────────────────────────────────

export async function signMessageForUser(
  credentials: DelegationCredentials,
  message: string
): Promise<string> {
  const privateKey = await getAgentPrivateKey(credentials.userId);
  if (!privateKey) throw new Error("Agent wallet not found in database.");
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  return await account.signMessage({ message });
}

/**
 * Signs EIP-712 typed data using the user's delegated embedded wallet.
 */
export async function signTypedDataForUser(
  credentials: DelegationCredentials,
  typedData: {
    domain: Record<string, unknown>;
    types: Record<string, Array<{ name: string; type: string }>>;
    primaryType: string;
    message: Record<string, unknown>;
  }
): Promise<string> {
  const privateKey = await getAgentPrivateKey(credentials.userId);
  if (!privateKey) throw new Error("Agent wallet not found in database.");
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  return await account.signTypedData(typedData as any);
}

/**
 * Signs an EVM transaction using the user's delegated wallet offline.
 */
export async function signTransactionForUser(
  credentials: DelegationCredentials,
  transaction: TransactionSerializable
): Promise<string> {
  const privateKey = await getAgentPrivateKey(credentials.userId);
  if (!privateKey) throw new Error("Agent wallet not found in database.");
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  // Use account.signTransaction to perform a purely offline cryptographic signature.
  // This avoids passing a transport (http()) to walletClient which can cause public RPC 
  // rate limits to hang the process in serverless environments.
  return await account.signTransaction(transaction as any);
}

/**
 * Checks if the agent wallet service is enabled.
 */
export function isDelegatedAccessEnabled(): boolean {
  return true; // Self-hosted wallets are always enabled
}
