import {
  TokenSearchData,
} from "../../../../types/token-search-response";
import { tool } from "ai";
import { z } from "zod";
import { getZerionApiKey } from "../../../utils/utils";
import { zerionBaseURL } from "../onchain/constant";

// Zerion Fungibles API Response Types
interface ZerionFungibleAttributes {
  name: string;
  symbol: string;
  description: string | null;
  icon: { url: string } | null;
  flags: {
    verified: boolean;
  };
  external_links: Array<{
    type: string;
    name: string;
    url: string;
  }>;
  implementations: Array<{
    chain_id: string;
    address: string | null;
    decimals: number;
  }>;
  market_data: {
    total_supply: number | null;
    circulating_supply: number | null;
    market_cap: number | null;
    fully_diluted_valuation: number | null;
    price: number | null;
    changes: {
      percent_1d: number | null;
      percent_30d: number | null;
      percent_90d: number | null;
      percent_365d: number | null;
    } | null;
  } | null;
}

interface ZerionFungible {
  type: string;
  id: string;
  attributes: ZerionFungibleAttributes;
  relationships?: {
    chart_day?: { links: { related: string }; data: { type: string; id: string } };
    chart_hour?: { links: { related: string }; data: { type: string; id: string } };
    chart_max?: { links: { related: string }; data: { type: string; id: string } };
    chart_month?: { links: { related: string }; data: { type: string; id: string } };
    chart_week?: { links: { related: string }; data: { type: string; id: string } };
    chart_year?: { links: { related: string }; data: { type: string; id: string } };
  };
  links?: {
    self: string;
  };
}

interface ZerionFungibleResponse {
  data: ZerionFungible | ZerionFungible[];
  links?: {
    self: string;
  };
}

// Transform Zerion response to match existing TokenSearchData format
const transformZerionToTokenData = (
  response: ZerionFungibleResponse,
  address: string
): TokenSearchData[] => {
  // Handle both single item and array responses
  const items = Array.isArray(response.data) ? response.data : [response.data];

  return items.map((fungible): TokenSearchData => {
    const attrs = fungible.attributes;
    const marketData = attrs.market_data;

    return {
      type: "fungibles",
      id: fungible.id,
      attributes: {
        name: attrs.name || "Unknown Token",
        symbol: attrs.symbol || "???",
        description: attrs.description || "",
        icon: attrs.icon || { url: "" },
        flags: attrs.flags || { verified: false },
        external_links: attrs.external_links || [],
        implementations: (attrs.implementations || []).map((impl) => ({
          chain_id: impl.chain_id,
          address: impl.address || address,
          decimals: impl.decimals,
        })).length > 0
          ? (attrs.implementations || []).map((impl) => ({
            chain_id: impl.chain_id,
            address: impl.address || address,
            decimals: impl.decimals,
          }))
          : [
            {
              chain_id: "solana",
              address: address,
              decimals: 9,
            },
          ],
        market_data: {
          total_supply: marketData?.total_supply || 0,
          circulating_supply: marketData?.circulating_supply || 0,
          market_cap: marketData?.market_cap || 0,
          fully_diluted_valuation: marketData?.fully_diluted_valuation || 0,
          price: marketData?.price || 0,
          changes: {
            percent_1d: marketData?.changes?.percent_1d || 0,
            percent_30d: marketData?.changes?.percent_30d || 0,
            percent_90d: marketData?.changes?.percent_90d || 0,
            percent_365d: marketData?.changes?.percent_365d || 0,
          },
        },
      },
      relationships: {
        chart_day: fungible.relationships?.chart_day || {
          links: { related: "" },
          data: { type: "fungible_charts", id: `${address}-day` },
        },
        chart_hour: fungible.relationships?.chart_hour || {
          links: { related: "" },
          data: { type: "fungible_charts", id: `${address}-hour` },
        },
        chart_max: fungible.relationships?.chart_max || {
          links: { related: "" },
          data: { type: "fungible_charts", id: `${address}-max` },
        },
        chart_month: fungible.relationships?.chart_month || {
          links: { related: "" },
          data: { type: "fungible_charts", id: `${address}-month` },
        },
        chart_week: fungible.relationships?.chart_week || {
          links: { related: "" },
          data: { type: "fungible_charts", id: `${address}-week` },
        },
        chart_year: fungible.relationships?.chart_year || {
          links: { related: "" },
          data: { type: "fungible_charts", id: `${address}-year` },
        },
      },
      links: fungible.links || {
        self: `https://solscan.io/token/${address}`,
      },
    };
  });
};

export const searchSolanaTokenMarketData = tool({
  description:
    "Search for token market data on Solana by providing a specific token mint address. Returns token name, symbol, price, market cap, and other metadata.",
  parameters: z.object({
    address: z.string().describe("The Solana token mint address (Base58 format)"),
  }),
  execute: async ({ address }): Promise<TokenSearchData[] | string> => {
    const apiKey = getZerionApiKey();

    if (!apiKey) {
      console.error("ZERION_DEV_API_KEY not configured");
      return "Solana token service is not configured. Please contact support.";
    }

    try {
      // Use Zerion fungibles endpoint with Solana implementation address filter
      const url = `${zerionBaseURL}/v1/fungibles/?filter[implementation_chain_id]=solana&filter[implementation_address]=${address}&currency=usd`;

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
          return "Invalid token address format. Please verify and try again.";
        }
        return `API Error: ${response.status}`;
      }

      const data: ZerionFungibleResponse = await response.json();

      // Check if we got any results
      const items = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);
      if (items.length === 0) {
        return "Token not found. Please verify the address is a valid Solana token mint.";
      }

      const tokenData = transformZerionToTokenData(data, address);

      if (tokenData.length === 0) {
        return "Unable to parse token data.";
      }

      return tokenData;
    } catch (error) {
      console.error("Error fetching Solana token data:", error);
      return "Failed to fetch token data. Please try again.";
    }
  },
});
