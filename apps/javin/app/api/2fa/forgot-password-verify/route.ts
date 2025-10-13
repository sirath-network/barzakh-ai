import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/db/queries";
import { savePasswordResetToken } from "@/lib/db/queries";
import { sendResetEmail } from "@/lib/utils/email";
import { nanoid } from "nanoid";
import * as speakeasy from "speakeasy";

export async function POST(request: NextRequest) {
  try {
    const { email, twoFactorToken } = await request.json();

    if (!email || !twoFactorToken) {
      return NextResponse.json(
        { message: "Email and 2FA token are required" },
        { status: 400 }
      );
    }

    // Get user from database
    const users = await getUser(email);
    if (users.length === 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const user = users[0];

    if (!user.twoFactorEnabled) {
      return NextResponse.json(
        { message: "2FA is not enabled for this user" },
        { status: 400 }
      );
    }

    // Verify 2FA token
    let isValid = false;
    
    // Try TOTP first
    if (user.twoFactorSecret) {
      isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: twoFactorToken,
        window: 2,
      });
    }
    
    // If TOTP fails, try backup codes
    if (!isValid && user.backupCodes) {
      try {
        const backupCodes = JSON.parse(user.backupCodes);
        const codeIndex = backupCodes.findIndex((code: string) => 
          code === twoFactorToken.toUpperCase()
        );
        
        if (codeIndex !== -1) {
          // Remove used backup code
          backupCodes.splice(codeIndex, 1);
          // Update user with remaining backup codes
          // Note: You'll need to add an updateUserBackupCodes function to your queries
          isValid = true;
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
