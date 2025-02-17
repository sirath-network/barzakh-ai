import { tool } from "ai";
import { z } from "zod";
import {
  PortfolioData,
  PortfolioResponse,
} from "@/types/wallet-actions-response";
import { getZerionApiKey } from "@/lib/utils";
import { SUPPORTED_CURRENCY } from "@/lib/constants";

export const getMultiChainWalletPortfolio = tool({
  description:
    "Fetch the multi-chain wallet portfolio of a given wallet address across all supported chains.",
  parameters: z.object({
    wallet_address: z.string().describe("wallet address of user"),
    currency: z
      .enum(SUPPORTED_CURRENCY)
      .default("usd")
      .describe("Denominated currency value of returned prices"),
  }),
  execute: async ({
    wallet_address,
    currency,
  }: {
    wallet_address: string;
    currency: string;
  }): Promise<PortfolioData> => {
    const apiKey = getZerionApiKey();
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${apiKey}`,
      },
    };

    try {
      const response = await fetch(
        `https://api.zerion.io/v1/wallets/${wallet_address}/portfolio?currency=${currency}`,
        options
      );

      const portfolioData: PortfolioResponse = await response.json();
      return { ...portfolioData.data, currency };
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw new Error("Failed to fetch wallet portfolio");
    }
  },
});
