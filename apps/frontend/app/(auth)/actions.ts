"use server";

import { z } from "zod";
import { headers } from "next/headers";

import {
  createUser,
  getUser,
  getUserByUsername,
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
import { generateUUID } from "@barzakh/shared/lib/utils/utils";
import { nanoid } from "nanoid";
import { sendResetEmail, sendOTPEmail } from "@/lib/utils/email";
// Dynamic import for Sentry to reduce initial bundle size
const captureException = async (error: unknown) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error);
};

async function verifyTurnstile(token: string) {
  // Validate token format before making request
  if (!token || token.trim() === "" || token.length < 10) {
    console.log("❌ Turnstile verification failed: Invalid token format");
    return false;
  }

  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for");

  const formData = new FormData();
  formData.append("secret", process.env.TURNSTILE_SECRET_KEY!);
  formData.append("response", token);
  formData.append("remoteip", ip!);

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();
    
    if (!data.success) {
      console.log("❌ Turnstile verification failed:", data);
    } else {
      console.log("✅ Turnstile verification successful");
    }

    return data.success;
  } catch (error) {
    console.error("❌ Turnstile verification error:", error);
    return false;
  }
}

// For login: only check required + min length
const loginSchema = z.object({
  // Accept either email or username; we'll resolve to email server-side
  email: z.string().min(1, "Required"),
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

const forgotPasswordOTPSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6, "OTP must be 6 digits"),
  "cf-turnstile-response": z.string(),
});
const resetPasswordSchema = z.object({
  token: z.string(),
  password: passwordValidation,
  passwordConfirm: z.string(),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords don't match",
  path: ["passwordConfirm"],
});

export interface LoginActionState {
  status: "idle" | "in_progress" | "success" | "failed" | "invalid_data" | "requires_2fa";
  email?: string;
  tempToken?: string;
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

    // Resolve identifier to email (supports username)
    let resolvedEmail = validatedData.email;
    if (!resolvedEmail.includes("@")) {
      // Enforce lowercase a-z0-9 only for username logins. Do not normalize; reject instead.
      const isLowerAlnum = /^[a-z0-9]+$/.test(resolvedEmail);
      if (!isLowerAlnum) {
        return { status: "failed" };
      }
      const usernameLookup = resolvedEmail; // already validated as lowercase a-z0-9
      const byUsername = await getUserByUsername(usernameLookup);
      if (byUsername.length === 0) {
        return { status: "failed" };
      }
      resolvedEmail = byUsername[0].email!;
    }

    // Check if user has 2FA enabled
    const users = await getUser(resolvedEmail);
    if (users.length > 0 && users[0].twoFactorEnabled) {
      // User has 2FA enabled, get temp token for 2FA verification
      try {
        const baseUrl =
          process.env.AUTH_URL ??
          process.env.PUBLIC_BASE_URL ??
          "http://localhost:3000";

        // Use a short timeout so a dead/remote AUTH_URL doesn't hang login
        const controller = new AbortController();
        // Increased timeout to 15s to handle cold starts/compilation in dev
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${baseUrl}/api/2fa/temp-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: resolvedEmail,
            password: validatedData.password,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const contentType = response.headers.get("content-type") || "";

        let data: any = null;
        if (contentType.includes("application/json")) {
          try {
            data = await response.json();
          } catch (parseError) {
            console.error("Temp login JSON parse error:", parseError);
          }
        } else {
          // Non‑JSON response (likely an HTML error page)
          const text = await response.text();
          console.error("Temp login non-JSON response (check AUTH_URL/PUBLIC_BASE_URL and that the target app is running):", {
            baseUrl,
            status: response.status,
            contentType,
            bodyPreview: text.slice(0, 200),
          });
        }

        // Wrong credentials / validation errors → just treat as failed login
        if (!response.ok) {
          if (response.status === 401 || response.status === 400) {
            console.warn("Temp login invalid credentials or 2FA state:", {
              status: response.status,
              error: data?.error,
            });
          } else {
            console.error("Temp login API error (remote 2FA endpoint issue):", {
              baseUrl,
              status: response.status,
              error: data?.error,
            });
          }
          return { status: "failed" };
        }

        if (!data?.tempToken) {
          console.error("Temp login succeeded but tempToken missing:", {
            baseUrl,
            data,
          });
          return { status: "failed" };
        }

        return {
          status: "requires_2fa",
          email: resolvedEmail,
          tempToken: data.tempToken,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.error("Temp login request timed out (is AUTH_URL/PUBLIC_BASE_URL pointing to a running server?)", {
            baseUrl:
              process.env.AUTH_URL ??
              process.env.PUBLIC_BASE_URL ??
              "http://localhost:3000",
          });
        } else {
          console.error("Temp login network or unexpected error:", {
            error,
            baseUrl:
              process.env.AUTH_URL ??
              process.env.PUBLIC_BASE_URL ??
              "http://localhost:3000",
          });
        }
        return { status: "failed" };
      }
    }

    await signIn("credentials", {
      email: resolvedEmail,
      password: validatedData.password,
      redirect: false,
    });

    return { status: "success" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { status: "invalid_data" };
    }
    captureException(error).catch(console.error);
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
  timestamp?: number;
}

    // Modify the register action to handle OTP flow
    export const register = async (
      prevState: RegisterActionState,
      formData: FormData
    ): Promise<RegisterActionState> => {
      const timestamp = Date.now();
      try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const otp = formData.get("otp") as string | null;
        const turnstileResponse = formData.get("cf-turnstile-response") as string;

        const isTurnstileValid = await verifyTurnstile(turnstileResponse);

        if (!isTurnstileValid) {
          return { status: "failed", timestamp };
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
              email,
              timestamp
            };
          }

          console.log('Creating user account');
          const id = generateUUID();
          await createUser(id, email, password);
          
          return { 
            status: "otp_verified",
            email,
            timestamp
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
              email,
              timestamp
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
                timestamp
            };
        }

        console.log('Sending OTP to:', email);
        const otpCode = generateOTP();
        await saveOTP(email, otpCode);
        await sendOTPEmail(email, otpCode);

        return { 
          status: "otp_sent",
          email,
          timestamp
        };
    } catch (error) {
        console.error('Registration error:', error);
        
        // Handle potential duplicate key error during creation as a fallback
        if (error instanceof Error && 'code' in error && error.code === '23505') {
            return {
                status: "user_exists",
                fieldErrors: { email: ["An account with this email already exists."] },
                timestamp
            };
        }

        if (error instanceof z.ZodError) {
        return {
            status: "invalid_data",
            fieldErrors: error.flatten().fieldErrors,
            timestamp
        };
        }
        
        captureException(error).catch(console.error);
        return { status: "failed", timestamp };
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
    | "invalid_email"
    | "otp_sent"
    | "otp_verified"
    | "requires_2fa";
  email?: string;
  fieldErrors?: {
    email?: string[];
    otp?: string[];
  };
}

export async function forgotPassword(
  _: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  try {
    const email = formData.get("email") as string;
    const otp = formData.get("otp") as string | null;
    const turnstileResponse = formData.get("cf-turnstile-response") as string;

    console.log(`🔄 ForgotPassword action called - Email: ${email}, OTP: ${otp ? 'provided' : 'not provided'}`);

    const isTurnstileValid = await verifyTurnstile(turnstileResponse);

    if (!isTurnstileValid) {
      console.log(`❌ Turnstile verification failed for ${email} - token may be expired or already used`);
      return { 
        status: "failed",
        fieldErrors: { 
          email: ["Security verification failed. Please refresh the page and try again."] 
        }
      };
    }

    // Check if user exists
    const user = await getUser(email);
    if (user.length === 0) {
      return {
        status: "invalid_email",
        fieldErrors: { email: ["Email not found"] },
      };
    }

    // If we're verifying OTP
    if (otp) {
      console.log(`🔍 Verifying OTP for email: ${email}`);
      const verified = await verifyOTP(email, otp);
      console.log(`✅ OTP verification result: ${verified}`);
      
      if (!verified) {
        console.log(`❌ OTP verification failed for ${email}`);
        return { 
          status: "invalid_data",
          fieldErrors: { otp: ["Invalid or expired OTP"] },
          email
        };
      }

      // Check if user has 2FA enabled - if so, redirect to 2FA verification
      if (user[0].twoFactorEnabled) {
        return { 
          status: "requires_2fa",
          email
        };
      }

      // OTP verified and no 2FA - send reset link
      try {
        const resetToken = nanoid(32);
        await savePasswordResetToken(email, resetToken);

        const resetUrl = `${process.env.PUBLIC_BASE_URL}/forgotpassword/${resetToken}`;
        await sendResetEmail(email, resetUrl);

        console.log(`🎉 Successfully completed OTP verification and reset email for ${email}`);
        return { 
          status: "otp_verified",
          email
        };
      } catch (resetError) {
        console.error("Error sending reset email:", resetError);
        // If reset email sending fails, provide specific error
        if (resetError instanceof Error) {
          if (resetError.message.includes("Email sending failed") || 
              resetError.message.includes("Failed to authenticate") ||
              resetError.message.includes("Unable to connect") ||
              resetError.message.includes("timeout")) {
            return { 
              status: "failed",
              fieldErrors: { 
                email: ["Failed to send password reset link. Please try again in a moment."] 
              }
            };
          }
        }
        throw resetError;
      }
    }

    // Initial submission - validate email, then send OTP
    try {
      forgotPasswordSchema.parse({ 
        email, 
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

    // Check if user has 2FA enabled - if so, redirect to 2FA verification
    if (user[0].twoFactorEnabled) {
      return { 
        status: "requires_2fa",
        email
      };
    }

    // Send OTP for verification
    try {
      const otpCode = generateOTP();
      await saveOTP(email, otpCode);
      await sendOTPEmail(email, otpCode);

      return { 
        status: "otp_sent",
        email
      };
    } catch (otpError) {
      console.error("Error sending OTP:", otpError);
      // If email sending fails, clean up the saved OTP
      try {
        await deleteOTP(email);
      } catch (cleanupError) {
        console.error("Error cleaning up OTP:", cleanupError);
      }
      throw otpError;
    }
  } catch (err) {
    console.error("Error while running forgotPassword action:", err);
    
    // Provide more specific error information
    if (err instanceof Error) {
      if (err.message.includes("OTP email sending failed") || err.message.includes("Email sending failed")) {
        return { 
          status: "failed",
          fieldErrors: { 
            email: ["Failed to send verification code. Please try again in a moment."] 
          }
        };
      }
    }
    
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
    passwordConfirm?: string[];
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
      passwordConfirm: formData.get("passwordConfirm") as string,
    };

    // Validate the input using Zod
    const validated = resetPasswordSchema.safeParse(form);

    if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      return {
        status: "invalid_data",
        fieldErrors: {
          password: fieldErrors.password || [],
          passwordConfirm: fieldErrors.passwordConfirm || [],
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
