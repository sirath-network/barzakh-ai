import {
  filterAndLimitPortfolio,
  transformToZerionPortfolio,
} from "@/lib/utils";
import {
  PortfolioData,
  PortfolioResponse,
  BirdeyePortfolioResponse,
  TokenItem,
} from "@/types/wallet-actions-response";
import { tool } from "ai";
import { z } from "zod";

export const getSolanaChainWalletPortfolio = tool({
  description:
    "Fetch the multi-chain wallet portfolio of a solana wallet address.",
  parameters: z.object({
    wallet_address: z.string().describe("solana wallet address of user"),
  }),
  execute: async ({
    wallet_address,
  }: {
    wallet_address: string;
  }): Promise<PortfolioData> => {
    const options = (chain: string) => ({
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
        "x-chain": chain, // Send one chain at a time
      },
    });

    try {
      const response = await fetch(
        `https://public-api.birdeye.so/v1/wallet/token_list?wallet=${wallet_address}`,
        options("solana")
      );
      const portfolioData = await response.json();
      const transformedPortfolio = transformToZerionPortfolio(portfolioData);
      const filteredPortfolio = filterAndLimitPortfolio(transformedPortfolio);
      // console.log(transformedPortfolio);

      return filteredPortfolio;
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw new Error("Failed to fetch wallet portfolio");
    }
  },
});
