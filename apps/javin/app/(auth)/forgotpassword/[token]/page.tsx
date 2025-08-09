"use client";

import { useActionState, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
            <div className="hidden bg-muted lg:flex lg:flex-col lg:items-center lg:justify-center p-8 text-center">
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
                  <h1 className="text-3xl font-bold">Reset Your Password</h1>
                  <p className="text-muted-foreground mt-2 max-w-sm">
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
                    className="mx-auto w-full max-w-md space-y-6"
                >
                    <div className="space-y-2 text-center">
                       <img
                        alt="Brand Banner"
                        src="/images/javin/banner/sirath-banner.svg"
                        className="w-32 h-auto mx-auto lg:hidden" 
                      />
                      <h1 className="text-3xl font-bold">Set New Password</h1>
                      <p className="text-muted-foreground">
                        Enter and confirm your new password below.
                      </p>
                    </div>
                    
                    <AuthForm
                      action={handleSubmit}
                      emailNeeded={false}
                      forgotPasswordNeeded={false}
                      passwordNeeded={true}
                      fieldErrors={state.fieldErrors}
                    >
                      <SubmitButton isSuccessful={isSuccessful} className="w-full">Reset Password</SubmitButton>
                    </AuthForm>

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