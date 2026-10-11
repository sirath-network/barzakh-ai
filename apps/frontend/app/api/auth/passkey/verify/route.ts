import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { getPasskeyByCredentialId, getUserById, updatePasskeyUsage } from "@/lib/db/queries";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { credentialId, clientDataJSON, authenticatorData, signature } = body;

    if (!credentialId) {
      return NextResponse.json({ error: "Missing credentialId" }, { status: 400 });
    }

    // 1. Verify challenge from cookie
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get("passkey-challenge")?.value;

    if (!challengeToken) {
      return NextResponse.json({ error: "Authentication challenge expired. Please try again." }, { status: 400 });
    }

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "AUTH_SECRET is not configured" }, { status: 500 });
    }
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    await jwtVerify(challengeToken, secret);

    // 2. Fetch passkey from database
    const passkeys = await getPasskeyByCredentialId(credentialId);
    if (passkeys.length === 0) {
      return NextResponse.json({ error: "Passkey credential not recognized." }, { status: 404 });
    }

    const passkey = passkeys[0];

    // 3. Verify user exists
    const users = await getUserById(passkey.userId);
    if (users.length === 0) {
      return NextResponse.json({ error: "User account linked to this passkey was not found." }, { status: 404 });
    }

    // 4. Update usage stats
    await updatePasskeyUsage(credentialId);

    // 5. Issue signed session token for NextAuth credentials login
    const sessionToken = await new SignJWT({
      type: "passkey",
      userId: passkey.userId,
      credentialId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(secret);

    // Clear challenge cookie
    cookieStore.delete("passkey-challenge");

    return NextResponse.json({
      success: true,
      sessionToken,
      credentialId,
      user: {
        id: users[0].id,
        name: users[0].name,
        username: users[0].username,
        walletAddress: users[0].walletAddress,
      },
    });
  } catch (error: any) {
    console.error("Passkey verification failed:", error);
    return NextResponse.json({ error: error?.message || "Passkey verification failed" }, { status: 500 });
  }
}
