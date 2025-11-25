import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: "Email and token are required" }, { status: 400 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.email, email));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not enabled for this user" }, { status: 400 });
    }

    // First try to verify as TOTP token - only accept current or immediately previous time step
    // Reject tokens older than ~60 seconds (delta <= -2)
    // otplib checkDelta returns the delta (number) or null if invalid
    const delta = authenticator.checkDelta(token, dbUser.twoFactorSecret);

    // Only accept tokens from current time step (delta === 0) or immediately previous (delta === -1)
    // Reject tokens from 2+ steps ago (older than ~60 seconds)
    let verified = false;
    if (delta !== null) {
      verified = delta >= -1 && delta <= 1;
    }

    // If TOTP verification failed, check if it's a backup code
    if (!verified && dbUser.backupCodes) {
      try {
        const backupCodes = JSON.parse(dbUser.backupCodes) as string[];
        const tokenIndex = backupCodes.indexOf(token.toUpperCase());
        
        if (tokenIndex !== -1) {
          // Remove the used backup code
          backupCodes.splice(tokenIndex, 1);
          await db
            .update(user)
            .set({ backupCodes: JSON.stringify(backupCodes) })
            .where(eq(user.id, dbUser.id));
          
          verified = true;
        }
      } catch (error) {
        console.error("Error parsing backup codes:", error);
      }
    }

    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "2FA verification successful"
    });
  } catch (error) {
    console.error("2FA login verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
