import {
  filterAndLimitPortfolio,
} from "../../../utils/utils";
import {
  PortfolioData,
} from "../../../../types/wallet-actions-response";
import { tool } from "ai";
import { z } from "zod";
import { getZerionApiKey } from "../../../utils/utils";
import { zerionBaseURL } from "../onchain/constant";

// Zerion API Response Types for Solana
interface ZerionPositionAttributes {
  quantity: {
    decimals: number;
    numeric: string;
    float: number;
  };
  value: number | null;
  price: number;
  changes: {
    absolute_1d: number | null;
    percent_1d: number | null;
  } | null;
  fungible_info: {
    name: string;
    symbol: string;
    icon: { url: string } | null;
    implementations: Array<{
      chain_id: string;
      address: string | null;
      decimals: number;
    }>;
  };
}

interface ZerionPosition {
  type: string;
  id: string;
  attributes: ZerionPositionAttributes;
}

interface ZerionPositionsResponse {
  data: ZerionPosition[];
  links?: {
    self: string;
    next?: string;
  };
}

// Transform Zerion response to match existing portfolio format
const transformZerionToPortfolio = (
  response: ZerionPositionsResponse,
  walletAddress: string
): PortfolioData => {
  const positions = response.data || [];

  // Calculate positions distribution by token symbol and collect icons
  const positions_distribution_by_chain: { [key: string]: number } = {};
  const token_icons: { [key: string]: string } = {};
  let totalUsd = 0;

  for (const position of positions) {
    const symbol = position.attributes.fungible_info?.symbol || "UNKNOWN";
    const valueUsd = position.attributes.value || 0;
    const iconUrl = position.attributes.fungible_info?.icon?.url;

    if (valueUsd > 0) {
      positions_distribution_by_chain[symbol] =
        (positions_distribution_by_chain[symbol] || 0) + valueUsd;
      totalUsd += valueUsd;
    }

    // Store icon URL for each token (even if value is 0)
    if (iconUrl && !token_icons[symbol]) {
      token_icons[symbol] = iconUrl;
    }
  }

  return {
    type: "portfolio",
    id: walletAddress,
    attributes: {
      positions_distribution_by_type: {
        wallet: totalUsd,
        deposited: 0,
        borrowed: 0,
        locked: 0,
        staked: 0,
      },
      positions_distribution_by_chain,
      token_icons,
      total: {
        positions: totalUsd,
      },
      changes: {
        absolute_1d: 0,
        percent_1d: 0,
      },
    },
    currency: "usd",
  };
};

export const getSolanaChainWalletPortfolio = tool({
  description:
    "Fetch the wallet portfolio of a Solana wallet address, including all tokens and their USD values.",
  parameters: z.object({
    wallet_address: z.string().describe("Solana wallet address (Base58 format)"),
  }),
  execute: async ({
    wallet_address,
  }: {
    wallet_address: string;
  }): Promise<PortfolioData | string> => {
    const apiKey = getZerionApiKey();

    if (!apiKey) {
      console.error("ZERION_DEV_API_KEY not configured");
      return "Solana portfolio service is not configured. Please contact support.";
    }

    try {
      // Use Zerion API with Solana chain filter
      const url = `${zerionBaseURL}/v1/wallets/${wallet_address}/positions/?filter[chain_ids]=solana&currency=usd&sort=-value`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Basic ${apiKey}`,
        },
      });

      if (!response.ok) {
        let errorDetails = "";
        try {
          const errorJson = await response.json();
          errorDetails = JSON.stringify(errorJson);
        } catch (e) {
          errorDetails = await response.text();
        }
        console.error(`Zerion API Error ${response.status}:`, errorDetails);

        if (response.status === 400) {
          return "Invalid Solana address format. Please verify and try again.";
        }
        return `API Error: ${response.status}`;
      }

      const data: ZerionPositionsResponse = await response.json();

      if (!data.data || data.data.length === 0) {
        return "Wallet has no token balances on Solana.";
      }

      const portfolio = transformZerionToPortfolio(data, wallet_address);

      // Check if there are any valued tokens
      if (Object.keys(portfolio.attributes.positions_distribution_by_chain).length === 0) {
        return "Wallet has tokens but none with USD value data.";
      }

      const filteredPortfolio = filterAndLimitPortfolio(portfolio);
      return filteredPortfolio;
    } catch (error) {
      console.error("Error fetching Solana wallet portfolio:", error);
      return "Failed to fetch wallet portfolio. Please try again.";
    }
  },
});
