/**
 * Agent Identity & Balance Tools
 * 
 * Provides the AI with tools to check its own agent wallet address,
 * BNB balance (gas), and specific token balances.
 */

import { tool } from "ai";
import { z } from "zod";
import { getUserAgentWalletAddress } from "@/lib/agent/agent-wallet-store";
import { createPublicClient, http, fallback, formatEther } from "viem";
import { bsc } from "viem/chains";

const BSC_RPC = process.env.BNBCHAIN_RPC_URL || "https://bsc-dataseed1.binance.org";

function getPublicClient() {
  return createPublicClient({
    chain: bsc,
    transport: http(BSC_RPC, { timeout: 30000 }),
  });
}

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" as const }],
    outputs: [{ name: "", type: "uint256" as const }],
  },
  {
    name: "decimals",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint8" as const }],
  },
] as const;

/**
 * Returns the agent's wallet address and native balances (BNB/SOL).
 */
export const createGetAgentWalletInfoTool = (userId: string) =>
  tool({
    description: "REQUIRED: Get the AI agent's own wallet addresses and native balances (BNB on BSC, SOL on Solana). You MUST call this at the start of any trading lifecycle to know where funds are located.",
    parameters: z.object({}),
    execute: async () => {
      try {
        const evmAddress = await getUserAgentWalletAddress(userId, "evm");
        const solanaAddress = await getUserAgentWalletAddress(userId, "solana");
        
        if (!evmAddress && !solanaAddress) {
          return { error: "No agent wallet found for this user." };
        }

        const result: any = {};

        if (evmAddress) {
          const client = getPublicClient();
          const balance = await client.getBalance({ address: evmAddress as `0x${string}` });
          result.evm = {
            address: evmAddress,
            bnbBalance: formatEther(balance),
            chain: "BSC (56)",
            explorer: `https://bscscan.com/address/${evmAddress}`
          };
        }

        if (solanaAddress) {
          const { Connection, PublicKey } = await import("@solana/web3.js");
          const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
          const connection = new Connection(rpcUrl);
          const balanceLamports = await connection.getBalance(new PublicKey(solanaAddress));
          result.solana = {
            address: solanaAddress,
            solBalance: (balanceLamports / 1e9).toString(),
            chain: "Solana",
            explorer: `https://solscan.io/account/${solanaAddress}`
          };
        }

        return result;
      } catch (error: any) {
        return { error: error.message || "Failed to fetch agent wallet info." };
      }
    },
  });

/**
 * Returns the agent's balance for a specific token (EVM or Solana).
 */
export const createGetAgentTokenBalanceTool = (userId: string) =>
  tool({
    description: "REQUIRED: Get the AI agent's balance for a specific token. Auto-detects EVM (0x...) vs Solana (base58) based on token address format. You MUST call this before selling to ensure you have positive balance.",
    parameters: z.object({
      tokenAddress: z.string().describe("The token contract address (0x... for EVM, base58 for Solana)"),
    }),
    execute: async ({ tokenAddress }) => {
      try {
        const isSolana = !tokenAddress.startsWith("0x");

        if (isSolana) {
          const solanaAddress = await getUserAgentWalletAddress(userId, "solana");
          if (!solanaAddress) return { error: "No Solana agent wallet found." };

          const { Connection, PublicKey } = await import("@solana/web3.js");
          const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
          const connection = new Connection(rpcUrl);
          
          const mintPubkey = new PublicKey(tokenAddress);
          const walletPubkey = new PublicKey(solanaAddress);
          const tokenProgramId = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
          const associatedTokenProgramId = new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL");
          const [ata] = PublicKey.findProgramAddressSync(
            [walletPubkey.toBuffer(), tokenProgramId.toBuffer(), mintPubkey.toBuffer()],
            associatedTokenProgramId,
          );
          
          try {
            const balanceInfo = await connection.getTokenAccountBalance(ata);
            return {
              tokenAddress,
              balance: balanceInfo.value.uiAmountString,
              rawBalance: balanceInfo.value.amount,
              decimals: balanceInfo.value.decimals
            };
          } catch (e: any) {
            // Token account might not exist if balance is 0
            if (e.message?.includes("could not find account")) {
              return { tokenAddress, balance: "0", rawBalance: "0", decimals: 0 };
            }
            throw e;
          }
        } else {
          // EVM logic
          const evmAddress = await getUserAgentWalletAddress(userId, "evm");
          if (!evmAddress) return { error: "No EVM agent wallet found." };

          const client = getPublicClient();
          
          // 1. Get balance
          const balance = await client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [evmAddress as `0x${string}`],
          });

          // 2. Get decimals
          const decimals = await client.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals",
          });

          const formattedBalance = Number(balance) / Math.pow(10, decimals);

          return {
            tokenAddress,
            balance: formattedBalance.toString(),
            rawBalance: balance.toString(),
            decimals
          };
        }
      } catch (error: any) {
        return { error: error.message || "Failed to fetch token balance." };
      }
    },
  });
