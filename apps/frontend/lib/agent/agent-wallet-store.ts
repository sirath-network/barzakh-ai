/**
 * Agent Wallet Store — Multi-Chain User Delegation Credentials
 * 
 * Manages per-user delegation credentials, spend tracking, and audit logging.
 * Supports both EVM (viem) and Solana (@solana/web3.js) wallets.
 * 
 * Architecture:
 * - Each user who enables "Agent Automation" gets delegation credentials stored here
 * - Users can have one wallet per chain (EVM + Solana)
 * - Credentials come from server-managed keypairs (stored encrypted)
 * - Spend limits are user-configurable (with platform-level defaults)
 * - All agent-executed transactions are logged and visible to the user
 * - Users can revoke delegation at any time
 * 
 * Storage: Postgres/Drizzle.
 */

import { db } from "@/lib/db/db";
import {
  agent_wallet,
  agent_delegation,
  agent_transaction
} from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { encryptSecret, decryptSecret } from "@/lib/security/crypto";
import type { DelegationCredentials } from "./dynamic-agent-wallet";

// ─── Types ──────────────────────────────────────────────────────────────────

export type WalletChain = "evm" | "solana" | "sui";

export interface AgentTransaction {
  id: string;
  userId: string;
  walletAddress: string;
  operationType: string;
  amount: string;
  signature: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AgentWalletInfo {
  walletAddress: string;
  chain: WalletChain;
  createdAt: Date;
}

interface RecordTransactionInput {
  userId: string;
  walletAddress: string;
  operationType: string;
  amount: string;
  signature: string;
  metadata?: Record<string, unknown>;
}



// ─── Agent Wallet Creation ──────────────────────────────────────────────────

/**
 * Creates a new server-managed agent wallet for a user.
 * Supports EVM (viem) and Solana (@solana/web3.js) key generation.
 * The private key is stored encrypted in Postgres.
 */
export async function createAgentWallet(
  userId: string,
  chain: WalletChain = "evm"
): Promise<string> {
  // Check if user already has a wallet for this chain
  const existing = await getEmbeddedWalletAddress(userId, chain);
  if (existing) return existing;

  let walletAddress: string;
  let privateKey: string;

  if (chain === "solana") {
    // Generate Solana keypair using @solana/web3.js
    const { Keypair } = await import("@solana/web3.js");
    const keypair = Keypair.generate();
    walletAddress = keypair.publicKey.toBase58();
    // Store the full 64-byte secret key as base64
    privateKey = Buffer.from(keypair.secretKey).toString("base64");
  } else if (chain === "sui") {
    // Generate Sui Ed25519 keypair using the official Mysten SDK.
    // Store the SDK's bech32 secret key string (suiprivkey...) encrypted.
    const { Ed25519Keypair } = await import("@mysten/sui/keypairs/ed25519");
    const keypair = Ed25519Keypair.generate();
    walletAddress = keypair.getPublicKey().toSuiAddress();
    privateKey = keypair.getSecretKey();
  } else {
    // Generate EVM keypair using viem
    const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");
    privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    walletAddress = account.address;
  }

  // Store the private key securely encrypted
  await db.insert(agent_wallet).values({
    userId,
    walletAddress,
    privateKeyEncrypted: encryptSecret(privateKey),
    chain,
  });

  console.log(`[AgentStore] ${chain.toUpperCase()} agent wallet created for user ${userId}: ${walletAddress}`);
  return walletAddress;
}

/**
 * Deletes a user's agent wallet entirely for a specific chain.
 * CRITICAL: Always disables agent automation first to prevent orphaned delegation.
 * Removes the wallet record and all delegation credentials for that chain.
 */
export async function deleteAgentWallet(
  userId: string,
  chain?: WalletChain
): Promise<boolean> {
  // Step 1: Revoke any active delegation FIRST (disable automation)
  const hadDelegation = await hasDelegation(userId, chain);
  if (hadDelegation) {
    await revokeDelegation(userId, chain);
    console.log(`[AgentStore] Delegation revoked before wallet deletion for user ${userId} (chain: ${chain || "all"})`);
  }

  // Step 2: Delete the agent wallet record(s)
  if (chain) {
    await db.delete(agent_wallet)
      .where(and(eq(agent_wallet.userId, userId), eq(agent_wallet.chain, chain)));
  } else {
    // Delete all wallets for user (backward compat)
    await db.delete(agent_wallet)
      .where(eq(agent_wallet.userId, userId));
  }

  console.log(`[AgentStore] Agent wallet deleted for user ${userId} (chain: ${chain || "all"})`);
  return true;
}

/**
 * Gets the private key for a user's agent wallet (for signing).
 * Returns null if no agent wallet exists for the specified chain.
 */
export async function getAgentPrivateKey(
  userId: string,
  chain: WalletChain = "evm"
): Promise<string | null> {
  const records = await db.select().from(agent_wallet)
    .where(and(eq(agent_wallet.userId, userId), eq(agent_wallet.chain, chain)));
  if (records.length === 0 || !records[0].privateKeyEncrypted) return null;
  return decryptSecret(records[0].privateKeyEncrypted);
}

// ─── Agent Automation Enable/Disable ────────────────────────────────────────

/**
 * Enables agent automation for a user with a server-managed wallet.
 * Creates a delegation record that marks the agent as active for the specified chain.
 * The server-managed wallet's private key is used directly for signing.
 */
export async function enableAgentAutomation(
  userId: string,
  walletAddress: string,
  chain: WalletChain = "evm"
): Promise<void> {
  await db.insert(agent_delegation).values({
    userId,
    walletId: `server-managed-${chain}-${userId}`,
    walletApiKey: "server-managed",
    keyShare: "server-managed", // required column natively
    walletAddress,
    chain,
  });
  console.log(`[AgentStore] Agent automation enabled for user ${userId} | chain ${chain} | wallet ${walletAddress}`);
}

// ─── Embedded Wallet Registration ───────────────────────────────────────────

/**
 * Registers a user's embedded wallet address (manual override).
 * Called when the user creates an embedded wallet from the Agent Automation UI.
 */
export async function registerEmbeddedWallet(
  userId: string,
  walletAddress: string,
  chain: WalletChain = "evm"
): Promise<void> {
  // We use standard insert but if they already had one we shouldn't crash, 
  // though typically this is a 1-to-1 mapping workflow.
  await db.insert(agent_wallet).values({
    userId,
    walletAddress,
    privateKeyEncrypted: null, // manual override so no serverside pk
    chain,
  });
  console.log(`[AgentStore] Embedded wallet registered for user ${userId} (${chain}): ${walletAddress}`);
}

/**
 * Gets the registered embedded wallet address for a user on a specific chain.
 */
export async function getEmbeddedWalletAddress(
  userId: string,
  chain: WalletChain = "evm"
): Promise<string | null> {
  const records = await db.select().from(agent_wallet)
    .where(and(eq(agent_wallet.userId, userId), eq(agent_wallet.chain, chain)))
    .orderBy(desc(agent_wallet.createdAt))
    .limit(1);
  return records.length > 0 ? records[0].walletAddress : null;
}

/**
 * Gets all wallets for a user across all chains.
 */
export async function getAllUserWallets(
  userId: string
): Promise<AgentWalletInfo[]> {
  const records = await db.select().from(agent_wallet)
    .where(eq(agent_wallet.userId, userId))
    .orderBy(desc(agent_wallet.createdAt));
  return records.map(r => ({
    walletAddress: r.walletAddress,
    chain: r.chain as WalletChain,
    createdAt: r.createdAt,
  }));
}

// ─── Delegation Credentials ─────────────────────────────────────────────────

/**
 * Stores delegation credentials for a user.
 * Called when the Dynamic webhook delivers key shares after user approval.
 */
export async function storeDelegationCredentials(
  credentials: DelegationCredentials
): Promise<void> {
  await db.insert(agent_delegation).values({
    userId: credentials.userId,
    walletId: credentials.walletId,
    walletApiKey: credentials.walletApiKey,
    keyShare: typeof credentials.keyShare === "string" ? credentials.keyShare : JSON.stringify(credentials.keyShare),
    walletAddress: credentials.walletAddress,
    chain: credentials.chain,
  });

  // Also register the wallet address if not already stored
  if (credentials.walletAddress) {
    const exists = await getEmbeddedWalletAddress(credentials.userId, credentials.chain as WalletChain);
    if (!exists) {
      await db.insert(agent_wallet).values({
        userId: credentials.userId,
        walletAddress: credentials.walletAddress,
        chain: credentials.chain,
      });
    }
  }

  console.log(`[AgentStore] Delegation stored for user ${credentials.userId} | chain ${credentials.chain} | wallet ${credentials.walletAddress}`);
}

/**
 * Retrieves active delegation credentials for a user.
 * If chain is specified, only returns credentials for that chain.
 * Returns null if user hasn't delegated or has revoked.
 */
export async function getDelegationCredentials(
  userId: string,
  chain?: WalletChain
): Promise<DelegationCredentials | null> {
  let query = db.select()
    .from(agent_delegation)
    .where(
      chain
        ? and(eq(agent_delegation.userId, userId), eq(agent_delegation.chain, chain))
        : eq(agent_delegation.userId, userId)
    )
    .orderBy(desc(agent_delegation.delegatedAt))
    .limit(1);

  const records = await query;

  if (records.length === 0) return null;
  const creds = records[0];
  if (creds.revokedAt) return null;

  return {
    userId: creds.userId,
    walletId: creds.walletId,
    walletApiKey: creds.walletApiKey,
    keyShare: creds.keyShare,
    walletAddress: creds.walletAddress,
    chain: creds.chain as any,
    delegatedAt: creds.delegatedAt,
    revokedAt: creds.revokedAt ?? undefined,
  } as DelegationCredentials;
}

/**
 * Revokes delegation for a user. The AI agent can no longer sign on their behalf.
 * If chain is specified, only revokes for that chain.
 * Note: Does NOT remove the embedded wallet — user can re-enable later.
 */
export async function revokeDelegation(
  userId: string,
  chain?: WalletChain
): Promise<boolean> {
  const records = await db.select()
    .from(agent_delegation)
    .where(
      chain
        ? and(eq(agent_delegation.userId, userId), eq(agent_delegation.chain, chain))
        : eq(agent_delegation.userId, userId)
    )
    .orderBy(desc(agent_delegation.delegatedAt))
    .limit(1);

  if (records.length === 0 || records[0].revokedAt) return false;

  await db.update(agent_delegation)
    .set({ revokedAt: new Date() })
    .where(eq(agent_delegation.id, records[0].id));

  console.log(`[AgentStore] Delegation revoked for user ${userId} (chain: ${chain || "any"})`);
  return true;
}

/**
 * Checks if a user has active delegation, optionally for a specific chain.
 */
export async function hasDelegation(
  userId: string,
  chain?: WalletChain
): Promise<boolean> {
  const creds = await getDelegationCredentials(userId, chain);
  return creds !== null;
}

/**
 * Gets the embedded wallet address for a user (EVM by default).
 * Checks embeddedWalletStore first, then falls back to delegation credentials.
 */
export async function getUserAgentWalletAddress(
  userId: string,
  chain: WalletChain = "evm"
): Promise<string | null> {
  // First check explicit registration
  const registered = await getEmbeddedWalletAddress(userId, chain);
  if (registered) return registered;
  // Fallback to delegation credentials
  const creds = await getDelegationCredentials(userId, chain);
  return creds?.walletAddress ?? null;
}



// ─── Transaction Audit Log ──────────────────────────────────────────────────

/**
 * Records an agent-executed transaction for audit and user visibility.
 */
export async function recordAgentTransaction(
  input: RecordTransactionInput
): Promise<AgentTransaction> {
  const id = `atx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date();

  await db.insert(agent_transaction).values({
    id,
    userId: input.userId,
    walletAddress: input.walletAddress,
    operationType: input.operationType,
    amount: input.amount,
    signature: input.signature,
    metadata: input.metadata,
    createdAt
  });

  console.log(
    `[AgentStore] Tx recorded: ${input.operationType} | $${input.amount} | user:${input.userId} | wallet:${input.walletAddress.slice(0, 10)}...`
  );

  return {
    id,
    ...input,
    createdAt
  };
}

/**
 * Gets recent agent transactions for a user (for display in settings).
 */
export async function getRecentTransactions(
  userId: string,
  limit: number = 20
): Promise<AgentTransaction[]> {
  const results = await db.select()
    .from(agent_transaction)
    .where(eq(agent_transaction.userId, userId))
    .orderBy(desc(agent_transaction.createdAt))
    .limit(limit);

  return results.map(tx => ({
    id: tx.id,
    userId: tx.userId,
    walletAddress: tx.walletAddress,
    operationType: tx.operationType,
    amount: tx.amount,
    signature: tx.signature,
    metadata: tx.metadata as Record<string, unknown> | undefined,
    createdAt: tx.createdAt
  }));
}

/**
 * Gets the total spend for a user in the last 24 hours.
 */
export async function get24hSpend(userId: string): Promise<number> {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const transactions = await db.select()
    .from(agent_transaction)
    .where(
      and(
        eq(agent_transaction.userId, userId),
        gte(agent_transaction.createdAt, twentyFourHoursAgo)
      )
    );

  return transactions.reduce((sum, tx) => {
      const cleanStr = tx.amount.replace(/[^0-9.]/g, '');
      const val = parseFloat(cleanStr);
      return sum + (isNaN(val) ? 0 : val);
  }, 0);
}
