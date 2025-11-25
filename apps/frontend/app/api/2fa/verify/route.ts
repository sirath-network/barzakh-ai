import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import { nanoid } from "nanoid";

// Generate backup codes
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    codes.push(nanoid(8).toUpperCase());
  }
  return codes;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token, action } = await request.json();

    if (!token || !action) {
      return NextResponse.json({ error: "Token and action are required" }, { status: 400 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.email, session.user.email));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not set up" }, { status: 400 });
    }

    // Verify the token - only accept current or immediately previous time step
    // Reject tokens older than ~60 seconds (delta <= -2)
    // otplib checkDelta returns the delta (number) or null if invalid
    const delta = authenticator.checkDelta(token, dbUser.twoFactorSecret);

    // Only accept tokens from current time step (delta === 0) or immediately previous (delta === -1)
    // Reject tokens from 2+ steps ago (older than ~60 seconds)
    let verified = false;
    if (delta !== null) {
      verified = delta >= -1 && delta <= 1;
    }

    if (!verified) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    if (action === "enable") {
      // Enable 2FA and generate backup codes
      const backupCodes = generateBackupCodes();
      
      await db
        .update(user)
        .set({ 
          twoFactorEnabled: true,
          backupCodes: JSON.stringify(backupCodes)
        })
        .where(eq(user.id, dbUser.id));

      return NextResponse.json({
        success: true,
        backupCodes: backupCodes,
        message: "2FA enabled successfully"
      });
    } else if (action === "verify") {
      // Just verify the token for login
      return NextResponse.json({
        success: true,
        message: "Token verified successfully"
      });
    } else if (action === "disable") {
      // Disable 2FA
      await db
        .update(user)
        .set({ 
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: null
        })
        .where(eq(user.id, dbUser.id));

      return NextResponse.json({
        success: true,
        message: "2FA disabled successfully"
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
