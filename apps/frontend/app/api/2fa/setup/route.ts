import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { encrypt2FASecret, checkRateLimit } from "@/lib/security/crypto";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 setup attempts per 15 minutes
    const rateLimit = checkRateLimit(`2fa-setup:${session.user.id}`, 5, 15 * 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: `Too many attempts. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds` 
      }, { status: 429 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.id, session.user.id));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Generate OTPAuth URL
    // Use email if available, otherwise username, otherwise "User"
    const accountLabel = dbUser.email || dbUser.username || "User";
    const otpauth = authenticator.keyuri(accountLabel, 'Barzakh', secret);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Encrypt the secret before storing
    const encryptedSecret = encrypt2FASecret(secret);

    // Update user with the encrypted secret (but don't enable 2FA yet)
    await db
      .update(user)
      .set({ twoFactorSecret: encryptedSecret })
      .where(eq(user.id, dbUser.id));

    return NextResponse.json({
      secret: secret, // Return plaintext to user for manual entry
      qrCode: qrCodeUrl,
      manualEntryKey: secret,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
