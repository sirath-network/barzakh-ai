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

const BSC_RPC_URL =
  process.env.BSC_RPC_URL ||
  "https://bnb-mainnet.g.alchemy.com/v2/QmCrH0w-wPKCJ7hBHKn1t";

function getPublicClient() {
  return createPublicClient({
    chain: bsc,
    transport: http("https://tiniest-sly-seed.bsc.quiknode.pro/1ca12a92f4abaa2d94c69d7d7d59d65a6539b969/", { timeout: 30000 }),
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
 * Returns the agent's wallet address and BNB balance on BSC.
 */
export const createGetAgentWalletInfoTool = (userId: string) =>
  tool({
    description: "REQUIRED: Get the AI agent's own wallet address and BNB balance on BSC. You MUST call this at the start of any trading lifecycle to know where funds are located.",
    parameters: z.object({}),
    execute: async () => {
      try {
        const address = await getUserAgentWalletAddress(userId);
        if (!address) {
          return { error: "No agent wallet found for this user." };
        }

        const client = getPublicClient();
        const balance = await client.getBalance({ address: address as `0x${string}` });

        return {
          address,
          bnbBalance: formatEther(balance),
          chain: "BSC (56)",
          explorers: {
            address: `https://bscscan.com/address/${address}`
          }
        };
      } catch (error: any) {
        return { error: error.message || "Failed to fetch agent wallet info." };
      }
    },
  });

/**
 * Returns the agent's balance for a specific token on BSC.
 */
export const createGetAgentTokenBalanceTool = (userId: string) =>
  tool({
    description: "REQUIRED: Get the AI agent's balance for a specific token (0x...) on BSC. You MUST call this before selling to ensure you have positive balance.",
    parameters: z.object({
      tokenAddress: z.string().describe("The token contract address on BSC (0x...)"),
    }),
    execute: async ({ tokenAddress }) => {
      try {
        const address = await getUserAgentWalletAddress(userId);
        if (!address) {
          return { error: "No agent wallet found for this user." };
        }

        const client = getPublicClient();
        
        // 1. Get balance
        const balance = await client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
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
      } catch (error: any) {
        return { error: error.message || "Failed to fetch token balance." };
      }
    },
  });
