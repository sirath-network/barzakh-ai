import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { lt, ne, and, isNotNull, eq } from "drizzle-orm";

/**
 * GET /api/cron/check-subscriptions
 * 
 * Cron job to check for expired x402 subscriptions and downgrade users.
 * Should be run daily via Vercel Cron.
 * 
 * Requires CRON_SECRET authorization header for security.
 */
export async function GET(request: Request) {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();
        const freeMessageLimit = Number(process.env.FREE_USER_MESSAGE_LIMIT) || 10;

        // Find users with expired x402 subscriptions who are not already on free tier
        const expiredUsers = await db
            .select({
                id: user.id,
                email: user.email,
                tier: user.tier,
                x402PeriodEnd: user.x402PeriodEnd,
            })
            .from(user)
            .where(
                and(
                    ne(user.tier, "free"),
                    isNotNull(user.x402PeriodEnd),
                    lt(user.x402PeriodEnd, now)
                )
            );

        console.log(`[Cron] Found ${expiredUsers.length} expired subscriptions`);

        let downgraded = 0;
        let errors = 0;

        for (const expiredUser of expiredUsers) {
            try {
                await db
                    .update(user)
                    .set({
                        tier: "free",
                        billingCycle: "monthly",
                        dailyMessageRemaining: freeMessageLimit,
                        x402CancelAtPeriodEnd: false,
                        x402PeriodEnd: null, // Clear period end
                    })
                    .where(eq(user.id, expiredUser.id));

                console.log(`[Cron] Downgraded user ${expiredUser.id} (was ${expiredUser.tier})`);
                downgraded++;
            } catch (error) {
                console.error(`[Cron] Failed to downgrade user ${expiredUser.id}:`, error);
                errors++;
            }
        }

        return NextResponse.json({
            success: true,
            checked: expiredUsers.length,
            downgraded,
            errors,
            timestamp: now.toISOString(),
        });
    } catch (error: any) {
        console.error("[Cron] Subscription check failed:", error);
        return NextResponse.json(
            { error: "Failed to check subscriptions", details: error.message },
            { status: 500 }
        );
    }
}
