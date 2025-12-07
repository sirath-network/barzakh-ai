import { auth } from "@/app/(auth)/auth";
import { removeUserWalletAddress, getUserById, getOTP, deleteOTP } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { compare } from "bcrypt-ts";
import { authenticator } from "otplib";
import { decrypt2FASecret, isEncrypted } from "@/lib/security/crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { password, twoFactorToken, emailOtp } = body;

    // Get full user data from DB to verify re-authentication
    const [dbUser] = await getUserById(session.user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has a password set AND (email linked or 2FA enabled)
    // Required for unbind to prevent getting stuck in verification
    if (!dbUser.password || (!dbUser.email && !dbUser.twoFactorEnabled)) {
      return NextResponse.json({
        error: "Cannot disconnect wallet: Please finalize your account setup by securing both your password and email. This step is required to verify your identity and enable wallet management actions."
      }, { status: 400 });
    }

    // SECURITY: Require re-authentication for sensitive wallet unbind operation
    // User must provide password AND (2FA token if 2FA enabled, OR email OTP if no 2FA)

    // Determine what verification is needed
    const has2FA = dbUser.twoFactorEnabled && dbUser.twoFactorSecret;

    // First call: no credentials provided - tell frontend what's needed
    if (!password && !twoFactorToken && !emailOtp) {
      return NextResponse.json({
        error: "Re-authentication required to unbind wallet",
        requiresAuth: true,
        has2FA,
        userEmail: dbUser.email ? maskEmail(dbUser.email) : null
      }, { status: 401 });
    }

    // Verify password (always required)
    if (!password) {
      return NextResponse.json({
        error: "Password is required"
      }, { status: 400 });
    }

    const passwordsMatch = await compare(password, dbUser.password);
    if (!passwordsMatch) {
      return NextResponse.json({
        error: "Invalid password"
      }, { status: 400 });
    }

    // Now verify the second factor
    if (has2FA) {
      // User has 2FA enabled - require TOTP
      if (!twoFactorToken) {
        return NextResponse.json({
          error: "2FA code is required"
        }, { status: 400 });
      }

      try {
        const decryptedSecret = isEncrypted(dbUser.twoFactorSecret!)
          ? decrypt2FASecret(dbUser.twoFactorSecret!)
          : dbUser.twoFactorSecret!;

        const delta = authenticator.checkDelta(twoFactorToken, decryptedSecret);
        if (delta === null || delta < -1 || delta > 1) {
          return NextResponse.json({
            error: "Invalid 2FA code"
          }, { status: 400 });
        }
      } catch (error) {
        console.error("2FA verification error during unbind:", error);
        return NextResponse.json({
          error: "2FA verification failed"
        }, { status: 400 });
      }
    } else {
      // User doesn't have 2FA - require email OTP
      if (!emailOtp) {
        return NextResponse.json({
          error: "Email verification code is required"
        }, { status: 400 });
      }

      if (!dbUser.email) {
        return NextResponse.json({
          error: "No email associated with this account"
        }, { status: 400 });
      }

      // Verify email OTP
      const savedOTP = await getOTP(dbUser.email);
      if (!savedOTP) {
        return NextResponse.json({
          error: "No verification code found. Please request a new one."
        }, { status: 400 });
      }

      if (savedOTP.otp !== emailOtp) {
        return NextResponse.json({
          error: "Invalid verification code"
        }, { status: 400 });
      }

      // Check expiry (5 minutes)
      const now = new Date();
      const expiryTime = new Date(savedOTP.createdAt.getTime() + 5 * 60 * 1000);

      if (now > expiryTime) {
        await deleteOTP(dbUser.email);
        return NextResponse.json({
          error: "Verification code expired. Please request a new one."
        }, { status: 400 });
      }

      // Clean up the used OTP
      await deleteOTP(dbUser.email);
    }

    // All verification passed - unbind the wallet
    await removeUserWalletAddress(session.user.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Unbind wallet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to unbind wallet" },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart[1]}***@${domain}`;
}
