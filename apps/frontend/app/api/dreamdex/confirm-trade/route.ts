import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getPendingConfirmation,
  removePendingConfirmation,
} from "@/lib/agent/pending-confirmations";
import { executeAgenticDreamDexTrade } from "@/lib/agent/dreamdex-executor";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { confirmationId, action } = await request.json();

  if (!confirmationId) {
    return NextResponse.json(
      { error: "confirmationId is required" },
      { status: 400 }
    );
  }

  const pending = getPendingConfirmation(confirmationId);

  if (!pending) {
    return NextResponse.json(
      { error: "Confirmation not found or expired. Please request a new order." },
      { status: 404 }
    );
  }

  // Verify the authenticated user matches the original requester
  if (pending.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Unauthorized: user mismatch" },
      { status: 403 }
    );
  }

  // Handle rejection
  if (action === "reject") {
    removePendingConfirmation(confirmationId);
    return NextResponse.json({ success: true, status: "rejected" });
  }

  // Execute the pending DreamDEX order
  try {
    const rawResult = pending.rawResult;
    const autoResult = await executeAgenticDreamDexTrade(pending.userId, rawResult);

    if (!autoResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: autoResult.error || "Autonomous trade execution failed during broadcast.",
        },
        { status: 500 }
      );
    }

    // Clean up after successful execution
    removePendingConfirmation(confirmationId);

    return NextResponse.json({
      success: true,
      transactionHash: autoResult.transactionHash,
      explorerUrl: autoResult.explorerUrl,
      orderId: autoResult.orderId,
      action: autoResult.action,
      marketSymbol: autoResult.marketSymbol,
    });
  } catch (error: any) {
    console.error("[ConfirmDreamDexTrade] Execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.shortMessage || error.message || "Failed to execute DreamDEX trade",
      },
      { status: 500 }
    );
  }
}
