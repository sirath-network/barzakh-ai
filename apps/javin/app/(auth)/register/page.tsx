"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { register, type RegisterActionState } from "../actions";
import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [showOTPField, setShowOTPField] = useState(false);
  const [formData, setFormData] = useState<{ email: string; password: string } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);

  const [isPending, startTransition] = useTransition();

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" },
  );

  useEffect(() => {
    console.log('State changed:', state);
    
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
    } else if (state.status === "otp_verified") {
      setIsSuccessful(true);
      toast.success("Account created successfully! Redirecting...");
      setTimeout(() => router.push("/login"), 2000);
    }

    // Update email from state if available
    if (state.email && state.email !== email) {
      setEmail(state.email);
    }
  }, [state, router, email]);

  const handleFormAction = (currentFormData: FormData) => {
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

    console.log('Form submission with data:', {
      email: currentFormData.get("email"),
      hasPassword: !!currentFormData.get("password"),
      hasOtp: !!currentFormData.get("otp"),
      hasTurnstile: !!currentFormData.get("cf-turnstile-response"),
      showOTPField
    });

    // Validate Turnstile token
    if (!currentFormData.get("cf-turnstile-response")) {
      toast.error("Please complete the security check");
      return;
    }

    return formAction(currentFormData);
  };

  const handleResendOTP = () => {
    startTransition(() => {
      if (formData?.email && formData?.password && turnstileToken) {
        console.log('Resending OTP for:', formData.email);
        
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

  const formVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.4 } },
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
       {/* Left side - Brand banner */}
       <div className="relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center p-8 text-center overflow-hidden">
          {/* 1. Video Background (lapisan paling belakang) */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover -z-10"
          >
            <source src="/video/background.mp4" type="video/mp4" />
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
            <h1 className="text-3xl font-bold">All Features. One Platform!</h1>
            <p className="text-muted-foreground mt-2 max-w-sm">
                Unlock the future of blockchain insights with our intelligent AI search.
            </p>
         </motion.div>
      </div>

       {/* Right side - Form */}
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

                    <form action={handleFormAction}>
                        <AuthForm
                            defaultEmail={email}
                            fieldErrors={state.fieldErrors}
                            emailNeeded={!showOTPField}
                            passwordNeeded={!showOTPField}
                            showOTPField={showOTPField}
                            onResendOTP={showOTPField ? handleResendOTP : undefined}
                            onTurnstileSuccess={handleTurnstileSuccess}
                            turnstileToken={turnstileToken}
                            turnstileRef={turnstileRef}
                            formRef={formRef}
                        >
                            <SubmitButton 
                              isSuccessful={isSuccessful} 
                              className="w-full"
                              disabled={isPending}
                            >
                                {isPending 
                                  ? (showOTPField ? "Verifying..." : "Sending Code...") 
                                  : (showOTPField ? "Verify & Create Account" : "Sign Up")
                                }
                            </SubmitButton>
                        </AuthForm>
                    </form>
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