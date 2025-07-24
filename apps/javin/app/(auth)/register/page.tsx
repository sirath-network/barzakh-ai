"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";

import { register, type RegisterActionState } from "../actions";
import { useTheme } from "next-themes";

export default function Page() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showOTPField, setShowOTPField] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    {
      status: "idle",
    }
  );

  // Fix hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (state.status === "user_exists") {
      toast.error("Account already exists");
    } else if (state.status === "failed") {
      toast.error("Failed to create account");
    } else if (state.status === "invalid_data") {
      toast.error("Failed validating your submission!");
    } else if (state.status === "too_small") {
      toast.error("Password should be at least 6 characters long.");
    } else if (state.status === "otp_sent") {
      setShowOTPField(true);
      toast.success("OTP sent to your email");
    } else if (state.status === "otp_verified") {
      toast.success("Account created successfully");
      setIsSuccessful(true);
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  }, [state, router]);

  const [formData, setFormData] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const handleSubmit = (formData: FormData) => {
    const emailValue = formData.get("email") as string;
    const passwordValue = formData.get("password") as string;
    const otpValue = formData.get("otp") as string | null;

    setEmail(emailValue);
    
    // Store email and password when first submitting
    if (!showOTPField && !otpValue) {
      setFormData({ email: emailValue, password: passwordValue });
    }

    // Create a new FormData with all required fields
    const submitData = new FormData();
    submitData.append("email", emailValue);
    
    if (passwordValue) {
      submitData.append("password", passwordValue);
    } else if (formData?.password) {
      // Use stored password if not in current form data
      submitData.append("password", formData.password);
    }
    
    if (otpValue) {
      submitData.append("otp", otpValue);
    }
    
    formAction(submitData);
  };

  const handleResendOTP = async () => {
    try {
      const response = await fetch('/api/resend-otp', {  
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (response.ok) {
        toast.success("New OTP sent to your email");
      } else {
        const errorData = await response.json();
        console.error('OTP resend error:', errorData);
        toast.error("Failed to resend OTP");
      }
    } catch (error) {
      console.error("Error resending OTP:", error);
      toast.error("Failed to resend OTP");
    }
  };

  return (
    <div className="flex flex-col h-dvh w-screen pt-12 md:pt-0 items-center justify-center bg-background">
      <div className="rounded-xl p-6 flex flex-col items-center gap-2 leading-relaxed text-center max-w-2xl">
        {/* Fix hydration mismatch by showing a fallback until mounted */}
        {!mounted ? (
          <img
            alt="Barzakh Agents"
            src="/images/javin/banner/sirath-banner.svg"
            className="w-32 sm:w-48 h-auto"
          />
        ) : (
          <img
            alt="Barzakh Agents"
            src="/images/javin/banner/sirath-banner.svg"
            className="w-32 sm:w-48 h-auto"
          />
        )}
        <p className="text-lg text-muted-foreground">
          Intelligent, focused AI search powering crypto and blockchain insights.
        </p>
      </div>
      <div className="w-fit overflow-hidden rounded-2xl gap-5 flex flex-col border m-2 p-5">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign Up</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {showOTPField 
              ? "Enter the OTP sent to your email" 
              : "Create an account with your email and password"}
          </p>
        </div>
        <AuthForm
          action={handleSubmit}
          defaultEmail={email}
          fieldErrors={state.fieldErrors}
          emailNeeded={!showOTPField}
          passwordNeeded={!showOTPField}
          showOTPField={showOTPField}
          onResendOTP={showOTPField ? handleResendOTP : undefined}
        >
          <SubmitButton isSuccessful={isSuccessful}>
            {showOTPField ? "Verify OTP" : "Sign Up"}
          </SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Already have an account? "}
            <Link
              href="/login"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign in
            </Link>
            {" instead."}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}