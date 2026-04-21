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
import { createPublicClient, http, encodeFunctionData, encodeAbiParameters, fallback, parseEther } from "viem";
import { bsc } from "viem/chains";
import { getAgentPrivateKey } from "@/lib/agent/agent-wallet-store";

// ─── Constants ──────────────────────────────────────────────────────────────

const BSC_RPC_URL =
  process.env.BSC_RPC_URL ||
  "https://bnb-mainnet.g.alchemy.com/v2/QmCrH0w-wPKCJ7hBHKn1t";

const API_BASE = "https://four.meme/meme-api/v1";
const TOKEN_MANAGER2_ADDRESS = "0x5c952063c7fc8610FFDB798152D69F0B9550762b" as const;
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

const TOKEN_MANAGER2_ABI = [
  {
    name: "createToken",
    type: "function" as const,
    stateMutability: "payable" as const,
    inputs: [
      { name: "args", type: "bytes" as const },
      { name: "signature", type: "bytes" as const },
    ],
    outputs: [],
  },
  {
    name: "_launchFee",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint256" as const }],
  },
  {
    name: "_tradingFeeRate",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint256" as const }],
  },
] as const;

const ERC20_ABI = [
  {
    name: "balanceOf",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [{ name: "account", type: "address" as const }],
    outputs: [{ name: "", type: "uint256" as const }],
  },
  {
    name: "decimals",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [],
    outputs: [{ name: "", type: "uint8" as const }],
  },
  {
    name: "approve",
    type: "function" as const,
    stateMutability: "nonpayable" as const,
    inputs: [
      { name: "spender", type: "address" as const },
      { name: "amount", type: "uint256" as const },
    ],
    outputs: [{ name: "", type: "bool" as const }],
  },
  {
    name: "allowance",
    type: "function" as const,
    stateMutability: "view" as const,
    inputs: [
      { name: "owner", type: "address" as const },
      { name: "spender", type: "address" as const },
    ],
    outputs: [{ name: "", type: "uint256" as const }],
  },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPublicClient() {
  return createPublicClient({
    chain: bsc,
    transport: http("https://tiniest-sly-seed.bsc.quiknode.pro/1ca12a92f4abaa2d94c69d7d7d59d65a6539b969/", { timeout: 30000 }),
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
        // Clean and validate address
        const cleanAddress = tokenAddress.trim().toLowerCase();
        
        // Hallucination safeguard
        if (cleanAddress === "0x823fc8ef7295188d95708516d7458d6154179083") {
           return {
             status: "error",
             message: "Warning: You used a placeholder address (0x823fc8ef...). If you do not have the real address in context, you MUST call searchFourMemeTokens with the token name first to get the correct address."
           };
        }

        // Length validation (0x + 40 chars = 42)
        if (!cleanAddress.startsWith("0x") || cleanAddress.length !== 42) {
          return {
            status: "error",
            message: `Invalid address: "${tokenAddress}". It is either truncated or malformed (expected 40 hex characters). Please search for the token again to get the full correct address.`
          };
        }

        // 1. Auth check
        const isAgentEnabled = await hasDelegation(userId);
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
          args: [cleanAddress as `0x${string}`],
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
          args: [cleanAddress as `0x${string}`, 0n, fundsWei],
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
            abi: ERC20_ABI,
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

          console.log(`[FourMeme] Approval broadcasted: ${approveResult.transactionHash}. Waiting for confirmation...`);
          await publicClient.waitForTransactionReceipt({ 
            hash: approveResult.transactionHash as `0x${string}` 
          });
          console.log(`[FourMeme] Approval confirmed! Proceeding with buy.`);
        }

        // 6. Execute buy — try buyTokenAMAP first, fallback to X Mode buyToken if error "A"
        let buyResult;
        
        // First attempt: standard buyTokenAMAP
        const buyAmapData = encodeFunctionData({
          abi: BUYTOKEN_AMAP_ABI,
          functionName: "buyTokenAMAP",
          args: [cleanAddress as `0x${string}`, fundsWei, minAmount],
        });

        // If automation is disabled, return transaction data for manual approval
        if (!isAgentEnabled) {
          return {
            status: "requires_manual_approval",
            type: "buy",
            tokenAddress,
            amount: parsed.bnbAmount,
            isUsd: parsed.isUsd,
            usdAmount: parsed.usdAmount,
            estimatedTokens: formatTokens(estimatedAmount),
            preparedAt: Date.now(),
            transaction: {
              to: tokenManager,
              value: amountMsgValue.toString(),
              data: buyAmapData,
              chainId: 56,
            }
          };
        }

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
              cleanAddress as `0x${string}`,      // token
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
REQUIRED: Always call getAgentWalletInfo or getAgentTokenBalance first to confirm where your funds are before executing. Also call quoteFourMemeSell to show the estimate.`,
    parameters: z.object({
      tokenAddress: z
        .string()
        .describe("The Four.meme token contract address on BSC (0x...)"),
      tokenAmount: z
        .string()
        .describe(
          "Amount of tokens to sell (e.g. '1000000') or 'all' to sell the entire balance of the agent wallet."
        ),
      slippagePercent: z
        .number()
        .default(5)
        .describe("Slippage tolerance in percent (default 5%)"),
    }),
    execute: async ({ tokenAddress, tokenAmount, slippagePercent }) => {
      try {
        // Clean and validate address
        const cleanAddress = tokenAddress.trim().toLowerCase();

        // Length validation (0x + 40 chars = 42)
        if (!cleanAddress.startsWith("0x") || cleanAddress.length !== 42) {
          return {
            status: "error",
            message: `Invalid address: "${tokenAddress}". It is either truncated or malformed (expected 40 hex characters). Please search for the token again to get the full correct address.`
          };
        }
        // 1. Auth check
        const isAgentEnabled = await hasDelegation(userId);
        const walletAddress = await getUserAgentWalletAddress(userId);
        if (!walletAddress) {
          return { status: "error", message: "No embedded agent wallet found." };
        }

        const isAll = tokenAmount.toLowerCase().trim() === "all";
        let tokensToSellWei: bigint;
        let displayAmount = tokenAmount;

        const publicClient = getPublicClient();

        if (isAll) {
          console.log(`[FourMeme] Fetching balance of ${tokenAddress} for ${walletAddress}...`);
          const balance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [walletAddress as `0x${string}`],
          });
          
          if (balance === 0n) {
            return { status: "error", message: "You do not have any of these tokens in your agent wallet." };
          }
          
          tokensToSellWei = alignToGwei(balance);
          displayAmount = (Number(tokensToSellWei) / 1e18).toString();
        } else {
          const tokens = parseFloat(tokenAmount);
          if (tokens <= 0 || isNaN(tokens)) {
            return { status: "error", message: "Token amount must be > 0." };
          }
          tokensToSellWei = alignToGwei(BigInt(Math.floor(tokens * 1e18)));
        }

        console.log(
          `[FourMeme] Sell: ${displayAmount} tokens of ${tokenAddress} for user ${userId}`
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

        // 3. Approve token to tokenManager (only if needed)
        console.log(`[FourMeme] Checking allowance for ${tokenAddress}...`);
        const currentAllowance = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [walletAddress as `0x${string}`, tokenManager],
        });

        if (currentAllowance < tokensToSellWei) {
          console.log(
            `[FourMeme] Allowance insufficient (${currentAllowance} < ${tokensToSellWei}), approving...`
          );

          const approveData = encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [tokenManager, tokensToSellWei],
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

          console.log(`[FourMeme] Approval broadcasted: ${approveResult.transactionHash}. Waiting for confirmation...`);
          await publicClient.waitForTransactionReceipt({ 
            hash: approveResult.transactionHash as `0x${string}` 
          });
          console.log(`[FourMeme] Approval confirmed! Proceeding with sell.`);
        } else {
          console.log(`[FourMeme] Allowance sufficient, skipping approval step.`);
        }

        // 4. Execute sellToken
        const sellData = encodeFunctionData({
          abi: SELLTOKEN_SIMPLE_ABI,
          functionName: "sellToken",
          args: [tokenAddress as `0x${string}`, tokensToSellWei],
        });

        // If automation is disabled, return transaction data for manual approval
        if (!isAgentEnabled) {
          return {
            status: "requires_manual_approval",
            type: "sell",
            tokenAddress,
            tokenAmount: displayAmount,
            preparedAt: Date.now(),
            estimatedBnb: formatBnb(tokensToSellWei), // Rough estimate before quote logic but fine for UI
            transaction: {
              to: tokenManager,
              value: "0",
              data: sellData,
              chainId: 56,
            }
          };
        }

        const sellResult = await executeOnChainTransaction({
          userId,
          description: `Four.meme: Sell ${displayAmount} tokens (${tokenAddress})`,
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
          message: `Successfully sold ${displayAmount} tokens on Four.meme!`,
          transactionHash: sellResult.transactionHash,
          explorerUrl: sellResult.transactionHash
            ? `https://bscscan.com/tx/${sellResult.transactionHash}`
            : undefined,
          details: { tokenAddress, tokensSold: displayAmount, slippage: `${slippagePercent}%` },
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

// ─── Launch Tool Implementation ─────────────────────────────────────────────

export function createFourMemeLaunchTool(userId: string) {
  return tool({
    description:
      "Launch a new meme token on Four.meme (BNB Chain). Requires an image to be uploaded to the chat first. Supports optional Tax Tokens (trading fees) and Presale (developer buy-in).",
    parameters: z.object({
      name: z.string().describe("Token name (e.g. 'Barzakh AI')"),
      symbol: z.string().describe("Token symbol (e.g. 'BARZAKH')"),
      description: z.string().describe("Detailed description of the token project"),
      label: z.enum(['Meme', 'AI', 'Defi', 'Games', 'Infra', 'De-Sci', 'Social', 'Depin', 'Charity', 'Others']).describe("Category label"),
      presaleBnb: z.number().optional().default(0).describe("Amount of BNB to buy your own supply at launch (presale)"),
      taxInfo: z.object({
        feeRate: z.number().describe("Total fee rate (1, 3, 5, or 10 %)"),
        burnRate: z.number().describe("Percentage of fee to burn"),
        divideRate: z.number().describe("Percentage of fee for dividends"),
        liquidityRate: z.number().describe("Percentage of fee for liquidity"),
        recipientRate: z.number().describe("Percentage of fee for recipient"),
        recipientAddress: z.string().optional().describe("Address for recipient fee"),
        minSharing: z.number().optional().default(100000).describe("Min balance for sharing"),
      }).optional().describe("Optional tax token configuration (revenue sharing)"),
      twitter: z.string().optional().describe("Twitter/X profile URL"),
      telegram: z.string().optional().describe("Telegram group/channel URL"),
      website: z.string().optional().describe("Project website URL"),
      _messages: z.any().optional().describe("Internal: message history for image retrieval"),
    }),
    execute: async ({ name, symbol, description, label, presaleBnb, taxInfo, twitter, telegram, website, _messages }) => {
      try {
        // 1. Auth check
        const isAgentEnabled = await hasDelegation(userId);
        const agentAddress = await getUserAgentWalletAddress(userId);
        if (!agentAddress) {
          return { status: "error", message: "Agent wallet not found." };
        }

        // 2. Resolve Image from messages (look for type: 'image' in CoreMessage content)
        const messages = _messages || [];
        let foundImageUrl: string | null = null;
        let foundImageData: string | null = null;
        let foundMimeType: string | null = null;

        // Search backwards through messages for the most recent image
        for (let i = messages.length - 1; i >= 0; i--) {
           const m = messages[i];
           if (m.role !== 'user' || !Array.isArray(m.content)) continue;
           
           const imagePart = m.content.find((part: any) => part.type === 'image');
           if (imagePart) {
              if (typeof imagePart.image === 'string') {
                 // Check if it's a URL or base64
                 if (imagePart.image.startsWith('http')) {
                    foundImageUrl = imagePart.image;
                 } else {
                    foundImageData = imagePart.image;
                    foundMimeType = imagePart.mimeType || 'image/png';
                 }
                 break;
              } else if (imagePart.image instanceof URL) {
                 foundImageUrl = imagePart.image.toString();
                 break;
              }
           }
        }

        if (!foundImageUrl && !foundImageData) {
          return {
            status: "error",
            message: "I couldn't find the image in the chat history. Please upload the image again, and I'll proceed with the launch.",
          };
        }

        // 3. Fetch/Prepare Image Data
        let imageBuffer: Buffer;
        if (foundImageUrl) {
           const imageResponse = await fetch(foundImageUrl);
           if (!imageResponse.ok) {
              return { status: "error", message: "Failed to download the token image from the provided URL." };
           }
           const imageBlob = await imageResponse.blob();
           imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
        } else {
           // Base64 data
           imageBuffer = Buffer.from(foundImageData!, 'base64');
        }

        // 4. Four.meme API Auth (Nonce -> Login)
        const privateKey = await getAgentPrivateKey(userId);

        if (!privateKey) {
             return { status: "error", message: "Failed to retrieve agent signing key for authentication. Please make sure agent automation is enabled." };
        }

        const publicClient = getPublicClient();
        const { privateKeyToAccount } = await import("viem/accounts");
        const account = privateKeyToAccount(privateKey as `0x${string}`);

        // Get Nonce
        const nonceRes = await fetch(`${API_BASE}/private/user/nonce/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountAddress: agentAddress,
            verifyType: 'LOGIN',
            networkCode: 'BSC',
          }),
        });
        const nonceData = await nonceRes.json();
        if (nonceData.code !== '0' && nonceData.code !== 0) {
          throw new Error('Four.meme Nonce failed');
        }
        const nonce = nonceData.data;

        // Login
        const loginMessage = `You are sign in Meme ${nonce}`;
        const loginSig = await account.signMessage({ message: loginMessage });

        const loginRes = await fetch(`${API_BASE}/private/user/login/dex`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            region: 'WEB',
            langType: 'EN',
            verifyInfo: {
              address: agentAddress,
              networkCode: 'BSC',
              signature: loginSig,
              verifyType: 'LOGIN',
            },
            walletName: 'MetaMask',
          }),
        });
        const loginData = await loginRes.json();
        const accessToken = loginData.data;
        if (!accessToken) throw new Error("Four.meme login failed");

        // 5. Upload Image
        const formData = new FormData();
        // Use correct extension based on MIME type
        const extension = foundMimeType?.split('/')?.[1] || 'png';
        const fileName = `token-logo.${extension}`;
        
        formData.append('file', new Blob([new Uint8Array(imageBuffer)]), fileName);

        const uploadRes = await fetch(`${API_BASE}/private/token/upload`, {
          method: 'POST',
          headers: { 'meme-web-access': accessToken },
          body: formData as any,
        });

        if (!uploadRes.ok) {
           const errorText = await uploadRes.text();
           console.error("[FourMeme] Image upload failed with status:", uploadRes.status, errorText);
           if (uploadRes.status === 413) {
              return { status: "error", message: "The image/GIF you provided is too large for the Four.meme API. Please try a smaller file (under 5MB)." };
           }
           return { status: "error", message: `Four.meme image upload failed (${uploadRes.status}). The service might be experiencing issues or the file type is unsupported.` };
        }

        const uploadData = await uploadRes.json();
        const imgUrl = uploadData.data;
        if (!imgUrl) throw new Error("Image upload to Four.meme failed: No URL returned");

        // 6. Get Public Config (raisedToken)
        const configRes = await fetch(`${API_BASE}/public/config`);
        const configJson = await configRes.json();
        const symbols = configJson.data;
        const bnbConfig = symbols.find((s: any) => s.symbol === 'BNB' && s.status === 'PUBLISH') || symbols[0];

        // 7. Prep Metadata Create
        // Normalize label to canonical case-sensitive list
        const validLabels = ['Meme', 'AI', 'Defi', 'Games', 'Infra', 'De-Sci', 'Social', 'Depin', 'Charity', 'Others'];
        const normalizedLabel = validLabels.find(l => l.toLowerCase() === label.toLowerCase()) || label;

        const body: any = {
           name,
           shortName: symbol,
           desc: description,
           totalSupply: Number(bnbConfig.totalAmount || 1000000000),
           raisedAmount: Number(bnbConfig.totalBAmount || 24),
           saleRate: Number(bnbConfig.saleRate || 0.8),
           reserveRate: 0,
           imgUrl,
           raisedToken: bnbConfig,
           launchTime: Date.now(),
           funGroup: false,
           label: normalizedLabel,
           lpTradingFee: 0.0025,
           preSale: String(presaleBnb || 0),
           clickFun: false,
           symbol: bnbConfig.symbol,
           dexType: 'PANCAKE_SWAP',
           rushMode: false,
           onlyMPC: false,
           feePlan: false,
        };

        if (website) body.webUrl = website;
        if (twitter) body.twitterUrl = twitter;
        if (telegram) body.telegramUrl = telegram;

        if (taxInfo) {
           body.tokenTaxInfo = {
               feeRate: taxInfo.feeRate,
               burnRate: taxInfo.burnRate || 0,
               divideRate: taxInfo.divideRate || 0,
               liquidityRate: taxInfo.liquidityRate || 0,
               recipientRate: taxInfo.recipientRate || 0,
               recipientAddress: taxInfo.recipientAddress || "",
               minSharing: taxInfo.minSharing || 100000
           };
        }

        const createRes = await fetch(`${API_BASE}/private/token/create`, {
          method: 'POST',
          headers: {
            'meme-web-access': accessToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        const createData = await createRes.json();
        if (createData.code !== '0' && createData.code !== 0) throw new Error(`Create API failed: ${createData.msg}`);
        
        const { createArg, signature, creationFeeWei } = createData.data;

        // 8. Estimate Total Cost (On-chain)
        const launchFee = await publicClient.readContract({
          address: TOKEN_MANAGER2_ADDRESS,
          abi: TOKEN_MANAGER2_ABI,
          functionName: '_launchFee',
        });

        let totalValue = launchFee;
        if (presaleBnb > 0) {
           const presaleWei = parseEther(String(presaleBnb));
           const tradingFeeRate = await publicClient.readContract({
             address: TOKEN_MANAGER2_ADDRESS,
             abi: TOKEN_MANAGER2_ABI,
             functionName: '_tradingFeeRate',
           });
           const tradingFee = (presaleWei * tradingFeeRate) / 10000n;
           totalValue = launchFee + presaleWei + tradingFee;
        }

        // Use the API provided fee if higher (safety)
        const apiFee = BigInt(creationFeeWei || "0");
        if (apiFee > totalValue) totalValue = apiFee;

        // 9. Execute On-chain
        const launchData = encodeFunctionData({
           abi: TOKEN_MANAGER2_ABI,
           functionName: 'createToken',
           args: [createArg as `0x${string}`, signature as `0x${string}`],
        });

        // If automation is disabled, return transaction data for manual approval
        if (!isAgentEnabled) {
          return {
            status: "requires_manual_approval",
            type: "launch",
            name,
            symbol,
            presaleBnb,
            imgUrl,
            preparedAt: Date.now(),
            transaction: {
              to: TOKEN_MANAGER2_ADDRESS,
              value: totalValue.toString(),
              data: launchData,
              chainId: 56,
            }
          };
        }

        const launchResult = await executeOnChainTransaction({
          userId,
          description: `Launch Four.meme Token: ${name} (${symbol})`,
          estimatedValueUsd: "0",
          chainId: 56,
          transaction: {
            to: TOKEN_MANAGER2_ADDRESS,
            value: totalValue,
            data: launchData,
            chainId: 56,
          },
        });

        if (!launchResult.success || !launchResult.transactionHash) {
           return { status: "error", message: launchResult.error || "Token launch transaction failed." };
        }

        // 10. Extract Token Address from Receipt Logs
        let tokenAddress = "";
        try {
           const receipt = await publicClient.waitForTransactionReceipt({ 
              hash: launchResult.transactionHash as `0x${string}` 
           });
           
           const { decodeEventLog, parseAbiItem } = await import("viem");
           
           // List of potential ABI signatures to try (bonding curve events vary slightly)
           const potentialAbis = [
              parseAbiItem('event TokenCreate(address indexed creator, address indexed token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee)'),
              parseAbiItem('event TokenCreate(address indexed token, address indexed creator, string name, string symbol)'),
              parseAbiItem('event TokenCreate(address creator, address token, uint256 requestId, string name, string symbol, uint256 totalSupply, uint256 launchTime, uint256 launchFee)'),
           ];

           for (const log of receipt.logs) {
              if (log.address.toLowerCase() !== TOKEN_MANAGER2_ADDRESS.toLowerCase()) continue;
              
              for (const abi of potentialAbis) {
                 try {
                    const decoded = decodeEventLog({
                       abi: [abi],
                       data: log.data,
                       topics: log.topics,
                    });
                    if (decoded.eventName === 'TokenCreate') {
                       tokenAddress = (decoded.args as any).token;
                       break;
                    }
                 } catch (e) {
                    // Try next ABI
                 }
              }
              if (tokenAddress) break;
           }

           // Last resort fallback: Check for a Log that looks like a Token creation (Address topic)
           if (!tokenAddress) {
              for (const log of receipt.logs) {
                 // The TokenCreate signature hash: TokenCreate(address,address,uint256,string,string,uint256,uint256,uint256)
                 const SIG = "0x396d5e902b675b032348d3d2e9517ee8f0c4a926603fbc075d3d282ff00cad20";
                 if (log.topics[0] === SIG && log.topics.length >= 3) {
                    // Usually second or third topic is the token address
                    // In indexed: [sig, creator, token] or [sig, token, creator]
                    // We check both and pick the one that ISN'T the user's address
                    const topic1 = log.topics[1]?.replace("0x000000000000000000000000", "0x");
                    const topic2 = log.topics[2]?.replace("0x000000000000000000000000", "0x");
                    
                    const userAddress = await getUserAgentWalletAddress(userId);
                    if (topic1 && topic1.toLowerCase() !== userAddress?.toLowerCase()) tokenAddress = topic1;
                    else if (topic2) tokenAddress = topic2;
                    if (tokenAddress) break;
                 }
              }
           }
        } catch (e) {
           console.error("[FourMeme] Failed to parse transaction receipt for token address:", e);
        }

        const successMessage = `Successfully launched ${name} (${symbol}) on Four.meme!\n\n` +
           `Contract Address: ${tokenAddress || "Unknown (check explorer)"}\n` +
           `[Four.meme Link](${tokenAddress ? `https://four.meme/en/token/${tokenAddress}` : "N/A"})\n` +
           `[Explorer Link](https://bscscan.com/tx/${launchResult.transactionHash})`;

        return {
          status: "success",
          message: successMessage,
          transactionHash: launchResult.transactionHash,
          explorerUrl: `https://bscscan.com/tx/${launchResult.transactionHash}`,
          tokenAddress: tokenAddress || "Unknown (check explorer)",
          fourMemeUrl: tokenAddress ? `https://four.meme/en/token/${tokenAddress}` : undefined,
          details: { name, symbol, imgUrl, presale: presaleBnb },
        };

      } catch (error: any) {
        console.error("[FourMeme] Launch error:", error);
        return {
          status: "error",
          message: error.message || "Failed to launch token on Four.meme.",
        };
      }
    },
  });
}
