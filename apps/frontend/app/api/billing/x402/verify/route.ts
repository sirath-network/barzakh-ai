import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createPublicClient, http, parseAbiItem, decodeEventLog } from "viem";
import { baseSepolia } from "viem/chains";
import { db } from "@/lib/db/db";
import { x402_transactions, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const client = createPublicClient({
  chain: baseSepolia,
  transport: http(),
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
    const tx = await client.getTransaction({ hash: transactionHash as `0x${string}` });
    const receipt = await client.getTransactionReceipt({ hash: transactionHash as `0x${string}` });

    if (!tx || !receipt) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed on-chain" }, { status: 400 });
    }

    // Check transaction age (prevent replay of old transactions)
    const block = await client.getBlock({ blockHash: receipt.blockHash });
    const txTimestamp = Number(block.timestamp);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const MAX_AGE_SECONDS = 3600; // 1 hour

    if (currentTimestamp - txTimestamp > MAX_AGE_SECONDS) {
        return NextResponse.json({ error: "Transaction is too old" }, { status: 400 });
    }

    // Verify USDC Transfer
    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
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

    const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0xd4100f16dbc770f5247dc3251d61b4a48c34f630";
    
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
      chainId: 84532,
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
        return Number(process.env.PRO_USER_MESSAGE_LIMIT) || 200;
      } else if (tier === "ultimate") {
        return Number(process.env.ULTIMATE_USER_MESSAGE_LIMIT) || 1000;
      }
      return Number(process.env.FREE_USER_MESSAGE_LIMIT) || 5;
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
  } catch (error) {
    console.error("Payment verification failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
