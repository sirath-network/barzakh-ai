import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const nonce = crypto.randomUUID();
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

    const token = await new SignJWT({ nonce, userId: session.user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);

    (await cookies()).set("wallet-bind-nonce", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 300, // 5 minutes
    });

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Wallet bind nonce error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
