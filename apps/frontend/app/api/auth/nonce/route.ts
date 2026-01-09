import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Address is required" }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  const timestamp = Date.now();
  if (!process.env.AUTH_SECRET) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

  const token = await new SignJWT({ nonce, timestamp, address })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret);

  (await cookies()).set("auth-nonce", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 300, // 5 minutes
  });

  return NextResponse.json({ nonce, timestamp });
}
