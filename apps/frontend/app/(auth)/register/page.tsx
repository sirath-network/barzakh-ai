// @ts-nocheck
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';

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
  const [isFormValid, setIsFormValid] = useState(false);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<number>(0);
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const spline = useRef<Application | null>(null);
  const [splineVisible, setSplineVisible] = useState(false);
  const [mouseHasMoved, setMouseHasMoved] = useState(false);

  const [isPending, startTransition] = useTransition();

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

  const [state, formAction] = useActionState<RegisterActionState, FormData>(
    register,
    { status: "idle" },
  );

  useEffect(() => {
    console.log('State changed:', state);
    
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
      toast.success("Account created successfully! Redirecting...");
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
      console.log('Registration already successful, ignoring submission');
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

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
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
            src="/images/barzakh/banner/sirath-banner.png"
            className="w-48 h-auto mb-4 mx-auto"
            />
            <h1 className="text-3xl font-bold text-white">All Features. One Platform!</h1>
            <p className="text-gray-200 mt-2 max-w-sm">
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
                          src="/images/barzakh/banner/sirath-banner.png"
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
                        {showOTPField && (
                            <p className="text-sm text-muted-foreground">
                                We&apos;ve sent a code to your email
                            </p>
                        )}
                        {showOTPField && (
                          <div className="text-center mt-2">
                            <button
                              type="button"
                              onClick={handleResendOTP}
                              disabled={isPending}
                              className="text-sm text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-300 underline disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isPending ? "Sending..." : "Didn't receive the code? Resend"}
                            </button>
                          </div>
                        )}
                    </div>

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
                        >
                            <SubmitButton 
                              isSuccessful={isSuccessful} 
                              className="w-full"
                              disabled={!isFormValid || isPending}
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