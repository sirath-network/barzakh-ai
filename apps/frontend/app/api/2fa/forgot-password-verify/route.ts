import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/db/queries";
import { savePasswordResetToken } from "@/lib/db/queries";
import { sendResetEmail } from "@/lib/utils/email";
import { nanoid } from "nanoid";
import { authenticator } from "otplib";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { 
  decrypt2FASecret, 
  isEncrypted, 
  findBackupCode,
  checkRateLimit
} from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, twoFactorToken } = await request.json();

    if (!email || !twoFactorToken) {
      return NextResponse.json(
        { message: "Email and 2FA token are required" },
        { status: 400 }
      );
    }

    // Rate limit: 5 attempts per 15 minutes per email
    const rateLimit = checkRateLimit(`forgot-2fa:${email}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        message: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds` 
      }, { status: 429 });
    }

    // Get user from database
    const users = await getUser(email);
    if (users.length === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const dbUser = users[0];

    if (!dbUser.twoFactorEnabled) {
      return NextResponse.json(
        { message: "2FA is not enabled for this user" },
        { status: 400 }
      );
    }

    let isValid = false;
    
    // Try TOTP first
    if (dbUser.twoFactorSecret) {
      // Decrypt the secret if it's encrypted (backward compatible)
      let decryptedSecret: string;
      try {
        decryptedSecret = isEncrypted(dbUser.twoFactorSecret) 
          ? decrypt2FASecret(dbUser.twoFactorSecret)
          : dbUser.twoFactorSecret;
      } catch (error) {
        console.error("Failed to decrypt 2FA secret:", error);
        return NextResponse.json(
          { message: "2FA configuration error" },
          { status: 500 }
        );
      }

      const delta = authenticator.checkDelta(twoFactorToken, decryptedSecret);
      if (delta !== null) {
        isValid = delta >= -1 && delta <= 1;
      }
    }
    
    // If TOTP fails, try backup codes
    if (!isValid && dbUser.backupCodes) {
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
              .where(eq(user.email, email));
            isValid = true;
          }
        } else {
          // Legacy plain backup codes
          const codeIndex = backupCodes.findIndex((code: string) => 
            code === twoFactorToken.toUpperCase()
          );
          if (codeIndex !== -1) {
            backupCodes.splice(codeIndex, 1);
            await db
              .update(user)
              .set({ backupCodes: JSON.stringify(backupCodes) })
              .where(eq(user.email, email));
            isValid = true;
          }
        }
      } catch (error) {
        console.error("Error parsing backup codes:", error);
      }
    }

    if (!isValid) {
      return NextResponse.json(
        { message: "Invalid 2FA token" },
        { status: 401 }
      );
    }

    // 2FA verified - generate reset token and send reset email
    const resetToken = nanoid(32);
    await savePasswordResetToken(email, resetToken);

    const resetUrl = `${process.env.PUBLIC_BASE_URL}/forgotpassword/${resetToken}`;
    await sendResetEmail(email, resetUrl);

    return NextResponse.json({
      message: "2FA verified. Password reset link sent to your email.",
      success: true
    });

  } catch (error) {
    console.error("2FA forgot password verification error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
