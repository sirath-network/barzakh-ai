/**
 * DreamDEX Plugin for KeeperHub
 *
 * Exposes binary prediction market actions, reads, and triggers on Somnia Network.
 */

import poolAbi from "./abi/DreamDexPool.json";

export interface PluginDefinition {
  name: string;
  version: string;
  description: string;
  category: string;
  chains: number[];
  actions: Record<string, ActionDefinition>;
  reads: Record<string, ReadDefinition>;
  triggers: Record<string, TriggerDefinition>;
}

export interface ActionDefinition {
  name: string;
  description: string;
  inputs: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (context: any, inputs: any) => Promise<any>;
}

export interface ReadDefinition {
  name: string;
  description: string;
  inputs: Record<string, { type: string; description: string; required?: boolean }>;
  handler: (context: any, inputs: any) => Promise<any>;
}

export interface TriggerDefinition {
  name: string;
  description: string;
  event: string;
}

export const dreamDexPlugin: PluginDefinition = {
  name: "DreamDEX",
  version: "1.0.0",
  description: "Automate decentralized binary prediction markets on Somnia Network",
  category: "DeFi",
  chains: [50312, 5031], // Somnia Shannon Testnet & Mainnet
  actions: {
    placeOrder: {
      name: "Place Order",
      description: "Place a taker or limit order on the DreamDEX CLOB orderbook",
      inputs: {
        poolAddress: { type: "address", description: "Target prediction pool contract address", required: true },
        side: { type: "string", description: "'UP' (0) or 'DOWN' (1)", required: true },
        amount: { type: "string", description: "Collateral amount in tUSDC base units (6 decimals)", required: true },
        maxSlippageBps: { type: "number", description: "Max slippage in basis points (e.g. 500 = 5%)", required: false },
      },
      handler: async (ctx, inputs) => {
        const sideNumber = String(inputs.side).toUpperCase() === "UP" ? 0 : 1;
        const slippage = inputs.maxSlippageBps || 500;
        return ctx.writeContract({
          address: inputs.poolAddress,
          abi: poolAbi,
          functionName: "placeOrder",
          args: [sideNumber, BigInt(inputs.amount), BigInt(slippage)],
        });
      },
    },

    redeemWinningTokens: {
      name: "Redeem Winnings",
      description: "Claim 1:1 tUSDC collateral per winning outcome contract on resolved markets",
      inputs: {
        poolAddress: { type: "address", description: "Resolved prediction pool contract address", required: true },
        account: { type: "address", description: "Beneficiary wallet address", required: true },
      },
      handler: async (ctx, inputs) => {
        return ctx.writeContract({
          address: inputs.poolAddress,
          abi: poolAbi,
          functionName: "redeemWinningTokens",
          args: [inputs.account],
        });
      },
    },

    closePosition: {
      name: "Close Position Early",
      description: "Liquidate active contracts back to the CLOB orderbook before expiry to lock in profits or mitigate loss",
      inputs: {
        poolAddress: { type: "address", description: "Active prediction pool contract address", required: true },
        side: { type: "string", description: "'UP' or 'DOWN'", required: true },
        contractsToSell: { type: "string", description: "Number of contracts to sell", required: true },
        minPayout: { type: "string", description: "Minimum acceptable tUSDC base units", required: true },
      },
      handler: async (ctx, inputs) => {
        const sideNumber = String(inputs.side).toUpperCase() === "UP" ? 0 : 1;
        return ctx.writeContract({
          address: inputs.poolAddress,
          abi: poolAbi,
          functionName: "closePosition",
          args: [sideNumber, BigInt(inputs.contractsToSell), BigInt(inputs.minPayout)],
        });
      },
    },

    mintTokens: {
      name: "Mint Outcome Sets",
      description: "Deposit tUSDC collateral to mint equal UP + DOWN token sets via ERC-6909 standard",
      inputs: {
        poolAddress: { type: "address", description: "Prediction pool contract address", required: true },
        collateralAmount: { type: "string", description: "Collateral in tUSDC base units (1.0 tUSDC = 1,000,000)", required: true },
      },
      handler: async (ctx, inputs) => {
        return ctx.writeContract({
          address: inputs.poolAddress,
          abi: poolAbi,
          functionName: "mintTokens",
          args: [BigInt(inputs.collateralAmount)],
        });
      },
    },
  },

  reads: {
    getImpliedProbability: {
      name: "Get Implied Probability",
      description: "Query real-time implied probabilities (UP vs DOWN) in millionths (0.65 = 650,000)",
      inputs: {
        poolAddress: { type: "address", description: "Prediction pool contract address", required: true },
      },
      handler: async (ctx, inputs) => {
        const [upProb, downProb] = await ctx.readContract({
          address: inputs.poolAddress,
          abi: poolAbi,
          functionName: "getImpliedProbability",
          args: [],
        });
        return {
          upProbRaw: upProb.toString(),
          downProbRaw: downProb.toString(),
          upProbPercent: (Number(upProb) / 10000).toFixed(2) + "%",
          downProbPercent: (Number(downProb) / 10000).toFixed(2) + "%",
        };
      },
    },

    getMarketStatus: {
      name: "Get Market Status",
      description: "Query whether market is in Open, Locked, or Resolved state, with strike price and expiry",
      inputs: {
        poolAddress: { type: "address", description: "Prediction pool contract address", required: true },
      },
      handler: async (ctx, inputs) => {
        const [status, strikePrice, expiryTimestamp] = await ctx.readContract({
          address: inputs.poolAddress,
          abi: poolAbi,
          functionName: "getMarketStatus",
          args: [],
        });
        const statusMap = ["Pending", "Trading", "Locked", "Resolved", "Voided"];
        return {
          statusCode: status,
          statusLabel: statusMap[status] || "Unknown",
          strikePrice: strikePrice.toString(),
          expiryTimestamp: Number(expiryTimestamp),
          isExpired: Date.now() / 1000 >= Number(expiryTimestamp),
        };
      },
    },
  },

  triggers: {
    onMarketResolved: {
      name: "On Market Resolved",
      description: "Triggers a workflow run when a DreamDEX market settles and emits MarketResolved event",
      event: "MarketResolved(address indexed pool, uint8 winningOutcome, uint256 settlementPrice, uint256 resolvedAt)",
    },
  },
};

export default dreamDexPlugin;
