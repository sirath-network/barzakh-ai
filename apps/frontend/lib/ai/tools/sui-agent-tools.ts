import { tool } from "ai";
import { z } from "zod";
import {
  executeSuiAgentTransfer,
  getSuiAgentWalletSnapshot,
} from "@/lib/agent/sui-agent-executor";

const suiNetworkSchema = z.enum(["mainnet", "testnet", "devnet"]);

export const createGetSuiAgentWalletInfoTool = (userId: string) =>
  tool({
    description: `Get Barzakh AI's embedded Sui agent wallet address, delegation status, and SUI balance. REQUIRED before any autonomous Sui operation. Defaults to the configured Sui agent network, normally testnet for hackathon demos.`,
    parameters: z.object({
      network: suiNetworkSchema.optional().describe("Sui network to inspect. Defaults to SUI_AGENT_NETWORK or testnet."),
    }),
    execute: async ({ network }) => {
      return getSuiAgentWalletSnapshot(userId, network);
    },
  });

export const createExecuteSuiTransferTool = (userId: string) =>
  tool({
    description: `Autonomously transfer native SUI from the user's embedded Sui agent wallet. Use only after checking getSuiAgentWalletInfo. This actually signs and broadcasts a Sui transaction when Sui automation is enabled. Defaults to testnet/devnet; mainnet writes require SUI_AGENT_ENABLE_MAINNET_WRITES=true.`,
    parameters: z.object({
      recipient: z.string().describe("Recipient Sui address, normalized 0x + 64 hex chars."),
      amountSui: z.string().describe("Amount of SUI to send, e.g. '0.01'. Up to 9 decimals."),
      network: suiNetworkSchema.optional().describe("Sui network. Prefer testnet for Sui Overflow hackathon demos unless user explicitly requests another network."),
      memo: z.string().optional().describe("Optional reason/audit note for this Sui transfer."),
    }),
    execute: async ({ recipient, amountSui, network, memo }) => {
      const result = await executeSuiAgentTransfer({
        userId,
        recipient,
        amountSui,
        network,
        memo,
      });

      return {
        ...result,
        _instructionToAI: result.success
          ? "Sui transaction succeeded. Keep the response brief and include the explorer URL if the UI does not already render it."
          : "Sui transaction failed. Explain the error briefly and suggest checking wallet funding, network, delegation, or recipient address.",
      };
    },
  });
