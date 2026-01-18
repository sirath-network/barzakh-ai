import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { x402_transactions } from "@/lib/db/schema";
import { eq, desc, lt, gt, sql, and } from "drizzle-orm";
import { NextResponse } from "next/server";

function parseLimit(value: string | null): number {
    if (!value) return 10;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return 10;
    }
    return Math.min(parsed, 50);
}

// USD prices for each plan and billing cycle (in cents)
const PLAN_PRICES_CENTS: Record<string, Record<string, number>> = {
    pro: {
        monthly: 2500,     // $25
        quarterly: 6600,   // $66
        yearly: 24000,     // $240
    },
    ultimate: {
        monthly: 25000,    // $250
        quarterly: 66000,  // $660
        yearly: 240000,    // $2400
    },
};

/**
 * GET /api/billing/x402/transactions
 * 
 * Fetches x402 transactions for the authenticated user with pagination support.
 */
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(request.url);
        const searchParams = url.searchParams;
        const limit = parseLimit(searchParams.get("limit"));
        const startingAfter = searchParams.get("starting_after") || undefined;

        // Build query conditions
        const conditions = [eq(x402_transactions.userId, session.user.id)];

        // For cursor-based pagination using createdAt
        if (startingAfter) {
            // Get the cursor transaction's createdAt
            const [cursorTx] = await db
                .select({ createdAt: x402_transactions.createdAt })
                .from(x402_transactions)
                .where(eq(x402_transactions.id, startingAfter))
                .limit(1);

            if (cursorTx) {
                conditions.push(lt(x402_transactions.createdAt, cursorTx.createdAt));
            }
        }

        // Fetch transactions (limit + 1 to check if there are more)
        const transactions = await db
            .select()
            .from(x402_transactions)
            .where(and(...conditions))
            .orderBy(desc(x402_transactions.createdAt))
            .limit(limit + 1);

        const hasMore = transactions.length > limit;
        const data = transactions.slice(0, limit);

        // Get blockchain explorer URL based on chainId
        const getExplorerUrl = (chainId: number, txHash: string) => {
            if (chainId === 25) {
                return `https://cronoscan.com/tx/${txHash}`;
            } else if (chainId === 338) {
                return `https://explorer.cronos.org/testnet/tx/${txHash}`;
            }
            return null;
        };

        const formattedTransactions = data.map((tx) => {
            const amountCents = PLAN_PRICES_CENTS[tx.planId]?.[tx.billingCycle] ?? 0;

            // Handle createdAt - may be Date object or string depending on DB driver
            const createdAtDate = tx.createdAt instanceof Date
                ? tx.createdAt
                : new Date(tx.createdAt);

            return {
                id: tx.id,
                planId: tx.planId,
                planName: tx.planId.charAt(0).toUpperCase() + tx.planId.slice(1),
                billingCycle: tx.billingCycle,
                amountCents,
                currency: "USD",
                chainId: tx.chainId,
                chainName: tx.chainId === 25 ? "Cronos" : "Cronos Testnet",
                transactionHash: tx.transactionHash,
                explorerUrl: getExplorerUrl(tx.chainId, tx.transactionHash),
                status: tx.status,
                createdAt: createdAtDate.getTime() / 1000, // Unix timestamp for consistency with Stripe
            };
        });

        const nextCursor = data.length > 0 ? data[data.length - 1].id : null;

        return NextResponse.json({
            transactions: formattedTransactions,
            hasMore,
            nextCursor,
        });
    } catch (error: any) {
        console.error("[x402] Error fetching transactions:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch transactions" },
            { status: 500 }
        );
    }
}
