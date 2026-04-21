/**
 * Dynamic Delegated Wallet Service
 * 
 * Server-side service for autonomous AI execution using the USER's embedded wallet
 * via Dynamic's Delegated Access pattern.
 * 
 * Flow:
 * 1. User creates an embedded wallet (MPC) via Dynamic SDK on the frontend
 * 2. User opts into "Agent Automation" — approves delegation
 * 3. Dynamic sends delegation credentials (walletId, walletApiKey, keyShare) via webhook
 * 4. We store these encrypted credentials per-user in the database
 * 5. AI agent uses these credentials to sign transactions ON BEHALF of the user
 * 6. User can revoke delegation at any time
 * 
 * The user OWNS the wallet. The AI acts as a delegate.
 * The user funds their own wallet. The AI signs from it.
 */

// @ts-ignore — exports exist at runtime (verified in index.esm.js) but .d.ts has broken src/ resolution
import { createDelegatedEvmWalletClient, delegatedSignMessage, delegatedSignTransaction, delegatedSignTypedData } from "@dynamic-labs-wallet/node-evm";
import type { TransactionSerializable } from "viem";

// ─── Configuration ──────────────────────────────────────────────────────────

const DYNAMIC_ENVIRONMENT_ID = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID;
const DYNAMIC_API_KEY = process.env.DYNAMIC_API_TOKEN; // Server-side API key

// ─── Types ──────────────────────────────────────────────────────────────────

/** Delegation credentials received from Dynamic webhook per-user */
export interface DelegationCredentials {
  walletId: string;
  walletApiKey: string;
  keyShare: unknown; // ServerKeyShare (opaque to us, from Dynamic webhook)
  walletAddress: string;
  chain: "evm" | "svm";
  userId: string;
  delegatedAt: Date;
  revokedAt?: Date;
}

// ─── Singleton Client ───────────────────────────────────────────────────────

let evmDelegatedClient: any = null;

function getEvmDelegatedClient() {
  if (!DYNAMIC_ENVIRONMENT_ID || !DYNAMIC_API_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID or DYNAMIC_API_TOKEN for delegated access"
    );
  }
  if (!evmDelegatedClient) {
    evmDelegatedClient = createDelegatedEvmWalletClient({
      environmentId: DYNAMIC_ENVIRONMENT_ID,
      apiKey: DYNAMIC_API_KEY,
    });
  }
  return evmDelegatedClient;
}

// ─── Core Signing Operations ────────────────────────────────────────────────

/**
 * Signs a message using the user's delegated embedded wallet.
 */
export async function signMessageForUser(
  credentials: DelegationCredentials,
  message: string
): Promise<string> {
  const client = getEvmDelegatedClient();
  return delegatedSignMessage(client, {
    walletId: credentials.walletId,
    walletApiKey: credentials.walletApiKey,
    keyShare: credentials.keyShare,
    message,
  });
}

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as allChains from "viem/chains";
import { getAgentPrivateKey } from "./agent-wallet-store";

/**
 * Signs EIP-712 typed data using the user's delegated embedded wallet.
 * Used for x402 TransferWithAuthorization (subscription payments from user's wallet).
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
  // Graceful fallback for local development or users who haven't linked a Dynamic Embedded Wallet via webhook
  if (credentials.walletApiKey === "server-managed") {
      const privateKey = await getAgentPrivateKey(credentials.userId);
      if (!privateKey) throw new Error("Fallback server wallet not found in database.");
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const walletClient = createWalletClient({ account, transport: http() });
      return await walletClient.signTypedData(typedData as any);
  }

  const client = getEvmDelegatedClient();
  const cleanWalletId = credentials.walletId.replace(/^server-managed-/, "");
  return delegatedSignTypedData(client, {
    walletId: cleanWalletId,
    walletApiKey: credentials.walletApiKey,
    keyShare: credentials.keyShare,
    typedData,
  });
}

/**
 * Signs and optionally broadcasts an EVM transaction using the user's delegated wallet.
 * Used for relay swaps, token approvals, etc.
 */
export async function signTransactionForUser(
  credentials: DelegationCredentials,
  transaction: TransactionSerializable
): Promise<string> {
  // Graceful fallback for local development or users who haven't linked a Dynamic Embedded Wallet via webhook
  if (credentials.walletApiKey === "server-managed") {
      const privateKey = await getAgentPrivateKey(credentials.userId);
      if (!privateKey) throw new Error("Fallback server wallet not found in database.");
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const targetChain = Object.values(allChains).find(c => c.id === transaction.chainId) || allChains.mainnet;
      const walletClient = createWalletClient({ account, chain: targetChain as any, transport: http() });
      return await walletClient.signTransaction(transaction as any);
  }

  const client = getEvmDelegatedClient();
  const cleanWalletId = credentials.walletId.replace(/^server-managed-/, "");
  return delegatedSignTransaction(client, {
    walletId: cleanWalletId,
    walletApiKey: credentials.walletApiKey,
    keyShare: credentials.keyShare,
    transaction,
  });
}

/**
 * Checks if the delegated access service is properly configured.
 */
export function isDelegatedAccessEnabled(): boolean {
  return !!(DYNAMIC_ENVIRONMENT_ID && DYNAMIC_API_KEY);
}
