import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import {
  createUserWithPasskey,
  createPasskeyCredential,
  getPasskeyByCredentialId,
  getUserById,
} from "@/lib/db/queries";
import { generateUUID } from "@barzakh/shared/lib/utils/utils";
import { generateMonadIdentity } from "@/lib/agent/mera-passkey";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      credentialId,
      publicKey,
      email,
      name,
      username,
      deviceName,
      transports,
      prfSupported,
    } = body;

    if (!credentialId || !publicKey) {
      return NextResponse.json({ error: "Missing credentialId or publicKey" }, { status: 400 });
    }

    // 1. Verify challenge from cookie
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get("passkey-challenge")?.value;

    if (!challengeToken) {
      return NextResponse.json({ error: "Passkey challenge expired or missing. Please try again." }, { status: 400 });
    }

    if (!process.env.AUTH_SECRET) {
      return NextResponse.json({ error: "AUTH_SECRET is not configured" }, { status: 500 });
    }
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    await jwtVerify(challengeToken, secret);

    // 2. Check if credentialId already exists
    const existingPasskeys = await getPasskeyByCredentialId(credentialId);
    if (existingPasskeys.length > 0) {
      return NextResponse.json({ error: "This passkey is already registered." }, { status: 409 });
    }

    // 3. Check if linking to existing account (via active session OR via existing email)
    const session = await auth();
    let targetUserId = session?.user?.id;
    let existingAccountUser: any = null;

    if (session?.user?.id) {
      const existingUser = await getUserById(session.user.id);
      if (existingUser.length > 0) {
        targetUserId = session.user.id;
        existingAccountUser = existingUser[0];
      }
    } else if (email) {
      const { getUser } = await import("@/lib/db/queries");
      const usersWithEmail = await getUser(email);
      if (usersWithEmail.length > 0) {
        targetUserId = usersWithEmail[0].id;
        existingAccountUser = usersWithEmail[0];
      }
    }

    if (targetUserId && existingAccountUser) {
      // Link passkey to existing user without creating new wallet addresses
      const newPasskey = await createPasskeyCredential({
        userId: targetUserId,
        credentialId,
        publicKey,
        deviceName: deviceName || "Passkey",
        walletAddress: existingAccountUser.walletAddress || undefined,
        prfSupported: !!prfSupported,
        transports: JSON.stringify(transports || []),
      });

      // Clear challenge cookie
      cookieStore.delete("passkey-challenge");

      // Generate signed session token for instant NextAuth login
      const sessionToken = await new SignJWT({
        type: "passkey",
        userId: targetUserId,
        credentialId,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("5m")
        .sign(secret);

      return NextResponse.json({
        success: true,
        message: "Passkey linked to your account successfully!",
        isNewUser: false,
        sessionToken,
        credentialId,
        user: {
          id: existingAccountUser.id,
          email: existingAccountUser.email,
          name: existingAccountUser.name,
          username: existingAccountUser.username,
          walletAddress: existingAccountUser.walletAddress,
        },
        passkey: newPasskey,
      });
    }

    // 4. New User Registration with Passkey
    const newUserId = generateUUID();
    const finalEmail = email?.trim() || null;
    const finalName = name || (finalEmail ? finalEmail.split("@")[0] : generateMonadIdentity().name);
    let finalUsername = username || (finalEmail ? finalEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 30) : generateMonadIdentity().username);

    // Ensure username uniqueness
    const { getUserByUsername } = await import("@/lib/db/queries");
    const existingWithUsername = await getUserByUsername(finalUsername);
    if (existingWithUsername.length > 0) {
      finalUsername = `${finalUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Create user without forcing a separate dummy wallet
    const { user: newUser, passkey: newPasskey } = await createUserWithPasskey({
      id: newUserId,
      email: finalEmail,
      credentialId,
      publicKey,
      walletAddress: null as any,
      name: finalName,
      username: finalUsername,
      deviceName: deviceName || "Passkey",
      prfSupported: !!prfSupported,
      transports: JSON.stringify(transports || []),
    });

    // Generate signed session token for instant NextAuth login
    const sessionToken = await new SignJWT({
      type: "passkey",
      userId: newUserId,
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
      isNewUser: true,
      sessionToken,
      credentialId,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        username: newUser.username,
        walletAddress: newUser.walletAddress,
      },
      passkey: newPasskey,
    });
  } catch (error: any) {
    console.error("Passkey registration failed:", error);
    return NextResponse.json({ error: error?.message || "Failed to register passkey" }, { status: 500 });
  }
}
