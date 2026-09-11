import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { executeAgenticDreamDexTrade } from "@/lib/agent/dreamdex-executor";
import { getUserAgentWalletAddress, getUserDreamDexTransactions, hasDelegation } from "@/lib/agent/agent-wallet-store";
import { dreamDexApi } from "@barzakh/shared/lib/ai/tools/dreamdex/api-client";

/**
 * GET /api/cron/dreamdex-sweep
 *
 * Automated background sweep for DreamDEX Event Contract predictions on Somnia Network.
 * Checks for finalized markets with claimable winning contracts in user agent wallets
 * and automatically redeems them into tUSDC collateral on-chain, even when users
 * are offline or have their browsers closed!
 *
 * Can be run every 5 minutes via Vercel Cron.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn("[DreamDexSweepCron] Unauthorized attempt to invoke cron sweep");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[DreamDexSweepCron] Starting automated DreamDEX settlement sweep on Somnia...");

    // Find all users who have an active EVM agent wallet or delegation
    const allUsers = await db
      .select({
        id: user.id,
        email: user.email,
      })
      .from(user);

    let sweptUsers = 0;
    let redeemedCount = 0;
    const redeemedTxs: string[] = [];

    for (const u of allUsers) {
      try {
        const isDelegated = await hasDelegation(u.id, "evm");
        if (!isDelegated) continue;

        const agentAddress = await getUserAgentWalletAddress(u.id, "evm");
        if (!agentAddress) continue;

        // Fetch user DreamDEX transactions to find all pools they traded on
        const userTxs = await getUserDreamDexTransactions(u.id, agentAddress);
        if (!userTxs || userTxs.length === 0) continue;

        const extraPools: Array<{ address: string; symbol?: string; asset?: string }> = [];
        const seen = new Set<string>();
        const trades: Array<any> = [];

        for (const tx of userTxs) {
          const meta = tx.metadata as any;
          if (meta?.pool && !seen.has(meta.pool.toLowerCase())) {
            seen.add(meta.pool.toLowerCase());
            extraPools.push({
              address: meta.pool,
              symbol: meta.marketSymbol,
              asset: meta.marketSymbol?.split("-")[0],
            });
          }
          trades.push({
            signature: tx.signature,
            pool: meta?.pool,
            marketSymbol: meta?.marketSymbol,
            side: meta?.side,
            amount: tx.amount,
            price: meta?.price,
            quantity: meta?.quantity,
            operationType: tx.operationType,
            createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : String(tx.createdAt),
          });
        }

        // Query positions
        const posData = await dreamDexApi.getPositions(agentAddress, { extraPools, trades });
        const resolved = posData.resolved || [];

        const claimable = resolved.filter(
          (p: any) => p.claimable === true && !p.isRedeemed && p.status === "Claimable"
        );

        if (claimable.length > 0) {
          console.log(`[DreamDexSweepCron] Found ${claimable.length} claimable positions for user ${u.id} (${agentAddress})`);
          sweptUsers++;

          for (const pos of claimable) {
            try {
              console.log(`[DreamDexSweepCron] Auto-redeeming winning position on ${pos.marketSymbol || pos.market} for user ${u.id}...`);
              const redeemRes = await executeAgenticDreamDexTrade(u.id, {
                action: "redeem",
                pool: pos.poolAddress,
                marketSymbol: pos.marketSymbol || pos.market,
                amount: pos.quantity,
                outcomeId: pos.marketId?.startsWith("0x") ? pos.marketId : undefined,
              });

              if (redeemRes.success && redeemRes.transactionHash) {
                redeemedCount++;
                redeemedTxs.push(redeemRes.transactionHash);
                console.log(`[DreamDexSweepCron] Successfully redeemed: ${redeemRes.transactionHash}`);
              }
            } catch (redeemErr: any) {
              console.warn(`[DreamDexSweepCron] Error auto-redeeming ${pos.marketSymbol}:`, redeemErr?.message || redeemErr);
            }
          }
        }
      } catch (userErr: any) {
        console.warn(`[DreamDexSweepCron] Error processing user ${u.id}:`, userErr?.message || userErr);
      }
    }

    console.log(`[DreamDexSweepCron] Sweep complete. Swept ${sweptUsers} users, redeemed ${redeemedCount} positions.`);

    return NextResponse.json({
      success: true,
      sweptUsers,
      redeemedCount,
      redeemedTxs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[DreamDexSweepCron] Cron sweep failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to execute DreamDEX sweep" },
      { status: 500 }
    );
  }
}
