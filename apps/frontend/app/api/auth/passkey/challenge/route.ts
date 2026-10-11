import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { bufferToBase64URL } from "@/lib/agent/mera-passkey";
import { auth } from "@/app/(auth)/auth";

export async function GET() {
  try {
    const rawChallenge = crypto.randomBytes(32);
    const challenge = bufferToBase64URL(rawChallenge);
    const timestamp = Date.now();

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "AUTH_SECRET is not configured" }, { status: 500 });
    }
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    const challengeToken = await new SignJWT({ challenge, timestamp })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set("passkey-challenge", challengeToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
      path: "/",
    });

    // Check if user is currently authenticated
    const session = await auth();
    let userDetails = null;

    if (session?.user?.id) {
      try {
        const { getUserById } = await import("@/lib/db/queries");
        const dbUsers = await getUserById(session.user.id);
        if (dbUsers.length > 0) {
          userDetails = {
            id: dbUsers[0].id,
            email: dbUsers[0].email || session.user.email || null,
            name: dbUsers[0].name || session.user.name || null,
            username: dbUsers[0].username || null,
          };
        }
      } catch (dbErr) {
        console.error("Failed to load user for challenge:", dbErr);
      }
    }

    if (!userDetails && session?.user) {
      userDetails = {
        id: session.user.id || null,
        email: session.user.email || null,
        name: session.user.name || null,
        username: (session.user as any)?.username || null,
      };
    }

    return NextResponse.json({ challenge, user: userDetails });
  } catch (error) {
    console.error("Failed to generate passkey challenge:", error);
    return NextResponse.json({ error: "Failed to generate passkey challenge" }, { status: 500 });
  }
}
