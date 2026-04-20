/**
 * Four.meme Agentic Executor — Buy/Sell + Quotes on BNB Chain Bonding Curve
 *
 * Uses viem readContract for quotes (matching the Four.meme reference SDK exactly)
 * and the user's embedded Dynamic wallet via delegated access for execution.
 *
 * All on-chain interactions go through TokenManagerHelper3 on BSC (chain ID 56).
 */

import { tool } from "ai";
import { z } from "zod";
import { executeOnChainTransaction } from "@/lib/agent/agent-payment-executor";
import {
  hasDelegation,
  getUserAgentWalletAddress,
} from "@/lib/agent/agent-wallet-store";
import { createPublicClient, http, encodeFunctionData, encodeAbiParameters, fallback } from "viem";
import { bsc } from "viem/chains";

// ─── Constants ──────────────────────────────────────────────────────────────

const BSC_RPC_URL =
  process.env.BSC_RPC_URL ||
  "https://bnb-mainnet.g.alchemy.com/v2/QmCrH0w-wPKCJ7hBHKn1t";

const HELPER_ADDRESS = "0xF251F83e40a78868FcfA3FA4599Dad6494E46034" as const;
const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000" as const;

// ─── ABI Definitions (from Four.meme reference SDK) ─────────────────────────

const HELPER_ABI = [
  {
    name: "getTokenInfo",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "token", type: "address" as const }],
    outputs: [
      { name: "version", type: "uint256" as const },
      { name: "tokenManager", type: "address" as const },
      { name: "quote", type: "address" as const },
      { name: "lastPrice", type: "uint256" as const },
      { name: "tradingFeeRate", type: "uint256" as const },
      { name: "minTradingFee", type: "uint256" as const },
      { name: "launchTime", type: "uint256" as const },
      { name: "offers", type: "uint256" as const },
      { name: "maxOffers", type: "uint256" as const },
      { name: "funds", type: "uint256" as const },
      { name: "maxFunds", type: "uint256" as const },
      { name: "liquidityAdded", type: "bool" as const },
    ],
  },
  {
    name: "tryBuy",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [
      { name: "token", type: "address" as const },
      { name: "amount", type: "uint256" as const },
      { name: "funds", type: "uint256" as const },
    ],
    outputs: [
      { name: "tokenManager", type: "address" as const },
      { name: "quote", type: "address" as const },
      { name: "estimatedAmount", type: "uint256" as const },
      { name: "estimatedCost", type: "uint256" as const },
      { name: "estimatedFee", type: "uint256" as const },
      { name: "amountMsgValue", type: "uint256" as const },
      { name: "amountApproval", type: "uint256" as const },
      { name: "amountFunds", type: "uint256" as const },
    ],
  },
  {
    name: "trySell",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [
      { name: "token", type: "address" as const },
      { name: "amount", type: "uint256" as const },
    ],
    outputs: [
      { name: "tokenManager", type: "address" as const },
      { name: "quote", type: "address" as const },
      { name: "funds", type: "uint256" as const },
      { name: "fee", type: "uint256" as const },
    ],
  },
] as const;

const BUYTOKEN_AMAP_ABI = [
  {
    name: "buyTokenAMAP",
    type: "function" as const,
    stateMutability: "payable" as const,
    inputs: [
      { name: "token", type: "address" as const },
      { name: "funds", type: "uint256" as const },
      { name: "minAmount", type: "uint256" as const },
    ],
    outputs: [],
  },
] as const;

// X Mode buy: buyToken(bytes args, uint256 time, bytes signature)
// Used for X Mode exclusive tokens that reject buyTokenAMAP with error "A"
const BUYTOKEN_XMODE_ABI = [
  {
    name: "buyToken",
    type: "function" as const,
    stateMutability: "payable" as const,
    inputs: [
      { name: "args", type: "bytes" as const },
      { name: "time", type: "uint256" as const },
      { name: "signature", type: "bytes" as const },
    ],
    outputs: [],
  },
] as const;

// BuyTokenParams struct layout for X Mode abi.encode
const BUY_TOKEN_PARAMS_TYPES = [
  { name: "origin", type: "uint256" as const },
  { name: "token", type: "address" as const },
  { name: "to", type: "address" as const },
  { name: "amount", type: "uint256" as const },
  { name: "maxFunds", type: "uint256" as const },
  { name: "funds", type: "uint256" as const },
  { name: "minAmount", type: "uint256" as const },
] as const;

const SELLTOKEN_SIMPLE_ABI = [
  {
    name: "sellToken",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "token", type: "address" as const },
      { name: "amount", type: "uint256" as const },
    ],
    outputs: [],
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "spender", type: "address" as const },
      { name: "amount", type: "uint256" as const },
    ],
    outputs: [{ type: "bool" as const }],
  },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPublicClient() {
  return createPublicClient({
    chain: bsc,
    transport: fallback([
      http(BSC_RPC_URL, { timeout: 60000 }),
      http("https://binance.llamarpc.com", { timeout: 60000 }),
      http("https://bsc-dataseed.binance.org", { timeout: 60000 }),
    ]),
  });
}

const formatBnb = (wei: bigint) => (Number(wei) / 1e18).toFixed(8);
const formatTokens = (wei: bigint) =>
  (Number(wei) / 1e18).toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Align a wei amount to GWEI precision (multiples of 1e9).
 * Four.meme contracts require all amounts to be GWEI-aligned,
 * otherwise they revert with error code "GW".
 */
const GWEI = BigInt(1e9);
function alignToGwei(wei: bigint): bigint {
  return (wei / GWEI) * GWEI;
}

/**
 * Fetch current BNB price in USD from CoinGecko (free, no API key needed).
 * Falls back to a cached estimate if the API is unavailable.
 */
async function getBnbPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd",
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const price = data?.binancecoin?.usd;
      if (price && price > 0) return price;
    }
  } catch {
    // fallback
  }
  // Fallback: try Binance API
  try {
    const res = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT",
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.ok) {
      const data = await res.json();
      const price = parseFloat(data?.price);
      if (price && price > 0) return price;
    }
  } catch {
    // fallback
  }
  console.warn("[FourMeme] Could not fetch BNB price, using fallback $600");
  return 600; // rough fallback
}

/**
 * Parse a user amount that can be:
 *  - "0.01" → 0.01 BNB
 *  - "$0.5" or "$5" → USD amount, convert to BNB
 * Returns BNB amount as a number.
 */
async function parseAmountToBnb(amount: string): Promise<{
  bnbAmount: number;
  isUsd: boolean;
  usdAmount?: number;
  bnbPrice?: number;
}> {
  const trimmed = amount.trim();

  // Check if it's a USD amount (starts with $ or ends with USD)
  const usdMatch = trimmed.match(
    /^\$?([\d.]+)\s*(?:USD|usd)?$|^([\d.]+)\s*(?:USD|usd)$/
  );
  if (trimmed.startsWith("$") || /usd$/i.test(trimmed)) {
    const numStr = trimmed.replace(/[$\s]|usd/gi, "");
    const usdAmount = parseFloat(numStr);
    if (usdAmount > 0) {
      const bnbPrice = await getBnbPriceUsd();
      const bnbAmount = usdAmount / bnbPrice;
      console.log(
        `[FourMeme] Converted $${usdAmount} USD → ${bnbAmount.toFixed(6)} BNB (BNB price: $${bnbPrice})`
      );
      return { bnbAmount, isUsd: true, usdAmount, bnbPrice };
    }
  }

  // Otherwise treat as BNB amount
  const bnbAmount = parseFloat(trimmed);
  return { bnbAmount, isUsd: false };
}

// ============================================================================
// Tool: Quote Four.meme Buy (using viem readContract)
// ============================================================================

export const quoteFourMemeBuyTool = tool({
  description:
    "Get a buy quote for a token on Four.meme (BNB Chain bonding curve) WITHOUT executing. Returns estimated tokens received, BNB cost, and trading fee. Supports both BNB amounts (e.g. '0.01') and USD amounts (e.g. '$0.5', '$5 USD'). Use this before executing a buy to show the user what they'll get.",
  parameters: z.object({
    tokenAddress: z
      .string()
      .describe("The token contract address on BSC (0x...)"),
    amount: z
      .string()
      .describe(
        "Amount to spend. Can be BNB (e.g. '0.01') or USD (e.g. '$0.5', '$5 USD'). If the user says '$X worth of BNB', treat it as USD."
      ),
  }),
  execute: async ({ tokenAddress, amount }) => {
    try {
      const parsed = await parseAmountToBnb(amount);
      if (parsed.bnbAmount <= 0 || isNaN(parsed.bnbAmount)) {
        return { status: "error", error: "Invalid amount. Provide a BNB amount (e.g. '0.01') or USD amount (e.g. '$0.5')." };
      }

      const fundsWei = BigInt(Math.floor(parsed.bnbAmount * 1e18));
      const publicClient = getPublicClient();

      // Call tryBuy(token, 0, fundsWei) — funds-based buy
      const result = await publicClient.readContract({
        address: HELPER_ADDRESS,
        abi: HELPER_ABI,
        functionName: "tryBuy",
        args: [tokenAddress as `0x${string}`, 0n, fundsWei],
      });

      const [tokenManager, quote, estimatedAmount, estimatedCost, estimatedFee, amountMsgValue] = result;
      const isNativeQuote = quote === ZERO_ADDRESS;

      // Handle 0-quote (usually invalid address or graduated token)
      if (estimatedAmount === 0n) {
        return {
          status: "error",
          error: "The Four.meme bonding curve returned 0 tokens for this amount. This usually means the token address is incorrect, or the token has already graduated to PancakeSwap (DEX).",
          details: `Address: ${tokenAddress}. Try searching for the token again to verify its address.`,
        };
      }

      return {
        status: "success",
        quote: {
          token_address: tokenAddress,
          token_manager: tokenManager,
          quote_token: isNativeQuote ? "BNB (native)" : quote,
          estimated_tokens: formatTokens(estimatedAmount),
          estimated_tokens_wei: estimatedAmount.toString(),
          estimated_cost: `${formatBnb(estimatedCost)} ${isNativeQuote ? "BNB" : "quote token"}`,
          estimated_cost_wei: estimatedCost.toString(),
          trading_fee: `${formatBnb(estimatedFee)} ${isNativeQuote ? "BNB" : "quote token"}`,
          total_to_send: `${formatBnb(amountMsgValue)} BNB`,
          total_to_send_wei: amountMsgValue.toString(),
          ...(parsed.isUsd
            ? {
                usd_amount: `$${parsed.usdAmount?.toFixed(2)}`,
                bnb_equivalent: `${parsed.bnbAmount.toFixed(6)} BNB`,
                bnb_price: `$${parsed.bnbPrice?.toFixed(2)}`,
              }
            : {}),
        },
        network: "BNB Chain (BSC)",
        note: `Buy quote: ~${formatTokens(estimatedAmount)} tokens for ${formatBnb(estimatedCost)} BNB${parsed.isUsd ? ` ($${parsed.usdAmount?.toFixed(2)} USD)` : ""} + ${formatBnb(estimatedFee)} fee.`,
      };
    } catch (error: any) {
      console.error("[FourMeme] Quote buy error:", error);
      return {
        status: "error",
        error: "Failed to get buy quote. The token may not exist on the bonding curve or may have graduated to PancakeSwap.",
        details: error.message,
      };
    }
  },
});

// ============================================================================
// Tool: Quote Four.meme Sell (using viem readContract)
// ============================================================================

export const quoteFourMemeSellTool = tool({
  description:
    "Get a sell quote for a token on Four.meme (BNB Chain bonding curve) WITHOUT executing. Returns estimated BNB received and trading fee. Use this before executing a sell.",
  parameters: z.object({
    tokenAddress: z
      .string()
      .describe("The token contract address on BSC (0x...)"),
    tokenAmount: z
      .string()
      .describe("Amount of tokens to sell (in whole tokens, e.g. '1000000')"),
  }),
  execute: async ({ tokenAddress, tokenAmount }) => {
    try {
      const tokens = parseFloat(tokenAmount);
      if (tokens <= 0 || isNaN(tokens)) {
        return { status: "error", error: "Token amount must be greater than 0." };
      }

      const amountWei = alignToGwei(BigInt(Math.floor(tokens * 1e18)));
      const publicClient = getPublicClient();

      const result = await publicClient.readContract({
        address: HELPER_ADDRESS,
        abi: HELPER_ABI,
        functionName: "trySell",
        args: [tokenAddress as `0x${string}`, amountWei],
      });

      const [tokenManager, quote, fundsReceived, fee] = result;
      const isNativeQuote = quote === ZERO_ADDRESS;
      const netReceived = fundsReceived - fee;

      return {
        status: "success",
        quote: {
          token_address: tokenAddress,
          token_manager: tokenManager,
          quote_token: isNativeQuote ? "BNB (native)" : quote,
          tokens_to_sell: tokenAmount,
          gross_received: `${formatBnb(fundsReceived)} ${isNativeQuote ? "BNB" : "quote token"}`,
          trading_fee: `${formatBnb(fee)} ${isNativeQuote ? "BNB" : "quote token"}`,
          net_received: `${formatBnb(netReceived)} ${isNativeQuote ? "BNB" : "quote token"}`,
          net_received_wei: netReceived.toString(),
        },
        network: "BNB Chain (BSC)",
        note: `Sell quote: ${tokenAmount} tokens → ~${formatBnb(netReceived)} ${isNativeQuote ? "BNB" : "quote"} (after ${formatBnb(fee)} fee).`,
      };
    } catch (error: any) {
      console.error("[FourMeme] Quote sell error:", error);
      return {
        status: "error",
        error: "Failed to get sell quote. The token may not exist on the bonding curve.",
        details: error.message,
      };
    }
  },
});

// ============================================================================
// Agentic Buy Tool (requires Agent Automation)
// ============================================================================

export const createFourMemeBuyTool = (userId: string) =>
  tool({
    description: `Execute a buy on Four.meme (BNB Chain bonding curve) using the user's embedded agent wallet.
Buys tokens by spending BNB. Supports both BNB amounts (e.g. '0.01') and USD amounts (e.g. '$0.5', '$5 USD').
Uses buyTokenAMAP with slippage protection.
REQUIRES Agent Automation to be ENABLED. Only works for bonding curve tokens (not graduated DEX tokens).
Always call quoteFourMemeBuy first to show the estimate before executing.`,
    parameters: z.object({
      tokenAddress: z
        .string()
        .describe("The Four.meme token contract address on BSC (0x...)"),
      amount: z
        .string()
        .describe(
          "Amount to spend. BNB amount (e.g. '0.01') or USD amount (e.g. '$0.5', '$5 USD'). If user says '$X worth of BNB', treat as USD."
        ),
      slippagePercent: z
        .number()
        .default(5)
        .describe(
          "Slippage tolerance in percent (default 5%). Min tokens = estimated * (1 - slippage/100)"
        ),
    }),
    execute: async ({ tokenAddress, amount, slippagePercent }) => {
      try {
        // Hallucination safeguard
        if (tokenAddress.toLowerCase() === "0x823fc8ef7295188d95708516d7458d6154179083") {
           return {
             status: "error",
             message: "Warning: You are using a documentation example address (0x823fc8ef...). Please search for the actual token first and use the address provided in the search results."
           };
        }

        // 1. Auth check
        const isAgentEnabled = await hasDelegation(userId);
        if (!isAgentEnabled) {
          return {
            status: "error",
            message:
              "Agent Automation is not enabled. The user must enable it in Settings → Wallet first.",
          };
        }
        const walletAddress = await getUserAgentWalletAddress(userId);
        if (!walletAddress) {
          return { status: "error", message: "No embedded agent wallet found." };
        }

        // 2. Parse amount (supports USD conversion)
        const parsed = await parseAmountToBnb(amount);
        if (parsed.bnbAmount <= 0 || isNaN(parsed.bnbAmount)) {
          return { status: "error", message: "Invalid amount." };
        }

        const fundsWei = BigInt(Math.floor(parsed.bnbAmount * 1e18));
        const publicClient = getPublicClient();

        console.log(
          `[FourMeme] Buy: ${parsed.isUsd ? `$${parsed.usdAmount} (${parsed.bnbAmount.toFixed(6)} BNB)` : `${amount} BNB`} of ${tokenAddress} for user ${userId}`
        );

        // 3. Get token info
        const tokenInfo = await publicClient.readContract({
          address: HELPER_ADDRESS,
          abi: HELPER_ABI,
          functionName: "getTokenInfo",
          args: [tokenAddress as `0x${string}`],
        });

        const [, tokenManager, quote, , , , , , , , , liquidityAdded] =
          tokenInfo;

        if (liquidityAdded) {
          return {
            status: "error",
            message:
              "This token has already graduated to PancakeSwap. Use a DEX swap tool instead.",
          };
        }

        // 4. Get buy quote
        const tryBuyResult = await publicClient.readContract({
          address: HELPER_ADDRESS,
          abi: HELPER_ABI,
          functionName: "tryBuy",
          args: [tokenAddress as `0x${string}`, 0n, fundsWei],
        });

        const [, , estimatedAmount, , , amountMsgValue, amountApproval] =
          tryBuyResult;

        // Apply slippage
        const slippageBps = BigInt(Math.floor(slippagePercent * 100));
        const minAmount = alignToGwei(
          (estimatedAmount * (BigInt(10000) - slippageBps)) / BigInt(10000)
        );

        console.log(
          `[FourMeme] Estimated: ${formatTokens(estimatedAmount)} tokens, minAmount: ${formatTokens(minAmount)}, msgValue: ${formatBnb(amountMsgValue)} BNB`
        );

        // 5. Approve if BEP-20 quote
        if (quote !== ZERO_ADDRESS && amountApproval > 0n) {
          console.log(
            `[FourMeme] Approving ${amountApproval} of quote ${quote} to ${tokenManager}`
          );

          const approveData = encodeFunctionData({
            abi: ERC20_APPROVE_ABI,
            functionName: "approve",
            args: [tokenManager, amountApproval],
          });

          const approveResult = await executeOnChainTransaction({
            userId,
            description: "Four.meme: Approve quote token for buy",
            estimatedValueUsd: "0",
            chainId: 56,
            transaction: {
              to: quote,
              value: 0n,
              data: approveData,
              chainId: 56,
            },
          });

          if (!approveResult.success) {
            return {
              status: "error",
              message: `Approval failed: ${approveResult.error}`,
            };
          }
        }

        // 6. Execute buy — try buyTokenAMAP first, fallback to X Mode buyToken if error "A"
        let buyResult;
        
        // First attempt: standard buyTokenAMAP
        const buyAmapData = encodeFunctionData({
          abi: BUYTOKEN_AMAP_ABI,
          functionName: "buyTokenAMAP",
          args: [tokenAddress as `0x${string}`, fundsWei, minAmount],
        });

        buyResult = await executeOnChainTransaction({
          userId,
          description: `Four.meme: Buy tokens (${parsed.isUsd ? `$${parsed.usdAmount}` : `${amount} BNB`} → ${tokenAddress})`,
          estimatedValueUsd: parsed.isUsd
            ? String(parsed.usdAmount)
            : String(parsed.bnbAmount),
          chainId: 56,
          transaction: {
            to: tokenManager,
            value: amountMsgValue,
            data: buyAmapData,
            chainId: 56,
          },
        });

        // If failed with X Mode error "A", retry with X Mode buyToken(bytes,uint256,bytes)
        if (!buyResult.success && buyResult.error?.includes("A")) {
          console.log(`[FourMeme] Token is X Mode exclusive, retrying with X Mode buyToken...`);

          // Encode BuyTokenParams struct
          const encodedParams = encodeAbiParameters(
            BUY_TOKEN_PARAMS_TYPES,
            [
              0n,                                 // origin: 0
              tokenAddress as `0x${string}`,      // token
              walletAddress as `0x${string}`,      // to: buyer's wallet
              0n,                                 // amount: 0 (funds-based)
              0n,                                 // maxFunds: 0 (skip)
              fundsWei,                           // funds: BNB to spend
              minAmount,                          // minAmount: slippage protection
            ]
          );

          const buyXModeData = encodeFunctionData({
            abi: BUYTOKEN_XMODE_ABI,
            functionName: "buyToken",
            args: [
              encodedParams,                      // args: encoded BuyTokenParams
              0n,                                 // time: reserved (ignored)
              "0x" as `0x${string}`,              // signature: reserved (ignored)
            ],
          });

          buyResult = await executeOnChainTransaction({
            userId,
            description: `Four.meme: Buy X Mode tokens (${parsed.isUsd ? `$${parsed.usdAmount}` : `${amount} BNB`} → ${tokenAddress})`,
            estimatedValueUsd: parsed.isUsd
              ? String(parsed.usdAmount)
              : String(parsed.bnbAmount),
            chainId: 56,
            transaction: {
              to: tokenManager,
              value: amountMsgValue,
              data: buyXModeData,
              chainId: 56,
            },
          });
        }

        if (!buyResult.success) {
          return {
            status: "error",
            message: buyResult.error || "Buy transaction failed.",
          };
        }

        return {
          status: "success",
          message: `Successfully bought ~${formatTokens(estimatedAmount)} tokens for ${formatBnb(amountMsgValue)} BNB${parsed.isUsd ? ` ($${parsed.usdAmount?.toFixed(2)})` : ""} on Four.meme!`,
          transactionHash: buyResult.transactionHash,
          explorerUrl: buyResult.transactionHash
            ? `https://bscscan.com/tx/${buyResult.transactionHash}`
            : undefined,
          details: {
            tokenAddress,
            bnbSpent: formatBnb(amountMsgValue),
            estimatedTokens: formatTokens(estimatedAmount),
            slippage: `${slippagePercent}%`,
            ...(parsed.isUsd
              ? { usdAmount: `$${parsed.usdAmount?.toFixed(2)}`, bnbPrice: `$${parsed.bnbPrice?.toFixed(2)}` }
              : {}),
          },
        };
      } catch (error: any) {
        console.error("[FourMeme] Buy error:", error);
        return {
          status: "error",
          message: error.message || "Failed to execute buy on Four.meme.",
        };
      }
    },
  });

// ============================================================================
// Agentic Sell Tool (requires Agent Automation)
// ============================================================================

export const createFourMemeSellTool = (userId: string) =>
  tool({
    description: `Execute a sell on Four.meme (BNB Chain bonding curve) using the user's embedded agent wallet.
Sells tokens back to the bonding curve for BNB.
REQUIRES Agent Automation to be ENABLED. Only works for bonding curve tokens (not graduated DEX tokens).
Always call quoteFourMemeSell first to show the estimate before executing.`,
    parameters: z.object({
      tokenAddress: z
        .string()
        .describe("The Four.meme token contract address on BSC (0x...)"),
      tokenAmount: z
        .string()
        .describe(
          "Amount of tokens to sell (in whole tokens, e.g. '1000000')"
        ),
      slippagePercent: z
        .number()
        .default(5)
        .describe("Slippage tolerance in percent (default 5%)"),
    }),
    execute: async ({ tokenAddress, tokenAmount, slippagePercent }) => {
      try {
        // 1. Auth check
        const isAgentEnabled = await hasDelegation(userId);
        if (!isAgentEnabled) {
          return {
            status: "error",
            message:
              "Agent Automation is not enabled. Enable it in Settings → Wallet.",
          };
        }
        const walletAddress = await getUserAgentWalletAddress(userId);
        if (!walletAddress) {
          return { status: "error", message: "No embedded agent wallet found." };
        }

        const tokens = parseFloat(tokenAmount);
        if (tokens <= 0 || isNaN(tokens)) {
          return { status: "error", message: "Token amount must be > 0." };
        }

        const amountWei = alignToGwei(BigInt(Math.floor(tokens * 1e18)));
        const publicClient = getPublicClient();

        console.log(
          `[FourMeme] Sell: ${tokenAmount} tokens of ${tokenAddress} for user ${userId}`
        );

        // 2. Get token info
        const tokenInfo = await publicClient.readContract({
          address: HELPER_ADDRESS,
          abi: HELPER_ABI,
          functionName: "getTokenInfo",
          args: [tokenAddress as `0x${string}`],
        });

        const [, tokenManager, , , , , , , , , , liquidityAdded] = tokenInfo;

        if (liquidityAdded) {
          return {
            status: "error",
            message:
              "This token has graduated to PancakeSwap. Use a DEX swap tool.",
          };
        }

        // 3. Approve token to tokenManager
        console.log(
          `[FourMeme] Approving ${amountWei} tokens to ${tokenManager}`
        );

        const approveData = encodeFunctionData({
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [tokenManager, amountWei],
        });

        const approveResult = await executeOnChainTransaction({
          userId,
          description: "Four.meme: Approve tokens for sell",
          estimatedValueUsd: "0",
          chainId: 56,
          transaction: {
            to: tokenAddress as `0x${string}`,
            value: 0n,
            data: approveData,
            chainId: 56,
          },
        });

        if (!approveResult.success) {
          return {
            status: "error",
            message: `Token approval failed: ${approveResult.error}`,
          };
        }

        // 4. Execute sellToken
        const sellData = encodeFunctionData({
          abi: SELLTOKEN_SIMPLE_ABI,
          functionName: "sellToken",
          args: [tokenAddress as `0x${string}`, amountWei],
        });

        const sellResult = await executeOnChainTransaction({
          userId,
          description: `Four.meme: Sell ${tokenAmount} tokens (${tokenAddress})`,
          estimatedValueUsd: "0",
          chainId: 56,
          transaction: {
            to: tokenManager,
            value: 0n,
            data: sellData,
            chainId: 56,
          },
        });

        if (!sellResult.success) {
          return {
            status: "error",
            message: sellResult.error || "Sell transaction failed.",
          };
        }

        return {
          status: "success",
          message: `Successfully sold ${tokenAmount} tokens on Four.meme!`,
          transactionHash: sellResult.transactionHash,
          explorerUrl: sellResult.transactionHash
            ? `https://bscscan.com/tx/${sellResult.transactionHash}`
            : undefined,
          details: { tokenAddress, tokensSold: tokenAmount, slippage: `${slippagePercent}%` },
        };
      } catch (error: any) {
        console.error("[FourMeme] Sell error:", error);
        return {
          status: "error",
          message: error.message || "Failed to execute sell on Four.meme.",
        };
      }
    },
  });
