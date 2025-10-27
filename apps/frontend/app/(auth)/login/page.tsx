"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { signIn, getSession } from "next-auth/react";
import { motion } from "framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";
import Spline from '@splinetool/react-spline';
import type { Application } from '@splinetool/runtime';

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { LogoGoogle } from "@/components/icons";
import { ActionResultOverlay } from "@/components/action-result-overlay";
import { Button } from "@/components/ui/button";
import { login, type LoginActionState } from "../actions";

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
  const spline = useRef<Application | null>(null); // Ref for the Spline application
  const [splineVisible, setSplineVisible] = useState(false); // Control visibility to reset initial state
  const [mouseHasMoved, setMouseHasMoved] = useState(false); // Track if mouse has moved to avoid initial hover state

  const [overlayState, setOverlayState] = useState<OverlayState>({
    status: "idle",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginState, setLoginState] = useState<LoginActionState>({ status: "idle" });

  // Handle mouse movement to enable Spline scene
  useEffect(() => {
    const handleMouseMove = () => {
      // Small delay before enabling to ensure initial cursor position doesn't trigger
      setTimeout(() => {
        if (!mouseHasMoved) {
          setMouseHasMoved(true);
        }
      }, 50);
    };

    // Listen for mouse movement - with slight delay
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseHasMoved]);

  // Load Spline scene - this makes it interactive  
  const onLoad = (splineApp: Application) => {
    if (splineApp) {
      spline.current = splineApp;
      console.log('Spline scene loaded successfully - interactive mode enabled');
      
      // Reset hexagons to inactive state on initial load
      // Wait a bit longer to ensure Spline is fully initialized
      setTimeout(() => {
        try {
          // Access the internal Three.js scene
          const internalScene = (splineApp as any)._scene;
          
          if (internalScene) {
            // Recursively traverse and reset all meshes
            internalScene.traverse((object: any) => {
              // Reset mesh material properties
              if (object.isMesh && object.material) {
                const materials = Array.isArray(object.material) 
                  ? object.material 
                  : [object.material];
                
                materials.forEach((mat: any) => {
                  if (mat) {
                    // Turn off emission
                    if (mat.emissive) {
                      mat.emissive.setHex(0x000000);
                      mat.emissiveIntensity = 0;
                    }
                    // Remove emissive map
                    if (mat.emissiveMap) {
                      mat.emissiveMap = null;
                      mat.needsUpdate = true;
                    }
                    // Update material
                    mat.needsUpdate = true;
                  }
                });
              }
              
              // Handle PointLights - reduce intensity or disable
              if (object.isPointLight) {
                object.intensity = 0;
                object.visible = false;
              }
              
              // Handle ambient lights  
              if (object.type === 'AmbientLight') {
                object.intensity = 0;
              }
            });
            
            console.log('Spline hexagons and lights reset to inactive state');
            // Make scene visible after reset
            setSplineVisible(true);
          }
        } catch (error) {
          console.log('Could not reset Spline scene:', error);
          // Show anyway if reset fails
          setSplineVisible(true);
        }
      }, 800); // Increased timeout to ensure scene is fully loaded and stabilized
    }
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
      }, 2000);
    } else if (result.status === "requires_2fa") {
      // Redirect to 2FA verification page
      router.push(`/verify-2fa?email=${encodeURIComponent(result.email!)}&tempToken=${encodeURIComponent(result.tempToken!)}`);
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
        {/* --- PERUBAHAN DIMULAI DI SINI --- */}
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
              className="relative z-[10] pointer-events-none" // Pastikan konten berada di atas video dan gradien, don't block Spline interactions
          >
              <img
                alt="Brand Banner"
                src="/images/barzakh/banner/sirath-banner.svg" 
                className="w-48 h-auto mb-4 mx-auto" 
              />
              <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
              <p className="text-gray-200 mt-2 max-w-sm">
                Intelligent, focused AI search powering crypto and blockchain insights.
              </p>
          </motion.div>
        </div>
        {/* --- PERUBAHAN SELESAI DI SINI --- */}

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
                src="/images/barzakh/banner/sirath-banner.svg"
                className="w-32 h-auto mx-auto lg:hidden"
              />
              <h1 className="text-3xl font-bold">Sign In</h1>
              <p className="text-muted-foreground">
                Enter your credentials to access your account.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="w-full inline-flex h-10 items-center justify-center rounded-md border bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <LogoGoogle className="mr-2 h-4 w-4" />
                Continue with Google
              </button>
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
    </>
  );
}