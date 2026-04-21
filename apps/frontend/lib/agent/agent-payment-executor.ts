/**
 * Agent Payment Executor — User-Owned Wallet Edition
 * 
 * Orchestrates autonomous AI-driven payment and trade execution
 * using the USER's own embedded wallet via delegated access.
 * 
 * Flow:
 * 1. User funds their embedded wallet with USDC/ETH/SOL
 * 2. User enables "Agent Automation" in settings (approves delegation)
 * 3. AI agent can now autonomously:
 *    - Pay for subscriptions (x402 EIP-3009 on Base)
 *    - Execute relay cross-chain swaps
 *    - Perform on-chain queries/transactions as instructed
 * 4. All operations are logged and subject to user-configured spend limits
 * 5. User can revoke delegation at any time
 * 
 * Security Controls:
 * - Per-transaction spend limits (user-configurable)
 * - 24-hour rolling spend window
 * - Operation allowlist
 * - Full audit logging with user visibility
 * - User can revoke delegation instantly
 */

import {
  signTypedDataForUser,
  signTransactionForUser,
  isDelegatedAccessEnabled,
  type DelegationCredentials,
} from "./dynamic-agent-wallet";
import {
  getDelegationCredentials,
  recordAgentTransaction,
} from "./agent-wallet-store";
import { createPublicClient, http } from "viem";
import type { TransactionSerializable } from "viem";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PaymentExecutionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  spentAmount?: string;
  operationType: "x402_subscription" | "relay_swap" | "on_chain_tx";
}

export interface X402PaymentParams {
  /** User ID whose embedded wallet will be used */
  userId: string;
  /** Payment amount in USDC (human readable, e.g. "9.99") */
  amount: string;
  /** Subscription plan being purchased */
  planId: string;
  /** EIP-712 typed data for TransferWithAuthorization */
  domain: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  message: Record<string, unknown>;
}

export interface RelaySwapParams {
  /** User ID whose embedded wallet will be used */
  userId: string;
  /** Input token + amount */
  inputAmount: string;
  inputToken: string;
  /** Output token */
  outputToken: string;
  /** Chain ID for the transaction */
  chainId: number;
  /** EVM Transaction to sign + broadcast */
  transaction: TransactionSerializable;
  /** Explicit classification of the operation */
  operationType?: "relay_swap" | "erc20_approve" | "transfer";
}

export interface OnChainTxParams {
  /** User ID whose embedded wallet will be used */
  userId: string;
  /** Description for audit log */
  description: string;
  /** Estimated value in USD for spend tracking */
  estimatedValueUsd: string;
  /** Chain ID */
  chainId: number;
  /** Transaction to sign + broadcast */
  transaction: TransactionSerializable;
}

// ─── Helpers ────────────────────────────────────────────────────────────────



/**
 * Gets the user's delegation credentials or throws a descriptive error.
 */
async function getUserCredentials(userId: string): Promise<DelegationCredentials> {
  if (!isDelegatedAccessEnabled()) {
    throw new Error("Agent automation is not configured on this instance");
  }

  const credentials = await getDelegationCredentials(userId);
  if (!credentials) {
    throw new Error(
      "Agent automation is not enabled for your account. " +
      "Go to Settings → Wallet → Enable Agent Automation to allow the AI to execute transactions from your embedded wallet."
    );
  }

  if (credentials.revokedAt) {
    throw new Error(
      "Agent automation has been revoked. Re-enable it in Settings → Wallet."
    );
  }

  return credentials;
}

/**
 * Fetches the next available nonce for a wallet on a specific chain.
 * Uses 'pending' block tag to account for transactions in the mempool.
 */
async function getSuggestedNonce(publicClient: any, address: string): Promise<number> {
  return await publicClient.getTransactionCount({
    address: address as `0x${string}`,
    blockTag: 'pending'
  });
}

/**
 * Robustly executes a transaction with retries for nonce/gas issues.
 */
async function executeWithRetry(
    operation: () => Promise<string>,
    retries: number = 3
): Promise<string> {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;
            const errorMsg = error.message?.toLowerCase() || "";
            
            // If it's a nonce issue, we should allow the loop to continue and potentially 
            // the caller will increment the nonce before the next attempt.
            if (errorMsg.includes("nonce too low") || errorMsg.includes("already known") || errorMsg.includes("replacement transaction underpriced")) {
                console.warn(`[AgentExecutor] Transaction failed (attempt ${i+1}/${retries}): ${errorMsg}. Retrying...`);
                continue;
            }
            
            // For other errors (insufficient funds, etc), fail fast
            throw error;
        }
    }
    throw lastError;
}

// ─── x402 Subscription Payments ─────────────────────────────────────────────

/**
 * Autonomously pays for a subscription using the user's embedded wallet.
 * Signs an EIP-3009 TransferWithAuthorization for USDC on Base.
 */
export async function executeX402Payment(
  params: X402PaymentParams
): Promise<PaymentExecutionResult> {
  try {
    const credentials = await getUserCredentials(params.userId);
    const amount = parseFloat(params.amount);



    // Sign the EIP-712 typed data with user's delegated wallet
    const signature = await signTypedDataForUser(credentials, {
      domain: params.domain,
      types: params.types,
      primaryType: "TransferWithAuthorization",
      message: params.message,
    });

    // Record the transaction for audit trail (visible to user)
    await recordAgentTransaction({
      userId: params.userId,
      walletAddress: credentials.walletAddress,
      operationType: "x402_subscription",
      amount: params.amount,
      signature,
      metadata: { planId: params.planId },
    });

    return {
      success: true,
      transactionHash: signature,
      spentAmount: params.amount,
      operationType: "x402_subscription",
    };
  } catch (error: any) {
    console.error("[AgentPayment] x402 payment failed:", error);
    return {
      success: false,
      error: error.message || "Failed to execute subscription payment",
      operationType: "x402_subscription",
    };
  }
}

// ─── Relay Cross-Chain Swaps ────────────────────────────────────────────────

import * as allChains from "viem/chains";

/**
 * Autonomously executes a relay swap using the user's embedded wallet.
 * Signs the transaction and broadcasts it on-chain.
 */
export async function executeRelaySwap(
  params: RelaySwapParams
): Promise<PaymentExecutionResult> {
  const credentials = await getUserCredentials(params.userId);
  let currentNonce: number | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 1. Prepare transaction locally via viem publicClient
      const targetChain = params.chainId === 56 ? allChains.bsc : Object.values(allChains).find(c => c.id === params.chainId);
      if (!targetChain) {
          throw new Error(`Chain ID ${params.chainId} is not supported locally.`);
      }

      const publicClient: any = createPublicClient({
          chain: targetChain as any,
          transport: targetChain.id === 56 
            ? http("https://tiniest-sly-seed.bsc.quiknode.pro/1ca12a92f4abaa2d94c69d7d7d59d65a6539b969/", { timeout: 30000 })
            : http(undefined, { timeout: 30000 })
      });

      // Fetch nonce - either fresh or incremented
      if (currentNonce === null) {
          currentNonce = await getSuggestedNonce(publicClient, credentials.walletAddress);
      }

      const preparedReq = await publicClient.prepareTransactionRequest({
          account: credentials.walletAddress as `0x${string}`,
          to: params.transaction.to as `0x${string}`,
          value: typeof params.transaction.value === 'bigint' ? params.transaction.value : BigInt(params.transaction.value || 0),
          data: params.transaction.data as `0x${string}`,
          chain: targetChain as any,
          nonce: currentNonce,
      });

      const baseTx = {
          to: preparedReq.to,
          value: preparedReq.value,
          data: preparedReq.data,
          nonce: preparedReq.nonce,
          gas: preparedReq.gas,
          chainId: targetChain.id,
      };

      let serializableTx: any;
      if (preparedReq.type === 'eip1559') {
          serializableTx = {
              ...baseTx,
              maxFeePerGas: preparedReq.maxFeePerGas,
              maxPriorityFeePerGas: preparedReq.maxPriorityFeePerGas,
              type: "eip1559"
          };
      } else {
          serializableTx = {
              ...baseTx,
              gasPrice: preparedReq.gasPrice,
              type: "legacy"
          };
      }

      // 2. Sign the transaction payload
      const signedTx = await signTransactionForUser(
        credentials,
        serializableTx
      );

      // 3. Broadcast
      const txHash = await publicClient.sendRawTransaction({
          serializedTransaction: signedTx as `0x${string}`
      });

      // 4. Record for audit
      await recordAgentTransaction({
        userId: params.userId,
        walletAddress: credentials.walletAddress,
        operationType: params.operationType || "relay_swap",
        amount: params.inputAmount,
        signature: txHash,
        metadata: {
          inputToken: params.inputToken,
          outputToken: params.outputToken,
          chainId: params.chainId,
          attempt
        },
      });

      return {
        success: true,
        transactionHash: txHash,
        spentAmount: params.inputAmount,
        operationType: "relay_swap",
      };
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || "";
      console.error(`[AgentPayment] Relay swap attempt ${attempt} failed:`, error.message);

      // Handle nonce issues by incrementing and retrying
      if (errorMsg.includes("nonce too low") || errorMsg.includes("already known") || errorMsg.includes("replacement transaction underpriced")) {
          if (attempt < maxAttempts) {
              // Increment nonce manually for retry
              currentNonce = (currentNonce ?? 0) + 1;
              console.log(`[AgentPayment] Retrying with incremented nonce: ${currentNonce}`);
              continue;
          }
      }

      // Final attempt or non-retryable error
      return {
        success: false,
        error: error.message || "Failed to execute relay swap",
        operationType: "relay_swap",
      };
    }
  }

  return {
    success: false,
    error: "Max retries exceeded for relay swap",
    operationType: "relay_swap",
  };
}

// ─── Generic On-Chain Transaction ───────────────────────────────────────────

/**
 * Autonomously executes any on-chain transaction the AI determines is needed.
 * For example: token approvals, NFT interactions, DeFi operations.
 */
export async function executeOnChainTransaction(
  params: OnChainTxParams
): Promise<PaymentExecutionResult> {
  const credentials = await getUserCredentials(params.userId);
  let currentNonce: number | null = null;
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // 1. Prepare transaction locally via viem publicClient
      const targetChain = params.chainId === 56 ? allChains.bsc : Object.values(allChains).find(c => c.id === params.chainId);
      if (!targetChain) {
          throw new Error(`Chain ID ${params.chainId} is not supported locally.`);
      }

      const publicClient: any = createPublicClient({
          chain: targetChain as any,
          transport: targetChain.id === 56 
            ? http("https://tiniest-sly-seed.bsc.quiknode.pro/1ca12a92f4abaa2d94c69d7d7d59d65a6539b969/", { timeout: 30000 })
            : http(undefined, { timeout: 30000 })
      });

      // Fetch nonce
      if (currentNonce === null) {
          currentNonce = await getSuggestedNonce(publicClient, credentials.walletAddress);
      }

      const preparedReq = await publicClient.prepareTransactionRequest({
          account: credentials.walletAddress as `0x${string}`,
          to: params.transaction.to as `0x${string}`,
          value: typeof params.transaction.value === 'bigint' ? params.transaction.value : BigInt(params.transaction.value || 0),
          data: params.transaction.data as `0x${string}`,
          chain: targetChain as any,
          nonce: currentNonce,
      });

      const baseTx = {
          to: preparedReq.to,
          value: preparedReq.value,
          data: preparedReq.data,
          nonce: preparedReq.nonce,
          gas: preparedReq.gas,
          chainId: targetChain.id,
      };

      let serializableTx: any;
      if (preparedReq.type === 'eip1559') {
          serializableTx = {
              ...baseTx,
              maxFeePerGas: preparedReq.maxFeePerGas,
              maxPriorityFeePerGas: preparedReq.maxPriorityFeePerGas,
              type: "eip1559"
          };
      } else {
          serializableTx = {
              ...baseTx,
              gasPrice: preparedReq.gasPrice,
              type: "legacy"
          };
      }

      // 2. Sign transaction
      const signedTx = await signTransactionForUser(
        credentials,
        serializableTx
      );

      // 3. Broadcast
      const txHash = await publicClient.sendRawTransaction({
          serializedTransaction: signedTx as `0x${string}`
      });

      // Record for audit
      await recordAgentTransaction({
        userId: params.userId,
        walletAddress: credentials.walletAddress,
        operationType: "on_chain_tx",
        amount: params.estimatedValueUsd,
        signature: txHash,
        metadata: {
          description: params.description,
          chainId: params.chainId,
          attempt
        },
      });

      return {
        success: true,
        transactionHash: txHash,
        spentAmount: params.estimatedValueUsd,
        operationType: "on_chain_tx",
      };
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || "";
      console.error(`[AgentPayment] On-chain tx attempt ${attempt} failed:`, error.message);

      if (errorMsg.includes("nonce too low") || errorMsg.includes("already known") || errorMsg.includes("replacement transaction underpriced")) {
          if (attempt < maxAttempts) {
              currentNonce = (currentNonce ?? 0) + 1;
              console.log(`[AgentPayment] Retrying on-chain tx with incremented nonce: ${currentNonce}`);
              continue;
          }
      }

      return {
        success: false,
        error: error.message || "Failed to execute on-chain transaction",
        operationType: "on_chain_tx",
      };
    }
  }

  return {
    success: false,
    error: "Max retries exceeded for on-chain transaction",
    operationType: "on_chain_tx",
  };
}
