"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { LogoGoogle } from "@/components/icons";
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
  const turnstileRef = useRef<TurnstileInstance>(null); // Ref for the Turnstile component

  const [overlayState, setOverlayState] = useState<OverlayState>({
    status: "idle",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
      "cf-turnstile-response": turnstileToken,
    });

    setIsLoading(false);

    if (result?.error) {
      setOverlayState({ status: "error", title: "Login Failed", message: "Invalid credentials!" });
    } else if (result?.ok) {
      setOverlayState({ status: "success", title: "Login Successful", message: "You will be redirected shortly." });
      setTimeout(() => {
        router.push("/");
      }, 2000);
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
          {/* 1. Video Background (lapisan paling belakang) */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute top-0 left-0 w-full h-full object-cover -z-10"
          >
            <source src="/video/login.mp4" type="video/mp4" />
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
              className="z-10" // Pastikan konten berada di atas video dan gradien
          >
              <img
                alt="Brand Banner"
                src="/images/javin/banner/sirath-banner.svg" 
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
                src="/images/javin/banner/sirath-banner.svg"
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
                >
                  <SubmitButton isLoading={isLoading} className="w-full">
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