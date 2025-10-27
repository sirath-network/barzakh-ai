"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useRef } from "react";
// import { toast } from "sonner";
import { motion } from "framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';

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
  const [isFormValid, setIsFormValid] = useState(false);
  const [showOTPField, setShowOTPField] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const spline = useRef<Application | null>(null);
  const [splineVisible, setSplineVisible] = useState(false);
  const [mouseHasMoved, setMouseHasMoved] = useState(false);

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

  // Handle mouse movement to enable Spline scene
  useEffect(() => {
    const handleMouseMove = () => {
      setTimeout(() => {
        if (!mouseHasMoved) {
          setMouseHasMoved(true);
        }
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseHasMoved]);

  // Load Spline scene - this makes it interactive  
  const onLoad = (splineApp: Application) => {
    if (splineApp) {
      spline.current = splineApp;
      
      setTimeout(() => {
        try {
          const internalScene = (splineApp as any)._scene;
          
          if (internalScene) {
            internalScene.traverse((object: any) => {
              if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) 
                  ? object.material 
                  : [object.material];
                
                materials.forEach((mat: any) => {
                  if (mat) {
                    if (mat.emissive) {
                      mat.emissive.setHex(0x000000);
                      mat.emissiveIntensity = 0;
                    }
                    if (mat.emissiveMap) {
                      mat.emissiveMap = null;
                      mat.needsUpdate = true;
                    }
                    mat.needsUpdate = true;
                  }
                });
              }
              
              if (object.isPointLight) {
                object.intensity = 0;
                object.visible = false;
              }
              
              if (object.type === 'AmbientLight') {
                object.intensity = 0;
              }
            });
            
            setSplineVisible(true);
          }
        } catch (error) {
          console.log('Could not reset Spline scene:', error);
          setSplineVisible(true);
        }
      }, 800);
    }
  };

  useEffect(() => {
    console.log(`📱 Frontend received status: ${state.status}`, state);
    
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
      setOverlayState({ status: "error", title: "Invalid Email", message: "The email address you entered is not valid." });
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
      // Redirect to 2FA verification page
      router.push(`/verify-2fa?email=${encodeURIComponent(state.email!)}&context=forgot_password`);
    }
  }, [state.status, router, state.email, state.fieldErrors]);

  const handleSubmit = (formData: FormData) => {
    if (isSubmitting) {
      console.log("🚫 Form submission blocked - already submitting");
      return;
    }
    
    // Check if Turnstile token is available before proceeding
    if (!turnstileToken || turnstileToken.trim() === "") {
      console.log("🚫 Form submission blocked - Turnstile token not available");
      setOverlayState({ 
        status: "error", 
        title: "Verification Required", 
        message: "Please complete the security verification before proceeding." 
      });
      return;
    }
    
    setIsSubmitting(true);
    setEmail(formData.get("email") as string);
    formData.set("cf-turnstile-response", turnstileToken);
    
    console.log("📤 Form submission started with valid Turnstile token");
    formAction(formData);
  };

  const handleTurnstileSuccess = (token: string) => {
    setTurnstileToken(token);
    console.log("🔒 Turnstile token received and ready for submission");
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
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  
  const closeOverlay = () => {
    setOverlayState({ status: "idle", message: "" });
    // Reset Turnstile when closing error overlay to ensure fresh token on retry
    if (overlayState.status === "error") {
      turnstileRef.current?.reset();
      setTurnstileToken("");
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
        <div className="relative hidden lg:flex lg:flex-col lg:items-center lg:justify-center p-8 text-center overflow-hidden">
          {/* 1. Spline 3D Background - Must be at base z-index to receive events */}
          <div 
            className="absolute inset-0"
            style={{
              pointerEvents: mouseHasMoved ? 'auto' : 'none'
            }}
          >
            <Spline 
              scene="https://prod.spline.design/b-w9Ye7DE6uTcEKD/scene.splinecode"
              onLoad={onLoad}
              style={{ 
                width: '100%', 
                height: '100%',
                opacity: splineVisible ? 1 : 0,
                transition: 'opacity 0.5s ease-in'
              }}
            />
          </div>
          
          {/* Overlay to block ALL pointer events until mouse moves */}
          {!mouseHasMoved && (
            <div 
              className="absolute inset-0 z-[50] bg-black/0" 
              style={{ 
                pointerEvents: 'auto',
                cursor: 'default'
              }}
            />
          )}

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
                src="/images/barzakh/banner/sirath-banner.svg" 
                className="w-48 h-auto mb-4 mx-auto"
              />
              <h1 className="text-3xl font-bold text-white">Forgot Password?</h1>
              <p className="text-gray-200 mt-2 max-w-sm">
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
              className="mx-auto w-full max-w-md space-y-8"
          >
            <div className="space-y-4 text-center">
               <img
                alt="Brand Banner"
                src="/images/barzakh/banner/sirath-banner.svg"
                className="w-32 h-auto mx-auto lg:hidden" 
              />
              <h1 className="text-3xl font-bold">
                {showOTPField ? "Verify Your Email" : "Reset Password"}
              </h1>
              <p className="text-muted-foreground">
                {showOTPField 
                  ? `Enter the code sent to ${email}`
                  : "Enter your email to receive a verification code."
                }
              </p>
              {showOTPField && (
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={isResending}
                    className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending ? "Sending..." : "Didn't receive the code? Resend"}
                  </button>
                </div>
              )}
            </div>
            
            <form action={handleSubmit}>
              <AuthForm
                defaultEmail={email}
                passwordNeeded={false}
                emailNeeded={!showOTPField}
                showOTPField={showOTPField}
                fieldErrors={state.fieldErrors}
                onTurnstileSuccess={handleTurnstileSuccess}
                turnstileToken={turnstileToken}
                turnstileRef={turnstileRef}
                onValidationChange={handleValidationChange}
              >
                <SubmitButton 
                  isSuccessful={isSuccessful} 
                  className="w-full"
                  disabled={!isFormValid || isSubmitting}
                >
                  {isSubmitting 
                    ? "Processing..." 
                    : showOTPField 
                      ? "Verify & Send Reset Link" 
                      : "Send Verification Code"
                  }
                </SubmitButton>
              </AuthForm>
            </form>
            
            <div className="space-y-3">
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
            </div>

          </motion.div>
        </div>
      </div>
    </>
  );
}