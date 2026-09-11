import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { executeAgenticDreamDexTrade } from "@/lib/agent/dreamdex-executor";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to close your prediction position." },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("[DreamDexClosePositionRoute] Received close position payload:", {
      userId: session.user.id,
      marketSymbol: body.marketSymbol,
      pool: body.pool || body.poolAddress,
      quantity: body.quantity,
      side: body.side,
    });

    const payload = {
      ...body,
      action: "close_position",
      pool: body.pool || body.poolAddress,
    };

    const result = await executeAgenticDreamDexTrade(session.user.id, payload);

    if (!result.success) {
      console.warn("[DreamDexClosePositionRoute] Early exit failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to exit prediction market on Somnia Network.",
        },
        { status: 400 }
      );
    }

    console.log("[DreamDexClosePositionRoute] Position successfully closed on-chain:", result.transactionHash);

    // Invalidate cached positions immediately
    try {
      const { dreamDexApi } = await import("@barzakh/shared/lib/ai/tools/dreamdex/api-client");
      dreamDexApi.clearPositionsCache();
    } catch {}

    return NextResponse.json({
      success: true,
      txHash: result.transactionHash,
      transactionHash: result.transactionHash,
      explorerUrl: result.explorerUrl,
      action: "close_position",
      marketSymbol: result.marketSymbol,
    });
  } catch (error: any) {
    console.error("[DreamDexClosePositionRoute] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.shortMessage || error.message || "Failed to exit prediction position.",
      },
      { status: 500 }
    );
  }
}
