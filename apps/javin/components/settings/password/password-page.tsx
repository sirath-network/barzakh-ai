"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Lock, Shield, Eye, EyeOff, CheckCircle, AlertCircle, Key } from "lucide-react";

export default function PasswordSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const router = useRouter();

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/(?=.*[a-z])/.test(password)) errors.push("One lowercase letter");
    if (!/(?=.*[A-Z])/.test(password)) errors.push("One uppercase letter");
    if (!/(?=.*\d)/.test(password)) errors.push("One number");
    return errors;
  };

  const getPasswordStrength = (password) => {
    const errors = validatePassword(password);
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (errors.length === 0) return { strength: 100, label: "Strong", color: "text-emerald-500 dark:text-emerald-400" };
    if (errors.length <= 2) return { strength: 75, label: "Good", color: "text-yellow-500 dark:text-yellow-400" };
    if (errors.length <= 3) return { strength: 50, label: "Fair", color: "text-red-500 dark:text-red-400" };
    return { strength: 25, label: "Weak", color: "text-red-500 dark:text-red-400" };
  };

  const validateForm = () => {
    const newErrors = {};
    if (!currentPassword) newErrors.currentPassword = "Current password is required";
    if (!password) {
      newErrors.password = "New password is required";
    } else if (validatePassword(password).length > 0) {
      newErrors.password = "Password doesn't meet requirements";
    } else if (currentPassword && password === currentPassword) {
      newErrors.password = "New password must be different from current password";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      try {
        await fetch("/api/auth/signout", { method: "POST", headers: { "Content-Type": "application/json" } });
      } catch (apiError) {
        console.log("API signout failed, continuing with manual cleanup:", apiError);
      }

      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
        const authCookies = [
          'next-auth.session-token', 'next-auth.csrf-token', 'next-auth.callback-url',
          'authjs.session-token', 'authjs.csrf-token', 'authjs.callback-url',
          '__Secure-next-auth.session-token', '__Secure-next-auth.callback-url', '__Secure-next-auth.csrf-token',
          '__Secure-authjs.session-token', '__Secure-authjs.callback-url', '__Secure-authjs.csrf-token'
        ];
        authCookies.forEach(cookieName => {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
        });
        setTimeout(() => window.location.replace("/login"), 100);
      }
    } catch (error) {
      console.error("Logout error:", error);
      if (typeof window !== "undefined") {
        toast.error("Session ended. Redirecting to login...");
        setTimeout(() => window.location.replace("/login"), 1000);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.error === "Current password is incorrect") {
          setErrors({ ...errors, currentPassword: "Current password is incorrect" });
          toast.error("Current password is incorrect");
          return;
        }
        if (res.status === 400 && data.error === "New password cannot be the same as current password") {
          setErrors({ ...errors, password: "New password must be different from current password" });
          toast.error("New password must be different from current password");
          return;
        }
        throw new Error(data.error || "Failed to update password.");
      }
      toast.success("Password updated successfully! Logging out...");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setTimeout(async () => await handleLogout(), 2000);
    } catch (err) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordRequirements = validatePassword(password);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-red-800/50 rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-red-700/50">
              <Lock className="w-6 h-6 text-gray-700 dark:text-red-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Settings</h1>
              <p className="text-gray-600 dark:text-gray-300">Update your account password</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black/80 rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
          <div className="p-8 border-b border-gray-200 dark:border-red-900/30">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Change Password</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Create a strong password to keep your account secure. You'll be logged out after updating.
            </p>
          </div>
          <div className="p-8 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Current Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); if (errors.currentPassword) setErrors({ ...errors, currentPassword: "" }); if (errors.password && errors.password.includes("different from current")) setErrors({ ...errors, password: "" }); }}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${errors.currentPassword ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-red-900/50 bg-gray-50 dark:bg-black/20'}`}
                  placeholder="Enter your current password" />
                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.currentPassword && <p className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.currentPassword}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: "" }); }}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${errors.password ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-red-900/50 bg-gray-50 dark:bg-black/20'}`}
                  placeholder="Enter your new password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {currentPassword && password && currentPassword === password && (
                <div className="mt-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
                  <span className="text-sm text-yellow-600 dark:text-yellow-400">New password must be different</span>
                </div>
              )}

              {password && currentPassword !== password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Password Strength</span>
                    <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-red-900/30 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.strength === 100 ? 'bg-emerald-500' : passwordStrength.strength >= 75 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${passwordStrength.strength}%` }}></div>
                  </div>
                </div>
              )}

              {password && passwordRequirements.length > 0 && currentPassword !== password && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium mb-2">Password must include:</p>
                  <ul className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <li key={index} className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                        <div className="w-1 h-1 bg-red-500 dark:bg-red-400 rounded-full"></div>{req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {errors.password && <p className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">Confirm New Password</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" }); }}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all ${errors.confirmPassword ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-red-900/50 bg-gray-50 dark:bg-black/20'}`}
                  placeholder="Confirm your new password" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {confirmPassword && password && (
                <div className="mt-2 flex items-center gap-2">
                  {password === confirmPassword ? (<><CheckCircle className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /><span className="text-sm text-emerald-600 dark:text-emerald-400">Passwords match</span></>) : (<><AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400" /><span className="text-sm text-red-600 dark:text-red-400">Passwords don't match</span></>)}
                </div>
              )}
              {errors.confirmPassword && <p className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.confirmPassword}</p>}
            </div>

            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 border border-red-200 dark:border-red-700/50">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Security Notice</h3>
                  <p className="text-sm text-red-700 dark:text-red-200">
                    After updating your password, you'll be automatically logged out and need to sign in again.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-gray-200 dark:border-red-900/30 flex justify-end">
            <button type="button" onClick={handleSubmit} disabled={isLoading || !currentPassword || !password || !confirmPassword || password !== confirmPassword || passwordRequirements.length > 0 || currentPassword === password}
              className="bg-gray-800 text-white dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 px-6 py-3 rounded-lg hover:bg-gray-700 dark:hover:from-red-700 dark:hover:to-red-800 text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              {isLoading ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Updating...</>) : (<><Lock className="w-4 h-4" />Update Password</>)}
            </button>
          </div>
        </div>

        <div className="mt-4 md:mt-6 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-red-900/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-1">Need Help?</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                Having trouble changing your password? Our support team is here to help.
              </p>
            </div>
            <button onClick={() => window.open("https://barzakh.tech/contact", "_blank")}
              className="bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-red-900/30 text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-200 dark:border-red-900/20 text-xs md:text-sm">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}