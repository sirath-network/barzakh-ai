"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useRef } from "react";
// import { toast } from "sonner";
import { motion } from "framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { forgotPassword, type ForgotPasswordActionState } from "../actions";
import { ActionResultOverlay } from "@/components/action-result-overlay";
import { Button } from "@/components/ui/button";

type OverlayState = {
  status: "success" | "error" | "idle";
  title?: string;
  message: string;
};

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<TurnstileInstance>(null);

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
    if (state.status === "failed") {
      turnstileRef.current?.reset();
      setOverlayState({ status: "error", title: "Request Failed", message: "Something went wrong! Please try again." });
    } else if (state.status === "invalid_data") {
      turnstileRef.current?.reset();
      setOverlayState({ status: "error", title: "Invalid Data", message: "Failed validating your submission." });
    } else if (state.status === "invalid_email") {
      turnstileRef.current?.reset();
      setOverlayState({ status: "error", title: "Invalid Email", message: "The email address you entered is not valid." });
    } else if (state.status === "success") {
      setOverlayState({ status: "success", title: "Link Sent", message: "A password reset link has been sent to your email." });
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    }
  }, [state.status, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    if (turnstileToken) {
      formData.set("cf-turnstile-response", turnstileToken);
    }
    formAction(formData);
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
  };

  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  
  const closeOverlay = () => {
    setOverlayState({ status: "idle", message: "" });
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
        <div className="relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center p-8 text-center overflow-hidden">
          {/* 1. Video Background (lapisan paling belakang) */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover -z-10"
          >
            <source src="/video/reset.mp4" type="video/mp4" />
            Browser Anda tidak mendukung tag video.
          </video>

          {/* 2. LAPISAN GRADIENT BLUR (BARU) */}
          {/* Gradien Atas */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/50 to-transparent" />
          {/* Gradien Bawah */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

          {/* 3. Konten Teks (lapisan paling depan) */}
          <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
          >
              <img
                alt="Brand Banner"
                src="/images/javin/banner/sirath-banner.svg" 
                className="w-48 h-auto mb-4 mx-auto"
              />
              <h1 className="text-3xl font-bold">Forgot Password?</h1>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Don&apos;t worry. We&apos;ll send you a link to get back into your account.
              </p>
          </motion.div>
        </div>

        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 h-screen lg:h-auto">
          <motion.div
              key="forgot-password-form"
              variants={formVariants}
              initial="initial"
              animate="animate"
              className="mx-auto w-full max-w-md space-y-6"
          >
            <div className="space-y-2 text-center">
               <img
                alt="Brand Banner"
                src="/images/javin/banner/sirath-banner.svg"
                className="w-32 h-auto mx-auto lg:hidden" 
              />
              <h1 className="text-3xl font-bold">Reset Password</h1>
              <p className="text-muted-foreground">
                Enter your email to receive a reset link.
              </p>
            </div>
            
            <form action={handleSubmit}>
              <AuthForm
                defaultEmail={email}
                passwordNeeded={false}
                emailNeeded={true}
                fieldErrors={state.fieldErrors}
                onTurnstileSuccess={handleTurnstileSuccess}
                turnstileToken={turnstileToken}
                turnstileRef={turnstileRef}
              >
                {/* */}
                <SubmitButton isSuccessful={false} className="w-full">
                    Send Reset Link
                </SubmitButton>
              </AuthForm>
            </form>
            
            <p className="text-center text-sm text-muted-foreground">
              Remembered your password?{" "}
              <Link
                href="/login"
                className="font-semibold underline underline-offset-4 hover:text-primary"
              >
                Sign In
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
    </>
  );
}