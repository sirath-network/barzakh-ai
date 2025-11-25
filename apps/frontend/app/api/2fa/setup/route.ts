import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.email, session.user.email));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a new secret
    const secret = authenticator.generateSecret();

    // Generate OTPAuth URL
    const otpauth = authenticator.keyuri(session.user.email, 'Barzakh', secret);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpauth);

    // Update user with the secret (but don't enable 2FA yet)
    await db
      .update(user)
      .set({ twoFactorSecret: secret })
      .where(eq(user.id, dbUser.id));

    return NextResponse.json({
      secret: secret,
      qrCode: qrCodeUrl,
      manualEntryKey: secret,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
