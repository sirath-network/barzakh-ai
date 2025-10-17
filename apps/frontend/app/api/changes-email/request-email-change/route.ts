import { type NextRequest, NextResponse } from "next/server";
import { compareSync } from "bcrypt-ts";
import { auth } from '@/app/(auth)/auth';
import { getUser, saveEmailChangeRequest, generateOTP } from "@/lib/db/queries";
import { sendOTPEmail } from "@/lib/utils/email"; 

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  const { newEmail, currentPassword } = await req.json();

  // --- Basic Validation ---
  if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ message: 'A valid new email is required' }, { status: 400 });
  }
  if (!currentPassword) {
    return NextResponse.json({ message: 'Your current password is required' }, { status: 400 });
  }
  if (newEmail.toLowerCase() === session.user.email.toLowerCase()) {
    return NextResponse.json({ message: 'New email must be different from the current one' }, { status: 400 });
  }
  
  try {
    // Check if the new email is already in use
    const existingUserCheck = await getUser(newEmail);
    if (existingUserCheck.length > 0) {
        return NextResponse.json({ message: 'This email is already in use by another account.' }, { status: 409 });
    }

    // --- Security Check: Validate Password ---
    const [currentUser] = await getUser(session.user.email);
    if (!currentUser || !currentUser.password) {
      return NextResponse.json({ message: 'User not found or password not set.' }, { status: 404 });
    }

    const isPasswordValid = compareSync(currentPassword, currentUser.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'The password you entered is incorrect' }, { status: 403 });
    }

    // --- Generate OTP ---
    const otp = generateOTP();

    // ✅ Simpan OTP + email baru di tabel request (userId, newEmail, otp, expiresAt)
    await saveEmailChangeRequest({
      userId: session.user.id,
      newEmail,
      code: otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 menit
    });

    // ✅ Kirim OTP ke EMAIL LAMA (session.user.email)
    await sendOTPEmail(session.user.email, otp);

    return NextResponse.json({ 
      message: `Verification code sent to your current email: ${session.user.email}` 
    }, { status: 200 });

  } catch (error) {
    console.error("Error requesting email change:", error);
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
}
