import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getUserDreamDexTransactions } from "@/lib/agent/agent-wallet-store";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ executed: false }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol") || "";
    const pool = searchParams.get("pool") || "";
    const side = searchParams.get("side") || "";
    const action = searchParams.get("action") || "place_order";
    const toolCallId = searchParams.get("toolCallId") || "";
    const orderFingerprint = searchParams.get("orderFingerprint") || "";

    const txs = await getUserDreamDexTransactions(session.user.id);

    const match = txs.find((tx) => {
      const meta = (tx.metadata || {}) as any;
      if (orderFingerprint && meta.orderFingerprint === orderFingerprint) return true;
      if (toolCallId && (meta.toolCallId === toolCallId || meta.orderFingerprint?.includes(toolCallId))) return true;

      // Match by identical pool + side + action
      const matchesAction = tx.operationType === `dreamdex_${action}`;
      const matchesPool = pool && meta.pool && meta.pool.toLowerCase() === pool.toLowerCase();
      const matchesSymbol = symbol && meta.marketSymbol && meta.marketSymbol.toLowerCase() === symbol.toLowerCase();
      const matchesSide = side && meta.side && meta.side.toLowerCase() === side.toLowerCase();

      if (matchesAction && (matchesPool || matchesSymbol) && matchesSide) {
        return true;
      }
      return false;
    });

    if (match && match.signature) {
      return NextResponse.json({
        executed: true,
        txHash: match.signature,
        transactionHash: match.signature,
        createdAt: match.createdAt,
        marketSymbol: (match.metadata as any)?.marketSymbol || symbol,
      });
    }

    return NextResponse.json({ executed: false });
  } catch (err: any) {
    console.error("[CheckOrderRoute] Error:", err);
    return NextResponse.json({ executed: false, error: err.message }, { status: 500 });
  }
}
