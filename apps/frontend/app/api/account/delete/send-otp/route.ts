import { auth } from "@/app/(auth)/auth";
import { getUserById, saveOTP, generateOTP } from "@/lib/db/queries";
import { sendOTPEmail } from "@/lib/utils/email";
import { checkRateLimit } from "@/lib/security/crypto";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limit: 3 OTP requests per 10 minutes per user
        const rateLimit = checkRateLimit(`account-delete-otp:${session.user.id}`, 3, 10 * 60 * 1000);
        if (!rateLimit.allowed) {
            return NextResponse.json({
                error: `Too many OTP requests. Try again in ${Math.ceil(rateLimit.resetIn / 60000)} minutes.`
            }, { status: 429 });
        }

        // Get full user data from DB
        const [dbUser] = await getUserById(session.user.id);
        if (!dbUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Only send email OTP if user doesn't have 2FA enabled
        if (dbUser.twoFactorEnabled) {
            return NextResponse.json({
                error: "You have 2FA enabled. Please use your authenticator app."
            }, { status: 400 });
        }

        if (!dbUser.email) {
            return NextResponse.json({
                error: "No email associated with this account."
            }, { status: 400 });
        }

        // Generate and save OTP
        const otp = generateOTP();
        await saveOTP(dbUser.email, otp);

        // Send OTP email
        await sendOTPEmail(dbUser.email, otp);

        // Mask email for frontend display
        const maskedEmail = maskEmail(dbUser.email);

        return NextResponse.json({
            success: true,
            message: "Verification code sent",
            maskedEmail,
            remaining: rateLimit.remaining
        });
    } catch (error: any) {
        console.error("Send account delete OTP error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to send verification code" },
            { status: 500 }
        );
    }
}

function maskEmail(email: string): string {
    const [localPart, domain] = email.split("@");
    if (localPart.length <= 2) {
        return `${localPart[0]}***@${domain}`;
    }
    return `${localPart[0]}${localPart[1]}***@${domain}`;
}
