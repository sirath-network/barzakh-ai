import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback-secret");

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

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.id, payload.userId as string));
    
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!dbUser.twoFactorEnabled || !dbUser.twoFactorSecret) {
      return NextResponse.json({ error: "2FA not enabled for this user" }, { status: 400 });
    }

    // Verify 2FA token - only accept current or immediately previous time step
    // Reject tokens older than ~60 seconds (delta <= -2)
    // otplib checkDelta returns the delta (number) or null if invalid
    const delta = authenticator.checkDelta(twoFactorToken, dbUser.twoFactorSecret);

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
        const tokenIndex = backupCodes.indexOf(twoFactorToken.toUpperCase());
        
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
      return NextResponse.json({ error: "Invalid 2FA token" }, { status: 400 });
    }

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
      .setExpirationTime("30d") // 30 days
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
