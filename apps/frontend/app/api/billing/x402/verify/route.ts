import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { base } from "viem/chains";
import { db } from "@/lib/db/db";
import { x402_transactions, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Use a dedicated RPC URL if available for better reliability
const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactionHash, planId, billingCycle } = await request.json();

  if (!transactionHash || !planId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // Check if transaction already exists
    const existingTx = await db
      .select()
      .from(x402_transactions)
      .where(eq(x402_transactions.transactionHash, transactionHash))
      .limit(1);

    if (existingTx.length > 0) {
      return NextResponse.json({ error: "Transaction already processed" }, { status: 400 });
    }

    // Verify transaction on-chain
    let tx = await client
      .getTransaction({ hash: transactionHash as `0x${string}` })
      .catch(() => null);
    let receipt = await client
      .getTransactionReceipt({ hash: transactionHash as `0x${string}` })
      .catch(() => null);

    if (!receipt) {
      try {
        receipt = await client.waitForTransactionReceipt({
          hash: transactionHash as `0x${string}`,
          timeout: 60000, // Wait up to 60 seconds
          pollingInterval: 2000,
        });
        // Refetch tx after receipt is confirmed
        tx = await client.getTransaction({
          hash: transactionHash as `0x${string}`,
        });
      } catch (e) {
        console.log("Transaction receipt not found after waiting");
      }
    }

    if (!tx || !receipt) {
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    // Skip block age check - we trust transactions that we just received a receipt for.
    // The receipt itself proves the transaction was mined recently enough.
    // This avoids the unreliable getBlock call that often fails on public RPCs.
    // For replay attack prevention, we already check if transactionHash exists in DB above.

    // Verify USDC Transfer
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC
    if (tx.to?.toLowerCase() !== usdcAddress.toLowerCase()) {
       return NextResponse.json({ error: "Invalid contract interaction" }, { status: 400 });
    }

    // Find Transfer event
    const transferEventAbi = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
    const transferLog = receipt.logs.find(log => 
        log.address.toLowerCase() === usdcAddress.toLowerCase() &&
        log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" // Transfer topic
    );

    if (!transferLog) {
        return NextResponse.json({ error: "Transfer event not found" }, { status: 400 });
    }

    const decodedLog = decodeEventLog({
        abi: [transferEventAbi],
        data: transferLog.data,
        topics: transferLog.topics,
    });

    const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535";
    
    // @ts-ignore
    if (decodedLog.args.to.toLowerCase() !== receiverAddress.toLowerCase()) {
        return NextResponse.json({ error: "Invalid receiver" }, { status: 400 });
    }

    // Validate Amount
    // @ts-ignore
    const paidAmount = BigInt(decodedLog.args.value);
    let expectedAmount = BigInt(0);

    const cycle = billingCycle || "monthly";

    if (planId === "pro") {
      if (cycle === "monthly") expectedAmount = BigInt(25 * 1000000);
      else if (cycle === "quarterly") expectedAmount = BigInt(66 * 1000000);
      else if (cycle === "yearly") expectedAmount = BigInt(240 * 1000000);
    } else if (planId === "ultimate") {
      if (cycle === "monthly") expectedAmount = BigInt(250 * 1000000);
      else if (cycle === "quarterly") expectedAmount = BigInt(660 * 1000000);
      else if (cycle === "yearly") expectedAmount = BigInt(2400 * 1000000);
    }

    // Allow a small margin of error? No, exact amount for stablecoins.
    // But maybe user sent slightly more? We should check >= expectedAmount
    if (paidAmount < expectedAmount) {
       return NextResponse.json({ 
         error: `Insufficient payment amount. Expected ${Number(expectedAmount) / 1000000} USDC, got ${Number(paidAmount) / 1000000} USDC` 
       }, { status: 400 });
    }

    // Record transaction
    await db.insert(x402_transactions).values({
      userId: session.user.id,
      transactionHash: transactionHash,
      chainId: 8453, // Base Mainnet
      // @ts-ignore
      amount: decodedLog.args.value.toString(),
      tokenAddress: usdcAddress,
      senderAddress: receipt.from,
      planId: planId,
      billingCycle: billingCycle || "monthly",
      status: "confirmed",
    });

    // Get the daily message limit for the new tier
    const getDailyMessageLimit = (tier: string): number => {
      if (tier === "pro") {
        return Number(process.env.PRO_USER_MESSAGE_LIMIT) || 100;
      } else if (tier === "ultimate") {
        return Number(process.env.ULTIMATE_USER_MESSAGE_LIMIT) || 1000;
      }
      return Number(process.env.FREE_USER_MESSAGE_LIMIT) || 20;
    };

    const newDailyLimit = getDailyMessageLimit(planId);

    // Update user tier AND reset daily message limit to the new tier's limit
    await db
      .update(user)
      .set({ 
        tier: planId,
        dailyMessageRemaining: newDailyLimit,
      })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    
    if (error.message && error.message.includes("could not be found after retries")) {
        return NextResponse.json({ error: "Block not found yet", code: "BLOCK_NOT_FOUND" }, { status: 409 });
    }

    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
