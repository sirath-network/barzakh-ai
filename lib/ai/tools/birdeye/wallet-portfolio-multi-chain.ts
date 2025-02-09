import { tool } from "ai";
import { z } from "zod";
const supported_chains = [
  "solana",
  "ethereum",
  "arbitrum",
  "avalanche",
  "bsc",
  "optimism",
  "polygon",
  "base",
  "zksync",
  "sui",
];
export const getMultiChainWalletPortfolio = tool({
  description:
    "Fetch the multi-chain wallet  portfolio of a given wallet address. supported chains are  solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui",
  parameters: z.object({
    wallet_address: z.string().describe("wallet address of user"),
    chain_name: z.string().describe("chain name"),
  }),
  execute: async ({
    wallet_address,
    chain_name,
  }: {
    wallet_address: string;
    chain_name: string;
  }) => {
    //if chain name not from supproted chain, return error
    if (!supported_chains.includes(chain_name)) {
      throw new Error(
        "Unsupported chain. supported chains are  solana, ethereum, arbitrum, avalanche, bsc, optimism, polygon, base, zksync, sui. Please provide a valid chain name."
      );
    }
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-chains": chain_name, // Adjust for multichain if needed
        "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
      },
    };

    try {
      const response = await fetch(
        `https://public-api.birdeye.so/v1/wallet/multichain_token_list?wallet=${wallet_address}`,
        options
      );
      const portfolioData = await response.json();
      console.log("portfolio ------------ ", portfolioData);
      return portfolioData;
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw new Error("Failed to fetch wallet portfolio");
    }
  },
});
