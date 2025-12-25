// @ts-nocheck
"use client";

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "@/lib/framer-motion";
import { LazySpline } from "@/components/lazy-spline";
import {
  verifyAndResetPassword,
  VerifyAndResetPasswordActionState,
} from "../../actions";
import { toast } from "sonner";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { ActionResultOverlay } from "@/components/action-result-overlay";
import { Button } from "@/components/ui/button";

type OverlayState = {
  status: "success" | "error" | "idle";
  title?: string;
  message: string;
};

export default function ResetPassword() {
  const { token } = useParams();
  const router = useRouter();

  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [overlayState, setOverlayState] = useState<OverlayState>({
    status: "idle",
    message: "",
  });

  const [state, formAction] = useActionState<
    VerifyAndResetPasswordActionState,
    FormData
  >(verifyAndResetPassword, {
    status: "idle",
  });

  const handleSubmit = (formData: FormData) => {
    if (typeof token !== "string") {
      setOverlayState({ status: "error", title: "Invalid Token", message: "The provided token is invalid." });
      return;
    }
    formData.set("token", token);
    formAction(formData);
  };

  useEffect(() => {
    if (state.status === "failed") {
      setOverlayState({ status: "error", title: "Reset Failed", message: "Something went wrong! Please try again." });
    } else if (state.status === "expired_token") {
      setOverlayState({ status: "error", title: "Expired Token", message: "Your token has expired. Please request a new reset link." });
    } else if (state.status == "redirect_to_forgot_password") {
      setOverlayState({ status: "error", title: "Invalid Token", message: "The token is incorrect. Redirecting you to request a new one." });
      setTimeout(() => router.push("/forgotpassword"), 2500);
    } else if (state.status === "success") {
      setIsSuccessful(true);
      setOverlayState({ status: "success", title: "Success!", message: "Your password has been reset successfully. Redirecting to login." });
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    }
  }, [state.status, router]);

  const closeOverlay = () => {
    setOverlayState({ status: "idle", message: "" });
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
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
          {/* 1. Spline 3D Background - Lazy loaded for better performance */}
          <LazySpline
            scene="https://prod.spline.design/b-w9Ye7DE6uTcEKD/scene.splinecode"
            className="absolute inset-0"
          />

          {/* 2. LAPISAN GRADIENT BLUR (BARU) */}
          {/* Gradien Atas - pointer events none so cursor can interact with Spline below */}
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black/50 to-transparent pointer-events-none z-[1]" />
          {/* Gradien Bawah */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-[1]" />

          {/* 3. Konten Teks (lapisan paling depan) */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-[10] pointer-events-none"
          >
            <img
              alt="Brand Banner"
              src="/images/barzakh/banner/sirath-banner.png"
              className="w-48 h-auto mb-4 mx-auto"
            />
            <h1 className="text-3xl font-bold text-white">Reset Your Password</h1>
            <p className="text-gray-200 mt-2 max-w-sm">
              Create a new, strong password to secure your account.
            </p>
          </motion.div>
        </div>

        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 h-screen lg:h-auto">
          <motion.div
            key="reset-password-form"
            variants={formVariants}
            initial="initial"
            animate="animate"
            className="mx-auto w-full max-w-md space-y-8"
          >
            <div className="space-y-4 text-center">
              <img
                alt="Brand Banner"
                src="/images/barzakh/banner/sirath-banner.png"
                className="w-32 h-auto mx-auto lg:hidden"
              />
              <h1 className="text-3xl font-bold">Set New Password</h1>
              <p className="text-muted-foreground">
                Enter and confirm your new password below.
              </p>
            </div>

            <form action={handleSubmit}>
              <AuthForm
                emailNeeded={false}
                forgotPasswordNeeded={false}
                passwordNeeded={true}
                passwordConfirmNeeded={true}
                fieldErrors={state.fieldErrors}
                onValidationChange={handleValidationChange}
              >
                <SubmitButton
                  isSuccessful={isSuccessful}
                  className="w-full"
                  disabled={!isFormValid}
                >
                  Reset Password
                </SubmitButton>
              </AuthForm>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                &larr; Back to Login
              </Link>
            </p>

          </motion.div>
        </div>
      </div>
    </>
  );
}