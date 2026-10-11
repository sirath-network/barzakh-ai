import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { executeAgenticKuruLimitOrder, executeAgenticKuruMarketSwap } from "@/lib/agent/monad-agent-executor";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-user";
    const body = await req.json();
    const { pair = "MON/USDC", side = "buy", orderType = "market", price, amount = "100" } = body;

    if (orderType === "limit") {
      const res = await executeAgenticKuruLimitOrder(userId, {
        pair,
        side,
        price: price || "0.0240",
        amount,
        postOnly: true,
      });
      return NextResponse.json(res);
    }

    const res = await executeAgenticKuruMarketSwap(userId, {
      pair,
      side,
      amount,
    });
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute order" }, { status: 500 });
  }
}
