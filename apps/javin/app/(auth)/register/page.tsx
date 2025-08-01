"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { register, type RegisterActionState } from "../actions";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showOTPField, setShowOTPField] = useState(false);
  const [formData, setFormData] = useState<{ email: string; password: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" },
  );

  useEffect(() => {
    if (state.status === "user_exists") toast.error("Account already exists");
    else if (state.status === "failed") toast.error("Failed to create account");
    else if (state.status === "invalid_data") toast.error("Failed validating your submission!");
    else if (state.status === "too_small") toast.error("Password should be at least 6 characters long.");
    else if (state.status === "otp_sent") {
      setShowOTPField(true);
      toast.success("OTP sent to your email");
    } else if (state.status === "otp_verified") {
      setIsSuccessful(true);
      toast.success("Account created! Redirecting...");
      setTimeout(() => router.push("/login"), 2000);
    }
  }, [state, router]);

  const handleSubmit = (currentFormData: FormData) => {
    const emailValue = currentFormData.get("email") as string;
    const passwordValue = currentFormData.get("password") as string;
    const otpValue = currentFormData.get("otp") as string | null;
    
    setEmail(emailValue);

    if (!showOTPField) {
      setFormData({ email: emailValue, password: passwordValue });
    }

    const submitData = new FormData();
    submitData.append("email", emailValue);

    const finalPassword = passwordValue || formData?.password;
    if (finalPassword) {
      submitData.append("password", finalPassword);
    }

    if (otpValue) {
      submitData.append("otp", otpValue);
    }

    formAction(submitData);
  };

  const handleResendOTP = () => {
    startTransition(() => {
      if (formData?.email && formData?.password) {
        const resendData = new FormData();
        resendData.append("email", formData.email);
        resendData.append("password", formData.password);
        formAction(resendData);
      }
    });
  };

  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.4 } },
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
       {/* */}
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
            <h1 className="text-3xl font-bold">All Features. One Platform!</h1>
            <p className="text-muted-foreground mt-2 max-w-sm">
                Unlock the future of blockchain insights with our intelligent AI search.
            </p>
         </motion.div>
      </div>

       {/* */}
       <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 h-screen lg:h-auto">
        <div className="mx-auto w-full max-w-md space-y-6">
            <AnimatePresence mode="wait">
                <motion.div
                    key={showOTPField ? "otp" : "register"}
                    variants={formVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="space-y-6"
                >
                    <div className="space-y-2 text-center">
                        <img
                          alt="Brand Banner"
                          src="/images/javin/banner/sirath-banner.svg"
                          className="w-32 h-auto mx-auto lg:hidden"
                        />
                        <h1 className="text-3xl font-bold">
                            {showOTPField ? "Verify Your Email" : "Create an Account"}
                        </h1>
                        <p className="text-muted-foreground">
                            {showOTPField
                            ? `Enter the code sent to ${email}`
                            : "Get started for free."}
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
                        <SubmitButton isSuccessful={isSuccessful} className="w-full">
                            {showOTPField ? "Verify & Create Account" : "Sign Up"}
                        </SubmitButton>
                    </AuthForm>
                </motion.div>
            </AnimatePresence>

            <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold underline underline-offset-4 hover:text-primary">
                    Sign In
                </Link>
            </p>
        </div>
      </div>
    </div>
  );
}