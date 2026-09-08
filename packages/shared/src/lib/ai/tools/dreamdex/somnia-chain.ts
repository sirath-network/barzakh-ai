import { tool } from "ai";
import { z } from "zod";
import { formatEther, formatUnits } from "viem";
import { createSomniaClient, SOMNIA_TESTNET_EXPLORER, SOMNIA_MAINNET_EXPLORER, SOMNIA_TESTNET_CHAIN } from "./sdk-client";

const TUSDC_TESTNET_ADDRESS = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E" as const;

// Minimal ERC-20 balanceOf ABI
const erc20BalanceOfAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export const getSomniaBalance = tool({
  description:
    "Get native STT and tUSDC token balance for an address on Somnia Network (Shannon Testnet). Useful for checking gas (STT) and prediction collateral (tUSDC).",
  parameters: z.object({
    address: z.string().describe("The EVM wallet address to check (0x...)"),
    testnet: z.boolean().optional().describe("Whether to check Shannon testnet (default true)"),
  }),
  execute: async ({ address, testnet = true }) => {
    try {
      if (!address || !address.startsWith("0x") || address.length !== 42) {
        return {
          error: "Invalid EVM address format. Must be a 42-character hex address starting with 0x.",
        };
      }

      const { publicClient } = createSomniaClient("", testnet);
      const explorer = testnet ? SOMNIA_TESTNET_EXPLORER : SOMNIA_MAINNET_EXPLORER;

      // Fetch STT balance
      const rawSttBalance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });
      const sttFormatted = formatEther(rawSttBalance);

      // Fetch tUSDC collateral balance
      let usdcFormatted = "0.0";
      try {
        const rawUsdc = await publicClient.readContract({
          address: TUSDC_TESTNET_ADDRESS,
          abi: erc20BalanceOfAbi,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
        usdcFormatted = formatUnits(rawUsdc, 6);
      } catch (tokenErr) {
        // Fallback if contract read fails
        console.warn("Could not read tUSDC balance:", tokenErr);
      }

      const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;

      return {
        address: truncated,
        network: testnet ? "Somnia Shannon Testnet" : "Somnia Mainnet",
        chainId: testnet ? 50312 : 5031,
        balances: {
          stt: {
            symbol: "STT",
            raw: rawSttBalance.toString(),
            formatted: `${Number(sttFormatted).toFixed(4)} STT`,
            role: "Native Gas Token",
          },
          tUSDC: {
            symbol: "tUSDC",
            formatted: `${Number(usdcFormatted).toFixed(2)} tUSDC`,
            contractAddress: TUSDC_TESTNET_ADDRESS,
            role: "Prediction Collateral (DreamDEX)",
          },
        },
        explorerUrl: `${explorer}/address/${address}`,
        canTradePredictionMarkets: Number(usdcFormatted) > 0,
        hasGas: Number(sttFormatted) > 0,
        tip:
          Number(sttFormatted) === 0
            ? "Need gas? Claim STT from the Somnia testnet faucet in Telegram: https://t.me/+XHq0F0JXMyhmMzM0"
            : Number(usdcFormatted) === 0
            ? "Need collateral? Claim tUSDC from the Somnia testnet faucet to trade DreamDEX Event Contracts."
            : "Wallet has both STT (gas) and tUSDC (collateral) ready for DreamDEX Event Contracts!",
      };
    } catch (error: any) {
      console.error("Error in getSomniaBalance:", error);
      return {
        error: "Failed to retrieve Somnia balance",
        details: error.message || String(error),
      };
    }
  },
});

export const getSomniaNetworkStats = tool({
  description:
    "Get live network stats for Somnia Shannon Testnet including latest block number, gas price, RPC latency, and DreamDEX contract addresses.",
  parameters: z.object({
    testnet: z.boolean().optional().describe("Whether to query testnet (default true)"),
  }),
  execute: async ({ testnet = true }) => {
    try {
      const { publicClient } = createSomniaClient("", testnet);
      const explorer = testnet ? SOMNIA_TESTNET_EXPLORER : SOMNIA_MAINNET_EXPLORER;

      const [blockNumber, gasPrice] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.getGasPrice(),
      ]);

      return {
        network: testnet ? "Somnia Shannon Testnet" : "Somnia Mainnet",
        chainId: testnet ? 50312 : 5031,
        latestBlock: blockNumber.toString(),
        gasPrice: {
          wei: gasPrice.toString(),
          gwei: `${(Number(gasPrice) / 1e9).toFixed(2)} Gwei`,
        },
        nativeToken: "STT",
        predictionDEX: "DreamDEX Event Contracts",
        contracts: {
          tUSDC: TUSDC_TESTNET_ADDRESS,
          binaryModule: "0x3ecC694Cef705358864a646142ac17A90E29e388",
          marketsCore: "0x2802504314685D89bF6C992CA5a8e7cC78bc0294",
        },
        explorerUrl: explorer,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Error in getSomniaNetworkStats:", error);
      return {
        error: "Failed to retrieve Somnia network stats",
        details: error.message || String(error),
      };
    }
  },
});
