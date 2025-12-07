import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import { 
  decrypt2FASecret, 
  isEncrypted, 
  findBackupCode,
  checkRateLimit,
  resetRateLimit
} from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: "Email and token are required" }, { status: 400 });
    }

    // Rate limit: 5 attempts per 15 minutes per email
    const rateLimit = checkRateLimit(`2fa-login:${email}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds` 
      }, { status: 429 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.email, email));
    
    // SECURITY: Use generic error messages to prevent user enumeration
    if (!dbUser || !dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // Decrypt the secret if it's encrypted (backward compatible)
    let decryptedSecret: string;
    try {
      decryptedSecret = isEncrypted(dbUser.twoFactorSecret) 
        ? decrypt2FASecret(dbUser.twoFactorSecret)
        : dbUser.twoFactorSecret;
    } catch (error) {
      console.error("Failed to decrypt 2FA secret:", error);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
    }

    // First try to verify as TOTP token
    const delta = authenticator.checkDelta(token, decryptedSecret);
    let verified = false;
    if (delta !== null) {
      verified = delta >= -1 && delta <= 1;
    }

    // If TOTP verification failed, check if it's a backup code
    if (!verified && dbUser.backupCodes) {
      try {
        const backupCodes = JSON.parse(dbUser.backupCodes) as string[];
        
        // Check if codes are hashed (contain $ from bcrypt) or plain
        const isHashed = backupCodes.length > 0 && backupCodes[0].startsWith('$');
        
        if (isHashed) {
          // New hashed backup codes
          const codeIndex = findBackupCode(token, backupCodes);
          if (codeIndex !== -1) {
            // Remove the used backup code
            backupCodes.splice(codeIndex, 1);
            await db
              .update(user)
              .set({ backupCodes: JSON.stringify(backupCodes) })
              .where(eq(user.id, dbUser.id));
            verified = true;
          }
        } else {
          // Legacy plain backup codes (backward compatible)
          const tokenIndex = backupCodes.indexOf(token.toUpperCase());
          if (tokenIndex !== -1) {
            backupCodes.splice(tokenIndex, 1);
            await db
              .update(user)
              .set({ backupCodes: JSON.stringify(backupCodes) })
              .where(eq(user.id, dbUser.id));
            verified = true;
          }
        }
      } catch (error) {
        console.error("Error parsing backup codes:", error);
      }
    }

    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    // Reset rate limit on success
    resetRateLimit(`2fa-login:${email}`);

    return NextResponse.json({
      success: true,
      message: "2FA verification successful"
    });
  } catch (error) {
    console.error("2FA login verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
