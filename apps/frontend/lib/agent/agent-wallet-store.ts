/**
 * Agent Wallet Store — User Delegation Credentials
 * 
 * Manages per-user delegation credentials, spend tracking, and audit logging.
 * 
 * Architecture:
 * - Each user who enables "Agent Automation" gets delegation credentials stored here
 * - Credentials come from Dynamic's delegation webhook (walletId, walletApiKey, keyShare)
 * - Spend limits are user-configurable (with platform-level defaults)
 * - All agent-executed transactions are logged and visible to the user
 * - Users can revoke delegation at any time
 * 
 * Storage: Migrated to Postgres/Drizzle.
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
 * Uses viem to generate a fresh EVM private key + address.
 * The private key is stored encrypted in Postgres.
 */
export async function createAgentWallet(userId: string): Promise<string> {
  const { generatePrivateKey, privateKeyToAccount } = await import("viem/accounts");

  // Check if user already has a wallet
  const existing = await getEmbeddedWalletAddress(userId);
  if (existing) return existing;

  // Generate a fresh key pair
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  const walletAddress = account.address;

  // Store the private key securely encrypted
  await db.insert(agent_wallet).values({
    userId,
    walletAddress,
    privateKeyEncrypted: encryptSecret(privateKey),
  });

  console.log(`[AgentStore] Agent wallet created for user ${userId}: ${walletAddress}`);
  return walletAddress;
}

/**
 * Gets the private key for a user's agent wallet (for signing).
 * Returns null if no agent wallet exists.
 */
export async function getAgentPrivateKey(
  userId: string
): Promise<string | null> {
  const records = await db.select().from(agent_wallet).where(eq(agent_wallet.userId, userId));
  if (records.length === 0 || !records[0].privateKeyEncrypted) return null;
  return decryptSecret(records[0].privateKeyEncrypted);
}

// ─── Agent Automation Enable/Disable ────────────────────────────────────────

/**
 * Enables agent automation for a user with a server-managed wallet.
 * Creates a delegation record that marks the agent as active.
 * The server-managed wallet's private key is used directly for signing.
 */
export async function enableAgentAutomation(
  userId: string,
  walletAddress: string
): Promise<void> {
  await db.insert(agent_delegation).values({
    userId,
    walletId: `server-managed-${userId}`,
    walletApiKey: "server-managed",
    keyShare: "server-managed", // required column natively
    walletAddress,
    chain: "evm",
  });
  console.log(`[AgentStore] Agent automation enabled for user ${userId} | wallet ${walletAddress}`);
}

// ─── Embedded Wallet Registration ───────────────────────────────────────────

/**
 * Registers a user's embedded wallet address (manual override).
 * Called when the user creates an embedded wallet from the Agent Automation UI.
 */
export async function registerEmbeddedWallet(
  userId: string,
  walletAddress: string
): Promise<void> {
  // We use standard insert but if they already had one we shouldn't crash, 
  // though typically this is a 1-to-1 mapping workflow.
  await db.insert(agent_wallet).values({
    userId,
    walletAddress,
    privateKeyEncrypted: null, // manual override so no serverside pk
  });
  console.log(`[AgentStore] Embedded wallet registered for user ${userId}: ${walletAddress}`);
}

/**
 * Gets the registered embedded wallet address for a user.
 */
export async function getEmbeddedWalletAddress(
  userId: string
): Promise<string | null> {
  const records = await db.select().from(agent_wallet).where(eq(agent_wallet.userId, userId)).orderBy(desc(agent_wallet.createdAt)).limit(1);
  return records.length > 0 ? records[0].walletAddress : null;
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
    const exists = await getEmbeddedWalletAddress(credentials.userId);
    if (!exists) {
      await db.insert(agent_wallet).values({
        userId: credentials.userId,
        walletAddress: credentials.walletAddress,
      });
    }
  }

  console.log(`[AgentStore] Delegation stored for user ${credentials.userId} | wallet ${credentials.walletAddress}`);
}

/**
 * Retrieves active delegation credentials for a user.
 * Returns null if user hasn't delegated or has revoked.
 */
export async function getDelegationCredentials(
  userId: string
): Promise<DelegationCredentials | null> {
  const records = await db.select()
    .from(agent_delegation)
    .where(eq(agent_delegation.userId, userId))
    .orderBy(desc(agent_delegation.delegatedAt))
    .limit(1);

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
 * Note: Does NOT remove the embedded wallet — user can re-enable later.
 */
export async function revokeDelegation(userId: string): Promise<boolean> {
  const records = await db.select()
    .from(agent_delegation)
    .where(eq(agent_delegation.userId, userId))
    .orderBy(desc(agent_delegation.delegatedAt))
    .limit(1);

  if (records.length === 0 || records[0].revokedAt) return false;

  await db.update(agent_delegation)
    .set({ revokedAt: new Date() })
    .where(eq(agent_delegation.id, records[0].id));

  console.log(`[AgentStore] Delegation revoked for user ${userId}`);
  return true;
}

/**
 * Checks if a user has active delegation.
 */
export async function hasDelegation(userId: string): Promise<boolean> {
  const creds = await getDelegationCredentials(userId);
  return creds !== null;
}

/**
 * Gets the embedded wallet address for a user.
 * Checks embeddedWalletStore first, then falls back to delegation credentials.
 */
export async function getUserAgentWalletAddress(userId: string): Promise<string | null> {
  // First check explicit registration
  const registered = await getEmbeddedWalletAddress(userId);
  if (registered) return registered;
  // Fallback to delegation credentials
  const creds = await getDelegationCredentials(userId);
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
