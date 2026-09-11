import { extractTimeframe } from "./pricing";
import { tool } from "ai";
import { z } from "zod";
import { dreamDexApi } from "./api-client";
import { SOMNIA_TESTNET_EXPLORER, SOMNIA_MAINNET_EXPLORER } from "./sdk-client";

export const getDreamDexPortfolio = tool({
  description:
    "Get a live on-chain portfolio view and render the interactive DreamDEX Prediction Portfolio card on Somnia Network. Displays active positions (open bets), open orders, historical resolved outcomes (win/loss history), P&L, and win-rate statistics. MANDATORY: ALWAYS invoke this tool whenever the user asks for their portfolio, positions, bets, or clicks 'View Portfolio'. Never answer from conversational memory without invoking this tool!",
  parameters: z.object({
    address: z
      .string()
      .optional()
      .describe("Wallet address to check portfolio for (0x...). If omitted, checks user's active/delegated wallet address."),
    testnet: z.boolean().optional().describe("Use testnet (default true)"),
    extraPools: z
      .array(
        z.object({
          address: z.string(),
          symbol: z.string().optional(),
          asset: z.string().optional(),
        })
      )
      .optional()
      .describe("Extra traded pool addresses to scan"),
    trades: z
      .array(
        z.object({
          signature: z.string().optional(),
          pool: z.string().optional(),
          marketSymbol: z.string().optional(),
          side: z.string().optional(),
          amount: z.string().optional(),
          price: z.number().optional(),
          quantity: z.number().optional(),
          operationType: z.string().optional(),
          createdAt: z.string().optional(),
        })
      )
      .optional()
      .describe("Recent trades for transaction hash matching"),
  }),
  execute: async ({ address, testnet = true, extraPools, trades, bypassCache }: any) => {
    try {
      const isTestnet = testnet !== false;
      const networkName = isTestnet ? "Somnia Shannon Testnet" : "Somnia Mainnet";
      const currency = isTestnet ? "tUSDC" : "USDC";
      const explorer = isTestnet ? SOMNIA_TESTNET_EXPLORER : SOMNIA_MAINNET_EXPLORER;
      const targetAddress = address || "0xcE6327fFb8329303e6D2db4d274D80F7337daB1d";

      // Fetch data from API with extra pools and trades
      const rawPositions = await dreamDexApi.getPositions(targetAddress, { extraPools, trades, bypassCache });
      const positions = Array.isArray(rawPositions)
        ? { active: rawPositions, orders: [], resolved: [] }
        : rawPositions || {};
      const rawMarkets = await dreamDexApi.getMarkets();
      const markets = Array.isArray(rawMarkets) ? rawMarkets : [];

      // Aggregate Active Positions with Real-Time Mark-To-Market Pricing
      let activeUnrealizedPnL = 0;
      const activePositions = (positions.active || []).map((pos: any) => {
        const market = markets.find(
          (m) =>
            m.id === pos.marketId ||
            m.symbol === pos.marketSymbol ||
            (m.poolAddress && pos.poolAddress && m.poolAddress.toLowerCase() === pos.poolAddress.toLowerCase())
        );
        const sym = pos.market || market?.symbol || pos.marketSymbol || pos.marketId || "Event Contract";
        const pnlNum = typeof pos.pnl === "number" ? pos.pnl : parseFloat(String(pos.pnl || "").replace(/[^0-9.-]/g, "")) || 0;
        activeUnrealizedPnL += pnlNum;

        const valNum = typeof pos.currentValue === "number"
          ? pos.currentValue
          : parseFloat(String(pos.currentValue || "").replace(/[^0-9.-]/g, "")) || (pos.quantity * (pos.currentPrice || 0.5));

        const tf = pos.timeframe || extractTimeframe(sym);

        return {
          market: sym,
          marketName: sym,
          poolAddress: pos.poolAddress || market?.poolAddress,
          side: pos.side || "UP",
          quantity: pos.quantity || 20,
          entryPrice: pos.entryPrice || 0.5,
          currentPrice: pos.currentPrice || 0.5,
          currentValue: `$${valNum.toFixed(2)} ${currency}`,
          pnl: pos.pnlFormatted || `${pnlNum >= 0 ? "+" : "-"}$${Math.abs(pnlNum).toFixed(2)} ${currency}`,
          unrealizedPnL: pos.unrealizedPnL || pos.pnlFormatted || `${pnlNum >= 0 ? "+" : "-"}$${Math.abs(pnlNum).toFixed(2)} ${currency}`,
          pnlPercentage: pos.pnlPercentage || `${((pnlNum / ((pos.quantity || 20) * (pos.entryPrice || 0.5))) * 100).toFixed(1)}%`,
          timeframe: tf,
          expiryTimestamp: pos.expiryTimestamp,
          expiryTime: pos.expiryTime,
          spotPrice: pos.spotPrice,
          strikePrice: pos.strikePrice,
          createdAt: pos.createdAt,
          txHash: pos.txHash || undefined,
          explorerUrl: pos.txHash
            ? `${explorer}/tx/${pos.txHash}`
            : pos.poolAddress
            ? `${explorer}/address/${pos.poolAddress}`
            : undefined,
        };
      });

      // Aggregate Open Orders
      const openOrders = (positions.orders || []).map((order: any) => {
        const market = markets.find(
          (m) => m.id === order.marketId || m.symbol === order.marketSymbol
        );
        return {
          market: market?.symbol || market?.shortSymbol || order.marketSymbol || order.marketId,
          marketName: market?.symbol || market?.shortSymbol || order.marketSymbol || order.marketId,
          side: order.side,
          price: order.price,
          entryPrice: order.price,
          quantity: order.quantity,
          currentValue: `$${((order.quantity || 0) * (order.price || 0)).toFixed(2)} ${currency}`,
          status: order.status || "Open",
          timeframe: order.timeframe || extractTimeframe(order.marketSymbol || ""),
          expiryTimestamp: order.expiryTimestamp,
          createdAt: order.createdAt,
          poolAddress: order.poolAddress,
          marketNonce: order.marketNonce,
          txHash: order.txHash,
        };
      });

      // Aggregate Resolved Positions (Win / Loss history)
      let totalInvested = 0;
      let totalPnL = 0;
      let wins = 0;
      const resolvedList = positions.resolved || [];

      const resolvedPositions = resolvedList.map((pos: any) => {
        const market = markets.find(
          (m) =>
            m.id === pos.marketId ||
            m.symbol === pos.marketSymbol ||
            (m.poolAddress && pos.poolAddress && m.poolAddress.toLowerCase() === pos.poolAddress.toLowerCase())
        );
        const isRefunded = pos.outcome === "REFUNDED" || pos.status === "Refunded";
        const isClosedEarly = pos.outcome === "CLOSED" || pos.status === "Closed Early";
        const isExpired = !isRefunded && !isClosedEarly && (pos.outcome === "EXPIRED" || pos.status === "Expired");
        const pnlNum = isRefunded || isExpired ? 0 : (
          typeof pos.pnl === "number"
            ? pos.pnl
            : parseFloat(String(pos.pnl || "").replace(/[^0-9.-]/g, "")) || 0
        );
        const isWin = !isRefunded && !isClosedEarly && !isExpired && pos.outcome !== "LOST" && (pos.isWinner === true || pos.outcome === "WON" || pnlNum > 0);
        if (isWin) wins += 1;
        totalPnL += pnlNum;

        // Only count capital for filled positions, not refunded unfilled orders
        if (!isRefunded) {
          const invested = (pos.quantity || 10) * (pos.entryPrice || 0.5);
          totalInvested += invested;
        }

        const isRedeemed = pos.isRedeemed === true || pos.status === "Redeemed" || pos.claimed === true;
        const claimable = isWin && !isRedeemed && !isExpired && !isRefunded && !isClosedEarly && (pos.claimable === true || pos.status === "Claimable");

        return {
          market: pos.market || market?.symbol || market?.shortSymbol || pos.marketSymbol || pos.marketId,
          marketName: pos.market || market?.symbol || market?.shortSymbol || pos.marketSymbol || pos.marketId,
          poolAddress: pos.poolAddress,
          outcome: isWin ? "WON" : isClosedEarly ? "CLOSED" : isRefunded ? "REFUNDED" : isExpired ? "EXPIRED" : "LOST",
          side: pos.side || (isWin ? "UP" : "DOWN"),
          isWinner: isWin,
          quantity: pos.quantity || 20,
          pnl: isRefunded || isExpired ? "$0.00 tUSDC" : (pnlNum === 0 ? "$0.00 tUSDC" : `${pnlNum >= 0 ? "+" : "-"}$${Math.abs(pnlNum).toFixed(2)} ${currency}`),
          payout: pos.payout || (isWin ? `${(pos.quantity || 20).toFixed(2)} ${currency}` : isRefunded ? `${((pos.quantity || 20) * 0.5).toFixed(2)} ${currency}` : `0.00 ${currency}`),
          status: isRedeemed ? "Redeemed" : isClosedEarly ? "Closed Early" : isWin ? (claimable ? "Claimable" : "Settled") : isRefunded ? "Refunded" : isExpired ? "Expired" : "Settled",
          isRedeemed,
          claimed: isRedeemed,
          claimable,
          timeframe: pos.timeframe || extractTimeframe(pos.market || pos.marketSymbol || ""),
          createdAt: pos.createdAt,
          settledAt: pos.settledAt,
          closedAt: pos.closedAt || pos.settledAt,
          txHash: pos.txHash || undefined,
          explorerUrl: pos.txHash
            ? `${explorer}/tx/${pos.txHash}`
            : pos.poolAddress
            ? `${explorer}/address/${pos.poolAddress}`
            : `${explorer}/address/${targetAddress}`,
        };
      });

      // Include active positions in totalInvested
      for (const act of activePositions) {
        totalInvested += (act.quantity || 10) * (act.entryPrice || 0.5);
      }

      const totalTrades = resolvedPositions.length + activePositions.length;
      const decidedPositions = resolvedPositions.filter((p: any) => p.outcome === "WON" || p.outcome === "LOST");
      const winRate = decidedPositions.length > 0 ? `${((wins / decidedPositions.length) * 100).toFixed(1)}%` : "0.0%";

      const netPnLNum = totalPnL + activeUnrealizedPnL;
      const formattedTotalPnL = `${netPnLNum >= 0 ? "+" : "-"}$${Math.abs(netPnLNum).toFixed(2)} ${currency}`;

      return {
        success: true,
        address: targetAddress,
        network: networkName,
        totalInvested: `$${totalInvested.toFixed(2)} ${currency}`,
        totalPnL: formattedTotalPnL,
        unrealizedPnL: formattedTotalPnL,
        winRate,
        totalTrades,
        positions: activePositions,
        activePositions,
        openOrders,
        resolvedPositions,
        portfolio: {
          activePositions,
          openOrders,
          resolvedPositions,
          summary: {
            totalInvested: `$${totalInvested.toFixed(2)} ${currency}`,
            totalPnL: formattedTotalPnL,
            winRate,
            totalTrades,
          },
        },
        explorerUrl: `${explorer}/address/${targetAddress}`,
        _instructionToAI:
          "CRITICAL: The interactive DreamDEX Prediction Portfolio UI card is ALREADY rendering in the user interface above! Output ONLY 1 short sentence directing the user to the card above (e.g. 'Here is your live DreamDEX prediction portfolio on Somnia Shannon.'). DO NOT duplicate or re-list the active positions, open orders, win/loss history, or metrics in plain text markdown!",
      };
    } catch (error: any) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "An unknown error occurred while fetching the portfolio",
        portfolio: null,
      };
    }
  },
});
