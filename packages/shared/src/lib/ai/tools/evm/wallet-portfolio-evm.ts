import { tool } from "ai";
import { z } from "zod";
import {
  PortfolioData,
  PortfolioResponse,
} from "../../../../types/wallet-actions-response";
import { filterAndLimitPortfolio, getZerionApiKey } from "../../../utils/utils";
import { SUPPORTED_CURRENCY } from "../../../constants";
import { multichainEnsLookup } from "../../../utils/multichain-ens-lookup";

export const getEvmMultiChainWalletPortfolio = tool({
  description:
    "Fetch the multi-chain wallet portfolio of a given wallet address across all EVM  chains.",
  parameters: z.object({
    wallet_address: z
      .string()
      .min(1, "Wallet address is required")
      .describe("EVM wallet address of user starting with '0x' or an ENS name ending with '.eth'"),
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
  }): Promise<PortfolioData | string> => {
    const apiKey = getZerionApiKey();

    // Resolve ENS name to address if needed
    let resolvedAddress = wallet_address;
    if (wallet_address.toLowerCase().endsWith('.eth')) {
      console.log("Resolving ENS name:", wallet_address);
      const address = await multichainEnsLookup(wallet_address);
      if (!address || address === "not found" || address === "error resolving ens name") {
        return `Failed to resolve ENS name: ${wallet_address}. Please provide a valid ENS name or wallet address.`;
      }
      resolvedAddress = address;
      console.log("Resolved ENS to address:", resolvedAddress);
    }

    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${apiKey}`,
      },
    };
    console.log("fetching portfolio of -", resolvedAddress);
    try {
      const response = await fetch(
        `https://api.zerion.io/v1/wallets/${resolvedAddress}/portfolio?currency=${currency}`,
        options
      );

      const portfolioData: PortfolioResponse = await response.json();

      // Check if portfolioData and portfolioData.data exist before accessing attributes
      if (!portfolioData || !portfolioData.data || !portfolioData.data.attributes) {
        console.log("Invalid response structure:", JSON.stringify(portfolioData, null, 2));
        return "No results found. Check address and try again.";
      }

      if (portfolioData.data.attributes.total.positions == 0) {
        return "Wallet has no balances.";
      }

      // Fetch DeFi protocol positions
      let defiPositions: any[] = [];
      try {
        const defiResponse = await fetch(
          `https://api.zerion.io/v1/wallets/${resolvedAddress}/positions/?filter[positions]=only_complex&filter[trash]=only_non_trash&currency=${currency}&sort=value`,
          options
        );
        if (defiResponse.ok) {
          const defiData = await defiResponse.json();
          defiPositions = defiData.data || [];
        }
      } catch (error) {
        console.error("Error fetching DeFi positions:", error);
        // Continue without DeFi data if it fails
      }

      // filter for tokens with < 1 usd and only show top 10
      const filteredPortfolio = filterAndLimitPortfolio(portfolioData.data);

      // Add DeFi summary to the response
      const defiSummary = {
        hasDefiPositions: defiPositions.length > 0,
        totalDefiValue: defiPositions.reduce((sum: number, pos: any) => sum + (pos.attributes?.value || 0), 0),
        positionCount: defiPositions.length,
        positions: defiPositions.slice(0, 20).map((pos: any) => ({
          protocol: pos.attributes?.application_metadata?.name || pos.attributes?.protocol || 'Unknown',
          type: pos.attributes?.position_type || pos.type || 'unknown',
          chain: pos.relationships?.chain?.data?.id || 'unknown',
          value: pos.attributes?.value || 0,
          tokens: pos.attributes?.fungible_info ? [{
            symbol: pos.attributes.fungible_info.symbol,
            name: pos.attributes.fungible_info.name,
            amount: pos.attributes.quantity?.float || 0,
          }] : []
        }))
      };

      return { ...filteredPortfolio, currency, defi: defiSummary };
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      return "Failed to fetch wallet portfolio";
    }
  },
});