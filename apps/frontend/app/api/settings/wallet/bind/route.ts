import { auth } from "@/app/(auth)/auth";
import { getUserByWalletAddress, updateUserWalletAddress } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { verifyMessage } from "viem";

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
