import { NextResponse } from "next/server";
import { generateOTP, saveOTP } from "@/lib/db/queries";
import { sendOTPEmail } from "@/lib/utils/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const otpCode = generateOTP();
    await saveOTP(email, otpCode);
    await sendOTPEmail(email, otpCode);

    return NextResponse.json(
      { success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in resend OTP:", error);
    return NextResponse.json(
      { error: "Failed to resend OTP" },
      { status: 500 }
    );
  }
}