import { tool } from "ai";
import { z } from "zod";

export const getMultiChainWalletPortfolio = tool({
  description:
    "Fetch the multi-chain token portfolio of a given wallet address.",
  parameters: z.object({
    wallet_address: z.string(),
  }),
  execute: async ({ wallet_address }) => {
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-chains": "ethereum", // Adjust for multichain if needed
        "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
      },
    };

    try {
      const response = await fetch(
        `https://public-api.birdeye.so/v1/wallet/multichain_token_list?wallet=${wallet_address}`,
        options
      );
      const portfolioData = await response.json();
      return portfolioData;
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw new Error("Failed to fetch wallet portfolio");
    }
  },
});
