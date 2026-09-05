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
import { createPublicClient, http, fallback, parseUnits, parseGwei } from "viem";
import type { TransactionSerializable } from "viem";
import { getNativeCurrencyForChain } from "./swap-error-parser";

// ─── RPC Configuration ──────────────────────────────────────────────────────
const MONAD_RPC = process.env.MONAD_RPC_URL || "https://monad-mainnet.drpc.org";
const BSC_RPC = process.env.BNBCHAIN_RPC_URL || "https://bsc-dataseed1.binance.org";
const BASE_RPC = process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org";
const ARBITRUM_RPC = process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc";
const POLYGON_RPC = process.env.POLYGON_RPC_URL || "https://polygon-rpc.com";
const OPTIMISM_RPC = process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io";

function getRpcTransport(chainId: number) {
  if (chainId === 1) {
    const custom = process.env.ETH_MAINNET_RPC_URL;
    if (custom) return http(custom, { timeout: 10000, retryCount: 1 });
    return fallback([
      http("https://ethereum-rpc.publicnode.com", { timeout: 8000, retryCount: 1 }),
      http("https://rpc.mevblocker.io", { timeout: 8000, retryCount: 1 }),
    ]);
  }
  if (chainId === 56) return http(BSC_RPC, { timeout: 10000, retryCount: 1 });
  if (chainId === 143) return http(MONAD_RPC, { timeout: 10000, retryCount: 1 });
  if (chainId === 8453) return http(BASE_RPC, { timeout: 10000, retryCount: 1 });
  if (chainId === 42161) return http(ARBITRUM_RPC, { timeout: 10000, retryCount: 1 });
  if (chainId === 137) return http(POLYGON_RPC, { timeout: 10000, retryCount: 1 });
  if (chainId === 10) return http(OPTIMISM_RPC, { timeout: 10000, retryCount: 1 });
  if (chainId === 5042002) return http("https://rpc.testnet.arc.network", { timeout: 10000, retryCount: 1 });
  return http(undefined, { timeout: 10000, retryCount: 1 });
}

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
  /** EVM Transaction to sign + broadcast, OR Solana transaction payload */
  transaction: any; // TransactionSerializable | { solanaTransaction: string }
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
  /** Whether to wait for on-chain receipt confirmation (default: true) */
  waitForReceipt?: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────



/**
 * Gets the user's delegation credentials or throws a descriptive error.
 */
async function getUserCredentials(userId: string, chainId?: number): Promise<DelegationCredentials> {
  if (!isDelegatedAccessEnabled()) {
    throw new Error("Agent automation is not configured on this instance");
  }

  let chain: "evm" | "solana" | undefined = undefined;
  if (chainId !== undefined) {
    chain = chainId === 792703809 ? "solana" : "evm";
  }

  const credentials = await getDelegationCredentials(userId, chain);
  if (!credentials) {
    throw new Error(
      "Agent automation is not enabled for your account. " +
      "Go to Settings → Wallet Settings → Enable Agent Automation to allow the AI to execute transactions from your embedded wallet."
    );
  }

  if (credentials.revokedAt) {
    throw new Error(
      "Agent automation has been revoked. Re-enable it in Settings → Wallet Settings."
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
      if (errorMsg.includes("nonce too low") || errorMsg.includes("already known") || errorMsg.includes("replacement transaction underpriced") || errorMsg.includes("higher priority")) {
        console.warn(`[AgentExecutor] Transaction failed (attempt ${i + 1}/${retries}): ${errorMsg}. Retrying...`);
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
    const credentials = await getUserCredentials(params.userId, 8453);
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
  const credentials = await getUserCredentials(params.userId, params.chainId);
  let currentNonce: number | null = null;
  const maxAttempts = 3;

  // ─── Solana Execution Branch ───
  if (params.chainId === 792703809) {
    try {
      console.log(`[AgentPayment] Executing Solana relay swap...`);
      const { Connection, VersionedTransaction, PublicKey } = await import("@solana/web3.js");
      const { signSolanaTransaction } = await import("./dynamic-agent-wallet");

      if (!params.transaction?.solanaTransaction) {
        throw new Error("Missing base64 solanaTransaction in Relay payload");
      }

      const txBuffer = Buffer.from(params.transaction.solanaTransaction, "base64");
      const versionedTx = VersionedTransaction.deserialize(txBuffer);

      // Pre-flight Solana Balance Check
      const rpcUrl = process.env.SOLANA_RPC_URL || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";
      const connection = new Connection(rpcUrl, "confirmed");

      const solanaAddress = await (await import("./agent-wallet-store")).getUserAgentWalletAddress(params.userId, "solana") || credentials.walletAddress;
      if (solanaAddress) {
        try {
          const pubkey = new PublicKey(solanaAddress);
          const solBalance = await connection.getBalance(pubkey);
          if (solBalance === 0) {
            console.warn(`[AgentPayment] Pre-flight check: Solana account ${solanaAddress} has 0 SOL`);
            return {
              success: false,
              error: `The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account. Account ${solanaAddress} has 0 SOL on Solana, but funds are required for gas and value.`,
              operationType: "relay_swap",
            };
          }
        } catch (balErr: any) {
          if (balErr?.message?.includes("exceeds the balance")) {
            throw balErr;
          }
          console.warn(`[AgentPayment] Solana pre-flight balance check non-fatal warning:`, balErr?.message || balErr);
        }
      }

      // Sign transaction
      const signedTx = await signSolanaTransaction(params.userId, versionedTx);

      // Broadcast transaction
      console.log(`[AgentPayment] Broadcasting Solana transaction...`);
      const signature = await connection.sendTransaction(signedTx, { skipPreflight: false });

      console.log(`[AgentPayment] Broadcasted! Hash: ${signature}. Waiting for confirmation...`);
      const latestBlockHash = await connection.getLatestBlockhash();

      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: signature
      }, "confirmed");

      console.log(`[AgentPayment] Solana swap confirmed!`);

      // Record for audit
      await recordAgentTransaction({
        userId: params.userId,
        walletAddress: solanaAddress,
        operationType: params.operationType || "relay_swap",
        amount: params.inputAmount,
        signature: signature,
        metadata: {
          inputToken: params.inputToken,
          outputToken: params.outputToken,
          chainId: params.chainId,
          chain: "solana"
        },
      });

      return {
        success: true,
        transactionHash: signature,
        spentAmount: params.inputAmount,
        operationType: "relay_swap",
      };
    } catch (error: any) {
      console.error(`[AgentPayment] Solana relay swap failed:`, error);
      return {
        success: false,
        error: error.message || "Failed to execute Solana relay swap",
        operationType: "relay_swap",
      };
    }
  }
  // ─── EVM Execution Branch ───

  // Resolve chain + publicClient OUTSIDE the try block so they're accessible in catch for retry nonce re-fetch
  const targetChain = params.chainId === 56 ? allChains.bsc : Object.values(allChains).find(c => c.id === params.chainId);
  if (!targetChain) {
    return { success: false, error: `Chain ID ${params.chainId} is not supported locally.`, operationType: "relay_swap" };
  }
  const publicClient: any = createPublicClient({
    chain: targetChain as any,
    transport: getRpcTransport(targetChain.id),
  });

  // ─── EVM Pre-flight Native & Token Balance Check ───
  try {
    const nativeBalance = await publicClient.getBalance({
      address: credentials.walletAddress as `0x${string}`,
    });
    const txValue = typeof params.transaction.value === 'bigint'
      ? params.transaction.value
      : BigInt(params.transaction.value || 0);

    const nativeSymbol = getNativeCurrencyForChain(targetChain.id, targetChain.name);

    if (nativeBalance === 0n) {
      console.warn(`[AgentPayment] Pre-flight check: Account ${credentials.walletAddress} has 0 ${nativeSymbol} on ${targetChain.name}`);
      return {
        success: false,
        error: `The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account. Account ${credentials.walletAddress} has 0 ${nativeSymbol} on ${targetChain.name}, but funds are required for gas and value.`,
        operationType: "relay_swap",
      };
    }

    if (txValue > 0n && nativeBalance < txValue) {
      console.warn(`[AgentPayment] Pre-flight check: Account ${credentials.walletAddress} has insufficient native balance (${nativeBalance} < ${txValue})`);
      return {
        success: false,
        error: `The total cost (gas * gas fee + value) of executing this transaction exceeds the balance of the account. Account ${credentials.walletAddress} has insufficient ${nativeSymbol} on ${targetChain.name} for the transaction value and network gas fee.`,
        operationType: "relay_swap",
      };
    }

    // Check ERC20 token balance if inputToken is an ERC-20 contract
    if (
      params.inputToken &&
      params.inputToken.startsWith("0x") &&
      params.inputToken.toLowerCase() !== "0x0000000000000000000000000000000000000000" &&
      params.inputToken.toLowerCase() !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    ) {
      try {
        const tokenBalance = await publicClient.readContract({
          address: params.inputToken as `0x${string}`,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "balance", type: "uint256" }],
            },
          ] as const,
          functionName: "balanceOf",
          args: [credentials.walletAddress as `0x${string}`],
        });

        if (tokenBalance === 0n) {
          console.warn(`[AgentPayment] Pre-flight check: Account ${credentials.walletAddress} has 0 ERC20 balance for ${params.inputToken}`);
          return {
            success: false,
            error: `transfer amount exceeds balance. Your account ${credentials.walletAddress} has 0 tokens of ${params.inputToken} on ${targetChain.name}.`,
            operationType: "relay_swap",
          };
        }
      } catch {
        // Ignore ERC-20 readContract failures and let standard transaction simulation run
      }
    }
  } catch (balErr: any) {
    if (balErr?.message?.includes("exceeds the balance") || balErr?.message?.includes("transfer amount exceeds balance")) {
      return {
        success: false,
        error: balErr.message,
        operationType: "relay_swap",
      };
    }
    console.warn(`[AgentPayment] EVM pre-flight balance check non-fatal warning:`, balErr?.message || balErr);
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {

      // Fetch nonce - either fresh or incremented
      if (currentNonce === null) {
        currentNonce = await getSuggestedNonce(publicClient, credentials.walletAddress);
      }

      // Monad (chain 143): dRPC rejects eth_estimateGas even without fee hints because it
      // internally computes totalCost = gasLimit × its own feeEstimate, which exceeds the
      // provider's security cap for high-value native transfers. Skip estimation entirely
      // and use a safe hardcoded gas limit. Relay swap txs typically use 200-400k gas;
      // 500k provides adequate headroom. Monad charges for provided gasLimit, not used gas.
      let preparedReq: any;
      if (targetChain.id === 143) {
        const gasLimit = params.transaction.gas ? BigInt(params.transaction.gas) : 500_000n;
        preparedReq = {
          account: credentials.walletAddress as `0x${string}`,
          to: params.transaction.to as `0x${string}`,
          value: typeof params.transaction.value === 'bigint' ? params.transaction.value : BigInt(params.transaction.value || 0),
          data: params.transaction.data as `0x${string}`,
          nonce: currentNonce,
          gas: gasLimit,
          maxFeePerGas: parseGwei('150'),
          maxPriorityFeePerGas: parseGwei('2'),
          type: 'eip1559',
        };
      } else {
        preparedReq = await publicClient.prepareTransactionRequest({
          account: credentials.walletAddress as `0x${string}`,
          to: params.transaction.to as `0x${string}`,
          value: typeof params.transaction.value === 'bigint' ? params.transaction.value : BigInt(params.transaction.value || 0),
          data: params.transaction.data as `0x${string}`,
          chain: targetChain as any,
          nonce: currentNonce,
          gas: params.transaction.gas,
        });

        // Add a 20% gas buffer to prevent Out-Of-Gas reverts on-chain, ONLY if gas wasn't manually overridden
        if (!params.transaction.gas && preparedReq.gas) {
          preparedReq.gas = (preparedReq.gas * 120n) / 100n;
        }
      }

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

      const txHash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`
      });
      console.log(`[AgentPayment] Broadcasted! Hash: ${txHash}. Waiting for confirmation...`);
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 45_000, // 45s — sufficient for BSC/EVM chains
      });

      if (receipt.status !== "success") {
        console.error(`[AgentPayment] Relay swap reverted on-chain: ${txHash}`);
        return {
          success: false,
          transactionHash: txHash,
          error: "Transaction reverted on-chain. This may be due to slippage or protocol conditions.",
          operationType: "relay_swap",
        };
      }

      console.log(`[AgentPayment] Relay swap confirmed!`);

      // 5. Record for audit
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
          attempt,
          gasUsed: receipt.gasUsed.toString(),
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
      if (errorMsg.includes("nonce too low") || errorMsg.includes("already known") || errorMsg.includes("replacement transaction underpriced") || errorMsg.includes("higher priority")) {
        if (attempt < maxAttempts) {
          // Wait briefly for pending txs to settle, then re-fetch the correct nonce
          console.log(`[AgentPayment] Nonce conflict detected, waiting 3s before retry...`);
          await new Promise(r => setTimeout(r, 3000));
          currentNonce = await getSuggestedNonce(publicClient, credentials.walletAddress);
          console.log(`[AgentPayment] Re-fetched nonce: ${currentNonce}. Retrying...`);
          continue;
        }
      }

      // Final attempt or non-retryable error
      return {
        success: false,
        error: error.shortMessage || error.message || "Failed to execute relay swap",
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
  const credentials = await getUserCredentials(params.userId, params.chainId);
  let currentNonce: number | null = null;
  const maxAttempts = 3;

  let targetChain = params.chainId === 56 ? allChains.bsc : Object.values(allChains).find(c => c.id === params.chainId);
  if (!targetChain && params.chainId === 5042002) {
    targetChain = {
      id: 5042002,
      name: 'Arc Testnet',
      nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
      rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } }
    } as any;
  }

  if (!targetChain) {
    throw new Error(`Chain ID ${params.chainId} is not supported locally.`);
  }

  const publicClient: any = createPublicClient({
    chain: targetChain as any,
    transport: getRpcTransport(targetChain.id),
  });

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[AgentPayment] On-chain tx attempt ${attempt}: preparing tx for chain ${params.chainId}...`);

      // Fetch nonce
      if (currentNonce === null) {
        currentNonce = await getSuggestedNonce(publicClient, credentials.walletAddress);
        console.log(`[AgentPayment] Nonce fetched: ${currentNonce}`);
      }

      console.log(`[AgentPayment] Estimating gas...`);

      // Monad (chain 143): dRPC rejects eth_estimateGas even without fee hints because it
      // internally computes totalCost = gasLimit × its own feeEstimate, which exceeds the
      // provider's security cap for high-value native transfers. Skip estimation entirely
      // and use a safe hardcoded gas limit.
      let preparedReq: any;
      if (targetChain.id === 143) {
        const gasLimit = params.transaction.gas ? BigInt(params.transaction.gas) : 500_000n;
        preparedReq = {
          account: credentials.walletAddress as `0x${string}`,
          to: params.transaction.to as `0x${string}`,
          value: typeof params.transaction.value === 'bigint' ? params.transaction.value : BigInt(params.transaction.value || 0),
          data: params.transaction.data as `0x${string}`,
          nonce: currentNonce,
          gas: gasLimit,
          maxFeePerGas: parseGwei('150'),
          maxPriorityFeePerGas: parseGwei('2'),
          type: 'eip1559',
        };
      } else {
        preparedReq = await publicClient.prepareTransactionRequest({
          account: credentials.walletAddress as `0x${string}`,
          to: params.transaction.to as `0x${string}`,
          value: typeof params.transaction.value === 'bigint' ? params.transaction.value : BigInt(params.transaction.value || 0),
          data: params.transaction.data as `0x${string}`,
          chain: targetChain as any,
          nonce: currentNonce,
          gas: params.transaction.gas,
        });

        // Add a 20% gas buffer to prevent Out-Of-Gas reverts on-chain, ONLY if gas wasn't manually overridden
        if (!params.transaction.gas && preparedReq.gas) {
          preparedReq.gas = (preparedReq.gas * 120n) / 100n;
        }
      }
      console.log(`[AgentPayment] Gas estimated: ${preparedReq.gas}, type: ${preparedReq.type}`);

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
      console.log(`[AgentPayment] Signing transaction...`);
      const signedTx = await signTransactionForUser(
        credentials,
        serializableTx
      );
      console.log(`[AgentPayment] Transaction signed. Broadcasting...`);

      // 3. Broadcast
      const txHash = await publicClient.sendRawTransaction({
        serializedTransaction: signedTx as `0x${string}`
      });
      console.log(`[AgentPayment] Broadcasted! Hash: ${txHash}, waiting for confirmation...`);

      if (params.waitForReceipt === false) {
        console.log(`[AgentPayment] Skipping receipt confirmation as requested. Returning success.`);
        // Record for audit even without receipt
        await recordAgentTransaction({
          userId: params.userId,
          walletAddress: credentials.walletAddress,
          operationType: "on_chain_tx",
          amount: params.estimatedValueUsd,
          signature: txHash,
          metadata: {
            description: params.description,
            chainId: params.chainId,
            attempt,
            gasUsed: "0",
          },
        });
        return {
          success: true,
          transactionHash: txHash,
          spentAmount: params.estimatedValueUsd,
          operationType: "on_chain_tx",
        };
      }

      // 4. Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        timeout: 45_000, // 45s — BSC block time is ~3s, plenty of margin
      });

      if (receipt.status !== "success") {
        console.error(`[AgentPayment] On-chain transaction reverted: ${txHash}`);
        return {
          success: false,
          transactionHash: txHash,
          error: "Transaction reverted on-chain. Please check the explorer for details.",
          operationType: "on_chain_tx",
        };
      }

      console.log(`[AgentPayment] On-chain transaction confirmed!`);

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
          attempt,
          gasUsed: receipt.gasUsed.toString(),
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

      if (errorMsg.includes("nonce too low") || errorMsg.includes("already known") || errorMsg.includes("replacement transaction underpriced") || errorMsg.includes("higher priority") || errorMsg.includes("timeout")) {
        if (attempt < maxAttempts) {
          if (errorMsg.includes("timeout")) {
            console.log(`[AgentPayment] Retrying on-chain tx due to signing timeout (attempt ${attempt + 1})...`);
          } else {
            // Wait briefly for pending txs to settle, then re-fetch the correct nonce
            console.log(`[AgentPayment] Nonce conflict detected, waiting 3s before retry...`);
            await new Promise(r => setTimeout(r, 3000));
            currentNonce = await getSuggestedNonce(publicClient, credentials.walletAddress);
            console.log(`[AgentPayment] Re-fetched nonce: ${currentNonce}. Retrying...`);
          }
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

// ─── Arc Nanopayments & Swarm Intelligence (Hackathon) ─────────────────────────

export interface ArcNanopaymentParams {
  userId: string;
  amount: number;
  destinationWallet: string;
}

/**
 * Autonomously pays a micro-invoice on the Arc blockchain using USDC.
 * This satisfies the "Agent-to-Agent Payment Loop" using Circle Nanopayments.
 */
export async function executeArcNanopayment(
  params: ArcNanopaymentParams
): Promise<PaymentExecutionResult> {
  try {
    const ARC_CHAIN_ID = 5042002; // Arc Testnet Chain ID

    console.log(`[AgentPayment] Executing ${params.amount} USDC Nanopayment on Arc to ${params.destinationWallet}...`);

    // On Arc, USDC is the native gas token, so a transfer is just a native value transfer.
    // parseUnits uses 18 decimals since native tokens use 18 decimals.
    const txValue = parseUnits(params.amount.toString(), 18);

    return await executeOnChainTransaction({
      userId: params.userId,
      description: `Nanopayment to Signal Agent`,
      estimatedValueUsd: params.amount.toString(),
      chainId: ARC_CHAIN_ID,
      transaction: {
        to: params.destinationWallet as `0x${string}`,
        value: txValue,
        data: "0x",
      },
      waitForReceipt: true,
    });
  } catch (error: any) {
    console.error("[AgentPayment] Arc Nanopayment failed:", error);
    return {
      success: false,
      error: error.message || "Failed to execute Arc Nanopayment",
      operationType: "on_chain_tx",
    };
  }
}

/**
 * The core Swarm Consumer logic.
 * 1. Pings the Signal Agent
 * 2. Catches the 402 Payment Required
 * 3. Pays the invoice on Arc
 * 4. Retries the request with the transaction receipt
 */
export async function querySignalAgent(
  userId: string,
  imageUrl: string,
  tokenName: string,
  marketData?: any
): Promise<any> {
  // Use the signal agent's URL. In a real environment, this would be an env var pointing to the Vercel deployment.
  const signalAgentUrl = process.env.SIGNAL_AGENT_URL || "http://localhost:3005/api/sentiment";

  console.log(`[Swarm] Querying Signal Agent for ${tokenName}...`);

  // 1. Initial Request
  let response = await fetch(signalAgentUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl, token_name: tokenName, market_data: marketData })
  });

  // 2. Handle x402 Payment Required
  if (response.status === 402) {
    const errorData = await response.json();
    const invoice = errorData.x402_invoice;

    console.log(`[Swarm] 402 Payment Required. Agent requested ${invoice.amount} ${invoice.currency} on ${invoice.chain}.`);

    // 3. Execute Nanopayment on Arc
    const paymentResult = await executeArcNanopayment({
      userId,
      amount: invoice.amount,
      destinationWallet: invoice.destination_wallet
    });

    if (!paymentResult.success || !paymentResult.transactionHash) {
      throw new Error(`Failed to pay Signal Agent invoice: ${paymentResult.error}`);
    }

    console.log(`[Swarm] Payment successful! TxHash: ${paymentResult.transactionHash}. Retrying request...`);

    // 4. Retry with Receipt Header
    response = await fetch(signalAgentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-402-receipt": paymentResult.transactionHash // Provide the Arc txHash as proof
      },
      body: JSON.stringify({ image_url: imageUrl, token_name: tokenName, market_data: marketData })
    });
  }

  if (!response.ok) {
    throw new Error(`Signal Agent failed: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`[Swarm] Received Intelligence:`, data);
  return data;
}
