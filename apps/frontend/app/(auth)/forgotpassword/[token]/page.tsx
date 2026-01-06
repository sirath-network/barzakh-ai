// @ts-nocheck
"use client";

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "@/lib/framer-motion";
import {
  verifyAndResetPassword,
  VerifyAndResetPasswordActionState,
} from "../../actions";
import { toast } from "sonner";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import Image from "next/image";
import { ActionResultOverlay } from "@/components/action-result-overlay";
import { Button } from "@/components/ui/button";
import { SmoothVideoBackground } from "@/components/smooth-video-background";

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

  // Password visibility state for marble banner
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const handlePasswordVisibilityChange = (isVisible: boolean) => {
    setIsPasswordVisible(isVisible);
  };

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
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
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
          key="reset-password-form"
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
                src={isPasswordVisible ? "/images/barzakh/banner/marble.png" : "/images/barzakh/banner/marble-origin.png"}
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
                <h1 className="text-xl font-bold text-white">Set Password</h1>
                <p className="text-zinc-500 text-xs">
                  Create a new password.
                </p>
              </div>

              {/* Reset password form */}
              <form action={handleSubmit}>
                <AuthForm
                  emailNeeded={false}
                  forgotPasswordNeeded={false}
                  passwordNeeded={true}
                  passwordConfirmNeeded={true}
                  fieldErrors={state.fieldErrors}
                  onPasswordVisibilityChange={handlePasswordVisibilityChange}
                  onValidationChange={handleValidationChange}
                  compact={true}
                >
                  <SubmitButton
                    isSuccessful={isSuccessful}
                    className="w-full h-10 bg-white hover:bg-zinc-200 text-black font-medium transition-colors mt-1 text-sm rounded-md"
                    disabled={!isFormValid}
                  >
                    Reset Password
                  </SubmitButton>
                </AuthForm>
              </form>

              {/* Footer links */}
              <div className="text-center text-[10px] text-zinc-600">
                <p>
                  <Link href="/login" className="hover:text-white transition-colors">
                    ← Back to Login
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}