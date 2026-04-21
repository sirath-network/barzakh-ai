import { tool } from "ai";
import { z } from "zod";

const FOURMEME_API_BASE = "https://four.meme/meme-api/v1";
const FOURMEME_STATIC_BASE = "https://static.four.meme";
const BSC_RPC_URL =
  process.env.BSC_RPC_URL ||
  "https://bnb-mainnet.g.alchemy.com/v2/QmCrH0w-wPKCJ7hBHKn1t";

/**
 * Resolve a Four.meme image field to a full URL.
 * - Search/ranking APIs return relative paths like "/market/xxx.png"
 * - Detail API returns full URLs like "https://static.four.meme/market/xxx.png"
 */
function resolveImageUrl(img: string | null | undefined): string | null {
  if (!img) return null;
  if (img.startsWith("http")) return img;
  return `${FOURMEME_STATIC_BASE}${img.startsWith("/") ? "" : "/"}${img}`;
}

// ============================================================================
// TokenManagerHelper3 ABI (for on-chain getTokenInfo)
// ============================================================================

const HELPER_ADDRESS = "0xF251F83e40a78868FcfA3FA4599Dad6494E46034";

// ABI-encoded function selector for getTokenInfo(address)
// keccak256("getTokenInfo(address)") → first 4 bytes
const GET_TOKEN_INFO_SELECTOR = "0x1f69565f";

// ============================================================================
// Tool: Search Four.meme Tokens
// ============================================================================

export const searchFourMemeTokens = tool({
  description:
    "Search for meme tokens on Four.meme (BNB Chain meme launchpad) by keyword, symbol, or tag. Supports filtering by type (HOT, NEW, VOL, PROGRESS, DEX/graduated, CAP, BURN), status (PUBLISH for bonding curve, TRADE for PancakeSwap, ALL), and list type (NOR for normal, BIN for Binance wallet). Returns paginated results with token names, symbols, addresses, images, prices, market caps, and bonding curve progress. Use this when the user asks about meme tokens on BNB/BSC or Four.meme.",
  parameters: z.object({
    keyword: z
      .string()
      .optional()
      .describe(
        "Search keyword (token name, symbol, or partial match). Leave empty for browsing."
      ),
    type: z
      .enum([
        "HOT",
        "NEW",
        "VOL",
        "PROGRESS",
        "DEX",
        "CAP",
        "BURN",
        "LAST",
      ])
      .default("HOT")
      .describe(
        "Sort/filter type: HOT (trending), NEW (newest), VOL (highest volume), PROGRESS (nearest graduation), DEX (graduated to PancakeSwap), CAP (market cap), BURN (burn tokens), LAST (last traded)"
      ),
    status: z
      .enum(["PUBLISH", "TRADE", "ALL"])
      .default("ALL")
      .describe(
        "Token status: PUBLISH (still on bonding curve), TRADE (graduated to PancakeSwap DEX), ALL (both)"
      ),
    pageSize: z
      .number()
      .default(20)
      .describe("Number of results per page (max 100, default 20)"),
    pageIndex: z
      .number()
      .default(1)
      .describe("Page number (1-indexed, default 1)"),
  }),
  execute: async ({ keyword, type, status, pageSize, pageIndex }) => {
    try {
      const body: Record<string, unknown> = {
        type,
        listType: "NOR",
        pageIndex: Math.max(1, pageIndex),
        pageSize: Math.min(100, Math.max(1, pageSize)),
        status,
        sort: "DESC",
      };

      if (keyword && keyword.trim() !== "") {
        body.keyword = keyword.trim();
      }

      const response = await fetch(`${FOURMEME_API_BASE}/public/token/search`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return {
          status: "error",
          error: `Four.meme API returned ${response.status}`,
        };
      }

      const data = await response.json();

      if (data.code !== "0" && data.code !== 0) {
        return {
          status: "error",
          error: `Four.meme API error: ${data.msg || JSON.stringify(data)}`,
        };
      }

      const records = Array.isArray(data.data) ? data.data : (data.data?.records || data.data?.list || []);
      const total = data.data?.total || data.data?.totalCount || records.length;

      if (records.length === 0) {
        return {
          status: "success",
          message: keyword
            ? `No tokens found matching "${keyword}" on Four.meme.`
            : `No tokens found with the specified filters on Four.meme.`,
          results: [],
          total_count: 0,
          query: keyword || null,
        };
      }

      const results = records.map((token: any, index: number) => {
        const isGraduated =
          token.status === "TRADE" ||
          token.listedPancake === true ||
          token.listedPancake === "true";
        const priceUsd = parseFloat(token.price || "0");
        const marketCap = parseFloat(token.cap || token.marketCap || "0");
        const volume24h = parseFloat(token.day1Vol || token.volume24h || token.volume || "0");
        const progress = parseFloat(token.progress || "0");

        return {
          index: index + 1,
          name: token.name || token.tokenName || "Unknown",
          symbol: token.symbol || token.tokenSymbol || "???",
          address: token.tokenAddress || token.address,
          image: resolveImageUrl(token.img || token.image || token.imageUrl || null),
          price_usd:
            priceUsd > 0 ? `$${priceUsd.toFixed(8)}` : "N/A",
          market_cap:
            marketCap > 0
              ? `$${marketCap.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : "N/A",
          volume_24h:
            volume24h > 0
              ? `$${volume24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : "N/A",
          progress: progress > 0 ? `${(progress * 100).toFixed(1)}%` : null,
          is_graduated: isGraduated,
          holder_count: token.hold || token.holderCount || token.holders || 0,
          description: token.descr || token.description
            ? (token.descr || token.description).substring(0, 120) +
              ((token.descr || token.description).length > 120 ? "..." : "")
            : null,
          created_at: token.createDate || token.createTime || token.createdAt || null,
          url: `https://four.meme/token/${token.tokenAddress || token.address}`,
          network: "BNB Chain (BSC)",
        };
      });

      const summary = results.map((r: any) => `[${r.index}] ${r.name} (${r.symbol}) - ${r.address}`).join("\n");

      return {
        status: "success",
        count: results.length,
        total_available: total,
        query: keyword || null,
        filter_type: type,
        filter_status: status,
        results,
        summary,
        note: `Found ${total} tokens on Four.meme (BNB Chain). Showing ${results.length} sorted by ${type}. Tokens marked as "graduated" have migrated to PancakeSwap DEX. When presenting/buying tokens, refer to them by their [index] and use the exact 0x... address provided in the results.`,
      };
    } catch (error: any) {
      return {
        status: "error",
        error: "Failed to search Four.meme tokens",
        details: error.message,
      };
    }
  },
});

// ============================================================================
// Tool: Get Four.meme Token Detail
// ============================================================================

export const getFourMemeTokenDetail = tool({
  description:
    "Get detailed information about a specific token on Four.meme (BNB Chain meme launchpad) by its contract address. Returns name, symbol, description, image, social links, bonding curve progress, graduation status, trading info, and creator. Use this when you have a token address and need full metadata.",
  parameters: z.object({
    tokenAddress: z
      .string()
      .describe(
        "The token contract address on BSC (0x...)"
      ),
  }),
  execute: async ({ tokenAddress }) => {
    try {
      const url = `${FOURMEME_API_BASE}/private/token/get/v2?address=${encodeURIComponent(tokenAddress)}`;
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
        },
      });

      if (!response.ok) {
        return {
          status: "error",
          error: `Four.meme API returned ${response.status} for token ${tokenAddress}`,
        };
      }

      const data = await response.json();

      if (data.code !== "0" && data.code !== 0) {
        return {
          status: "error",
          error: `Token not found: ${data.msg || "unknown error"}`,
        };
      }

      const token = data.data || {};
      const isGraduated =
        token.status === "TRADE" ||
        token.listedPancake === true ||
        token.listedPancake === "true";

      return {
        status: "success",
        token: {
          name: token.name || token.tokenName,
          symbol: token.symbol || token.tokenSymbol,
          address: token.address || token.tokenAddress || tokenAddress,
          description: token.descr || token.description || null,
          image: resolveImageUrl(token.image || token.img || token.imageUrl || null),
          is_graduated: isGraduated,
          progress: token.tokenPrice?.progress
            ? `${(parseFloat(token.tokenPrice.progress) * 100).toFixed(1)}%`
            : token.progress
              ? `${(parseFloat(token.progress) * 100).toFixed(1)}%`
              : null,
          price_usd: (token.tokenPrice?.price || token.price)
            ? `$${parseFloat(token.tokenPrice?.price || token.price).toFixed(8)}`
            : "N/A",
          market_cap: (token.tokenPrice?.marketCap || token.marketCap || token.cap)
            ? `$${parseFloat(token.tokenPrice?.marketCap || token.marketCap || token.cap).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
            : "N/A",
          holder_count: token.tokenPrice?.holderCount || token.holderCount || token.hold || 0,
          creator: token.userAddress || token.creator || token.creatorAddress || null,
          social: {
            website: token.webUrl || token.website || null,
            twitter: token.twitterUrl || token.twitter || null,
            telegram: token.telegramUrl || token.telegram || null,
          },
          labels: token.label ? [token.label] : (token.labels || token.tags || []),
          created_at: token.createDate || token.createTime || token.createdAt || null,
          url: `https://four.meme/token/${token.address || token.tokenAddress || tokenAddress}`,
        },
        network: "BNB Chain (BSC)",
        note: isGraduated
          ? "This token has graduated from the bonding curve and is now trading on PancakeSwap DEX."
          : "This token is still on the bonding curve. It will migrate to PancakeSwap once the curve completes.",
      };
    } catch (error: any) {
      return {
        status: "error",
        error: "Failed to fetch token detail from Four.meme",
        details: error.message,
      };
    }
  },
});

// ============================================================================
// Tool: Get Four.meme Rankings
// ============================================================================

export const getFourMemeRankings = tool({
  description:
    "Get token rankings from Four.meme (BNB Chain meme launchpad). Returns ranked lists of tokens by category: HOT (trending), NEW (newest), VOL_DAY_1 (24h volume), PROGRESS (nearest graduation), DEX (already on PancakeSwap), CAP (market cap). Supports optional filters by symbol, market cap range, volume range, and holder count range. Use this when the user asks 'what are the top/hottest/newest meme tokens on four.meme or BNB chain'.",
  parameters: z.object({
    rankingType: z
      .enum([
        "HOT",
        "NEW",
        "VOL_DAY_1",
        "VOL_HOUR_4",
        "VOL_HOUR_1",
        "VOL_MIN_30",
        "VOL_MIN_5",
        "VOL",
        "PROGRESS",
        "DEX",
        "CAP",
        "LAST",
        "BURN",
      ])
      .default("HOT")
      .describe(
        "Ranking category: HOT (trending), NEW (newest), VOL_DAY_1 (24h volume), PROGRESS (nearest graduation), DEX (graduated), CAP (market cap), LAST (recent trades), BURN (burnt tokens)"
      ),
    pageSize: z
      .number()
      .default(20)
      .describe("Number of ranked tokens to return (max 100, default 20)"),
    symbol: z
      .string()
      .optional()
      .describe("Filter by token symbol (optional)"),
    minCap: z
      .number()
      .optional()
      .describe("Minimum market cap filter (USD)"),
    maxCap: z
      .number()
      .optional()
      .describe("Maximum market cap filter (USD)"),
  }),
  execute: async ({ rankingType, pageSize, symbol, minCap, maxCap }) => {
    try {
      const body: Record<string, unknown> = {
        type: rankingType,
        pageSize: Math.min(100, Math.max(1, pageSize)),
      };

      if (symbol && symbol.trim()) body.symbol = symbol.trim();
      if (minCap !== undefined) body.minCap = minCap;
      if (maxCap !== undefined) body.maxCap = maxCap;

      const response = await fetch(
        `${FOURMEME_API_BASE}/public/token/ranking`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (compatible; BarzakhAI/1.0)",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        return {
          status: "error",
          error: `Four.meme ranking API returned ${response.status}`,
        };
      }

      const data = await response.json();

      if (data.code !== "0" && data.code !== 0) {
        return {
          status: "error",
          error: `Four.meme ranking error: ${data.msg || JSON.stringify(data)}`,
        };
      }

      const records = data.data?.records || data.data?.list || data.data || [];

      if (!Array.isArray(records) || records.length === 0) {
        return {
          status: "success",
          message: `No ranked tokens found for category "${rankingType}" on Four.meme.`,
          results: [],
          ranking_type: rankingType,
        };
      }

      const results = records.map((token: any, index: number) => {
        const isGraduated =
          token.status === "TRADE" ||
          token.listedPancake === true ||
          token.listedPancake === "true";
        const priceUsd = parseFloat(token.price || "0");
        const marketCap = parseFloat(token.cap || token.marketCap || "0");
        const volume24h = parseFloat(token.day1Vol || token.volume24h || token.volume || "0");
        const progress = parseFloat(token.progress || "0");

        return {
          index: index + 1,
          rank: index + 1,
          name: token.name || token.tokenName || "Unknown",
          symbol: token.symbol || token.tokenSymbol || "???",
          address: token.tokenAddress || token.address,
          image: resolveImageUrl(token.img || token.image || token.imageUrl || null),
          price_usd:
            priceUsd > 0 ? `$${priceUsd.toFixed(8)}` : "N/A",
          market_cap:
            marketCap > 0
              ? `$${marketCap.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : "N/A",
          volume_24h:
            volume24h > 0
              ? `$${volume24h.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
              : "N/A",
          progress: progress > 0 ? `${(progress * 100).toFixed(1)}%` : null,
          is_graduated: isGraduated,
          holder_count: token.hold || token.holderCount || token.holders || 0,
          url: `https://four.meme/token/${token.tokenAddress || token.address}`,
          network: "BNB Chain (BSC)",
        };
      });

      const summary = results.map((r: any) => `[${r.index}] ${r.name} (${r.symbol}) - ${r.address}`).join("\n");

      return {
        status: "success",
        ranking_type: rankingType,
        count: results.length,
        results,
        summary,
        note: `Top ${results.length} tokens ranked by ${rankingType} on Four.meme (BNB Chain). Tokens marked as "graduated" have migrated to PancakeSwap DEX. When presenting/buying tokens, refer to them by their [index] and ALWAYS use the exact 0x... address provided in the results.`,
      };
    } catch (error: any) {
      return {
        status: "error",
        error: "Failed to fetch rankings from Four.meme",
        details: error.message,
      };
    }
  },
});

// ============================================================================
// Tool: Get Four.meme On-Chain Market Data (via BSC RPC)
// ============================================================================

export const getFourMemeMarketData = tool({
  description:
    "Get live on-chain bonding curve data for a token on Four.meme (BNB Chain) by reading the TokenManagerHelper3 smart contract on BSC. Returns the token's version, tokenManager address, last price, trading fee rate, launch time, current offers vs max offers (bonding curve progress), current funds vs max funds, and whether liquidity has been added to PancakeSwap. Use this when the user wants precise on-chain data about a Four.meme token's bonding curve status.",
  parameters: z.object({
    tokenAddress: z
      .string()
      .describe("The token contract address on BSC (0x...)"),
  }),
  execute: async ({ tokenAddress }) => {
    try {
      // Pad the token address to 32 bytes for the ABI call
      const paddedAddress = tokenAddress
        .toLowerCase()
        .replace("0x", "")
        .padStart(64, "0");
      const callData = `${GET_TOKEN_INFO_SELECTOR}${paddedAddress}`;

      const rpcResponse = await fetch(BSC_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [
            {
              to: HELPER_ADDRESS,
              data: callData,
            },
            "latest",
          ],
        }),
      });

      if (!rpcResponse.ok) {
        return {
          status: "error",
          error: `BSC RPC request failed with status ${rpcResponse.status}`,
        };
      }

      const rpcData = await rpcResponse.json();

      if (rpcData.error) {
        return {
          status: "error",
          error: `BSC RPC error: ${rpcData.error.message || JSON.stringify(rpcData.error)}`,
        };
      }

      const result = rpcData.result;

      if (
        !result ||
        result === "0x" ||
        result ===
          "0x0000000000000000000000000000000000000000000000000000000000000000"
      ) {
        return {
          status: "error",
          error: `Token ${tokenAddress} not found on Four.meme TokenManager. It may not be a Four.meme token.`,
        };
      }

      // Decode the 12 return values (each 32 bytes = 64 hex chars)
      const hex = result.slice(2); // remove 0x
      const decode = (offset: number) =>
        BigInt("0x" + hex.slice(offset * 64, (offset + 1) * 64));

      const version = Number(decode(0));
      const tokenManager =
        "0x" + hex.slice(1 * 64 + 24, 2 * 64); // address is last 20 bytes
      const quote = "0x" + hex.slice(2 * 64 + 24, 3 * 64);
      const lastPrice = decode(3);
      const tradingFeeRate = Number(decode(4));
      const minTradingFee = decode(5);
      const launchTime = Number(decode(6));
      const offers = decode(7);
      const maxOffers = decode(8);
      const funds = decode(9);
      const maxFunds = decode(10);
      const liquidityAdded = decode(11) !== BigInt(0);

      // Calculate bonding curve progress
      const progressPercent =
        maxFunds > BigInt(0)
          ? Number((funds * BigInt(10000)) / maxFunds) / 100
          : 0;

      // Convert wei values to BNB (ether) for readability
      const formatBNB = (wei: bigint) => {
        const bnb = Number(wei) / 1e18;
        return bnb > 0 ? `${bnb.toFixed(6)} BNB` : "0";
      };

      const isZeroAddr =
        quote ===
        "0x0000000000000000000000000000000000000000";

      return {
        status: "success",
        token_address: tokenAddress,
        on_chain_data: {
          version,
          token_manager: tokenManager,
          quote_token: isZeroAddr ? "BNB (native)" : quote,
          last_price_wei: lastPrice.toString(),
          trading_fee_rate: `${tradingFeeRate / 100}%`,
          min_trading_fee_wei: minTradingFee.toString(),
          launch_time: launchTime > 0
            ? new Date(launchTime * 1000).toISOString()
            : "N/A",
          bonding_curve: {
            current_offers: offers.toString(),
            max_offers: maxOffers.toString(),
            current_funds: formatBNB(funds),
            max_funds: formatBNB(maxFunds),
            progress: `${progressPercent.toFixed(1)}%`,
          },
          liquidity_added: liquidityAdded,
        },
        network: "BNB Chain (BSC)",
        note: liquidityAdded
          ? "This token has completed its bonding curve and liquidity has been added to PancakeSwap. It is now freely tradeable on the DEX."
          : `This token is ${progressPercent.toFixed(1)}% through its bonding curve. Once it reaches 100%, it will graduate to PancakeSwap.`,
      };
    } catch (error: any) {
      return {
        status: "error",
        error: "Failed to read on-chain data from BSC",
        details: error.message,
      };
    }
  },
});

// ============================================================================
// Shared Constants: ABI selectors for tryBuy / trySell
// ============================================================================

// tryBuy(address token, uint256 amount, uint256 funds) -> (address,address,uint256,uint256,uint256,uint256,uint256,uint256)
const TRY_BUY_SELECTOR = "0xe21b103a"; // keccak256("tryBuy(address,uint256,uint256)")[:4]
// trySell(address token, uint256 amount) -> (address,address,uint256,uint256)
const TRY_SELL_SELECTOR = "0xc6f43e8c"; // keccak256("trySell(address,uint256)")[:4]

/**
 * Helper: Encode uint256 to 32-byte hex (no 0x prefix)
 */
function encodeUint256(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

/**
 * Helper: Encode address to 32-byte padded hex (no 0x prefix)
 */
function encodeAddress(addr: string): string {
  return addr.toLowerCase().replace("0x", "").padStart(64, "0");
}

// ============================================================================
// Tool: Quote Four.meme Buy
// ============================================================================

export const quoteFourMemeBuy = tool({
  description:
    "Get a buy quote for a token on Four.meme (BNB Chain bonding curve) without executing the transaction. Returns estimated tokens received, estimated BNB cost, and trading fee. Use this before executing a buy to show the user what they'll get. Pass EITHER a token amount OR a BNB funds amount (not both). For buying with BNB, set amountBnb to the BNB amount to spend and leave tokenAmount empty.",
  parameters: z.object({
    tokenAddress: z
      .string()
      .describe("The token contract address on BSC (0x...)"),
    tokenAmount: z
      .string()
      .optional()
      .describe(
        "Token amount to buy (in whole tokens, NOT wei). Leave empty if buying with a BNB amount."
      ),
    amountBnb: z
      .string()
      .optional()
      .describe(
        "BNB amount to spend (e.g. '0.01' for 0.01 BNB). Leave empty if specifying a token amount."
      ),
  }),
  execute: async ({ tokenAddress, tokenAmount, amountBnb }) => {
    try {
      // Convert to wei
      let amountWei = BigInt(0);
      let fundsWei = BigInt(0);

      if (amountBnb && amountBnb.trim() !== "") {
        // Buying with BNB amount (funds-based)
        const bnb = parseFloat(amountBnb);
        if (bnb <= 0) return { status: "error", error: "BNB amount must be greater than 0" };
        fundsWei = BigInt(Math.floor(bnb * 1e18));
      } else if (tokenAmount && tokenAmount.trim() !== "") {
        // Buying specific token amount
        const tokens = parseFloat(tokenAmount);
        if (tokens <= 0) return { status: "error", error: "Token amount must be greater than 0" };
        amountWei = BigInt(Math.floor(tokens * 1e18));
      } else {
        return { status: "error", error: "Specify either tokenAmount or amountBnb" };
      }

      // Encode: tryBuy(address, uint256, uint256)
      const callData = `${TRY_BUY_SELECTOR}${encodeAddress(tokenAddress)}${encodeUint256(amountWei)}${encodeUint256(fundsWei)}`;

      const rpcResponse = await fetch(BSC_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: HELPER_ADDRESS, data: callData }, "latest"],
        }),
      });

      const rpcData = await rpcResponse.json();
      if (rpcData.error) {
        return { status: "error", error: `BSC RPC error: ${rpcData.error.message || JSON.stringify(rpcData.error)}` };
      }

      const hex = (rpcData.result as string).slice(2);
      if (hex.length < 64 * 8) {
        return { status: "error", error: "Token not found or not a Four.meme bonding curve token." };
      }

      const decode = (i: number) => BigInt("0x" + hex.slice(i * 64, (i + 1) * 64));
      const tokenManager = "0x" + hex.slice(1 * 64 + 24, 2 * 64);
      const quoteToken = "0x" + hex.slice(2 * 64 + 24, 3 * 64);
      const estimatedAmount = decode(2);
      const estimatedCost = decode(3);
      const estimatedFee = decode(4);
      const amountMsgValue = decode(5);

      const isNativeQuote = quoteToken === "0x0000000000000000000000000000000000000000";
      const formatWei = (wei: bigint) => (Number(wei) / 1e18).toFixed(8);
      const formatTokens = (wei: bigint) => (Number(wei) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 2 });

      return {
        status: "success",
        quote: {
          token_address: tokenAddress,
          token_manager: tokenManager,
          quote_token: isNativeQuote ? "BNB (native)" : quoteToken,
          estimated_tokens: formatTokens(estimatedAmount),
          estimated_tokens_wei: estimatedAmount.toString(),
          estimated_cost: `${formatWei(estimatedCost)} ${isNativeQuote ? "BNB" : "quote token"}`,
          estimated_cost_wei: estimatedCost.toString(),
          trading_fee: `${formatWei(estimatedFee)} ${isNativeQuote ? "BNB" : "quote token"}`,
          total_to_send: `${formatWei(amountMsgValue)} BNB`,
          total_to_send_wei: amountMsgValue.toString(),
        },
        network: "BNB Chain (BSC)",
        note: `Buy quote for Four.meme token. You would receive approximately ${formatTokens(estimatedAmount)} tokens for ${formatWei(estimatedCost)} ${isNativeQuote ? "BNB" : "quote tokens"} (+ ${formatWei(estimatedFee)} fee). To execute, use the buy tool with this token address.`,
      };
    } catch (error: any) {
      return { status: "error", error: "Failed to get buy quote", details: error.message };
    }
  },
});

// ============================================================================
// Tool: Quote Four.meme Sell
// ============================================================================

export const quoteFourMemeSell = tool({
  description:
    "Get a sell quote for a token on Four.meme (BNB Chain bonding curve) without executing the transaction. Returns estimated BNB/quote received and trading fee. Use this before executing a sell to show the user what they'll receive.",
  parameters: z.object({
    tokenAddress: z
      .string()
      .describe("The token contract address on BSC (0x...)"),
    tokenAmount: z
      .string()
      .describe("Amount of tokens to sell (in whole tokens, NOT wei)"),
  }),
  execute: async ({ tokenAddress, tokenAmount }) => {
    try {
      const tokens = parseFloat(tokenAmount);
      if (tokens <= 0) return { status: "error", error: "Token amount must be greater than 0" };
      const amountWei = BigInt(Math.floor(tokens * 1e18));

      // Encode: trySell(address, uint256)
      const callData = `${TRY_SELL_SELECTOR}${encodeAddress(tokenAddress)}${encodeUint256(amountWei)}`;

      const rpcResponse = await fetch(BSC_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to: HELPER_ADDRESS, data: callData }, "latest"],
        }),
      });

      const rpcData = await rpcResponse.json();
      if (rpcData.error) {
        return { status: "error", error: `BSC RPC error: ${rpcData.error.message || JSON.stringify(rpcData.error)}` };
      }

      const hex = (rpcData.result as string).slice(2);
      if (hex.length < 64 * 4) {
        return { status: "error", error: "Token not found or not a Four.meme bonding curve token." };
      }

      const decode = (i: number) => BigInt("0x" + hex.slice(i * 64, (i + 1) * 64));
      const tokenManager = "0x" + hex.slice(0 * 64 + 24, 1 * 64);
      const quoteToken = "0x" + hex.slice(1 * 64 + 24, 2 * 64);
      const fundsReceived = decode(2);
      const fee = decode(3);

      const isNativeQuote = quoteToken === "0x0000000000000000000000000000000000000000";
      const formatWei = (wei: bigint) => (Number(wei) / 1e18).toFixed(8);

      const netReceived = fundsReceived - fee;

      return {
        status: "success",
        quote: {
          token_address: tokenAddress,
          token_manager: tokenManager,
          quote_token: isNativeQuote ? "BNB (native)" : quoteToken,
          tokens_to_sell: tokenAmount,
          gross_received: `${formatWei(fundsReceived)} ${isNativeQuote ? "BNB" : "quote token"}`,
          trading_fee: `${formatWei(fee)} ${isNativeQuote ? "BNB" : "quote token"}`,
          net_received: `${formatWei(netReceived)} ${isNativeQuote ? "BNB" : "quote token"}`,
          net_received_wei: netReceived.toString(),
        },
        network: "BNB Chain (BSC)",
        note: `Sell quote for Four.meme token. Selling ${tokenAmount} tokens would yield approximately ${formatWei(netReceived)} ${isNativeQuote ? "BNB" : "quote tokens"} after ${formatWei(fee)} fee. To execute, use the sell tool.`,
      };
    } catch (error: any) {
      return { status: "error", error: "Failed to get sell quote", details: error.message };
    }
  },
});
