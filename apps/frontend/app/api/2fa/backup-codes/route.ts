import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
    }

    // Generate new backup codes
    const backupCodes: string[] = [];
    for (let i = 0; i < 8; i++) {
      backupCodes.push(nanoid(8).toUpperCase());
    }

    // Update user with new backup codes
    await db
      .update(user)
      .set({ backupCodes: JSON.stringify(backupCodes) })
      .where(eq(user.id, dbUser.id));

    return NextResponse.json({
      success: true,
      backupCodes: backupCodes,
    });
  } catch (error) {
    console.error("Backup codes generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
