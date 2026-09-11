import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUserAgentWalletAddress, getUserDreamDexTransactions } from "@/lib/agent/agent-wallet-store";
import { getDreamDexPortfolio } from "@barzakh/shared/lib/ai/tools/dreamdex/dreamdex-portfolio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const session = await auth();
    const userId = session?.user?.id;
    let address = searchParams.get("address");
    const bypassCache = searchParams.get("refresh") === "true" || searchParams.has("_t");

    if (!address && userId) {
      address = await getUserAgentWalletAddress(userId, "evm");
    }

    if (!address) {
      address = "0xcE6327fFb8329303e6D2db4d274D80F7337daB1d";
    }

    let extraPools: Array<{ address: string; symbol?: string; asset?: string }> = [];
    let trades: Array<any> = [];

    try {
      // Fetch user DreamDEX transactions (works with userId or directly with wallet address)
      const dreamdexTxs = await getUserDreamDexTransactions(userId || undefined, address || undefined);
      const seen = new Set<string>();
      for (const tx of dreamdexTxs) {
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
          marketNonce: meta?.marketNonce,
          operationType: tx.operationType,
          createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : String(tx.createdAt),
        });
      }
    } catch (e) {
      console.warn("[PortfolioRoute] Could not load user trades:", e);
    }

    const portfolio = await (getDreamDexPortfolio as any).execute({
      address,
      testnet: true,
      extraPools,
      trades,
      bypassCache,
    });

    return NextResponse.json({
      success: true,
      portfolio,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("[PortfolioRoute] Error fetching portfolio:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch portfolio" },
      { status: 500 }
    );
  }
}
