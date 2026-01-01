"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Trash2, X, Mail, Lock, Shield, Loader2, ArrowLeft } from "lucide-react";

export default function DeleteAccountModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Step state: "confirm" = initial DELETE confirmation, "verify" = identity verification
  const [step, setStep] = useState<"confirm" | "verify">("confirm");

  // Identity verification state
  const [has2FA, setHas2FA] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [error, setError] = useState("");

  // Email OTP state
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const resetState = () => {
    setConfirmationText("");
    setStep("confirm");
    setHas2FA(false);
    setUserEmail(null);
    setPassword("");
    setTwoFactorToken("");
    setEmailOtp("");
    setError("");
    setOtpCooldown(0);
  };

  const handleClose = () => {
    if (!isDeleting) {
      resetState();
      onClose();
    }
  };

  const handleBack = () => {
    setStep("confirm");
    setPassword("");
    setTwoFactorToken("");
    setEmailOtp("");
    setError("");
  };

  const sendEmailOtp = async () => {
    setIsSendingOtp(true);
    setError("");

    try {
      const res = await fetch("/api/account/delete/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send verification code");
      }

      toast.success("Verification code sent to your email");
      setOtpCooldown(60);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const isVerifyFormValid = () => {
    if (!password) return false;
    if (has2FA) {
      return twoFactorToken.length === 6;
    } else {
      return emailOtp.length === 6;
    }
  };

  const handleProceedToVerify = async () => {
    if (confirmationText !== "DELETE") {
      toast.error('Please type "DELETE" to continue.');
      return;
    }

    setIsDeleting(true);
    setError("");

    try {
      // First call to check what verification is needed
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (data.requiresAuth) {
        // Show identity verification form
        setStep("verify");
        setHas2FA(data.has2FA || false);
        setUserEmail(data.userEmail || null);
      } else if (!res.ok) {
        throw new Error(data.error || "Failed to delete account.");
      } else {
        // Account deleted successfully (shouldn't happen without auth, but handle it)
        toast.success("Account deleted successfully.");
        await signOut({ redirect: false });
        router.push("/login");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    setError("");

    try {
      const body: { password?: string; twoFactorToken?: string; emailOtp?: string } = {};
      if (password) body.password = password;
      if (twoFactorToken) body.twoFactorToken = twoFactorToken;
      if (emailOtp) body.emailOtp = emailOtp;

      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete account.");
      }

      toast.success("Account deleted successfully.");
      await signOut({ redirect: false });
      router.push("/login");
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-red-900/30">
          <div className="flex items-center gap-4">
            {step === "verify" && (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                disabled={isDeleting}
              >
                <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center shadow-lg border border-red-200 dark:border-red-700/50 flex-shrink-0">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Delete Account
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {step === "confirm" ? "Permanently remove your account" : "Verify your identity"}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-red-900/20 rounded-lg transition-colors -mr-2 -mt-2 self-start"
              disabled={isDeleting}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Warning message - always shown */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <p className="text-sm text-red-800 dark:text-red-200 leading-relaxed">
              This action is <span className="font-bold">irreversible</span>. All your data, including chats,
              documents, and settings, will be permanently deleted.
            </p>
          </div>

          {/* Step 1: Confirmation */}
          {step === "confirm" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="font-mono font-bold text-red-600 dark:text-red-400">DELETE</span> to continue
              </label>
              <input
                type="text"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                className="w-full px-4 py-3 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all border-gray-200 dark:border-red-900/30 bg-gray-50 dark:bg-black/40 font-mono"
                placeholder="DELETE"
                disabled={isDeleting}
              />
            </div>
          )}

          {/* Step 2: Identity Verification */}
          {step === "verify" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>Identity verification required</span>
              </div>

              {/* Password input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all border-gray-200 dark:border-red-900/30 bg-gray-50 dark:bg-black/40"
                    placeholder="Enter your password"
                    disabled={isDeleting}
                  />
                </div>
              </div>

              {/* 2FA or Email OTP */}
              {has2FA ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    2FA Code
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={twoFactorToken}
                      onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full pl-10 pr-4 py-3 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all border-gray-200 dark:border-red-900/30 bg-gray-50 dark:bg-black/40 font-mono tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                      disabled={isDeleting}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Verification Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full pl-10 pr-4 py-3 border rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all border-gray-200 dark:border-red-900/30 bg-gray-50 dark:bg-black/40 font-mono tracking-widest"
                        placeholder="000000"
                        maxLength={6}
                        disabled={isDeleting}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={sendEmailOtp}
                      disabled={isSendingOtp || otpCooldown > 0 || isDeleting}
                      className="px-4 py-3 bg-red-500 dark:bg-red-600 text-white border border-red-600 dark:border-red-500 rounded-xl font-medium text-sm hover:bg-red-600 dark:hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isSendingOtp ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : otpCooldown > 0 ? (
                        `${otpCooldown}s`
                      ) : (
                        "Send"
                      )}
                    </button>
                  </div>
                  {userEmail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Code will be sent to {userEmail}
                    </p>
                  )}
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-red-900/30 bg-gray-50 dark:bg-black/80">
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 dark:border-red-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-red-900/20 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors text-sm"
              disabled={isDeleting}
            >
              Cancel
            </button>

            {step === "confirm" ? (
              <button
                onClick={handleProceedToVerify}
                disabled={confirmationText !== "DELETE" || isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            ) : (
              <button
                onClick={handleFinalDelete}
                disabled={!isVerifyFormValid() || isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  "Delete Account"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
