import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth"; // ✅ Sama seperti di request-email-change
import { db } from "@/lib/db/db"; // Pastikan path ini sesuai lokasi db kamu
import { user, email_change_requests } from "@/lib/db/schema"; // Pastikan schema sudah punya table ini
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    // ✅ Ambil session pakai App Router style
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { verificationCode } = await req.json();
    if (!verificationCode) {
      return NextResponse.json({ message: "Missing verification code" }, { status: 400 });
    }

    // ✅ Cari OTP request berdasarkan userId
    const [requestData] = await db
      .select()
      .from(email_change_requests)
      .where(eq(email_change_requests.userId, session.user.id));

    if (!requestData || requestData.code !== verificationCode) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 400 });
    }

    // ✅ Cek apakah OTP sudah expired
    if (new Date() > requestData.expiresAt) {
      return NextResponse.json({ message: "Verification code expired" }, { status: 400 });
    }

    // ✅ Update email user ke newEmail
    await db
      .update(user)
      .set({ email: requestData.newEmail })
      .where(eq(user.id, session.user.id));

    // ✅ Hapus request setelah berhasil
    await db
      .delete(email_change_requests)
      .where(eq(email_change_requests.userId, session.user.id));

    return NextResponse.json({ message: "Email address updated successfully",
      forceLogout: true
     });
  } catch (error) {
    console.error("Verify email change error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
