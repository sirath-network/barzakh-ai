"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useView } from "@/context/view-context";
import { useSidebar } from "@/components/ui/sidebar";
import { handleLogout } from "@/lib/auth-utils";
import { Lock, Shield, Eye, EyeOff, CheckCircle, AlertCircle, Key } from "lucide-react";

export default function PasswordSettingsPage() {
  const { data: session, update } = useSession();
  const { setView } = useView();
  const { setOpenMobile } = useSidebar();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  // Check if user is a Web3 user (has wallet address)
  const isWeb3User = !session?.user?.hasPassword && !!(session?.user as any)?.walletAddress;
  // Check if user is a Google OAuth user (no password set and no wallet address)
  const isGoogleUser = !session?.user?.hasPassword && session?.user?.email && !isWeb3User;

  const validatePassword = (password: string) => {
    const errors = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/(?=.*[a-z])/.test(password)) errors.push("One lowercase letter");
    if (!/(?=.*[A-Z])/.test(password)) errors.push("One uppercase letter");
    if (!/(?=.*\d)/.test(password)) errors.push("One number");
    if (!/(?=.*[!@#$%^&*])/.test(password)) errors.push("One special character (!@#$%^&*)");
    return errors;
  };

  const getPasswordStrength = (password: string) => {
    const errors = validatePassword(password);
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (errors.length === 0) return { strength: 100, label: "Strong", color: "text-emerald-500 dark:text-emerald-400" };
    if (errors.length <= 2) return { strength: 75, label: "Good", color: "text-yellow-500 dark:text-yellow-400" };
    if (errors.length <= 3) return { strength: 50, label: "Fair", color: "text-red-500 dark:text-red-400" };
    return { strength: 25, label: "Weak", color: "text-red-500 dark:text-red-400" };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Only require current password for users who have one (not Google OAuth or Web3 users)
    if (!isGoogleUser && !isWeb3User && !currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!password) {
      newErrors.password = "New password is required";
    } else if (validatePassword(password).length > 0) {
      newErrors.password = "Password doesn't meet requirements";
    } else if (!isGoogleUser && !isWeb3User && currentPassword && password === currentPassword) {
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

  const handleLogoutClick = async () => {
    await handleLogout();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: (isGoogleUser || isWeb3User) ? null : currentPassword,
          password
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400) {
          if (data.error.includes("Password must contain")) {
            setErrors({ ...errors, password: data.error });
            toast.error("Password validation failed");
            return;
          }
          if (data.error === "Current password is incorrect") {
            setErrors({ ...errors, currentPassword: "Current password is incorrect" });
            toast.error("Current password is incorrect");
            return;
          }
          if (data.error === "New password cannot be the same as current password") {
            setErrors({ ...errors, password: "New password must be different from current password" });
            toast.error("New password must be different from current password");
            return;
          }
        }
        throw new Error(data.error || "Failed to update password.");
      }

      // Special handling for Web3 users setting up their profile
      // Only skip logout if they are setting password for the first time
      if (isWeb3User && !session?.user?.hasPassword) {
        if (!session?.user?.email) {
          toast.success("Password set successfully!", {
            description: "Please set an email to secure your account.",
            action: {
              label: "Set Email",
              onClick: () => {
                setView("email");
                setOpenMobile(false);
              },
            },
            duration: 5000,
          });
        } else {
          toast.success("Password set successfully!");
        }

        // Update session to reflect new password without logging out
        await update({
          user: {
            ...session?.user,
            hasPassword: true,
            tokenVersion: data.user.tokenVersion
          }
        });
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
      } else {
        toast.success("Password updated successfully! Logging out...");
        setCurrentPassword("");
        setPassword("");
        setConfirmPassword("");
        setTimeout(async () => await handleLogoutClick(), 2000);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const passwordRequirements = validatePassword(password);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
              <Lock className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Password Settings</h1>
              <p className="text-sm md:text-base text-muted-foreground">Update your account password</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Card */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
            <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Change Password</h2>
              <p className="text-muted-foreground text-sm">
                Create a strong password to keep your account secure. You'll be logged out after updating.
              </p>
            </div>
            <div className="p-6 md:p-8 space-y-6">
              {/* Only show current password field for users who have a password (not Google OAuth or Web3 users) */}
              {!isGoogleUser && !isWeb3User && (
                <div>
                  <label className="block text-sm font-semibold text-muted-foreground mb-2">Current Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                    <input type={showCurrentPassword ? "text" : "password"} value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); if (errors.currentPassword) setErrors({ ...errors, currentPassword: "" }); if (errors.password && errors.password.includes("different from current")) setErrors({ ...errors, password: "" }); }}
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors.currentPassword ? 'border-destructive bg-destructive/5' : 'border-input bg-background'}`}
                      placeholder="Enter your current password" />
                    <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} tabIndex={-1} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.currentPassword && <p className="mt-2 text-sm text-destructive dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.currentPassword}</p>}
                </div>
              )}

              {/* Show info message for Google OAuth users */}
              {isGoogleUser && (
                <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-500" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">Google Account</h3>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        You're signed in with Google. Set up a password to enable email/password login as an alternative.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Show info message for Web3 users */}
              {isWeb3User && (
                <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-purple-500" />
                    <div>
                      <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">Web3 Account</h3>
                      <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        You're signed in with a wallet. Set up a password to enable email/password login as an alternative.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: "" }); }}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors.password ? 'border-destructive bg-destructive/5' : 'border-input bg-background'}`}
                    placeholder="Enter your new password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {!isGoogleUser && !isWeb3User && currentPassword && password && currentPassword === password && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-yellow-600 dark:text-yellow-400">New password must be different</span>
                  </div>
                )}

                {password && (isGoogleUser || isWeb3User || currentPassword !== password) && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Password Strength</span>
                      <span className={`text-xs font-medium ${passwordStrength.color}`}>{passwordStrength.label}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.strength === 100 ? 'bg-emerald-500' : passwordStrength.strength >= 75 ? 'bg-yellow-500' : 'bg-destructive'}`} style={{ width: `${passwordStrength.strength}%` }}></div>
                    </div>
                  </div>
                )}

                {password && passwordRequirements.length > 0 && (isGoogleUser || isWeb3User || currentPassword !== password) && (
                  <div className="mt-3 p-3 bg-destructive/10 dark:bg-red-500/10 border border-destructive/20 dark:border-red-500/20 rounded-lg">
                    <p className="text-xs text-destructive dark:text-red-400 font-medium mb-2">Password must include:</p>
                    <ul className="space-y-1">
                      {passwordRequirements.map((req, index) => (
                        <li key={index} className="text-xs text-destructive dark:text-red-400 flex items-center gap-1">
                          <div className="w-1 h-1 bg-destructive dark:bg-red-400 rounded-full"></div>{req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {errors.password && <p className="mt-2 text-sm text-destructive dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-muted-foreground mb-2">Confirm New Password</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: "" }); }}
                    className={`w-full pl-10 pr-12 py-3 border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${errors.confirmPassword ? 'border-destructive bg-destructive/5' : 'border-input bg-background'}`}
                    placeholder="Confirm your new password" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {confirmPassword && password && (
                  <div className="mt-2 flex items-center gap-2">
                    {password === confirmPassword ? (<><CheckCircle className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-600 dark:text-emerald-400">Passwords match</span></>) : (<><AlertCircle className="w-4 h-4 text-destructive dark:text-red-400" /><span className="text-sm text-destructive dark:text-red-400">Passwords not match</span></>)}
                  </div>
                )}
                {errors.confirmPassword && <p className="mt-2 text-sm text-destructive dark:text-red-400 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{errors.confirmPassword}</p>}

                {confirmPassword && passwordRequirements.length > 0 && (
                  <div className="mt-3 p-3 bg-destructive/10 dark:bg-red-500/10 border border-destructive/20 dark:border-red-500/20 rounded-lg">
                    <p className="text-xs text-destructive dark:text-red-400 font-medium mb-2">Password must include:</p>
                    <ul className="space-y-1">
                      {passwordRequirements.map((req, index) => (
                        <li key={index} className="text-xs text-destructive dark:text-red-400 flex items-center gap-1">
                          <div className="w-1 h-1 bg-destructive dark:bg-red-400 rounded-full"></div>{req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-700/40">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Security Notice</h3>
                    <p className="text-sm text-amber-700 dark:text-amber-200">
                      After updating your password, you'll be automatically logged out and need to sign in again.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8 border-t border-border flex justify-end">
              <button type="button" onClick={handleSubmit} disabled={isLoading || (!isGoogleUser && !isWeb3User && !currentPassword) || !password || !confirmPassword || password !== confirmPassword || passwordRequirements.length > 0 || (!isGoogleUser && !isWeb3User && currentPassword === password)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                {isLoading ? (<><div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>Updating...</>) : (<><Lock className="w-4 h-4" />Update Password</>)}
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Password Tips */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
                <h3 className="text-lg font-bold text-foreground mb-2">Password Tips</h3>
                <p className="text-muted-foreground text-sm">Create a strong, secure password</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Use a mix of characters</h4>
                    <p className="text-xs text-muted-foreground mt-1">Include uppercase, lowercase, numbers, and symbols</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Make it long</h4>
                    <p className="text-xs text-muted-foreground mt-1">At least 8 characters, longer is better</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Avoid common patterns</h4>
                    <p className="text-xs text-muted-foreground mt-1">Don't use "123456" or "password"</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Use unique passwords</h4>
                    <p className="text-xs text-muted-foreground mt-1">Don't reuse passwords from other accounts</p>
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
                    <p className="text-xs text-muted-foreground">You'll be logged out after changing your password</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Encrypted Storage</h4>
                    <p className="text-xs text-muted-foreground">Your password is securely encrypted</p>
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
              <p className="text-xs md:text-sm text-muted-foreground">
                Having trouble changing your password? Our support team is here to help.
              </p>
            </div>
            <button onClick={() => window.open("https://sirath.network/contact", "_blank")}
              className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-800 dark:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-300 dark:border-white/20 text-xs md:text-sm">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}