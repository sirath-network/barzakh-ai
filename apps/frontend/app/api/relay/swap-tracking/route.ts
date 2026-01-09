import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { relay_swap_tracking } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET: Check if a swap has already been completed
export async function GET(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const swapRequestId = searchParams.get("swapRequestId");

    if (!swapRequestId) {
        return NextResponse.json({ error: "swapRequestId is required" }, { status: 400 });
    }

    try {
        const existingSwap = await db
            .select()
            .from(relay_swap_tracking)
            .where(eq(relay_swap_tracking.swapRequestId, swapRequestId))
            .limit(1);

        return NextResponse.json({
            completed: existingSwap.length > 0,
            ...(existingSwap.length > 0 && {
                completedAt: existingSwap[0].completedAt,
                transactionHash: existingSwap[0].transactionHash,
            }),
        });
    } catch (error: any) {
        console.error("Error checking swap completion:", error);
        return NextResponse.json({ error: "Failed to check swap status" }, { status: 500 });
    }
}

// POST: Mark a swap as completed
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { swapRequestId, transactionHash } = await request.json();

    if (!swapRequestId) {
        return NextResponse.json({ error: "swapRequestId is required" }, { status: 400 });
    }

    try {
        // Check if already exists (idempotent)
        const existingSwap = await db
            .select()
            .from(relay_swap_tracking)
            .where(eq(relay_swap_tracking.swapRequestId, swapRequestId))
            .limit(1);

        if (existingSwap.length > 0) {
            return NextResponse.json({
                success: true,
                message: "Swap already marked as completed",
                alreadyExists: true,
            });
        }

        // Insert new record
        await db.insert(relay_swap_tracking).values({
            userId: session.user.id,
            swapRequestId,
            transactionHash: transactionHash || null,
        });

        return NextResponse.json({
            success: true,
            message: "Swap marked as completed",
        });
    } catch (error: any) {
        console.error("Error marking swap as completed:", error);
        return NextResponse.json({ error: "Failed to mark swap as completed" }, { status: 500 });
    }
}
