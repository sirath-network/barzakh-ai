import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyMessage } from "viem";

// Nonce store to prevent replay attacks (in production, use Redis or a database)
const nonceStore = new Map<string, { nonce: string; timestamp: number; userId: string }>();
const NONCE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (now - data.timestamp > NONCE_TTL) {
      nonceStore.delete(address);
    }
  }
}, 60 * 1000); // Clean up every minute

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.toLowerCase();

  if (!address) {
    return NextResponse.json({ error: "Wallet address is required" }, { status: 400 });
  }

  // Generate a unique nonce
  const nonce = `Barzakh AI — Ownership Verification\n\nNonce: ${crypto.randomUUID()}\nTimestamp: ${Date.now()}`;

  // Store nonce with user ID
  nonceStore.set(address, {
    nonce,
    timestamp: Date.now(),
    userId: session.user.id,
  });

  return NextResponse.json({
    message: nonce,
    expiresIn: NONCE_TTL / 1000, // seconds
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { address, signature, bindWallet = true } = await request.json();

  if (!address || !signature) {
    return NextResponse.json({ error: "Address and signature are required" }, { status: 400 });
  }

  const normalizedAddress = address.toLowerCase();
  const storedNonce = nonceStore.get(normalizedAddress);

  if (!storedNonce) {
    return NextResponse.json({ error: "Nonce not found or expired. Please request a new one." }, { status: 400 });
  }

  // Verify the nonce belongs to this user
  if (storedNonce.userId !== session.user.id) {
    return NextResponse.json({ error: "Invalid session" }, { status: 403 });
  }

  // Check if nonce has expired
  if (Date.now() - storedNonce.timestamp > NONCE_TTL) {
    nonceStore.delete(normalizedAddress);
    return NextResponse.json({ error: "Nonce expired. Please request a new one." }, { status: 400 });
  }

  try {
    // Verify the signature
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message: storedNonce.nonce,
      signature: signature as `0x${string}`,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Clear the used nonce
    nonceStore.delete(normalizedAddress);

    // Only bind wallet to account if explicitly requested (for login/registration flows)
    // For swap verification, we just confirm ownership without binding
    if (bindWallet) {
      await db
        .update(user)
        .set({ walletAddress: address })
        .where(eq(user.id, session.user.id));

      return NextResponse.json({
        success: true,
        message: "Wallet verified and linked to your account",
        walletAddress: address,
      });
    }

    // Verification-only mode (no wallet binding)
    return NextResponse.json({
      success: true,
      message: "Wallet ownership verified",
      walletAddress: address,
    });
  } catch (error: any) {
    console.error("Signature verification error:", error);
    return NextResponse.json({
      error: "Signature verification failed",
      details: error.message
    }, { status: 400 });
  }
}
