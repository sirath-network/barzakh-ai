import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateHashedBackupCodes, checkRateLimit } from "@/lib/security/crypto";

export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 3 regenerations per hour
    const rateLimit = checkRateLimit(`backup-codes:${session.user.id}`, 3, 60 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 60000)} minutes` 
      }, { status: 429 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
    }

    // Generate new hashed backup codes
    const { plainCodes, hashedCodes } = generateHashedBackupCodes(8);

    // Update user with new hashed backup codes
    await db
      .update(user)
      .set({ backupCodes: JSON.stringify(hashedCodes) })
      .where(eq(user.id, dbUser.id));

    return NextResponse.json({
      success: true,
      backupCodes: plainCodes, // Return plain codes to user (one time only!)
    });
  } catch (error) {
    console.error("Backup codes generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
