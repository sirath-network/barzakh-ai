import { tool } from "ai";
import { z } from "zod";

import {
  buildSuiBridgeEthPrep,
  executeSuiBridgeEthDeposit,
} from "@/lib/agent/sui-bridge-executor";

const ethereumChainSchema = z.enum(["mainnet", "sepolia"]);

export const createPrepareSuiBridgeDepositTool = (userId: string) =>
  tool({
    description:
      "Prepare or execute a Sui Native Bridge Ethereum -> Sui deposit using the user's embedded EVM wallet. Defaults to dry-run/prep unless execute=true. Requires official bridge env allowlists before real execution.",
    parameters: z.object({
      asset: z.string().default("ETH").describe("Bridge asset symbol, e.g. ETH, USDC, USDT."),
      amount: z.string().describe("Human amount, e.g. '0.01'."),
      suiRecipient: z.string().describe("0x-prefixed 32-byte Sui recipient address."),
      ethereumChain: ethereumChainSchema.optional().default("sepolia"),
      execute: z.boolean().optional().default(false).describe("Set true only when the user explicitly asks to send the bridge transaction."),
    }),
    execute: async ({ asset, amount, suiRecipient, ethereumChain, execute }) => {
      if (!execute) {
        return {
          success: false,
          dryRun: true,
          prep: buildSuiBridgeEthPrep({ asset, amount, suiRecipient, ethereumChain }),
          note: "Prepared bridge calldata and blockers only. No funds moved because execute=false.",
        };
      }
      return executeSuiBridgeEthDeposit({ userId, asset, amount, suiRecipient, ethereumChain, dryRun: false });
    },
  });




