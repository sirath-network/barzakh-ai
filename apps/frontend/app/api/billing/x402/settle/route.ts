import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { x402_transactions, user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
    verifyPayment,
    settlePayment,
    PaymentRequirements,
    PaymentPayloadV2,
} from "@barzakh/shared/lib/payments/x402-facilitator";

/**
 * POST /api/billing/x402/settle
 * 
 * Settles an x402 payment on-chain via the x402 Facilitator on Base.
 * Expects a V2 paymentPayload object and payment requirements.
 */
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentPayload, paymentRequirements, planId, billingCycle } = await request.json();

    if (!paymentPayload || !paymentRequirements || !planId) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    try {
        // Extract payer address from the V2 payload
        const payerAddress = paymentPayload.payload?.authorization?.from;

        if (!payerAddress) {
            console.error("[x402] Missing payer address in payload");
            return NextResponse.json({
                error: "Invalid payment payload - missing payer address",
                debug: { payload: paymentPayload.payload }
            }, { status: 400 });
        }

        // Check if this nonce has already been used (prevent replay)
        const nonce = paymentPayload.payload?.authorization?.nonce;
        if (!nonce) {
            console.error("[x402] Missing nonce in payload");
            return NextResponse.json({
                error: "Invalid payment payload - missing nonce"
            }, { status: 400 });
        }

        const existingTx = await db
            .select()
            .from(x402_transactions)
            .where(eq(x402_transactions.transactionHash, nonce))
            .limit(1);

        if (existingTx.length > 0) {
            return NextResponse.json({ error: "Payment already processed" }, { status: 400 });
        }

        // Verify payment with facilitator (off-chain validation)
        const verifyResult = await verifyPayment(paymentPayload as PaymentPayloadV2, paymentRequirements as PaymentRequirements);

        if (!verifyResult.isValid) {
            console.error("[x402] Verification failed:", verifyResult.invalidReason);
            return NextResponse.json({
                error: "Payment verification failed",
                reason: verifyResult.invalidReason
            }, { status: 400 });
        }

        // Settle payment on-chain via facilitator
        const settleResult = await settlePayment(paymentPayload as PaymentPayloadV2, paymentRequirements as PaymentRequirements);

        if (!settleResult.success) {
            console.error("[x402] Settlement failed:", settleResult.error);
            return NextResponse.json({
                error: "Payment settlement failed",
                reason: settleResult.error
            }, { status: 500 });
        }
        
        console.log("[x402] Full settlement response:", JSON.stringify(settleResult, null, 2));
        console.log("[x402] Payment settled successfully:", settleResult.txHash);

        // Validate that we have a proper blockchain transaction hash
        if (!settleResult.txHash || !/^0x[a-f0-9]{64}$/i.test(settleResult.txHash)) {
            console.error("[x402] Invalid transaction hash from facilitator:", settleResult.txHash);
            console.error("[x402] Full settlement response for debugging:", JSON.stringify(settleResult, null, 2));
            return NextResponse.json({
                error: "Invalid transaction hash received from facilitator",
                debug: { txHash: settleResult.txHash, fullResponse: settleResult }
            }, { status: 500 });
        }

        // Record transaction with validated blockchain transaction hash
        await db.insert(x402_transactions).values({
            userId: session.user.id,
            transactionHash: settleResult.txHash,
            chainId: paymentRequirements.network === "eip155:8453" ? 8453 : 84532,
            amount: paymentRequirements.amount,
            tokenAddress: paymentRequirements.asset,
            senderAddress: payerAddress,
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

        // Calculate subscription period end based on billing cycle
        const calculatePeriodEnd = (cycle: string): Date => {
            const now = new Date();
            switch (cycle.toLowerCase()) {
                case "yearly":
                    return new Date(now.setFullYear(now.getFullYear() + 1));
                case "quarterly":
                    return new Date(now.setMonth(now.getMonth() + 3));
                case "monthly":
                default:
                    return new Date(now.setMonth(now.getMonth() + 1));
            }
        };

        const periodEnd = calculatePeriodEnd(billingCycle || "monthly");

        // Update user tier, billing cycle, reset daily message limit, period end, and RESET cancellation flag
        await db
            .update(user)
            .set({
                tier: planId,
                billingCycle: billingCycle || "monthly",
                dailyMessageRemaining: newDailyLimit,
                x402CancelAtPeriodEnd: false, // Reset cancellation on new subscription
                x402PeriodEnd: periodEnd, // Set when subscription expires
            })
            .where(eq(user.id, session.user.id));

        return NextResponse.json({
            success: true,
            txHash: settleResult.txHash,
            blockNumber: settleResult.blockNumber,
        });
    } catch (error: any) {
        console.error("[x402] Settlement error:", error);
        return NextResponse.json({
            error: "Settlement failed",
            details: error.message
        }, { status: 500 });
    }
}
