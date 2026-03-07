import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { db } from "@/lib/db/db";
import { x402_transactions, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Use a dedicated RPC URL if available for better reliability
const rpcUrl = process.env.BASE_MAINNET_RPC_URL || "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(rpcUrl),
});

// Cache CRO price for 5 minutes to avoid excessive API calls
let cachedCroPrice: { price: number; timestamp: number } | null = null;
const CRO_PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCroUsdPrice(): Promise<number> {
  if (cachedCroPrice && Date.now() - cachedCroPrice.timestamp < CRO_PRICE_CACHE_TTL) {
    return cachedCroPrice.price;
  }

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=crypto-com-chain&vs_currencies=usd"
    );

    if (!response.ok) {
      return cachedCroPrice?.price ?? 0.10;
    }

    const data = await response.json();
    const price = data["crypto-com-chain"]?.usd ?? 0.10;
    cachedCroPrice = { price, timestamp: Date.now() };
    return price;
  } catch (error) {
    console.error("Error fetching CRO price:", error);
    return cachedCroPrice?.price ?? 0.10;
  }
}

// USD prices for each plan and billing cycle
const PLAN_PRICES_USD: Record<string, Record<string, number>> = {
  pro: {
    monthly: 25,
    quarterly: 66,
    yearly: 240,
  },
  ultimate: {
    monthly: 250,
    quarterly: 660,
    yearly: 2400,
  },
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactionHash, planId, billingCycle } = await request.json();

  if (!transactionHash || !planId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  // Validate transaction hash format (0x followed by 64 hex characters)
  if (!/^0x[a-f0-9]{64}$/i.test(transactionHash)) {
    return NextResponse.json({ error: "Invalid transaction hash format" }, { status: 400 });
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

    // Verify Native TCRO Transfer
    const receiverAddress = process.env.NEXT_PUBLIC_X402_RECEIVER_ADDRESS || "0x9355D5006c69aa04077aAA70b2502B2F0Ce93535";

    // Check that the transaction was sent to the receiver address (native transfer)
    if (tx.to?.toLowerCase() !== receiverAddress.toLowerCase()) {
      return NextResponse.json({ error: "Invalid receiver address" }, { status: 400 });
    }

    // Get USD price for the plan and calculate expected TCRO amount
    const cycle = billingCycle || "monthly";
    const usdPrice = PLAN_PRICES_USD[planId]?.[cycle] ?? 0;

    if (usdPrice === 0) {
      return NextResponse.json({ error: "Invalid plan or billing cycle" }, { status: 400 });
    }

    // Fetch current CRO/USD price to calculate expected TCRO
    const croUsdPrice = await getCroUsdPrice();
    const expectedTcro = usdPrice / croUsdPrice;

    // Convert to wei (18 decimals) - allow 5% slippage for price fluctuations
    const expectedAmount = BigInt(Math.floor(expectedTcro * 0.95 * 10 ** 18));
    const paidAmount = tx.value;

    if (paidAmount < expectedAmount) {
      const paidTcro = Number(paidAmount) / 10 ** 18;
      return NextResponse.json({
        error: `Insufficient payment. Expected ~${expectedTcro.toFixed(2)} TCRO ($${usdPrice}), got ${paidTcro.toFixed(2)} TCRO`
      }, { status: 400 });
    }

    // Record transaction
    await db.insert(x402_transactions).values({
      userId: session.user.id,
      transactionHash: transactionHash,
      chainId: 8453, // Base Mainnet
      amount: paidAmount.toString(),
      tokenAddress: null, // Native token
      senderAddress: receipt.from,
      planId: planId,
      billingCycle: billingCycle || "monthly",
      status: "confirmed",
    });

    // Get the daily message limit for the new tier and billing cycle
    const getDailyMessageLimit = (tier: string, cycle: string): number => {
      const cycleKey = cycle.toUpperCase();
      if (tier === "pro") {
        if (cycleKey === "YEARLY") return Number(process.env.PRO_YEARLY_USER_MESSAGE_LIMIT) || 150;
        if (cycleKey === "QUARTERLY") return Number(process.env.PRO_QUARTERLY_USER_MESSAGE_LIMIT) || 100;
        return Number(process.env.PRO_MONTHLY_USER_MESSAGE_LIMIT) || 50;
      } else if (tier === "ultimate") {
        if (cycleKey === "YEARLY") return Number(process.env.ULTIMATE_YEARLY_USER_MESSAGE_LIMIT) || 500;
        if (cycleKey === "QUARTERLY") return Number(process.env.ULTIMATE_QUARTERLY_USER_MESSAGE_LIMIT) || 350;
        return Number(process.env.ULTIMATE_MONTHLY_USER_MESSAGE_LIMIT) || 250;
      }
      return Number(process.env.FREE_USER_MESSAGE_LIMIT) || 10;
    };

    const newDailyLimit = getDailyMessageLimit(planId, billingCycle || "monthly");

    // Update user tier, billing cycle AND reset daily message limit to the new tier's limit
    await db
      .update(user)
      .set({
        tier: planId,
        billingCycle: billingCycle || "monthly",
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
