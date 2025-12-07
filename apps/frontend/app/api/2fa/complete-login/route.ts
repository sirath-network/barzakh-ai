import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
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

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function POST(request: NextRequest) {
  try {
    const { tempToken, twoFactorToken } = await request.json();

    if (!tempToken || !twoFactorToken) {
      return NextResponse.json({ error: "Temp token and 2FA token are required" }, { status: 400 });
    }

    // Verify the temporary JWT token
    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(tempToken, secret);
      payload = verifiedPayload;
    } catch (error) {
      return NextResponse.json({ error: "Invalid or expired temp token" }, { status: 401 });
    }

    if (payload.type !== "2fa_temp") {
      return NextResponse.json({ error: "Invalid token type" }, { status: 401 });
    }

    const userId = payload.userId as string;

    // Rate limit: 5 attempts per 15 minutes per user
    const rateLimit = checkRateLimit(`2fa-complete:${userId}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds` 
      }, { status: 429 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.id, userId));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not enabled for this user" }, { status: 400 });
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

    // Verify 2FA token
    const delta = authenticator.checkDelta(twoFactorToken, decryptedSecret);
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
          const codeIndex = findBackupCode(twoFactorToken, backupCodes);
          if (codeIndex !== -1) {
            backupCodes.splice(codeIndex, 1);
            await db
              .update(user)
              .set({ backupCodes: JSON.stringify(backupCodes) })
              .where(eq(user.id, dbUser.id));
            verified = true;
          }
        } else {
          // Legacy plain backup codes (backward compatible)
          const tokenIndex = backupCodes.indexOf(twoFactorToken.toUpperCase());
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
      return NextResponse.json({ error: "Invalid 2FA token" }, { status: 400 });
    }

    // Reset rate limit on success
    resetRateLimit(`2fa-complete:${userId}`);

    // Create final JWT token for session
    const sessionToken = await new SignJWT({ 
      userId: dbUser.id, 
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
      username: dbUser.username,
      tier: dbUser.tier,
      type: "session" 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .setIssuedAt()
      .sign(secret);

    return NextResponse.json({
      success: true,
      sessionToken,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        image: dbUser.image,
        username: dbUser.username,
        tier: dbUser.tier,
      }
    });
  } catch (error) {
    console.error("Complete login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
