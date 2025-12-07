import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import { 
  decrypt2FASecret, 
  isEncrypted, 
  generateHashedBackupCodes,
  checkRateLimit,
  resetRateLimit
} from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 verification attempts per 5 minutes
    const rateLimit = checkRateLimit(`2fa-verify:${session.user.id}`, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds` 
      }, { status: 429 });
    }

    const { token, action } = await request.json();

    if (!token || !action) {
      return NextResponse.json({ error: "Token and action are required" }, { status: 400 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
    }

    // Decrypt the secret if it's encrypted (backward compatible)
    let decryptedSecret: string;
    try {
      decryptedSecret = isEncrypted(dbUser.twoFactorSecret) 
        ? decrypt2FASecret(dbUser.twoFactorSecret)
        : dbUser.twoFactorSecret;
    } catch (error) {
      console.error("Failed to decrypt 2FA secret:", error);
      return NextResponse.json({ error: "2FA configuration error" }, { status: 500 });
    }

    // Verify the token
    const delta = authenticator.checkDelta(token, decryptedSecret);
    let verified = false;
    if (delta !== null) {
      verified = delta >= -1 && delta <= 1;
    }

    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Reset rate limit on successful verification
    resetRateLimit(`2fa-verify:${session.user.id}`);

    if (action === "enable") {
      // Enable 2FA and generate hashed backup codes
      const { plainCodes, hashedCodes } = generateHashedBackupCodes(8);
      
      await db
        .update(user)
        .set({ 
          twoFactorEnabled: true,
          backupCodes: JSON.stringify(hashedCodes) // Store hashed codes
        })
        .where(eq(user.id, dbUser.id));

      return NextResponse.json({
        success: true,
        backupCodes: plainCodes, // Return plain codes to user (one time only!)
        message: "2FA enabled successfully"
      });
    } else if (action === "verify") {
      return NextResponse.json({
        success: true,
        message: "Token verified successfully"
      });
    } else if (action === "disable") {
      await db
        .update(user)
        .set({ 
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: null
        })
        .where(eq(user.id, dbUser.id));

      return NextResponse.json({
        success: true,
        message: "2FA disabled successfully"
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
