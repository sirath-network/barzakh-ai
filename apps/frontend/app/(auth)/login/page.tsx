// @ts-nocheck
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { signIn, getSession } from "next-auth/react";
import { motion } from "@/lib/framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { LazySpline } from "@/components/lazy-spline";

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
      toast.error("Please complete the security verification first");
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
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
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

      <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
        {/* --- CHANGES START HERE --- */}
        <div className="relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center p-8 text-center overflow-hidden">
          {/* 1. Spline 3D Background - Lazy loaded for better performance */}
          <LazySpline
            scene="https://prod.spline.design/b-w9Ye7DE6uTcEKD/scene.splinecode"
            className="absolute inset-0"
          />

          {/* 2. GRADIENT BLUR LAYER (NEW) */}
          {/* Top Gradient - pointer events none so cursor can interact with Spline below */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-[1]" />
          {/* Bottom Gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-[1]" />

          {/* 3. Text Content (frontmost layer) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-[10] pointer-events-none" // Ensure content is above video and gradient, don't block Spline interactions
          >
            <img
              alt="Brand Banner"
              src="/images/barzakh/banner/sirath-banner.png"
              className="w-48 h-auto mb-4 mx-auto"
            />
            <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
            <p className="text-gray-200 mt-2 max-w-sm">
              Intelligent, focused AI search powering crypto and blockchain insights.
            </p>
          </motion.div>
        </div>
        {/* --- CHANGES END HERE --- */}

        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 h-screen lg:h-auto">
          <motion.div
            key="login-form"
            variants={formVariants}
            initial="initial"
            animate="animate"
            className="mx-auto w-full max-w-md space-y-6"
          >
            <div className="space-y-2 text-center">
              <img
                alt="Brand Banner"
                src="/images/barzakh/banner/sirath-banner.png"
                className="w-32 h-auto mx-auto lg:hidden"
              />
              <h1 className="text-3xl font-bold">Sign In</h1>
              <p className="text-muted-foreground">
                Enter your credentials to access your account.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={!turnstileToken || walletLoginInProgress || googleLoginInProgress}
                className="w-full inline-flex h-10 items-center justify-center rounded-md border bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogoGoogle className="mr-2 h-4 w-4" />
                {googleLoginInProgress ? "Redirecting..." : "Continue with Google"}
              </button>
              <WalletLoginButton
                turnstileToken={turnstileToken}
                disabled={googleLoginInProgress}
                onLoadingChange={setWalletLoginInProgress}
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
              <form onSubmit={handleSubmit}>
                <AuthForm
                  defaultEmail={email}
                  onTurnstileSuccess={handleTurnstileSuccess}
                  turnstileToken={turnstileToken}
                  turnstileRef={turnstileRef}
                  onValidationChange={handleValidationChange}
                >
                  <SubmitButton
                    isSuccessful={false}
                    className="w-full"
                    disabled={!isFormValid}
                  >
                    Sign In
                  </SubmitButton>
                </AuthForm>
              </form>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-semibold underline underline-offset-4 hover:text-primary"
              >
                Sign Up
              </Link>
            </p>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/" className="underline underline-offset-4 hover:text-primary">
                &larr; Back to Home
              </Link>
            </p>

          </motion.div>
        </div>
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
        <DialogContent className="w-[92vw] max-w-md sm:max-w-lg p-4 sm:p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Two-Factor Authentication</DialogTitle>
            <DialogDescription className="text-center">
              {useBackupCode ? "Enter your 8-character backup code" : "Enter the 6-digit code from your authenticator app"}
              {twoFAEmail ? ` • ${twoFAEmail}` : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTwoFAVerify} data-2fa-form className="space-y-4 sm:space-y-5">
            <OTPInput
              length={useBackupCode ? 8 : 6}
              value={twoFAToken}
              onChange={handleTwoFATokenChange}
              onComplete={handleOTPComplete}
              backupCode={useBackupCode}
              autoFocus
              disabled={isVerifying2FA}
            />
            <div className="flex items-center justify-center sm:justify-between">
              <button
                type="button"
                className="text-sm sm:text-base text-red-600 hover:underline"
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