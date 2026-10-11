import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { executeAgenticPerplPosition } from "@/lib/agent/monad-agent-executor";

export async function POST(req: Request) {
  try {
    const session = await auth();
    const userId = session?.user?.id || "demo-user";
    const body = await req.json();
    const { action = "open", market = "MON-PERP", side = "long", collateralAUSD = "100", leverage = 5 } = body;

    const res = await executeAgenticPerplPosition(userId, {
      market,
      side: side as "long" | "short",
      leverage: Number(leverage),
      collateralAUSD: Number(collateralAUSD),
    });
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute Perpl order" }, { status: 500 });
  }
}
