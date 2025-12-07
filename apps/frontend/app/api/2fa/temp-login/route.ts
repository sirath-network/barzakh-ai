import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcrypt-ts";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { SignJWT } from "jose";

if (!process.env.AUTH_SECRET) {
  throw new Error("AUTH_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Get user from database
    const [dbUser] = await db.select().from(user).where(eq(user.email, email));
    
    if (!dbUser) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!dbUser.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Verify password
    const passwordsMatch = await compare(password, dbUser.password);
    if (!passwordsMatch) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if user has 2FA enabled
    if (!dbUser.twoFactorEnabled) {
      return NextResponse.json({ error: "2FA not enabled" }, { status: 400 });
    }

    // Create temporary JWT token for 2FA verification
    const tempToken = await new SignJWT({ 
      userId: dbUser.id, 
      email: dbUser.email,
      type: "2fa_temp" 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("5m") // 5 minutes expiry
      .setIssuedAt()
      .sign(secret);

    return NextResponse.json({
      success: true,
      tempToken,
      requires2FA: true
    });
  } catch (error) {
    console.error("Temp login error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
