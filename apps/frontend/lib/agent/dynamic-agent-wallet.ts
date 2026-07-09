/**
 * Agent Wallet Service (Self-Hosted, Multi-Chain)
 * 
 * Server-side service for autonomous AI execution using the USER's embedded wallet.
 * Supports both EVM (viem) and Solana (@solana/web3.js) signing.
 * This completely removes the Dynamic SDK dependency and uses purely self-hosted
 * agent wallets.
 */

import type { TransactionSerializable } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getAgentPrivateKey } from "./agent-wallet-store";
import type { WalletChain } from "./agent-wallet-store";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Delegation credentials */
export interface DelegationCredentials {
  walletId: string;
  walletApiKey: string;
  keyShare?: unknown;
  walletAddress: string;
  chain: "evm" | "svm" | "solana";
  userId: string;
  delegatedAt: Date;
  revokedAt?: Date;
}

// ─── EVM Signing Operations ─────────────────────────────────────────────────

export async function signMessageForUser(
  credentials: DelegationCredentials,
  message: string
): Promise<string> {
  const privateKey = await getAgentPrivateKey(credentials.userId, "evm");
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
  const privateKey = await getAgentPrivateKey(credentials.userId, "evm");
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
  const privateKey = await getAgentPrivateKey(credentials.userId, "evm");
  if (!privateKey) throw new Error("Agent wallet not found in database.");
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  // Use account.signTransaction to perform a purely offline cryptographic signature.
  // This avoids passing a transport (http()) to walletClient which can cause public RPC 
  // rate limits to hang the process in serverless environments.
  return await account.signTransaction(transaction as any);
}

// ─── Solana Signing Operations ──────────────────────────────────────────────

/**
 * Gets the Solana Keypair from the encrypted private key stored in DB.
 * The key is stored as a base64-encoded 64-byte secret key.
 */
async function getSolanaKeypair(userId: string) {
  const { Keypair } = await import("@solana/web3.js");
  const secretKeyBase64 = await getAgentPrivateKey(userId, "solana");
  if (!secretKeyBase64) throw new Error("Solana agent wallet not found in database.");
  const secretKey = Buffer.from(secretKeyBase64, "base64");
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

/**
 * Signs a Solana transaction using the user's embedded Solana wallet.
 * Expects a Transaction or VersionedTransaction object.
 */
export async function signSolanaTransaction(
  userId: string,
  transaction: any // Transaction | VersionedTransaction
): Promise<any> {
  const keypair = await getSolanaKeypair(userId);
  
  if (transaction.version !== undefined) {
    // VersionedTransaction requires an array of signers
    transaction.sign([keypair]);
  } else {
    // Legacy Transaction
    transaction.partialSign(keypair);
  }
  
  return transaction;
}

/**
 * Signs a raw message (bytes) on Solana using the user's embedded wallet.
 * Uses Node.js built-in Ed25519 signing (crypto module) — no extra dependencies.
 * Returns the signature as a hex string.
 */
export async function signSolanaMessage(
  userId: string,
  message: Uint8Array
): Promise<string> {
  const crypto = await import("crypto");
  const keypair = await getSolanaKeypair(userId);
  
  // Ed25519 private key is the first 32 bytes of the 64-byte secret key
  const privateKeyRaw = keypair.secretKey.slice(0, 32);
  
  // Create a Node.js Ed25519 key object from the raw seed
  const privateKey = crypto.createPrivateKey({
    key: Buffer.concat([
      // DER prefix for Ed25519 private key (PKCS#8)
      Buffer.from("302e020100300506032b657004220420", "hex"),
      Buffer.from(privateKeyRaw),
    ]),
    format: "der",
    type: "pkcs8",
  });
  
  const signature = crypto.sign(null, Buffer.from(message), privateKey);
  return Buffer.from(signature).toString("hex");
}

/**
 * Gets the Solana public key for a user's agent wallet.
 */
export async function getSolanaPublicKey(userId: string): Promise<string> {
  const keypair = await getSolanaKeypair(userId);
  return keypair.publicKey.toBase58();
}

// ─── Utility ────────────────────────────────────────────────────────────────

/**
 * Checks if the agent wallet service is enabled.
 */
export function isDelegatedAccessEnabled(): boolean {
  return true; // Self-hosted wallets are always enabled
}
