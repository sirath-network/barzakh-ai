import { auth } from "@/app/(auth)/auth";
import { removeUserWalletAddress, getUserById } from "@/lib/db/queries";
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
    const { password, twoFactorToken } = body;

    // Get full user data from DB to verify re-authentication
    const [dbUser] = await getUserById(session.user.id);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // SECURITY: Require re-authentication for sensitive wallet unbind operation
    // User must provide either password OR 2FA token
    let isAuthenticated = false;

    // Option 1: Verify password if provided and user has a password
    if (password && dbUser.password) {
      const passwordsMatch = await compare(password, dbUser.password);
      if (passwordsMatch) {
        isAuthenticated = true;
      }
    }

    // Option 2: Verify 2FA token if provided and user has 2FA enabled
    if (!isAuthenticated && twoFactorToken && dbUser.twoFactorEnabled && dbUser.twoFactorSecret) {
      try {
        const decryptedSecret = isEncrypted(dbUser.twoFactorSecret) 
          ? decrypt2FASecret(dbUser.twoFactorSecret)
          : dbUser.twoFactorSecret;
        
        const delta = authenticator.checkDelta(twoFactorToken, decryptedSecret);
        if (delta !== null && delta >= -1 && delta <= 1) {
          isAuthenticated = true;
        }
      } catch (error) {
        console.error("2FA verification error during unbind:", error);
      }
    }

    // If user has neither password nor 2FA, and wallet is their only auth method, prevent unbind
    if (!dbUser.password && !dbUser.twoFactorEnabled) {
      return NextResponse.json({ 
        error: "Cannot unbind wallet: You have no other authentication method. Please set a password first." 
      }, { status: 400 });
    }

    // Require re-authentication
    if (!isAuthenticated) {
      // Tell frontend what authentication methods are available
      const availableMethods = [];
      if (dbUser.password) availableMethods.push("password");
      if (dbUser.twoFactorEnabled) availableMethods.push("2fa");
      
      return NextResponse.json({ 
        error: "Re-authentication required to unbind wallet",
        requiresAuth: true,
        availableMethods
      }, { status: 401 });
    }

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
