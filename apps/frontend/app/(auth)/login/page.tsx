// @ts-nocheck
"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { signIn, getSession } from "next-auth/react";
import { motion } from "@/lib/framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { Wallet } from "lucide-react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { LogoGoogle } from "@/components/icons";
import { WalletLoginButton } from "@/components/wallet-login-button";
import { ActionResultOverlay } from "@/components/action-result-overlay";
import { Button } from "@/components/ui/button";
import { login, type LoginActionState } from "../actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OTPInput } from "@/components/ui/otp-input";
import { toast } from "sonner";

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
  const turnstileRef = useRef<TurnstileInstance>(null); // Ref for the Turnstile component
  const [overlayState, setOverlayState] = useState<OverlayState>({
    status: "idle",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginState, setLoginState] = useState<LoginActionState>({ status: "idle" });

  // 2FA modal state
  const [isTwoFAModalOpen, setIsTwoFAModalOpen] = useState(false);
  const [twoFAEmail, setTwoFAEmail] = useState("");
  const [twoFATempToken, setTwoFATempToken] = useState("");
  const [twoFAToken, setTwoFAToken] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  // Track login method in progress to disable other buttons
  const [walletLoginInProgress, setWalletLoginInProgress] = useState(false);
  const [googleLoginInProgress, setGoogleLoginInProgress] = useState(false);



  // Handle Google OAuth with Turnstile verification
  const handleGoogleSignIn = () => {
    if (!turnstileToken) {
      toast.error("Please wait for security verification");
      return;
    }
    setGoogleLoginInProgress(true);
    signIn("google", { callbackUrl: "/" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    formData.set("cf-turnstile-response", turnstileToken);

    const result = await login(loginState, formData);
    setLoginState(result);
    setIsLoading(false);

    if (result.status === "failed") {
      setOverlayState({ status: "error", title: "Login Failed", message: "Invalid credentials!" });
    } else if (result.status === "success") {
      setOverlayState({ status: "success", title: "Login Successful", message: "You will be redirected shortly." });
      // Force session refresh to ensure user data is updated
      await getSession();
      setTimeout(() => {
        router.push("/");
      }, 500);
    } else if (result.status === "requires_2fa") {
      // Open 2FA modal instead of redirecting to a separate page
      setTwoFAEmail(result.email!);
      setTwoFATempToken(result.tempToken!);
      setTwoFAToken("");
      setUseBackupCode(false);
      setIsTwoFAModalOpen(true);
    }
  };

  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const closeOverlay = () => {
    setOverlayState({ status: "idle", message: "" });
    // Reset the Turnstile widget when the user clicks "Try Again"
    turnstileRef.current?.reset();
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const handleTwoFAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFAToken.trim()) {
      toast.error("Please enter your 2FA token");
      return;
    }
    setIsVerifying2FA(true);
    try {
      const response = await fetch("/api/2fa/complete-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken: twoFATempToken, twoFactorToken: twoFAToken.trim() }),
      });
      const data = await response.json();
      if (response.ok) {
        // Store the session token temporarily
        localStorage.setItem("sessionToken", data.sessionToken);
        const result = await signIn("credentials", {
          email: data.user.email,
          password: "",
          sessionToken: data.sessionToken,
          redirect: false,
        });
        if (result?.ok) {
          localStorage.removeItem("sessionToken");
          await getSession();
          toast.success("Login successful!");
          setIsTwoFAModalOpen(false);
          router.push("/");
        } else {
          toast.error("Session creation failed. Please try again.");
        }
      } else {
        toast.error(data.error || "Invalid 2FA token");
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
          key="login-form"
          variants={formVariants}
          initial="initial"
          animate="animate"
          className="w-full max-w-[360px] md:max-w-[440px]" // Responsive width: Compact on mobile, wider on tablet/desktop
        >
          {/* Glass card with marble header */}
          <div className="bg-zinc-900/90 backdrop-blur-xl overflow-hidden border border-zinc-800/50 shadow-2xl rounded-2xl">
            {/* Marble header image - Compact height, no overlay text */}
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
              {/* Gradient fade to blend into card body */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-transparent to-transparent" />
            </div>

            {/* Card content - Reduced padding and spacing */}
            <div className="p-5 px-6 space-y-4">

              {/* Login form */}
              <form onSubmit={handleSubmit}>
                <AuthForm
                  defaultEmail={email}
                  onTurnstileSuccess={handleTurnstileSuccess}
                  turnstileToken={turnstileToken}
                  turnstileRef={turnstileRef}
                  onValidationChange={handleValidationChange}
                  compact={true} // Enable compact mode
                >
                  <SubmitButton
                    isSuccessful={false}
                    className="w-full h-10 bg-white hover:bg-zinc-200 text-black font-medium transition-colors mt-1 text-sm rounded-md"
                    disabled={!isFormValid}
                  >
                    Get Started
                  </SubmitButton>
                </AuthForm>
              </form>

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

              {/* Social login buttons - Side by side icons at bottom */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={!turnstileToken || walletLoginInProgress || googleLoginInProgress}
                  className="w-full inline-flex h-10 items-center justify-center border border-zinc-800 bg-zinc-900/50 text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                >
                  <LogoGoogle className="h-5 w-5" />
                </button>
                <WalletLoginButton
                  turnstileToken={turnstileToken}
                  disabled={googleLoginInProgress}
                  onLoadingChange={setWalletLoginInProgress}
                  className="w-full inline-flex h-10 items-center justify-center border border-zinc-800 bg-zinc-900/50 text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                >
                  <Wallet className="h-5 w-5 text-white" />
                </WalletLoginButton>
              </div>

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
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-zinc-400 hover:text-white transition-colors"
                  >
                    Sign Up
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
              {isVerifying2FA ? "Verifying..." : "Verify & Sign In"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}