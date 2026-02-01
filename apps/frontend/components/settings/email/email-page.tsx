"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { handleLogout } from "@/lib/auth-utils";
import { Mail, Shield, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft, Key } from "lucide-react";
import { OTPInput } from "@/components/ui/otp-input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useView } from "@/context/view-context";
import { useSidebar } from "@/components/ui/sidebar";

export default function EmailSettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { setView } = useView();
  const { setOpenMobile } = useSidebar();
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const hasPassword = session?.user?.hasPassword;
  // Robust check for Web3 user using walletAddress
  const isWeb3User = !!(session?.user as any)?.walletAddress;

  useEffect(() => {
    if (session?.user?.email) {
      setCurrentEmail(session.user.email);
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
    return null;
  }

  // Prevent rendering during logout to avoid request loops
  if (isLoggingOut) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Signing you out...</p>
        </div>
      </div>
    );
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!newEmail) {
      newErrors.newEmail = "Email address is required";
    } else if (!validateEmail(newEmail)) {
      newErrors.newEmail = "Please enter a valid email address";
    } else if (newEmail === currentEmail) {
      newErrors.newEmail = "New email must be different from current email";
    }

    if (hasPassword) {
      if (!password) {
        newErrors.password = "Current password is required";
      } else if (password.length < 6) {
        newErrors.password = "Password seems too short";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    setNewEmail("");
    setMessage({ type: "", text: "" });
    setErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNewEmail("");
    setPassword("");
    setMessage({ type: "", text: "" });
    setShowVerification(false);
    setVerificationCode("");
    setErrors({});
    setShowPassword(false);
  };

  const handleRequestChange = async () => {
    if (!validateForm()) return;
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch('/api/changes-email/request-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail, currentPassword: password }),
      });
      const responseData = await response.json();
      if (response.ok) {
        setShowVerification(true);
        setMessage({ type: "success", text: `Verification code sent to ${currentEmail}. Please check your inbox.` });
      } else {
        setMessage({ type: "error", text: responseData.message || "Failed to request email change" });
      }
    } catch (error) {
      console.error("Request email change error:", error);
      setMessage({ type: "error", text: "Network error. Please check your connection and try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyChange = async () => {
    if (!verificationCode) {
      setMessage({ type: "error", text: "Please enter the verification code" });
      return;
    }
    if (verificationCode.length !== 6) {
      setMessage({ type: "error", text: "Verification code must be 6 digits" });
      return;
    }
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const response = await fetch('/api/changes-email/verify-email-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationCode, newEmail }),
      });
      const responseData = await response.json();
      if (response.ok) {
        setCurrentEmail(newEmail);
        setHasAutoSubmitted(false);

        // Special handling for Web3 users setting up their profile
        // Only skip logout if they are setting email for the first time
        if (isWeb3User && !session?.user?.email) {
          if (!hasPassword) {
            toast.success("Email set successfully!", {
              description: "Please set a password to secure your account.",
              action: {
                label: "Set Password",
                onClick: () => {
                  setView("password");
                  setOpenMobile(false);
                },
              },
              duration: 5000,
            });
          } else {
            toast.success("Email updated successfully!");
          }

          // Update session to reflect new email without logging out
          // Pass the new tokenVersion to prevent mismatch logout
          await update({
            user: {
              ...session?.user,
              email: newEmail,
              tokenVersion: responseData.tokenVersion
            }
          });
          // Reset editing state
          setIsEditing(false);
          setShowVerification(false);
          setVerificationCode("");
        } else {
          setMessage({ type: "success", text: "🎉 Email updated successfully! You'll be signed out in 3 seconds to complete the change." });
          setIsLoggingOut(true);
          setTimeout(async () => {
            try {
              // Use only handleLogout which already handles signOut internally
              await handleLogoutClick();
            } catch (error) {
              console.error("Logout error:", error);
              // Force redirect even if there's an error
              if (typeof window !== "undefined") {
                window.location.replace("/login");
              }
            }
          }, 3000);
        }
      } else {
        setHasAutoSubmitted(false);
        setMessage({ type: "error", text: responseData.message || "Invalid or expired verification code" });
      }
    } catch (error) {
      console.error("Verify email change error:", error);
      setHasAutoSubmitted(false);
      setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = () => {
    if (!hasAutoSubmitted && !isLoading) {
      setHasAutoSubmitted(true);
      setTimeout(() => {
        handleVerifyChange();
      }, 150);
    }
  };

  const handleLogoutClick = async () => {
    await handleLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
              <Mail className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Email Settings</h1>
              <p className="text-sm md:text-base text-muted-foreground">Update your account email address</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Card */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
            <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Change Email Address</h2>
              <p className="text-muted-foreground text-sm">
                Update your email address for account authentication and recovery. You'll be logged out after updating.
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {message.text && (
                <div className={`p-4 rounded-lg border ${message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20"
                  : "bg-destructive/10 dark:bg-red-500/10 border-destructive/20 dark:border-red-500/20"
                  }`}>
                  <div className="flex items-center gap-3">
                    {message.type === "success" ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-destructive dark:text-red-400 flex-shrink-0" />
                    )}
                    <p className={`text-sm font-medium ${message.type === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive dark:text-red-400"
                      }`}>
                      {message.text}
                    </p>
                  </div>
                </div>
              )}

              {isWeb3User && !currentEmail && !message.text && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">Complete Your Profile</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Please set up an email address to secure your account.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!isEditing ? (
                <div className="space-y-6">
                  {currentEmail && (
                    <div>
                      <label className="block text-sm font-semibold text-muted-foreground mb-2">Current Email Address</label>
                      <div className="bg-muted/30 rounded-lg p-4 border border-border">
                        <div className="flex items-center gap-3">
                          <Mail className="w-5 h-5 text-muted-foreground" />
                          <span className="text-foreground font-medium break-all">
                            {currentEmail}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleStartEditing}
                      className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      {currentEmail ? "Change Email" : "Set Email"}
                    </button>
                  </div>
                </div>
              ) : !showVerification ? (
                <div className="space-y-6">
                  {currentEmail && (
                    <div>
                      <label className="block text-sm font-semibold text-muted-foreground mb-2">Current Email</label>
                      <div className="bg-muted/30 rounded-lg p-3 border border-border">
                        <span className="text-foreground break-all">{currentEmail}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-2">New Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => {
                          setNewEmail(e.target.value);
                          if (errors.newEmail) setErrors({ ...errors, newEmail: "" });
                        }}
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors.newEmail ? 'border-destructive bg-destructive/5' : 'border-input bg-background'
                          }`}
                        placeholder="Enter your new email address"
                      />
                    </div>
                    {errors.newEmail && (
                      <p className="mt-2 text-sm text-destructive dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.newEmail}
                      </p>
                    )}
                  </div>

                  {hasPassword && (
                    <div>
                      <label className="block text-sm font-semibold text-muted-foreground mb-2">Current Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors({ ...errors, password: "" });
                          }}
                          className={`w-full pl-10 pr-12 py-3 border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors.password ? 'border-destructive bg-destructive/5' : 'border-input bg-background'
                            }`}
                          placeholder="Enter your current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-2 text-sm text-destructive dark:text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.password}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">Required for security verification</p>
                    </div>
                  )}

                  {(!isWeb3User || currentEmail) && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700/40">
                      <div className="flex gap-3">
                        <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Security Notice</h3>
                          <p className="text-sm text-amber-700 dark:text-amber-200">
                            After updating your email, you'll be automatically logged out and need to sign in again.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Verify Your Email</h3>
                    <p className="text-muted-foreground text-sm">
                      We've sent a verification code to <strong className="text-foreground">{currentEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-muted-foreground mb-2">Verification Code</label>
                    <OTPInput
                      length={6}
                      value={verificationCode}
                      onChange={(value) => {
                        setVerificationCode(value);
                        if (value.length < 6) {
                          setHasAutoSubmitted(false);
                        }
                      }}
                      onComplete={handleOTPComplete}
                    />
                    <p className="mt-2 text-sm text-muted-foreground text-center">
                      6-digit code from your email
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Didn't receive the code?{" "}
                      <button
                        onClick={handleRequestChange}
                        disabled={isLoading}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        Resend
                      </button>
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 border-t border-border flex justify-end gap-3">
              {isEditing && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground font-semibold transition-colors text-sm"
                >
                  Cancel
                </button>
              )}

              {isEditing && !showVerification && (
                <button
                  onClick={handleRequestChange}
                  disabled={isLoading || !newEmail || (hasPassword && !password) || !validateEmail(newEmail) || newEmail === currentEmail}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Verification Code
                    </>
                  )}
                </button>
              )}

              {showVerification && (
                <button
                  onClick={handleVerifyChange}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Verify & Update Email
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Email Tips */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
                <h3 className="text-lg font-bold text-foreground mb-2">Email Tips</h3>
                <p className="text-muted-foreground text-sm">Keep your email address secure</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Use a secure email</h4>
                    <p className="text-xs text-muted-foreground mt-1">Choose an email provider with good security features</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Keep it accessible</h4>
                    <p className="text-xs text-muted-foreground mt-1">Use an email you check regularly for important notifications</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Enable 2FA</h4>
                    <p className="text-xs text-muted-foreground mt-1">Use two-factor authentication on your email account</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Verify regularly</h4>
                    <p className="text-xs text-muted-foreground mt-1">Keep your recovery email up to date</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
                <h3 className="text-lg font-bold text-foreground mb-2">Security Features</h3>
                <p className="text-muted-foreground text-sm">Your account security</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Automatic Logout</h4>
                    <p className="text-xs text-muted-foreground">You'll be logged out after changing your email</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Email Verification</h4>
                    <p className="text-xs text-muted-foreground">We verify all email changes for security</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Password Required</h4>
                    <p className="text-xs text-muted-foreground">Current password needed for verification</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground mb-1">Need Help?</h3>
              <p className="text-xs md:text-sm text-muted-foreground">Having trouble changing your email? Our support team is here to help.</p>
            </div>
            <button
              onClick={() => window.open("https://barzakh.framer.ai/contact", "_blank")}
              className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-800 dark:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-300 dark:border-white/20 text-xs md:text-sm"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}