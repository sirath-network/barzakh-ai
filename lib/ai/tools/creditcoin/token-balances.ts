import { filterAndLimitPortfolio } from "@/lib/utils";
import {
  PortfolioData,
  PortfolioResponse,
} from "@/types/wallet-actions-response";
import { tool } from "ai";
import { z } from "zod";

export type BlockscoutTokensBalancesDataResponse = {
  token: {
    address: string;
    circulating_market_cap: number | null;
    decimals: string | null;
    exchange_rate: number | null;
    holders: string;
    icon_url: string | null;
    name: string;
    symbol: string;
    total_supply: string;
    type: "ERC-20" | "ERC-721";
    volume_24h: number | null;
  };
  token_id: string | null;
  token_instance: any | null;
  value: string;
}[];

export function convertToPortfolioResponse(
  balances: BlockscoutTokensBalancesDataResponse,
  id: string,
  currency: string = "units"
): PortfolioResponse {
  let totalPositions = balances.length;
  let walletBalance = 0;
  let positionsByChain: { [key: string]: number } = {};

  balances.forEach((entry) => {
    const value =
      parseFloat(entry.value) /
      Math.pow(10, parseInt(entry.token.decimals || "0"));
    walletBalance += value;
    positionsByChain[entry.token.name] = value;
  });

  return {
    links: {
      self: `/portfolio/${id}`,
    },
    data: {
      type: "portfolio",
      id,
      currency,
      attributes: {
        positions_distribution_by_type: {
          wallet: walletBalance,
          deposited: 0,
          borrowed: 0,
          locked: 0,
          staked: 0,
        },
        positions_distribution_by_chain: positionsByChain,
        total: {
          positions: null,
        },
        changes: {
          absolute_1d: 0, // Placeholder for future calculations
          percent_1d: 0, // Placeholder for future calculations
        },
      },
    },
  };
}

export const getTokenBalances = tool({
  description: "Fetch token balances for the wallet address.",
  parameters: z.object({
    wallet_address: z
      .string()
      .min(1, "Wallet address is required")
      .describe("EVM wallet address of user starting with '0x'"),
  }),
  execute: async ({
    wallet_address,
  }: {
    wallet_address: string;
  }): Promise<PortfolioData | string> => {
    const apiKey = process.env.CREDITCOIN_BLOCKSCOUT_API_KEY;
    if (!apiKey) {
      throw Error("creditcoin api key not found");
    }
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${apiKey}`,
      },
    };

    try {
      const response = await fetch(
        `https://creditcoin.blockscout.com/api/v2/addresses/${wallet_address}/token-balances`,
        options
      );

      const portfolioData: BlockscoutTokensBalancesDataResponse =
        await response.json();
      if (!portfolioData || portfolioData.length == 0) {
        //@ts-ignore
        return "No results found. Check address and try again.";
      }
      // console.log("portfoliodata", portfolioData[0]);

      const transformedPortfolio = convertToPortfolioResponse(
        portfolioData,
        wallet_address,
        "units"
      );

      return transformedPortfolio.data;
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      return "Failed to fetch wallet portfolio";
    }
  },
});
