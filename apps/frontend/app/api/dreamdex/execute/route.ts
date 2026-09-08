import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { executeAgenticDreamDexTrade } from "@/lib/agent/dreamdex-executor";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Please sign in to execute trades." },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log("[DreamDexExecuteRoute] Received order execution payload:", {
      userId: session.user.id,
      marketSymbol: body.marketSymbol,
      side: body.side,
      price: body.price,
      quantity: body.quantity,
      amount: body.amount,
      action: body.action,
      pool: body.pool || body.parameters?.pool,
    });

    const result = await executeAgenticDreamDexTrade(session.user.id, body);

    if (!result.success) {
      console.warn("[DreamDexExecuteRoute] Trade execution failed:", result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Trade execution failed on Somnia Network.",
        },
        { status: 400 }
      );
    }

    console.log("[DreamDexExecuteRoute] Trade successfully executed:", result.transactionHash);

    return NextResponse.json({
      success: true,
      txHash: result.transactionHash,
      transactionHash: result.transactionHash,
      explorerUrl: result.explorerUrl,
      orderId: result.orderId,
      action: result.action,
      marketSymbol: result.marketSymbol,
    });
  } catch (error: any) {
    console.error("[DreamDexExecuteRoute] Unexpected error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.shortMessage || error.message || "Failed to execute DreamDEX trade.",
      },
      { status: 500 }
    );
  }
}
