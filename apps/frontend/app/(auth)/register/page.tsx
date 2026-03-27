// @ts-nocheck
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Wallet } from "lucide-react";

import { register, type RegisterActionState } from "../actions";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { LogoGoogle } from "@/components/icons";
import { WalletLoginButton } from "@/components/wallet-login-button";
import { WalletSelectorModal } from "@/components/wallet-selector-modal";
import { signIn } from "next-auth/react";

import { SmoothVideoBackground } from "@/components/smooth-video-background";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showOTPField, setShowOTPField] = useState(false);
  const [formData, setFormData] = useState<{ email: string; password: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<number>(0);
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [isPending, startTransition] = useTransition();

  // Track login method in progress to disable other buttons
  const [walletLoginInProgress, setWalletLoginInProgress] = useState(false);
  const [googleLoginInProgress, setGoogleLoginInProgress] = useState(false);
  const [isWalletSelectorOpen, setIsWalletSelectorOpen] = useState(false);



  // Handle Google OAuth with Turnstile verification
  const handleGoogleSignIn = () => {
    if (!turnstileToken) {
      toast.error("Please wait for security verification");
      return;
    }
    setGoogleLoginInProgress(true);
    signIn("google", { callbackUrl: "/" });
  };

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" },
  );

  useEffect(() => {
    // Only process if timestamp actually changed to prevent duplicate toasts
    if (state.timestamp && state.timestamp === lastProcessedTimestamp) {
      return;
    }

    if (state.timestamp) {
      setLastProcessedTimestamp(state.timestamp);
    }

    if (state.status === "user_exists") {
      toast.error("Account already exists");
      turnstileRef.current?.reset();
    } else if (state.status === "failed") {
      toast.error("Failed to create account. Please check your connection and try again.");
      turnstileRef.current?.reset();
    } else if (state.status === "invalid_data") {
      // Inline errors are displayed by the AuthForm component, so we only need a generic fallback toast.
      if (!state.fieldErrors || Object.keys(state.fieldErrors).length === 0) {
        toast.error("Please check your input and try again.");
      }
      turnstileRef.current?.reset();
    } else if (state.status === "too_small") {
      toast.error("Password should be at least 8 characters long.");
      turnstileRef.current?.reset();
    } else if (state.status === "otp_sent") {
      setShowOTPField(true);
      toast.success("Verification code sent to your email");
      // Reset turnstile to get a fresh token for the next action (OTP verification or resend)
      turnstileRef.current?.reset();
    } else if (state.status === "otp_verified") {
      setIsSuccessful(true);
      setTimeout(() => router.push("/login"), 2000);
    }

    // Update email from state if available
    if (state.email && state.email !== email) {
      setEmail(state.email);
    }
  }, [state, router, email, lastProcessedTimestamp]);

  const handleFormAction = (currentFormData: FormData) => {
    // Don't submit if already successful
    if (isSuccessful) {
      return;
    }

    // Add the turnstile token if it's not already in the form data
    const existingToken = currentFormData.get("cf-turnstile-response") as string;

    if (!existingToken && turnstileToken) {
      currentFormData.set("cf-turnstile-response", turnstileToken);
    }

    // Ensure we have stored form data for OTP verification
    const emailValue = currentFormData.get("email") as string;
    const passwordValue = currentFormData.get("password") as string;

    if (!showOTPField && emailValue && passwordValue) {
      setFormData({ email: emailValue, password: passwordValue });
    }

    // Add stored data for OTP verification step
    if (showOTPField && formData) {
      if (!currentFormData.get("email")) {
        currentFormData.set("email", formData.email);
      }
      if (!currentFormData.get("password")) {
        currentFormData.set("password", formData.password);
      }
    }

    // Validate Turnstile token
    if (!currentFormData.get("cf-turnstile-response")) {
      toast.error("Please wait for security verification");
      return;
    }

    return formAction(currentFormData);
  };

  const handleResendOTP = () => {
    startTransition(() => {
      if (formData?.email && formData?.password && turnstileToken) {
        const resendData = new FormData();
        resendData.append("email", formData.email);
        resendData.append("password", formData.password);

        // Use the stored turnstile token for resend
        resendData.append("cf-turnstile-response", turnstileToken);

        formAction(resendData);
      } else {
        toast.error("Missing required information for resend. Please refresh and try again.");
      }
    });
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
  };

  return (
    <>
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
        <div className="w-full max-w-[360px] md:max-w-[440px]"> {/* Responsive width */}
          {/* Glass card with marble header */}
          <div className="bg-zinc-900/90 backdrop-blur-xl overflow-hidden border border-zinc-800/50 shadow-2xl rounded-2xl">
            {/* Marble header image */}
            <div className="relative h-40 overflow-hidden"> {/* Reduced height */}
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
              <AnimatePresence mode="wait">
                <motion.div
                  key={showOTPField ? "otp" : "register"}
                  variants={formVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-3"
                >
                  <div className="text-center space-y-1">
                    <h1 className="text-xl font-bold text-white">
                      {showOTPField ? "Verify Email" : "Create Account"}
                    </h1>
                    <p className="text-zinc-500 text-xs">
                      {showOTPField
                        ? `Enter code sent to ${email}`
                        : "Join us today for free."}
                    </p>
                    {showOTPField && (
                      <div className="mt-1">
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={isPending}
                          className="text-xs text-zinc-500 hover:text-white transition-colors underline disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isPending ? "Sending..." : "Resend code"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Register form */}
                  <form action={handleFormAction}>
                    <AuthForm
                      defaultEmail={email}
                      fieldErrors={state.fieldErrors}
                      emailNeeded={!showOTPField}
                      passwordNeeded={!showOTPField}
                      showOTPField={showOTPField}
                      emailLabel="Email"
                      forgotPasswordNeeded={false}
                      onTurnstileSuccess={handleTurnstileSuccess}
                      turnstileToken={turnstileToken}
                      turnstileRef={turnstileRef}
                      onValidationChange={handleValidationChange}
                      compact={true} // Enable compact mode
                    >
                      <SubmitButton
                        isSuccessful={isSuccessful}
                        className="w-full h-10 bg-white hover:bg-zinc-200 text-black font-medium transition-colors mt-1 text-sm rounded-md"
                        disabled={!isFormValid || isPending}
                      >
                        {isPending
                          ? (showOTPField ? "Verifying..." : "Sending...")
                          : (showOTPField ? "Verify" : "Sign Up")
                        }
                      </SubmitButton>
                    </AuthForm>
                  </form>

                  {!showOTPField && (
                    <>
                      {/* Divider */}
                      <div className="relative py-1">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-zinc-800" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-medium">
                          <span className="bg-zinc-900 px-2 text-zinc-500">
                            OR
                          </span>
                        </div>
                      </div>

                      {/* Social login buttons */}
                      <div className="grid grid-cols-2 gap-3 pb-2">
                        <button
                          onClick={handleGoogleSignIn}
                          disabled={!turnstileToken || walletLoginInProgress || googleLoginInProgress}
                          className="w-full inline-flex h-10 items-center justify-center border border-zinc-800 bg-zinc-900/50 text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                          type="button"
                        >
                          <LogoGoogle className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setIsWalletSelectorOpen(true)}
                          disabled={!turnstileToken || walletLoginInProgress || googleLoginInProgress}
                          className="w-full inline-flex h-10 items-center justify-center border border-zinc-800 bg-zinc-900/50 text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                          type="button"
                        >
                          <Wallet className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Footer links */}
              <div className="pt-0 text-center text-[10px] text-zinc-600 leading-tight">
                <p>
                  By continuing you agree to our{" "}
                  <Link href="/terms-of-service" className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" className="text-zinc-500 hover:text-zinc-400 underline underline-offset-2">
                    Privacy Policy
                  </Link>
                </p>
                <p className="mt-2 text-xs">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-zinc-400 hover:text-white transition-colors">
                    Sign In
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Selector Modal */}
      <WalletSelectorModal
        isOpen={isWalletSelectorOpen}
        onClose={() => setIsWalletSelectorOpen(false)}
        turnstileToken={turnstileToken}
        disabled={googleLoginInProgress}
        onLoadingChange={setWalletLoginInProgress}
      />

      {/* Hidden persistent listener for wallet login flow */}
      <div className="hidden">
        <WalletLoginButton
          turnstileToken={turnstileToken}
          onLoadingChange={setWalletLoginInProgress}
        />
      </div>
    </>
  );
}