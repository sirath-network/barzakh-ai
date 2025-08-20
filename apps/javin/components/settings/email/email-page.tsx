"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Mail, Shield, CheckCircle, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function EmailSettingsPage() {
  const { data: session, status } = useSession();
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (session?.user?.email) {
      setCurrentEmail(session.user.email);
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white">Loading your account...</p>
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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!newEmail) {
      newErrors.newEmail = "Email address is required";
    } else if (!validateEmail(newEmail)) {
      newErrors.newEmail = "Please enter a valid email address";
    } else if (newEmail === currentEmail) {
      newErrors.newEmail = "New email must be different from current email";
    }
    if (!password) {
      newErrors.password = "Current password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password seems too short";
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
        setMessage({ type: "success", text: "🎉 Email updated successfully! You'll be signed out in 3 seconds to complete the change." });
        setTimeout(async () => {
          try {
            await signOut({ redirect: false, callbackUrl: "/login" });
            await handleLogout();
          } catch (error) {
            console.error("SignOut error:", error);
            await handleLogout();
          }
        }, 3000);
      } else {
        setMessage({ type: "error", text: responseData.message || "Invalid or expired verification code" });
      }
    } catch (error) {
       console.error("Verify email change error:", error);
       setMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        const authCookies = [
          'authjs.session-token', 'authjs.csrf-token', 'authjs.callback-url',
          '__Secure-authjs.session-token', '__Secure-authjs.callback-url', '__Secure-authjs.csrf-token',
          'next-auth.session-token', 'next-auth.csrf-token', '__Host-next-auth.csrf-token', '__Secure-next-auth.session-token'
        ];
        authCookies.forEach(cookieName => {
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
        });
      }
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-800 dark:bg-gradient-to-br dark:from-red-600 dark:to-red-700 rounded-xl flex items-center justify-center shadow-lg">
              <Mail className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Email Settings</h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">Manage your account email address</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
          {message.text && (
            <div className={`p-3 md:p-4 border-b ${
              message.type === "success" 
                ? "bg-emerald-50 dark:bg-emerald-900/50 border-emerald-200 dark:border-emerald-700" 
                : "bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-700"
            }`}>
              <div className="flex items-center gap-2 md:gap-3">
                {message.type === "success" ? (
                  <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
                )}
                <p className={`text-xs md:text-sm font-medium ${
                  message.type === "success" ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
                }`}>
                  {message.text}
                </p>
              </div>
            </div>
          )}

          <div className="p-4 md:p-8">
            {!isEditing ? (
              <div className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 md:mb-3">
                    Current Email Address
                  </label>
                  <div className="bg-gray-100 dark:bg-gray-900/80 rounded-lg md:rounded-xl p-3 border border-gray-200 dark:border-red-900/30">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex items-center gap-2 md:gap-3">
                        <Mail className="w-4 h-4 md:w-5 md:h-5 text-gray-500 dark:text-red-400" />
                        <span className="text-sm md:text-base text-gray-900 dark:text-white font-medium break-all">
                          {currentEmail || "No email found"}
                        </span>
                      </div>
                      <button
                        onClick={handleStartEditing}
                        disabled={!currentEmail}
                        className="w-full md:w-auto px-3 py-2 md:px-4 md:py-2 bg-gray-800 text-white dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 rounded-lg hover:bg-gray-700 dark:hover:from-red-700 dark:hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs md:text-sm shadow-lg"
                      >
                        Change Email
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg md:rounded-xl p-3 border border-red-200 dark:border-red-800/30">
                  <div className="flex gap-2 md:gap-3">
                    <Shield className="w-4 h-4 md:w-5 md:h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-xs md:text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Security Notice</h3>
                      <p className="text-xs md:text-sm text-red-700 dark:text-red-200/80">
                        Your email is used for authentication and account recovery. Keep it secure and up to date.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : !showVerification ? (
              <div className="space-y-4 md:space-y-6">
                <button onClick={handleCancel} className="flex items-center gap-1 md:gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm">
                  <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="text-xs md:text-sm font-medium">Back</span>
                </button>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">Change Email Address</h2>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Enter your new email and current password to proceed</p>
                </div>
                <div className="space-y-3 md:space-y-5">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 md:mb-2">Current Email</label>
                    <div className="bg-gray-100 dark:bg-gray-900/80 rounded-lg p-2 md:p-3 border border-gray-200 dark:border-red-900/30">
                      <span className="text-sm md:text-base text-gray-700 dark:text-gray-200 break-all">{currentEmail}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 md:mb-2">New Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-red-400 w-4 h-4 md:w-5 md:h-5" />
                      <input type="email" value={newEmail} onChange={(e) => { setNewEmail(e.target.value); if (errors.newEmail) setErrors({...errors, newEmail: ""}); }}
                        className={`w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${ errors.newEmail ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-red-900/30 bg-white dark:bg-gray-900/80' }`}
                        placeholder="Enter your new email address" />
                    </div>
                    {errors.newEmail && ( <p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3 md:w-4 md:h-4" />{errors.newEmail}</p>)}
                  </div>
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 md:mb-2">Current Password</label>
                    <div className="relative">
                      <Shield className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-red-400 w-4 h-4 md:w-5 md:h-5" />
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({...errors, password: ""}); }}
                        className={`w-full pl-8 md:pl-10 pr-10 md:pr-12 py-2 md:py-3 text-sm md:text-base border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${ errors.password ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-red-900/30 bg-white dark:bg-gray-900/80' }`}
                        placeholder="Enter your current password" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"><EyeOff className="w-4 h-4 md:w-5 md:h-5" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" /></button>
                    </div>
                    {errors.password && (<p className="mt-1 text-xs text-red-500 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3 md:w-4 md:h-4" />{errors.password}</p>)}
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Required for security verification</p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:gap-3 pt-3 md:pt-4">
                  <button onClick={handleRequestChange} disabled={isLoading || !newEmail || !password || !validateEmail(newEmail) || newEmail === currentEmail}
                    className="w-full md:flex-1 bg-gray-800 text-white dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 py-2 md:py-3 px-4 md:px-6 rounded-lg hover:bg-gray-700 dark:hover:from-red-700 dark:hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-lg text-sm md:text-base">
                    {isLoading ? (<><div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Sending...</>) : ("Send Verification Code")}
                  </button>
                  <button onClick={handleCancel} className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 border border-gray-300 dark:border-red-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-red-900/20 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors text-sm md:text-base">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 md:space-y-6">
                <button onClick={handleCancel} className="flex items-center gap-1 md:gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm">
                  <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /><span className="text-xs md:text-sm font-medium">Back</span>
                </button>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1 md:mb-2">Verify Your Email</h2>
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">We've sent a verification code to <strong className="text-red-600 dark:text-red-400">{currentEmail}</strong></p>
                </div>
                <div className="space-y-3 md:space-y-5">
                  <div>
                    <label className="block text-xs md:text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 md:mb-2">Verification Code</label>
                    <input type="text" value={verificationCode} onChange={(e) => { const value = e.target.value.replace(/\D/g, '').slice(0, 6); setVerificationCode(value); }}
                      className="w-full px-3 md:px-4 py-2 md:py-3 border border-gray-300 dark:border-red-900/30 bg-white dark:bg-gray-900/80 rounded-lg text-center text-xl md:text-2xl font-mono tracking-widest text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="000000" maxLength={6} />
                    <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 text-center">Enter the 6-digit code from your email</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      Didn't receive the code?{" "}
                      <button onClick={handleRequestChange} disabled={isLoading} className="text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 font-medium">Resend</button>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-2 md:gap-3 pt-3 md:pt-4">
                  <button onClick={handleVerifyChange} disabled={isLoading || verificationCode.length !== 6} className="w-full md:flex-1 bg-emerald-600 text-white py-2 md:py-3 px-4 md:px-6 rounded-lg hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all flex items-center justify-center gap-2 text-sm md:text-base">
                    {isLoading ? (<><div className="w-3 h-3 md:w-4 md:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Verifying...</>) : (<><CheckCircle className="w-3 h-3 md:w-4 md:h-4" />Verify & Update Email</>)}
                  </button>
                  <button onClick={handleCancel} className="w-full md:w-auto px-4 md:px-6 py-2 md:py-3 border border-gray-300 dark:border-red-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-red-900/20 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors text-sm md:text-base">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 md:mt-6 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-red-900/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-1">Need Help?</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Having trouble changing your email? Our support team is here to help.</p>
            </div>
            <button onClick={() => window.open("https://barzakh.framer.ai/contact", "_blank")} className="bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-red-900/30 text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-200 dark:border-red-900/20 text-xs md:text-sm">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}