"use server";

import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { relay_swap_tracking } from "@/lib/db/schema";

export async function trackRelaySwap(swapRequestId: string, transactionHash: string) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    try {
        await db.insert(relay_swap_tracking).values({
            userId: session.user.id,
            swapRequestId,
            transactionHash,
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to track relay swap:", error);
        return { success: false, error: "Failed to persist swap tracking" };
    }
}
