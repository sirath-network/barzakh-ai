import { tool } from "ai";
import { z } from "zod";

import {
  buildSuiBridgeEthPrep,
  executeSuiBridgeEthDeposit,
} from "@/lib/agent/sui-bridge-executor";

import {
  buildChainBlockExplorerTxUrl,
  buildWormholeScanTxUrl,
  executeWormholeSuiBridgeTransfer,
  getWormholeOperationStatus,
} from "@/lib/agent/wormhole-sui-bridge-executor";
import { completeWormholeSuiCctpFromSourceTx } from "@/lib/agent/wormhole-sui-sdk-adapter";

const networkSchema = z.enum(["mainnet", "testnet", "devnet"]);
const ethereumChainSchema = z.enum(["mainnet", "sepolia"]);
const wormholeNetworkSchema = z.enum(["Mainnet", "Testnet", "mainnet", "testnet"]);
const wormholeRoutePreferenceSchema = z.enum(["auto", "cctp", "wtt", "connect"]);

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

export const createPrepareWormholeSuiBridgeTransferTool = (userId: string) =>
  tool({
    description:
      "Prepare or execute a Wormhole-based bridge transfer into or out of Sui. Bypasses Sui Native Bridge claim loops by default. For testnet bridge commands like 'bridge/send/transfer X from Sepolia to Sui testnet', treat the command itself as execution intent and set execute=true. For mainnet, default to dry-run quote unless the user explicitly asks to execute. Real execution still requires route validation, source-chain agent automation, server env write opt-ins, and a reviewed Wormhole execution adapter that returns a real tx hash. Auto route uses CCTP for native Circle USDC where supported, including current SDK testnet ManualCCTP quotes into and out of Sui; ManualCCTP completion can take up to 15 minutes or more. In normal user responses, provide the source/destination block explorer link from explorerUrl, not Wormholescan. WTT/TokenBridge/Connect are used for non-CCTP assets. If no Wormhole quote exists, the executor can auto-fallback to official Sui Native Bridge testnet USDC, which uses a separate Sui Bridge-specific Sepolia USDC token.",
    parameters: z.object({
      asset: z.string().describe("Asset symbol, e.g. SUI, ETH, USDC, WETH."),
      amount: z.string().describe("Human amount, e.g. '0.01'."),
      sourceChain: z.string().describe("Wormhole source chain name, e.g. Ethereum, Sui, Solana, Base, Avalanche."),
      destinationChain: z.string().describe("Wormhole destination chain name. One side must be Sui."),
      recipientAddress: z.string().describe("Destination recipient address on Sui or the counterparty chain."),
      sourceAddress: z.string().optional().describe("Optional source wallet address for display/tracking."),
      network: wormholeNetworkSchema.optional().default("Testnet"),
      routePreference: wormholeRoutePreferenceSchema.optional().default("auto"),
      nativeGasDropoff: z.string().optional().describe("Optional destination native gas drop-off request for Connect/Executor routes."),
      execute: z.boolean().optional().default(false).describe("For testnet bridge commands phrased as an action (bridge/send/transfer), set true immediately. For mainnet, set true only after explicit execution confirmation. Execution still requires env write opt-ins, source-chain agent automation, and a reviewed Wormhole adapter."),
    }),
    execute: async ({ asset, amount, sourceChain, destinationChain, recipientAddress, sourceAddress, network, routePreference, nativeGasDropoff, execute }) => {
      return executeWormholeSuiBridgeTransfer({
        userId,
        asset,
        amount,
        sourceChain,
        destinationChain,
        recipientAddress,
        sourceAddress,
        network,
        routePreference,
        nativeGasDropoff,
        execute,
      });
    },
  });

export const createCompleteWormholeCctpTransferTool = (userId: string) =>
  tool({
    description:
      "Complete/recover an already-initiated Wormhole Manual CCTP (USDC) or WTT (ETH, WETH, etc.) transfer from its source transaction hash/digest. Use this after tokens were transferred/burned on the source chain but destination tokens have not appeared, or a bridge status page shows PENDING CLAIM. This must not initiate a new transfer; it fetches the VAA/attestation and submits the destination completion transaction with the embedded destination wallet. Completion can take up to 15 minutes or more. Do not ask for amount: amount/nonce/VAA are parsed from the source transaction. In normal user responses, provide the destination block explorer link, not Wormholescan.",
    parameters: z.object({
      sourceTxHash: z.string().describe("The source-chain transaction hash/digest, not an ERC20 approval hash."),
      sourceChain: z.string().default("Sepolia").describe("Source Wormhole chain name, e.g. Sepolia, Sui, Ethereum, BaseSepolia."),
      destinationChain: z.string().default("Sui").describe("Destination Wormhole chain name, e.g. Sui or Sepolia."),
      recipientAddress: z.string().describe("Destination recipient address that should receive the tokens."),
      routeKind: z.enum(["cctp", "wtt", "auto"]).optional().default("auto").describe("Route kind of the transfer: 'cctp' for native USDC, 'wtt' for ETH or other wrapped tokens, or 'auto' to detect automatically."),
      network: wormholeNetworkSchema.optional().default("Testnet"),
    }),
    execute: async ({ sourceTxHash, sourceChain, destinationChain, recipientAddress, routeKind, network }) => {
      try {
        const completed = await completeWormholeSuiCctpFromSourceTx({
          userId,
          sourceTxHash,
          sourceChain,
          destinationChain,
          recipientAddress,
          routeKind,
          network: network === "Mainnet" || network === "mainnet" ? "Mainnet" : "Testnet",
        });
        return {
          ...completed,
          explorerUrl: completed.destinationTxHash
            ? buildChainBlockExplorerTxUrl({
                txHash: completed.destinationTxHash,
                chain: String(completed.destinationChain || destinationChain),
                network: completed.network,
              })
            : undefined,
          estimatedDuration: "up to 15 minutes or more; depends on Circle attestation",
        };
      } catch (error: any) {
        const message = error?.message || "Failed to complete Wormhole ManualCCTP transfer.";
        const diagnosis = message.includes("ERR_TLS_CERT_ALTNAME_INVALID") || message.includes("Hostname/IP does not match certificate")
          ? "Circle Iris sandbox DNS/TLS lookup failed. Local DNS may be resolving iris-api-sandbox.circle.com to an ISP block page; set CIRCLE_IRIS_SANDBOX_RESOLVE_IP or fix DNS, then retry recovery."
          : message.includes("receive_message") && message.includes("MoveAbort")
            ? "Circle attestation was fetched, but the Sui CCTP receive_message dry-run aborted. Do not rerun the source bridge; inspect the Sui CCTP package/SDK route or retry recovery after confirming destination package compatibility."
            : undefined;
        return {
          success: false,
          sourceTxHash,
          error: message,
          diagnosis,
          note: "No new source burn was initiated by this recovery tool. The burned amount is parsed from the CCTP burn transaction; do not ask the user for amount unless using a different/manual recovery flow.",
        };
      }
    },
  });

export const createGetWormholeBridgeStatusTool = (_userId: string) =>
  tool({
    description:
      "Look up Wormhole bridge/Executor/CCTP/WTT operation status by source transaction hash or wallet address using Wormholescan where indexed. For ManualCCTP, a Sepolia source burn may not appear in Wormholescan; Circle attestation/message hash plus Sui destination digest are the authoritative completion signals.",
    parameters: z.object({
      txHash: z.string().optional().describe("Source transaction hash/digest to inspect."),
      address: z.string().optional().describe("Wallet/address to list recent Wormhole operations for."),
      network: wormholeNetworkSchema.optional().default("Testnet"),
      pageSize: z.number().int().min(1).max(20).optional().default(5),
    }),
    execute: async ({ txHash, address, network, pageSize }) => {
      if (!txHash && !address) {
        return {
          success: false,
          error: "Provide txHash or address.",
        };
      }
      try {
        return {
          success: true,
          explorerUrl: txHash ? buildWormholeScanTxUrl({ txHash, network }) : null,
          result: await getWormholeOperationStatus({ txHash, address, network, pageSize }),
        };
      } catch (error: any) {
        return {
          success: false,
          explorerUrl: txHash ? buildWormholeScanTxUrl({ txHash, network }) : null,
          error: error?.message || "Failed to query Wormholescan.",
        };
      }
    },
  });



