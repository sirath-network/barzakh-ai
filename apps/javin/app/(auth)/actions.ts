"use server";

import { z } from "zod";
import { headers } from "next/headers";

import {
  createUser,
  getUser,
  getPasswordResetToken,
  savePasswordResetToken,
  updateUserPassword,
  deletePasswordResetToken,
  generateOTP,
  saveOTP,
  getOTP,
  deleteOTP,
} from "@/lib/db/queries";

import { signIn } from "./auth";
import { generateUUID } from "@javin/shared/lib/utils/utils";
import { nanoid } from "nanoid";
import { sendResetEmail, sendOTPEmail } from "@/lib/utils/email";
import * as Sentry from "@sentry/nextjs";

async function verifyTurnstile(token: string) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for");

  const formData = new FormData();
  formData.append("secret", process.env.TURNSTILE_SECRET_KEY!);
  formData.append("response", token);
  formData.append("remoteip", ip!);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  return data.success;
}

// For login: only check required + min length
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  "cf-turnstile-response": z.string(),
});

// For registration: enforce full strength rules
const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(100, "Password cannot be longer than 100 characters.")
  .refine(
    (password) => {
      const hasLowercase = /[a-z]/.test(password);
      const hasUppercase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[!@#$%^&*]/.test(password);
      return hasLowercase && hasUppercase && hasNumber && hasSpecialChar;
    },
    {
      message:
        "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character (!@#$%^&*).",
    }
  );

const registerSchema = z.object({
  email: z.string().email(),
  password: passwordValidation,
  "cf-turnstile-response": z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
  "cf-turnstile-response": z.string(),
});
const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordValidation,
});

export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data";
}

export const login = async (
  _: LoginActionState,
  formData: FormData
): Promise<LoginActionState> => {
  try {
    const validatedData = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
      "cf-turnstile-response": formData.get("cf-turnstile-response"),
    });

    const isTurnstileValid = await verifyTurnstile(
      validatedData["cf-turnstile-response"]
    );

    if (!isTurnstileValid) {
      return { status: "failed" };
    }

    await signIn("credentials", {
      email: validatedData.email,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }
    Sentry.captureException(error);
    return { status: "failed" };
  }
};

const verifyOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

// Add this new action state type
export interface VerifyOTPActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "invalid_data"
    | "invalid_otp"
    | "otp_expired";
}

export interface RegisterActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "user_exists"
    | "invalid_data"
    | "too_small"
    | "otp_sent"
    | "otp_verified";
  fieldErrors?: {
    email?: string[];
    password?: string[];
    otp?: string[];
  };
  email?: string;
}

    // Modify the register action to handle OTP flow
    export const register = async (
      prevState: RegisterActionState,
      formData: FormData
    ): Promise<RegisterActionState> => {
      try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const otp = formData.get("otp") as string | null;
        const turnstileResponse = formData.get("cf-turnstile-response") as string;

        const isTurnstileValid = await verifyTurnstile(turnstileResponse);

        if (!isTurnstileValid) {
          return { status: "failed" };
        }

        console.log('Registration attempt:', { email, hasOtp: !!otp });

        // If we're verifying OTP
        if (otp) {
          console.log('Verifying OTP for:', email);
          const verified = await verifyOTP(email, otp);
          
          if (!verified) {
            return { 
              status: "invalid_data",
              fieldErrors: { otp: ["Invalid or expired OTP"] },
              email
            };
          }

          console.log('Creating user account');
          const id = generateUUID();
          await createUser(id, email, password);
          
          return { 
            status: "otp_verified",
            email
          };
        }

        // Initial submission - validate inputs, then send OTP
        try {
          registerSchema.parse({ 
            email, 
            password,
            "cf-turnstile-response": turnstileResponse 
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            return {
              status: "invalid_data",
              fieldErrors: error.flatten().fieldErrors,
              email
            };
          }
          throw error;
        }

        // Check if user already exists BEFORE sending OTP
        const existingUser = await getUser(email);
        if (existingUser.length > 0) {
            return {
                status: "user_exists",
                fieldErrors: { email: ["An account with this email already exists."] },
                email,
            };
        }

        console.log('Sending OTP to:', email);
        const otpCode = generateOTP();
        await saveOTP(email, otpCode);
        await sendOTPEmail(email, otpCode);

        return { 
          status: "otp_sent",
          email
        };
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle potential duplicate key error during creation as a fallback
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return {
                status: "user_exists",
                fieldErrors: { email: ["An account with this email already exists."] },
            };
        }

        if (error instanceof z.ZodError) {
        return {
            status: "invalid_data",
            fieldErrors: error.flatten().fieldErrors,
        };
        }
        
        Sentry.captureException(error);
        return { status: "failed" };
    }
};

// Add this helper function to verify OTP
async function verifyOTP(email: string, otp: string): Promise<boolean> {
  try {
    console.log('Verifying OTP for:', email);
    const savedOTP = await getOTP(email);
    
    if (!savedOTP) {
      console.log('No OTP found for email:', email);
      return false;
    }

    console.log('Comparing OTPs - Saved:', savedOTP.otp, 'Received:', otp);
    if (savedOTP.otp !== otp) {
      console.log('OTP mismatch');
      return false;
    }

    const now = new Date();
    const expiryTime = new Date(savedOTP.createdAt.getTime() + 10 * 60 * 1000);
    
    if (now > expiryTime) {
      console.log('OTP expired');
      await deleteOTP(email);
      return false;
    }

    await deleteOTP(email);
    console.log('OTP verified successfully');
    return true;
  } catch (error) {
    console.error('OTP verification error:', error);
    return false;
  }
}

export interface ForgotPasswordActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "invalid_data"
    | "invalid_email";
  fieldErrors?: {
    email?: string[];
  };
}

export async function forgotPassword(
  _: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  try {
    const email = formData.get("email") as string;
    const turnstileResponse = formData.get("cf-turnstile-response") as string;

    const isTurnstileValid = await verifyTurnstile(turnstileResponse);

    if (!isTurnstileValid) {
      return { status: "failed" };
    }

    const user = await getUser(email);
    if (user.length === 0) {
      return {
        status: "invalid_email",
        fieldErrors: { email: ["Email not found"] },
      };
    }

    const resetToken = nanoid();
    await savePasswordResetToken(email, resetToken);

    const resetUrl = `${process.env.PUBLIC_BASE_URL}/forgotpassword/${resetToken}`;
    console.log("Reset URL:", resetUrl);

    await sendResetEmail(email, resetUrl); // 💌 Send the actual email

    return { status: "success" };
  } catch (err) {
    console.log("Error while running forgotPassword action = ", err);
    return { status: "failed" };
  }
}

export interface VerifyAndResetPasswordActionState {
  status:
    | "idle"
    | "in_progress"
    | "success"
    | "failed"
    | "redirect_to_forgot_password"
    | "expired_token"
    | "invalid_data";
  fieldErrors?: {
    password?: string[];
  };
}

export async function verifyAndResetPassword(
  _: VerifyAndResetPasswordActionState,
  formData: FormData
): Promise<VerifyAndResetPasswordActionState> {
  try {
    const form = {
      token: formData.get("token") as string,
      password: formData.get("password") as string,
    };

    // Validate the input using Zod
    const validated = resetPasswordSchema.safeParse(form);

    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      return {
        status: "invalid_data",
        fieldErrors: {
          password: fieldErrors.password || [],
        },
      };
    }

    const tokens = await getPasswordResetToken(validated.data.token);
    if (!tokens) {
      return { status: "redirect_to_forgot_password" };
    }

    if (tokens.expiry < new Date()) {
      console.log("expired_token");
      return { status: "expired_token" };
    }

    const email = tokens.email;
    await updateUserPassword(email, validated.data.password);
    await deletePasswordResetToken(validated.data.token);

    return { status: "success" };
  } catch (err) {
    console.log("Error while running verifyAndResetPassword action = ", err);
    return { status: "failed" };
  }
}
