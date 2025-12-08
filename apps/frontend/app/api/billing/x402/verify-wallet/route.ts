import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { verifyMessage } from "viem";

// Nonce store for payment wallet verification (in production, use Redis or a database)
const paymentNonceStore = new Map<string, { nonce: string; timestamp: number; userId: string }>();
const NONCE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired nonces periodically
setInterval(() => {
    const now = Date.now();
    for (const [address, data] of paymentNonceStore.entries()) {
        if (now - data.timestamp > NONCE_TTL) {
            paymentNonceStore.delete(address);
        }
    }
}, 60 * 1000); // Clean up every minute

// GET: Request a nonce for wallet verification (payment only - does NOT save wallet)
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

    // Generate a unique nonce for payment verification
    const nonce = `Barzakh AI — Payment Verification\n\nNonce: ${crypto.randomUUID()}\nTimestamp: ${Date.now()}`;

    // Store nonce with user ID
    paymentNonceStore.set(address, {
        nonce,
        timestamp: Date.now(),
        userId: session.user.id,
    });

    return NextResponse.json({
        message: nonce,
        expiresIn: NONCE_TTL / 1000, // seconds
    });
}

// POST: Verify wallet signature for payment (does NOT save wallet address)
export async function POST(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address, signature } = await request.json();

    if (!address || !signature) {
        return NextResponse.json({ error: "Address and signature are required" }, { status: 400 });
    }

    const normalizedAddress = address.toLowerCase();
    const storedNonce = paymentNonceStore.get(normalizedAddress);

    if (!storedNonce) {
        return NextResponse.json({ error: "Nonce not found or expired. Please request a new one." }, { status: 400 });
    }

    // Verify the nonce belongs to this user
    if (storedNonce.userId !== session.user.id) {
        return NextResponse.json({ error: "Invalid session" }, { status: 403 });
    }

    // Check if nonce has expired
    if (Date.now() - storedNonce.timestamp > NONCE_TTL) {
        paymentNonceStore.delete(normalizedAddress);
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
        paymentNonceStore.delete(normalizedAddress);

        // NOTE: We intentionally do NOT save the wallet address here.
        // This endpoint is only for payment verification, not for wallet binding.
        // Users paying with different wallets should not have their connected wallet changed.

        return NextResponse.json({
            success: true,
            message: "Wallet verified for payment",
            walletAddress: address,
        });
    } catch (error: any) {
        console.error("Payment wallet verification error:", error);
        return NextResponse.json({
            error: "Signature verification failed",
            details: error.message
        }, { status: 400 });
    }
}
