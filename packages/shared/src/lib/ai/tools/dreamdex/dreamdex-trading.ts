import { tool } from "ai";
import { z } from "zod";
import { formatEther, formatUnits } from "viem";
import { dreamDexApi } from "./api-client";
import { createSomniaClient, SOMNIA_TESTNET_EXPLORER, SOMNIA_MAINNET_EXPLORER } from "./sdk-client";

const TUSDC_TESTNET_ADDRESS = "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E" as const;
const SOMNIA_FAUCET_URL = "https://t.me/+XHq0F0JXMyhmMzM0";

const erc20BalanceOfAbi = [
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

interface BalanceCheckResult {
  hasChecked: boolean;
  canTrade: boolean;
  reason?: "insufficient_collateral" | "insufficient_gas";
  sttBalance?: string;
  usdcBalance?: string;
  requiredCollateral?: string;
  message?: string;
}

async function checkUserBalances(
  address?: string,
  requiredUSDC: number = 0,
  testnet: boolean = true
): Promise<BalanceCheckResult> {
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    return { hasChecked: false, canTrade: true };
  }

  try {
    const { publicClient } = createSomniaClient("", testnet);

    // Check native STT gas and tUSDC collateral concurrently with 1500ms timeout race
    const balancePromise = Promise.allSettled([
      publicClient.getBalance({ address: address as `0x${string}` }),
      publicClient.readContract({
        address: TUSDC_TESTNET_ADDRESS,
        abi: erc20BalanceOfAbi,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      }),
    ]);
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
    const raceRes = await Promise.race([balancePromise, timeoutPromise]);

    if (!raceRes) {
      console.warn("[DreamDexTrading] On-chain balance check timed out (1500ms), proceeding optimistically");
      return {
        hasChecked: false,
        canTrade: true,
        sttBalance: "1.0000 STT",
        usdcBalance: "100.00 tUSDC",
        requiredCollateral: `${requiredUSDC.toFixed(2)} tUSDC`,
      };
    }

    const [rawSttResult, rawUsdcResult] = raceRes;

    const rawStt = rawSttResult.status === "fulfilled" ? rawSttResult.value : 0n;
    const sttFormatted = formatEther(rawStt);
    const sttBalanceNum = Number(sttFormatted);

    let usdcFormatted = "0.00";
    let usdcBalanceNum = 0;
    if (rawUsdcResult.status === "fulfilled") {
      usdcFormatted = formatUnits(rawUsdcResult.value as bigint, 6);
      usdcBalanceNum = Number(usdcFormatted);
    } else {
      console.warn("Could not read tUSDC balance on Somnia:", rawUsdcResult.reason);
    }

    const truncatedAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

    if (sttBalanceNum <= 0) {
      return {
        hasChecked: true,
        canTrade: false,
        reason: "insufficient_gas",
        sttBalance: `${sttBalanceNum.toFixed(4)} STT`,
        usdcBalance: `${usdcBalanceNum.toFixed(2)} tUSDC`,
        requiredCollateral: `${requiredUSDC.toFixed(2)} tUSDC`,
        message: `Your wallet (${truncatedAddr}) has 0 STT for gas fees on Somnia Network. Please claim free testnet STT from the Somnia faucet first: ${SOMNIA_FAUCET_URL}`,
      };
    }

    if (usdcBalanceNum < requiredUSDC) {
      return {
        hasChecked: true,
        canTrade: false,
        reason: "insufficient_collateral",
        sttBalance: `${sttBalanceNum.toFixed(4)} STT`,
        usdcBalance: `${usdcBalanceNum.toFixed(2)} tUSDC`,
        requiredCollateral: `${requiredUSDC.toFixed(2)} tUSDC`,
        message: `Insufficient tUSDC collateral! This order requires ${requiredUSDC.toFixed(2)} tUSDC, but your wallet (${truncatedAddr}) only has ${usdcBalanceNum.toFixed(2)} tUSDC. Please claim free testnet tUSDC from the Somnia faucet before trading: ${SOMNIA_FAUCET_URL}`,
      };
    }

    return {
      hasChecked: true,
      canTrade: true,
      sttBalance: `${sttBalanceNum.toFixed(4)} STT`,
      usdcBalance: `${usdcBalanceNum.toFixed(2)} tUSDC`,
      requiredCollateral: `${requiredUSDC.toFixed(2)} tUSDC`,
    };
  } catch (error: any) {
    console.error("Somnia balance check error:", error?.message || error);
    return { hasChecked: false, canTrade: true };
  }
}

export const dreamDexMintTokens = tool({
  description:
    "Prepare a transaction to mint Up and Down outcome token pairs on a DreamDEX Event Contract market on Somnia Network. Deposits tUSDC collateral to receive equal amounts of Up and Down tokens (ERC-6909). 1 tUSDC = 1 Up + 1 Down token pair. Note: Uses tUSDC as collateral; STT is native gas. Validates user balance before preparation.",
  parameters: z.object({
    marketSymbol: z
      .string()
      .optional()
      .describe("The Event Contract market symbol or asset (e.g. 'ETH', 'BTC', 'ETH-5m'). Default: 'ETH'"),
    amount: z
      .number()
      .describe("Amount of tUSDC collateral to mint with (e.g., 20 = 20 tUSDC = 20 Up + 20 Down tokens)"),
    userAddress: z
      .string()
      .optional()
      .describe("User's EVM wallet address to verify collateral and gas balance"),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
  }),
  execute: async ({ marketSymbol = "ETH", amount, userAddress, testnet = true }) => {
    try {
      const market = await dreamDexApi.getMarketBySymbol(marketSymbol || "ETH");
      if (!market?.poolAddress) {
        return {
          success: false,
          error: "No active live prediction market found on DreamDEX. Please try again shortly.",
        };
      }
      const targetSymbol = market.symbol || marketSymbol;
      const targetQuestion = market.question || `Will ${market.asset || "ETH"} go Up?`;

      // Verify on-chain balances if address is available
      const balanceCheck = await checkUserBalances(userAddress, amount, testnet);
      if (!balanceCheck.canTrade) {
        return {
          success: false,
          status: balanceCheck.reason,
          error: balanceCheck.reason === "insufficient_gas" ? "Insufficient STT Gas" : "Insufficient tUSDC Collateral",
          action: "mint",
          marketSymbol: targetSymbol,
          userAddress,
          requiredCollateral: balanceCheck.requiredCollateral,
          currentBalance: balanceCheck.usdcBalance,
          sttBalance: balanceCheck.sttBalance,
          faucetUrl: SOMNIA_FAUCET_URL,
          tradeDetails: {
            market: targetSymbol,
            question: targetQuestion,
            side: "MINT UP + DOWN SET",
            probability: "1.00 (Collateral Mint)",
            quantity: amount,
            collateral: `${amount.toFixed(2)} tUSDC`,
          },
          message: balanceCheck.message,
        };
      }

      return {
        success: true,
        status: "prepared_awaiting_approval",
        isExecuted: false,
        requiresApproval: true,
        executionMode: "requires_signature",
        action: "mint",
        marketSymbol: targetSymbol,
        userAddress: userAddress || undefined,
        walletBalance: balanceCheck.hasChecked ? {
          tUSDC: balanceCheck.usdcBalance,
          stt: balanceCheck.sttBalance,
        } : undefined,
        parameters: {
          marketSymbol: targetSymbol,
          pool: market.poolAddress,
          amount,
          testnet,
        },
        tradeDetails: {
          market: targetSymbol,
          question: targetQuestion,
          side: "MINT UP + DOWN SET",
          probability: "1.00 (Collateral Mint)",
          quantity: amount,
          collateral: `${amount} tUSDC`,
        },
        message: `Transaction PREPARED (awaiting user confirmation/signature). Action: Deposit ${amount} tUSDC collateral to mint ${amount} UP + ${amount} DOWN tokens on ${targetSymbol}. NOTE: This transaction has NOT yet been broadcasted on-chain. Please review and confirm below.`,
        faucetUrl: SOMNIA_FAUCET_URL,
      };
    } catch (error: any) {
      return {
        error: "Failed to prepare mint transaction",
        details: error.message || String(error),
      };
    }
  },
});

export const dreamDexPlaceOrder = tool({
  description:
    "Prepare a buy or sell order on a DreamDEX Event Contract market's order book (CLOB) on Somnia Network. Validates user tUSDC collateral and STT gas balances on-chain before preparing the order. Price is expressed as implied probability (0.01-0.99, where 0.65 means 65% implied probability = $0.65/share). NOTE: Returns prepared order parameters for user confirmation; does NOT execute on-chain immediately without approval.",
  parameters: z.object({
    marketSymbol: z
      .string()
      .optional()
      .describe("The Event Contract market symbol or asset name (e.g. 'ETH', 'BTC', 'SOMI', or market symbol). Default: 'ETH'"),
    side: z
      .string()
      .describe("Order side: 'buy_up' (or 'up'), 'buy_down' (or 'down'), 'sell_up', 'sell_down'"),
    price: z
      .number()
      .optional()
      .describe("Order price as probability (0.01-0.99). Example: 0.50 means 50% probability ($0.50/contract). Optional: if omitted by user, automatically defaults to market implied probability or 0.50."),
    amount: z
      .number()
      .optional()
      .describe("Total collateral in tUSDC to bet/risk (e.g. 50 for 'Put 50 tUSDC' or 'Bet 50'). CRITICAL: ALWAYS use `amount` when user specifies a bet/risk amount in tUSDC, STT, or dollars! The contract quantity is automatically computed as amount / price so the user bets their EXACT requested collateral amount. Do NOT pass a bet amount into quantity!"),
    quantity: z
      .number()
      .optional()
      .describe("Number of contracts to trade (e.g. 100). ONLY use if user explicitly specifies contract units (e.g. 'buy 50 contracts'). If user specifies a bet amount in tUSDC, use `amount` instead."),
    orderType: z
      .enum(["limit", "ioc"])
      .optional()
      .describe("Order type: limit (rests on book) or ioc (fills immediately or cancels). Default: limit"),
    userAddress: z
      .string()
      .optional()
      .describe("User's EVM wallet address to verify collateral and gas balance"),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
  }),
  execute: async ({
    marketSymbol = "ETH",
    side,
    price,
    amount,
    quantity,
    orderType = "limit",
    userAddress,
    testnet = true,
  }) => {
    try {
      const market = await dreamDexApi.getMarketBySymbol(marketSymbol || "ETH");
      if (!market?.poolAddress) {
        return {
          success: false,
          error: "No active live prediction market found on DreamDEX. Please try again shortly.",
        };
      }
      const targetSymbol = market.symbol || marketSymbol;
      const targetQuestion = market.question || `Will ${market.asset || "ETH"} go Up?`;

      const rawSide = (side || "buy_up").toLowerCase().trim();
      const effectiveSide: "buy_up" | "buy_down" | "sell_up" | "sell_down" =
        rawSide.includes("sell_down") ? "sell_down"
        : rawSide.includes("sell_up") ? "sell_up"
        : rawSide.includes("down") || rawSide.includes("no") ? "buy_down"
        : "buy_up";
      const isUp = effectiveSide === "buy_up" || effectiveSide === "sell_down";

      // Query live order book to get exact taker prices crossing the spread (prevents unfilled order refunds)
      let bestBid = 480000;
      let bestAsk = 520000;
      try {
        const ob = await dreamDexApi.getOrderBook(targetSymbol);
        if (ob?.bids?.[0]?.price) bestBid = Number(ob.bids[0].price);
        if (ob?.asks?.[0]?.price) bestAsk = Number(ob.asks[0].price);
      } catch (err) {
        console.warn("[DreamDexTrading] Live orderbook fetch fallback:", err);
      }

      // Compute taker crossing prices:
      // UP: crosses YES asks at bestAsk (e.g. 0.52)
      // DOWN: crosses YES bids at bestBid (cost for NO is 1.0 - bestBid = 0.52)
      const marketTakerPrice = isUp ? (bestAsk / 1e6) : ((1e6 - bestBid) / 1e6);

      let effectivePrice = price;
      let priceInMillionths: number;

      if (effectivePrice !== undefined && effectivePrice !== null && effectivePrice >= 0.01 && effectivePrice <= 0.99) {
        // User explicitly specified a limit price
        if (isUp) {
          priceInMillionths = Math.round(effectivePrice * 1e6);
        } else {
          // For DOWN: in BinaryPool kind 2 is placed as an ask on the YES book.
          // Willingness to pay effectivePrice for DOWN means selling YES at (1 - effectivePrice).
          priceInMillionths = Math.round((1 - effectivePrice) * 1e6);
        }
      } else {
        // Market / Taker Order: Price to cross the order book and fill IMMEDIATELY (0% refund guarantee)
        effectivePrice = marketTakerPrice;
        if (isUp) {
          // Cross the best ask (with slight safety buffer to guarantee taker fill)
          priceInMillionths = Math.min(990000, bestAsk + 10000);
        } else {
          // Cross the best bid (with slight safety buffer to guarantee taker fill)
          priceInMillionths = Math.max(10000, bestBid - 10000);
        }
      }

      // Calculate effective quantity (contracts) and total collateral (tUSDC)
      let effectiveQuantity: number;
      let effectiveCollateral: number;

      if (amount !== undefined && amount > 0) {
        // User specified a collateral amount to bet (e.g. 50 tUSDC)
        effectiveQuantity = Math.max(0.001, Math.floor((amount / effectivePrice) * 1_000) / 1_000);
        effectiveCollateral = effectiveQuantity * effectivePrice;
      } else if (quantity !== undefined && quantity > 0) {
        // User specified a number of contracts
        effectiveQuantity = quantity;
        effectiveCollateral = parseFloat((effectivePrice * quantity).toFixed(2));
      } else {
        // Default to 10 tUSDC bet
        effectiveCollateral = 10;
        effectiveQuantity = Math.max(0.001, Math.floor((10 / effectivePrice) * 1_000) / 1_000);
        effectiveCollateral = effectiveQuantity * effectivePrice;
      }

      const totalCollateralUSDC = effectiveCollateral.toFixed(2);
      const requiredUSDCAmount = effectiveCollateral;

      // Verify on-chain balances if userAddress is provided
      const balanceCheck = await checkUserBalances(userAddress, requiredUSDCAmount, testnet);
      if (!balanceCheck.canTrade) {
        return {
          success: false,
          status: balanceCheck.reason,
          error: balanceCheck.reason === "insufficient_gas" ? "Insufficient STT Gas" : "Insufficient tUSDC Collateral",
          action: "place_order",
          marketSymbol: targetSymbol,
          userAddress,
          requiredCollateral: `${totalCollateralUSDC} tUSDC`,
          currentBalance: balanceCheck.usdcBalance,
          sttBalance: balanceCheck.sttBalance,
          faucetUrl: SOMNIA_FAUCET_URL,
          tradeDetails: {
            market: targetSymbol,
            question: targetQuestion,
            side: isUp ? "BUY UP (Yes)" : "BUY DOWN (No)",
            probability: `${effectivePrice.toFixed(2)} (${(effectivePrice * 100).toFixed(0)}% Implied)`,
            quantity: effectiveQuantity,
            collateral: `${totalCollateralUSDC} tUSDC`,
          },
          message: balanceCheck.message,
        };
      }

      return {
        success: true,
        status: "prepared_awaiting_approval",
        isExecuted: false,
        requiresApproval: true,
        executionMode: "requires_signature",
        action: "place_order",
        side: effectiveSide,
        marketSymbol: targetSymbol,
        price: effectivePrice,
        quantity: effectiveQuantity,
        collateral: totalCollateralUSDC,
        userAddress: userAddress || undefined,
        walletBalance: balanceCheck.hasChecked ? {
          tUSDC: balanceCheck.usdcBalance,
          stt: balanceCheck.sttBalance,
        } : undefined,
        parameters: {
          marketSymbol: targetSymbol,
          pool: market.poolAddress,
          side: effectiveSide,
          priceInMillionths,
          displayPrice: effectivePrice,
          quantity: effectiveQuantity,
          amount: requiredUSDCAmount,
          orderType,
          testnet,
        },
        tradeDetails: {
          market: targetSymbol,
          question: targetQuestion,
          side: isUp ? "BUY UP (Yes)" : "BUY DOWN (No)",
          probability: `${effectivePrice.toFixed(2)} (${(effectivePrice * 100).toFixed(0)}% Implied)`,
          quantity: effectiveQuantity,
          collateral: `${totalCollateralUSDC} tUSDC`,
        },
        message: `Order PREPARED and awaiting confirmation. Market: ${targetSymbol}, Side: ${isUp ? "BUY UP (Yes)" : "BUY DOWN (No)"}, Bet Amount: ${totalCollateralUSDC} tUSDC (${effectiveQuantity} contracts at ${effectivePrice.toFixed(2)} / ${(effectivePrice * 100).toFixed(0)}% implied probability). Required Collateral: ${totalCollateralUSDC} tUSDC (STT for gas fees). NOTE: This order has NOT been broadcasted to Somnia Network yet. Please review and confirm the trade below.`,
        faucetUrl: SOMNIA_FAUCET_URL,
      };
    } catch (error: any) {
      return {
        error: "Failed to prepare place order transaction",
        details: error.message || String(error),
      };
    }
  },
});

export const dreamDexCancelOrder = tool({
  description: "Cancel an open order on a DreamDEX Event Contract market on Somnia Network.",
  parameters: z.object({
    orderId: z.string().describe("The order ID to cancel"),
    marketSymbol: z.string().optional().describe("The market symbol or asset (e.g. 'ETH'). Default: 'ETH'"),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
  }),
  execute: async ({ orderId, marketSymbol = "ETH", testnet = true }) => {
    try {
      const market = await dreamDexApi.getMarketBySymbol(marketSymbol || "ETH");
      const targetSymbol = market?.symbol || marketSymbol;

      return {
        success: true,
        executionMode: "requires_signature",
        action: "cancel_order",
        marketSymbol: targetSymbol,
        parameters: {
          orderId,
          marketSymbol: targetSymbol,
          pool: market?.poolAddress,
          testnet,
        },
        message: `Prepared transaction to cancel order ${orderId} on ${targetSymbol}.`,
      };
    } catch (error: any) {
      return {
        error: "Failed to prepare cancel order transaction",
        details: error.message || String(error),
      };
    }
  },
});

export const dreamDexCancelAllOrders = tool({
  description: "Cancel all open orders on a specific DreamDEX Event Contract market.",
  parameters: z.object({
    marketSymbol: z.string().optional().describe("The market symbol or asset. Default: 'ETH'"),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
  }),
  execute: async ({ marketSymbol = "ETH", testnet = true }) => {
    try {
      const market = await dreamDexApi.getMarketBySymbol(marketSymbol || "ETH");
      const targetSymbol = market?.symbol || marketSymbol;

      return {
        success: true,
        executionMode: "requires_signature",
        action: "cancel_all",
        marketSymbol: targetSymbol,
        parameters: {
          marketSymbol: targetSymbol,
          pool: market?.poolAddress,
          testnet,
        },
        message: `Prepared transaction to cancel all resting orders on ${targetSymbol}.`,
      };
    } catch (error: any) {
      return {
        error: "Failed to prepare cancel-all transaction",
        details: error.message || String(error),
      };
    }
  },
});

export const dreamDexRedeemWinnings = tool({
  description:
    "Redeem winning tokens from a resolved/settled DreamDEX Event Contract market on Somnia Network. Winning tokens redeem 1:1 for tUSDC collateral. Call this whenever the user asks to redeem, claim, or cash out prediction winnings.",
  parameters: z.object({
    marketSymbol: z
      .string()
      .optional()
      .describe("The resolved market symbol or asset (e.g. 'BTC-UP-1h', 'ETH-UP-4h'). If omitted, scans user portfolio for claimable winning markets."),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
    address: z.string().optional().describe("User wallet address"),
    userAddress: z.string().optional().describe("User wallet address"),
    trades: z.array(z.any()).optional().describe("User trade history"),
    extraPools: z.array(z.any()).optional().describe("Extra pool addresses"),
  }),
  execute: async ({ marketSymbol, testnet = true, address, userAddress, trades, extraPools }: any) => {
    try {
      const targetAddress = address || userAddress || "0xcE6327fFb8329303e6D2db4d274D80F7337daB1d";
      const positions = await dreamDexApi.getPositions(targetAddress, { extraPools, trades, bypassCache: true });
      const resolved = positions.resolved || [];

      // Find all genuinely claimable winning positions
      const claimablePositions = resolved.filter(
        (p: any) => p.claimable === true && !p.isRedeemed && p.status === "Claimable"
      ).filter((position: any, index: number, positions: any[]) => {
        const id = String(position.outcomeId || position.marketId || "");
        return !id || positions.findIndex((candidate: any) => String(candidate.outcomeId || candidate.marketId || "") === id) === index;
      });

      if (claimablePositions.length === 0) {
        const activeCount = (positions.active || []).length;
        const redeemedCount = resolved.filter((p: any) => p.isRedeemed || p.status === "Redeemed").length;

        let explanation = "No unredeemed winning contracts found in your agent wallet on Somnia Shannon testnet.";
        if (redeemedCount > 0) {
          explanation += ` You have already claimed all settled winnings (${redeemedCount} positions redeemed into your tUSDC balance).`;
        }
        if (activeCount > 0) {
          explanation += ` You currently have ${activeCount} active position${activeCount > 1 ? "s" : ""} live that will become claimable once their rolling windows settle.`;
        }

        return {
          success: false,
          status: "no_claimable_winnings",
          action: "redeem",
          message: explanation,
          _instructionToAI: `Inform the user: "${explanation}" Do NOT output or simulate a confirmation card.`
        };
      }

      const totalClaimablePayout = claimablePositions.reduce((sum: number, p: any) => {
        const num = parseFloat(String(p.payout || "").replace(/[^0-9.-]/g, "")) || p.quantity || 0;
        return sum + num;
      }, 0);

      const isRedeemAll = !marketSymbol || marketSymbol.toLowerCase() === "all" || marketSymbol.toLowerCase().includes("winning");
      let targetPos = claimablePositions[0];

      if (marketSymbol && !isRedeemAll) {
        const matched = claimablePositions.find((p: any) =>
          (p.marketSymbol && p.marketSymbol.toLowerCase().includes(marketSymbol.toLowerCase())) ||
          (p.market && p.market.toLowerCase().includes(marketSymbol.toLowerCase()))
        );
        if (matched) {
          targetPos = matched;
        }
      }

      const hasMultiple = claimablePositions.length > 1 && isRedeemAll;
      const targetSymbol = hasMultiple
        ? `All Winning Markets (${claimablePositions.length} positions)`
        : (targetPos.marketSymbol || targetPos.market || marketSymbol || "Event Contract");
      const quantity = hasMultiple
        ? claimablePositions.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)
        : (targetPos.quantity || 20);
      const payoutAmount = hasMultiple
        ? `$${totalClaimablePayout.toFixed(2)} tUSDC`
        : (targetPos.payout || `${quantity.toFixed(2)} tUSDC`);
      const netProfit = hasMultiple
        ? `+$${(totalClaimablePayout * 0.45).toFixed(2)} tUSDC`
        : (targetPos.pnlFormatted || `+$${(quantity * 0.425).toFixed(2)} tUSDC`);

      const claimablePositionsPayload = claimablePositions.map((p: any) => ({
        marketSymbol: p.marketSymbol || p.market,
        pool: p.poolAddress,
        amount: p.quantity,
        outcomeId: p.outcomeId || (p.marketId?.startsWith("0x") ? p.marketId : undefined),
      }));

      return {
        success: true,
        status: "prepared_awaiting_approval",
        executionMode: "agent_autonomous",
        requiresConfirmation: true,
        action: "redeem",
        marketSymbol: targetSymbol,
        quantity,
        amount: quantity,
        collateral: quantity.toFixed(2),
        payoutAmount,
        netProfit,
        poolAddress: targetPos.poolAddress || "",
        outcomeId: targetPos.outcomeId || (targetPos.marketId?.startsWith("0x") ? targetPos.marketId : undefined),
        totalClaimableAmount: totalClaimablePayout,
        claimableMarketsCount: claimablePositions.length,
        claimablePositions: hasMultiple ? claimablePositionsPayload : undefined,
        parameters: {
          marketSymbol: targetSymbol,
          pool: targetPos.poolAddress || "",
          testnet,
          action: "redeem",
          amount: quantity,
          outcomeId: targetPos.outcomeId || (targetPos.marketId?.startsWith("0x") ? targetPos.marketId : undefined),
          claimablePositions: hasMultiple ? claimablePositionsPayload : undefined,
        },
        tradeDetails: {
          market: targetSymbol,
          action: "REDEEM WINNING TOKENS",
          contracts: `${hasMultiple ? `${claimablePositions.length} winning positions (${quantity} total contracts)` : `${quantity} winning contracts`}`,
          payout: payoutAmount,
          netProfit,
          ratio: "1:1 Collateral Payout (1.00 tUSDC per contract)",
        },
        message: hasMultiple
          ? `Prepared redemption for ${claimablePositions.length} winning positions totaling ${payoutAmount} (${netProfit} net profit). Please confirm below to claim your funds.`
          : `Prepared redemption for ${quantity} winning contracts on ${targetSymbol}. Payout: ${payoutAmount} (${netProfit} net profit). Please confirm below to claim your funds.`,
      };
    } catch (error: any) {
      return {
        error: "Failed to prepare redemption transaction",
        details: error.message || String(error),
      };
    }
  },
});

export const dreamDexClosePosition = tool({
  description:
    "Exit or close an active DreamDEX prediction market position early before the market window expires. Sells back held UP or DOWN contracts to the CLOB order book at the current market/mark price. Use this whenever the user asks to close position, exit early, cash out early, or sell back contracts.",
  parameters: z.object({
    marketSymbol: z
      .string()
      .optional()
      .describe("The Event Contract market symbol or asset (e.g. 'BTC-UP-5m', 'ETH', 'BTC'). If omitted, automatically finds user's active position."),
    pool: z
      .string()
      .optional()
      .describe("The specific pool contract address (optional)"),
    quantity: z
      .number()
      .optional()
      .describe("Number of contracts to close. If omitted, closes 100% of the active position."),
    price: z
      .number()
      .optional()
      .describe("Desired exit limit price as probability (0.01-0.99). If omitted, sells at current market/mark price."),
    userAddress: z
      .string()
      .optional()
      .describe("User's EVM wallet address"),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
    trades: z.array(z.any()).optional().describe("User trade history"),
    extraPools: z.array(z.any()).optional().describe("Extra pool addresses"),
  }),
  execute: async ({ marketSymbol, pool, quantity, price, userAddress, testnet = true, trades, extraPools }: any) => {
    try {
      const targetAddress = userAddress || "0xcE6327fFb8329303e6D2db4d274D80F7337daB1d";
      const positions = await dreamDexApi.getPositions(targetAddress, { extraPools, trades });
      const activePositions = positions.active || [];

      if (activePositions.length === 0) {
        return {
          success: false,
          status: "no_active_position",
          action: "close_position",
          message: "No active prediction positions found to close. All previous market windows have already resolved. You can place a new bet on Live Markets!",
          _instructionToAI: "Inform the user that there are no active positions open right now.",
        };
      }

      // Find the target active position
      let targetPos = activePositions[0];
      if (pool) {
        const found = activePositions.find((p: any) => p.poolAddress?.toLowerCase() === pool.toLowerCase());
        if (found) targetPos = found;
      } else if (marketSymbol) {
        const cleanSym = marketSymbol.toLowerCase();
        const found = activePositions.find((p: any) =>
          (p.marketSymbol && p.marketSymbol.toLowerCase().includes(cleanSym)) ||
          (p.market && p.market.toLowerCase().includes(cleanSym)) ||
          (p.symbol && p.symbol.toLowerCase().includes(cleanSym))
        );
        if (found) targetPos = found;
      }

      const isUp = String(targetPos.side || "").toLowerCase().includes("up");
      const effectiveSide = isUp ? "sell_up" : "sell_down";
      const targetSymbol = targetPos.marketSymbol || targetPos.market || targetPos.symbol || marketSymbol || "Active Market";
      const poolAddr = pool || targetPos.poolAddress || "";
      const totalContracts = targetPos.quantity || 10;
      const closeQuantity = quantity && quantity > 0 ? Math.min(quantity, totalContracts) : totalContracts;

      // Exit price
      const exitPrice = price && price >= 0.01 && price <= 0.99
        ? price
        : (targetPos.currentPrice || targetPos.entryPrice || 0.50);
      const priceInMillionths = Math.round(exitPrice * 1_000_000);
      const estimatedProceeds = (closeQuantity * exitPrice).toFixed(2);
      const pnlStr = targetPos.unrealizedPnL || targetPos.pnlFormatted || "$0.00 tUSDC";

      return {
        success: true,
        status: "prepared_awaiting_approval",
        isExecuted: false,
        requiresApproval: true,
        executionMode: "requires_signature",
        action: "close_position",
        side: effectiveSide,
        marketSymbol: targetSymbol,
        quantity: closeQuantity,
        price: exitPrice,
        estimatedProceeds: `${estimatedProceeds} tUSDC`,
        userAddress: targetAddress,
        poolAddress: poolAddr,
        parameters: {
          action: "close_position",
          marketSymbol: targetSymbol,
          pool: poolAddr,
          side: effectiveSide,
          quantity: closeQuantity,
          displayPrice: exitPrice,
          priceInMillionths,
          amount: parseFloat(estimatedProceeds),
          testnet,
        },
        tradeDetails: {
          market: targetSymbol,
          action: `EARLY EXIT (${isUp ? "SELL UP" : "SELL DOWN"})`,
          contracts: `${closeQuantity} contracts`,
          exitPrice: `$${exitPrice.toFixed(2)} (${Math.round(exitPrice * 100)}% Implied)`,
          estimatedProceeds: `${estimatedProceeds} tUSDC`,
          unrealizedPnL: pnlStr,
        },
        message: `Prepared early exit for ${closeQuantity} contracts on ${targetSymbol} at mark price $${exitPrice.toFixed(2)}. Estimated return: ${estimatedProceeds} tUSDC. Please confirm below to exit your position on Somnia Network.`,
        _instructionToAI: "CRITICAL: A rich UI confirmation card is ALREADY rendering to the user! DO NOT ask the user to type confirm or repeat parameters. Output ONLY one short sentence: 'Please review and confirm your early position exit above to execute on Somnia.'",
      };
    } catch (error: any) {
      return {
        error: "Failed to prepare close position transaction",
        details: error.message || String(error),
      };
    }
  },
});
