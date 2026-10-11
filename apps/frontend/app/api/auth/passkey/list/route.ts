import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { getPasskeysByUserId } from "@/lib/db/queries";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const passkeys = await getPasskeysByUserId(session.user.id);

    return NextResponse.json({
      passkeys: passkeys.map((p) => ({
        id: p.id,
        credentialId: p.credentialId,
        deviceName: p.deviceName,
        walletAddress: p.walletAddress,
        prfSupported: p.prfSupported,
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to list passkeys:", error);
    return NextResponse.json({ error: "Failed to list passkeys" }, { status: 500 });
  }
}
