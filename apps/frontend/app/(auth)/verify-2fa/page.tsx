"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";
import { toast } from "sonner";
import { Shield, ArrowLeft } from "lucide-react";
import { OTPInput } from "@/components/ui/otp-input";

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBackupCode, setIsBackupCode] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const email = searchParams.get("email");
  const tempToken = searchParams.get("tempToken");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const context = searchParams.get("context"); // "login" or "forgot_password"

  useEffect(() => {
    // For forgot password context, only email is required
    if (!email || (!tempToken && context !== "forgot_password")) {
      router.push("/login");
    }
  }, [email, tempToken, router, context]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token.trim()) {
      toast.error("Please enter your 2FA token");
      return;
    }

    setIsLoading(true);
    
    try {
      if (context === "forgot_password") {
        // Handle forgot password 2FA verification
        const response = await fetch("/api/2fa/forgot-password-verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            twoFactorToken: token.trim(),
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setTimeout(() => {
            router.push("/login");
          }, 2000);
        } else {
          toast.error(data.message || "2FA verification failed");
        }
      } else {
        // Complete login with 2FA verification
        const response = await fetch("/api/2fa/complete-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tempToken,
            twoFactorToken: token.trim(),
          }),
        });

        const data = await response.json();

        if (response.ok) {
        // Store the session token in localStorage temporarily
        localStorage.setItem("sessionToken", data.sessionToken);
        
        // Create a session using NextAuth with the sessionToken as a special credential
        const result = await signIn("credentials", {
          email: data.user.email,
          password: "", // Empty password since we're using sessionToken
          sessionToken: data.sessionToken,
          redirect: false,
        });

        if (result?.ok) {
          // Clean up the temporary session token
          localStorage.removeItem("sessionToken");
          // Force session refresh to ensure user data is updated
          await getSession();
          toast.success("Login successful!");
          router.push(callbackUrl);
        } else {
          console.error("SignIn result:", result);
          toast.error("Session creation failed. Please try again.");
        }
        } else {
          toast.error(data.error || "Invalid 2FA token");
        }
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (value: string) => {
    setToken(value);
    // Reset auto-submit flag when token is modified
    const expectedLength = isBackupCode ? 8 : 6;
    if (value.length < expectedLength) {
      setHasAutoSubmitted(false);
    }
  };

  const handleOTPComplete = () => {
    // Auto-submit when OTP is complete (only once per complete entry)
    if (!isLoading && token.trim() && !hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      // Small delay to ensure the last character is properly set
      setTimeout(() => {
        if (!isLoading) { // Double-check it hasn't started
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }
      }, 150);
    }
  };

  // For forgot password context, only email is required
  if (!email || (!tempToken && context !== "forgot_password")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </button>

        {/* Main Card */}
        <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-red-800/50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg border border-gray-200 dark:border-red-700/50">
                <Shield className="w-8 h-8 text-gray-600 dark:text-red-300" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Two-Factor Authentication
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {context === "forgot_password" 
                  ? "Enter your 2FA code to verify your identity for password reset"
                  : "Enter your 2FA code to sign in"
                }
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {email}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                  {isBackupCode ? "Backup Code" : "Authentication Code"}
                </label>
                <OTPInput
                  length={isBackupCode ? 8 : 6}
                  value={token}
                  onChange={handleTokenChange}
                  onComplete={handleOTPComplete}
                  backupCode={isBackupCode}
                  autoFocus
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
                  {isBackupCode 
                    ? "Paste or type your 8-character backup code" 
                    : "Enter the 6-digit code from your authenticator app"
                  }
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !token.trim()}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  "Verify & Sign In"
                )}
              </button>
            </form>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isBackupCode ? "Don't have a backup code?" : "Don't have your authenticator app?"}{" "}
                <button
                  onClick={() => {
                    // Toggle between backup code and TOTP mode
                    setIsBackupCode(!isBackupCode);
                    setToken(""); // Clear the input when switching modes
                    setHasAutoSubmitted(false); // Reset auto-submit flag
                  }}
                  className="text-red-600 dark:text-red-400 hover:underline"
                >
                  {isBackupCode ? "Use TOTP code" : "Use backup code"}
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Having trouble? Contact support for assistance.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  const SuspenseAny = Suspense as any;
  return (
    <SuspenseAny fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <Verify2FAContent />
    </SuspenseAny>
  );
}
