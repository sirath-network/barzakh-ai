import { auth } from "@/app/(auth)/auth";
import { getUserByWalletAddress, updateUserWalletAddress } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { address, signature, message } = await request.json();

    if (!address || !signature || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // SECURITY: Verify the nonce from cookie (server-issued)
    const cookieStore = await cookies();
    const nonceToken = cookieStore.get("wallet-bind-nonce")?.value;

    if (!nonceToken) {
      return NextResponse.json(
        { error: "Invalid session. Please refresh and try again." },
        { status: 400 }
      );
    }

    // Verify JWT nonce
    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    try {
      const { payload } = await jwtVerify(nonceToken, secret);
      
      // Verify the nonce is for the correct user
      if (payload.userId !== session.user.id) {
        return NextResponse.json({ error: "Invalid session" }, { status: 400 });
      }
      
      // Verify the message contains the nonce
      if (!message.includes(payload.nonce as string)) {
        return NextResponse.json({ error: "Invalid message format" }, { status: 400 });
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Session expired. Please refresh and try again." },
        { status: 400 }
      );
    }

    // Clear the nonce cookie after use
    cookieStore.delete("wallet-bind-nonce");

    // Verify signature
    const isValid = await verifyMessage({
      address,
      message,
      signature,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Check if wallet is already bound to another user
    const existingUsers = await getUserByWalletAddress(address);
    if (existingUsers.length > 0) {
      // If it's the same user, it's fine (maybe re-binding or just checking)
      if (existingUsers[0].id === session.user.id) {
        return NextResponse.json({ success: true, user: existingUsers[0] });
      }
      return NextResponse.json(
        { error: "Wallet address already connected to another account" },
        { status: 409 }
      );
    }

    // Update user
    const updatedUser = await updateUserWalletAddress(session.user.id, address);

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Bind wallet error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to bind wallet" },
      { status: 500 }
    );
  }
}
