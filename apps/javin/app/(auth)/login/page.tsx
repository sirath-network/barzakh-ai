"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";

import { login, type LoginActionState } from "../actions";
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

  const [overlayState, setOverlayState] = useState<OverlayState>({
    status: "idle",
    message: "",
  });

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    { status: "idle" }
  );

  useEffect(() => {
    if (state.status === "failed") {
      setOverlayState({ status: "error", title: "Login Failed", message: "Invalid credentials!" });
    } else if (state.status === "invalid_data") {
      setOverlayState({ status: "error", title: "Invalid Data", message: "Failed validating your submission!" });
    } else if (state.status === "success") {
      setOverlayState({ status: "success", title: "Login Successful", message: "You will be redirected shortly." });
      setTimeout(() => {
        router.push("/");
      }, 2000);
    }
  }, [state, router]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
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
        {/* */}
        {overlayState.status === 'error' && (
          <Button onClick={closeOverlay} className="w-full h-11" variant="secondary">
            Try Again
          </Button>
        )}
      </ActionResultOverlay>
      
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
              <h1 className="text-3xl font-bold">Welcome Back</h1>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Intelligent, focused AI search powering crypto and blockchain insights.
              </p>
          </motion.div>
        </div>

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
              <AuthForm action={handleSubmit} defaultEmail={email}>
                <SubmitButton isSuccessful={false} className="w-full">
                  Sign In
                </SubmitButton>
              </AuthForm>
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