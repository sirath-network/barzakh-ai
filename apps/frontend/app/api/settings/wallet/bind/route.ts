import { auth } from "@/app/(auth)/auth";
import { getUserByWalletAddress, updateUserWalletAddress, getUserById, getOTP, deleteOTP } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { compare } from "bcrypt-ts";
import { authenticator } from "otplib";
import { decrypt2FASecret, isEncrypted } from "@/lib/security/crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address, signature, message, password, twoFactorToken, emailOtp } = await request.json();

    // Get full user data from DB
    const [dbUser] = await getUserById(session.user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SECURITY: If user is binding a wallet (new or change), require re-authentication
    // Skip only if it's the exact same wallet address re-connecting
    const requiresVerification = dbUser.walletAddress !== address;

    if (requiresVerification) {
      // Check if user has a password set AND (email linked or 2FA enabled)
      // Required for wallet connection/change to prevent getting stuck in verification
      if (!dbUser.password || (!dbUser.email && !dbUser.twoFactorEnabled)) {
        return NextResponse.json({
          error: "Please finalize your account setup by securing both your password and email. This step is required to verify your identity and enable wallet management actions."
        }, { status: 400 });
      }

      const has2FA = dbUser.twoFactorEnabled && dbUser.twoFactorSecret;

      // First call: no credentials provided - tell frontend what's needed
      if (!password && !twoFactorToken && !emailOtp) {
        return NextResponse.json({
          error: "Re-authentication required to connect wallet",
          requiresAuth: true,
          has2FA,
          userEmail: dbUser.email ? maskEmail(dbUser.email) : null
        }, { status: 401 });
      }

      // Verify password (always required for wallet change)
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

      // Verify second factor
      if (has2FA) {
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
          console.error("2FA verification error during wallet change:", error);
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
    }

    // Now proceed with the standard wallet binding flow
    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // SECURITY: Verify the nonce from cookie (server-issued)
    const cookieStore = await cookies();
    const nonceToken = cookieStore.get("wallet-bind-nonce")?.value;

    if (!nonceToken) {
      return NextResponse.json(
        { error: "Invalid session. Please refresh and try again." },
        { status: 400 }
      );
    }

    // Verify JWT nonce
    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    try {
      const { payload } = await jwtVerify(nonceToken, secret);

      // Verify the nonce is for the correct user
      if (payload.userId !== session.user.id) {
        return NextResponse.json({ error: "Invalid session" }, { status: 400 });
      }

      // Verify the message contains the nonce
      if (!message.includes(payload.nonce as string)) {
        return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Session expired. Please refresh and try again." },
        { status: 400 }
      );
    }

    // Clear the nonce cookie after use
    cookieStore.delete("wallet-bind-nonce");

    // Verify signature
    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Check if wallet is already bound to another user
    const existingUsers = await getUserByWalletAddress(address);
    if (existingUsers.length > 0) {
      // If it's the same user, it's fine (maybe re-binding or just checking)
      if (existingUsers[0].id === session.user.id) {
        return NextResponse.json({ success: true, user: existingUsers[0] });
      }
      return NextResponse.json(
        { error: "Wallet address already connected to another account" },
        { status: 409 }
      );
    }

    // Update user
    const updatedUser = await updateUserWalletAddress(session.user.id, address);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Bind wallet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to bind wallet" },
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
