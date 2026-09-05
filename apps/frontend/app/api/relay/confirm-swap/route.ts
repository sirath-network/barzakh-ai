import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  getPendingConfirmation,
  removePendingConfirmation,
} from "@/lib/agent/pending-confirmations";
import { executeRelaySwap } from "@/lib/agent/agent-payment-executor";

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
      { error: "Confirmation not found or expired. Please request a new quote." },
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

  // Execute the pending transaction
  try {
    const { args, rawResult, transactions } = pending;
    let finalHash = "";

    for (const tx of transactions) {
      const isApproval = tx.data?.startsWith("0x095ea7b3");
      const isTransfer =
        !isApproval &&
        args.fromToken === args.toToken &&
        args.fromChainId === args.toChainId;
      const parsedAmount =
        (args.amount.toLowerCase() === "all" ||
          args.amount.toLowerCase() === "max") &&
        rawResult.quoteDetails?.amountIn
          ? rawResult.quoteDetails.amountIn
          : args.amount;

      const autoResult = await executeRelaySwap({
        userId: pending.userId,
        operationType: isApproval
          ? "erc20_approve"
          : isTransfer
            ? "transfer"
            : "relay_swap",
        inputAmount: isApproval ? "Approval" : parsedAmount,
        inputToken: args.fromToken,
        outputToken: args.toToken,
        chainId: tx.chainId || args.fromChainId || 8453,
        transaction: {
          to: tx.to,
          value: tx.value ? BigInt(tx.value) : 0n,
          data: tx.data || "0x",
          chainId: tx.chainId || args.fromChainId,
          solanaTransaction: tx.solanaTransaction,
        },
      });

      if (!autoResult.success) {
        // Keep pending confirmation so user can retry after depositing gas or fixing issues
        return NextResponse.json(
          {
            success: false,
            error:
              autoResult.error || "Autonomous execution failed during broadcast.",
          },
          { status: 500 }
        );
      }

      finalHash = autoResult.transactionHash || finalHash;
    }

    // Build explorer URL
    let explorerUrl = finalHash
      ? `https://relay.link/transaction/${finalHash}`
      : undefined;
    if (finalHash) {
      const executionChainId =
        transactions[0]?.chainId || args.fromChainId || 8453;
      const allChains = await import("viem/chains");
      const targetChain: any = Object.values(allChains).find(
        (c: any) => c?.id === executionChainId
      );
      const isSameChain = args.fromChainId === args.toChainId;
      if (isSameChain && targetChain?.blockExplorers?.default?.url) {
        explorerUrl = `${targetChain.blockExplorers.default.url}/tx/${finalHash}`;
      }
    }

    // Clean up after successful execution
    removePendingConfirmation(confirmationId);

    return NextResponse.json({
      success: true,
      transactionHash: finalHash,
      explorerUrl,
      sourceChain: rawResult.sourceChain,
      destinationChain: rawResult.destinationChain,
      senderAddress: rawResult.senderAddress,
      recipientAddress: rawResult.recipientAddress,
    });
  } catch (error: any) {
    console.error("[ConfirmSwap] Execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.shortMessage || error.message || "Failed to execute swap",
      },
      { status: 500 }
    );
  }
}
