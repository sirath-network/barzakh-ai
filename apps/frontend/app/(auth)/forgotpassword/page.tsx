// @ts-nocheck
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { motion } from "@/lib/framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { forgotPassword, type ForgotPasswordActionState } from "../actions";
import { ActionResultOverlay } from "@/components/action-result-overlay";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OTPInput } from "@/components/ui/otp-input";

type OverlayState = {
  status: "success" | "error" | "idle";
  title?: string;
  message: string;
};

import { SmoothVideoBackground } from "@/components/smooth-video-background";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [showOTPField, setShowOTPField] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);

  // 2FA modal state
  const [isTwoFAModalOpen, setIsTwoFAModalOpen] = useState(false);
  const [twoFAEmail, setTwoFAEmail] = useState("");
  const [twoFAToken, setTwoFAToken] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const [overlayState, setOverlayState] = useState<OverlayState>({
    status: "idle",
    message: "",
  });

  const [state, formAction] = useActionState<
    ForgotPasswordActionState,
    FormData
  >(forgotPassword, {
    status: "idle",
  });

  useEffect(() => {

    // Reset submitting state for any final status
    if (state.status !== "idle" && state.status !== "in_progress") {
      setIsSubmitting(false);
    }

    if (state.status === "failed") {
      turnstileRef.current?.reset();
      setTurnstileToken(""); // Clear the token on failure
      // Check if there are specific field errors for better user feedback
      const errorMessage = state.fieldErrors?.email?.[0] || "Something went wrong! Please try again.";
      setOverlayState({ status: "error", title: "Request Failed", message: errorMessage });
    } else if (state.status === "invalid_data") {
      turnstileRef.current?.reset();
      setTurnstileToken(""); // Clear the token on failure
      setOverlayState({ status: "error", title: "Invalid Data", message: "Failed validating your submission." });
    } else if (state.status === "invalid_email") {
      turnstileRef.current?.reset();
      setTurnstileToken(""); // Clear the token on failure
      setOverlayState({ status: "error", title: "User Not Found", message: "The email or username you entered was not found." });
    } else if (state.status === "otp_sent") {
      setShowOTPField(true);
      setEmail(state.email || "");
      // Reset Turnstile after successful OTP sending to ensure fresh token for next submission
      turnstileRef.current?.reset();
      setTurnstileToken("");
    } else if (state.status === "otp_verified") {
      setIsSuccessful(true);
      setOverlayState({ status: "success", title: "Link Sent", message: "A password reset link has been sent to your email." });
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } else if (state.status === "requires_2fa") {
      // Open 2FA modal instead of redirecting
      setTwoFAEmail(state.email || "");
      setTwoFAToken("");
      setUseBackupCode(false);
      setHasAutoSubmitted(false);
      setIsTwoFAModalOpen(true);
    }
  }, [state.status, router, state.email, state.fieldErrors]);

  const handleSubmit = (formData: FormData) => {
    if (isSubmitting) {
      return;
    }

    // Check if Turnstile token is available before proceeding
    if (!turnstileToken || turnstileToken.trim() === "") {
      setOverlayState({
        status: "error",
        title: "Verification Required",
        message: "Please wait for security verification to complete."
      });
      return;
    }

    setIsSubmitting(true);
    setEmail(formData.get("email") as string);
    formData.set("cf-turnstile-response", turnstileToken);
    formAction(formData);
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const handleResendOTP = async () => {
    if (!email || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setOverlayState({
          status: "success",
          title: "Code Resent",
          message: "A new verification code has been sent to your email."
        });

        // Auto-close the success overlay after 2 seconds
        setTimeout(() => {
          setOverlayState({ status: "idle", message: "" });
        }, 2000);
      } else {
        setOverlayState({
          status: "error",
          title: "Resend Failed",
          message: data.message || "Failed to resend verification code. Please try again."
        });
      }
    } catch (error) {
      setOverlayState({
        status: "error",
        title: "Resend Failed",
        message: "Failed to resend verification code. Please try again."
      });
    } finally {
      setIsResending(false);
    }
  };

  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const closeOverlay = () => {
    setOverlayState({ status: "idle", message: "" });
    // Reset Turnstile when closing error overlay to ensure fresh token on retry
    if (overlayState.status === "error") {
      turnstileRef.current?.reset();
      setTurnstileToken("");
    }
  };

  const handleTwoFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFAToken.trim()) {
      toast.error("Please enter your 2FA token");
      return;
    }
    setIsVerifying2FA(true);
    try {
      const response = await fetch("/api/2fa/forgot-password-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: twoFAEmail,
          twoFactorToken: twoFAToken.trim()
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsTwoFAModalOpen(false);
        setIsSuccessful(true);
        setOverlayState({
          status: "success",
          title: "Link Sent",
          message: "A password reset link has been sent to your email."
        });
        setTimeout(() => {
          router.push("/login");
        }, 2500);
      } else {
        toast.error(data.message || "Invalid 2FA token");
      }
    } catch (err) {
      console.error("2FA verification error:", err);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleTwoFATokenChange = (value: string) => {
    setTwoFAToken(value);
    // Reset auto-submit flag when token is modified
    const expectedLength = useBackupCode ? 8 : 6;
    if (value.length < expectedLength) {
      setHasAutoSubmitted(false);
    }
  };

  const handleOTPComplete = () => {
    // Auto-submit when OTP is complete (only once per complete entry)
    if (!isVerifying2FA && twoFAToken.trim() && !hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      // Small delay to ensure the last character is properly set
      setTimeout(() => {
        if (!isVerifying2FA) { // Double-check it hasn't started
          const form = document.querySelector('form[data-2fa-form]');
          if (form) {
            (form as HTMLFormElement).requestSubmit();
          }
        }
      }, 150);
    }
  };

  return (
    <>
      <ActionResultOverlay
        status={overlayState.status}
        title={overlayState.title}
        message={overlayState.message}
      >
        {overlayState.status === 'error' && (
          <Button onClick={closeOverlay} className="w-full h-11" variant="secondary">
            Try Again
          </Button>
        )}
      </ActionResultOverlay>

      {/* Full-screen video background */}
      <div className="fixed inset-0 -z-10 overflow-hidden bg-black">
        <SmoothVideoBackground
          src="/images/barzakh/banner/abs.webm"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-110"
        />
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Centered card layout */}
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          key="forgot-password-form"
          variants={formVariants}
          initial="initial"
          animate="animate"
          className="w-full max-w-[360px] md:max-w-[440px]"
        >
          {/* Glass card with marble header */}
          <div className="bg-zinc-900/90 backdrop-blur-xl overflow-hidden border border-zinc-800/50 shadow-2xl rounded-2xl">
            {/* Marble header image */}
            <div className="relative h-40 overflow-hidden">
              <Image
                src="/images/barzakh/banner/marble.png"
                alt="Decorative marble"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 440px"
                className="object-cover"
                style={{ objectPosition: "50% 35%" }}
              />
              {/* Gradient fade */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-transparent" />
            </div>

            {/* Card content */}
            <div className="p-5 px-6 space-y-4">
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold text-white">
                  {showOTPField ? "Verify" : "Password Reset"}
                </h1>
                <p className="text-zinc-500 text-xs">
                  {showOTPField
                    ? `Enter code sent to ${email}`
                    : "Enter your email or username to receive a code."
                  }
                </p>
                {showOTPField && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isResending}
                      className="text-xs text-zinc-500 hover:text-white transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending ? "Sending..." : "Didn't receive the code? Resend"}
                    </button>
                  </div>
                )}
              </div>

              {/* Forgot password form */}
              <form action={handleSubmit}>
                <AuthForm
                  defaultEmail={email}
                  passwordNeeded={false}
                  emailNeeded={!showOTPField}
                  showOTPField={showOTPField}
                  emailLabel="Email or Username"
                  fieldErrors={state.fieldErrors}
                  onTurnstileSuccess={handleTurnstileSuccess}
                  turnstileToken={turnstileToken}
                  turnstileRef={turnstileRef}
                  onValidationChange={handleValidationChange}
                  compact={true}
                  forgotPasswordNeeded={false}
                >
                  <SubmitButton
                    isSuccessful={isSuccessful}
                    className="w-full h-10 bg-white hover:bg-zinc-200 text-black font-medium transition-colors mt-1 text-sm rounded-md"
                    disabled={!isFormValid || isSubmitting}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : showOTPField
                        ? "Verify & Send Link"
                        : "Send Code"
                    }
                  </SubmitButton>
                </AuthForm>
              </form>

              {/* Footer links */}
              <div className="text-center text-[10px] text-zinc-600">
                <p>
                  Remembered your password?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                </p>
                <p className="mt-2">
                  <Link href="/login" className="hover:text-white transition-colors">
                    ← Back to Login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* 2FA Verification Modal */}
      <Dialog
        open={isTwoFAModalOpen}
        onOpenChange={(open) => {
          setIsTwoFAModalOpen(open);
          // Reset Turnstile widget when modal is closed so user can get a fresh token
          if (!open) {
            turnstileRef.current?.reset();
            setTurnstileToken("");
            setTwoFAToken("");
            setUseBackupCode(false);
            setHasAutoSubmitted(false);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[400px] p-5 rounded-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-bold text-center">Two-Factor Authentication</DialogTitle>
            <DialogDescription className="text-center">
              {useBackupCode ? "Enter your 8-character backup code" : "Enter the 6-digit code from your authenticator app"}
              {twoFAEmail ? ` • ${twoFAEmail}` : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTwoFAVerify} data-2fa-form className="space-y-4">
            <OTPInput
              length={useBackupCode ? 8 : 6}
              value={twoFAToken}
              onChange={handleTwoFATokenChange}
              onComplete={handleOTPComplete}
              backupCode={useBackupCode}
              autoFocus
              disabled={isVerifying2FA}
            />
            <div className="flex items-center justify-center">
              <button
                type="button"
                className="text-sm sm:text-base text-zinc-500 hover:text-white transition-colors"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setTwoFAToken("");
                  setHasAutoSubmitted(false);
                }}
              >
                {useBackupCode ? "Use TOTP code" : "Use backup code"}
              </button>
            </div>
            <Button type="submit" className="w-full h-11 sm:h-12 text-base" disabled={isVerifying2FA || !twoFAToken.trim()}>
              {isVerifying2FA ? "Verifying..." : "Verify & Send Reset Link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}