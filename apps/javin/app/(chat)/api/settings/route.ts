import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { db } from "@/lib/db/db";
import { user } from "@/lib/db/schema"; // ✅ Gunakan tabel 'user', bukan 'users'
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { fullName, username, avatar, password } = body;

  try {
    // ✅ Update tabel 'user' yang sesuai dengan schema
    await db
      .update(user)
      .set({
        name: fullName,
        username,
        image: avatar,
        ...(password ? { password: await hash(password, 10) } : {}),
      })
      .where(eq(user.email, session.user.email));

    // ✅ Return updated user data untuk client
    const [updatedUser] = await db
      .select()
      .from(user)
      .where(eq(user.email, session.user.email));

    return NextResponse.json({ 
      success: true, 
      user: {
        name: updatedUser.name,
        username: updatedUser.username,
        image: updatedUser.image,
        email: updatedUser.email
      }
    });
  } catch (error) {
    console.error("UPDATE ERROR:", error);
    return NextResponse.json({ error: "Gagal memperbarui profil." }, { status: 500 });
  }
}