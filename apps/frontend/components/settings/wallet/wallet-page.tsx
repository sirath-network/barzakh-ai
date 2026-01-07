"use client";

import { useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Wallet, Shield, CheckCircle, Loader2, AlertCircle, Unplug, RefreshCw, Key, Lock, Globe, Copy, Mail } from "lucide-react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function WalletSettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [isUnbindModalOpen, setIsUnbindModalOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const [errorAlert, setErrorAlert] = useState<{ title: string, description: ReactNode } | null>(null);

  // Re-authentication state for wallet unbind
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [has2FA, setHas2FA] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [unbindPassword, setUnbindPassword] = useState("");
  const [unbindTwoFactorToken, setUnbindTwoFactorToken] = useState("");
  const [unbindEmailOtp, setUnbindEmailOtp] = useState("");
  const [unbindError, setUnbindError] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Re-authentication state for wallet change
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeRequiresAuth, setChangeRequiresAuth] = useState(false);
  const [changeHas2FA, setChangeHas2FA] = useState(false);
  const [changeUserEmail, setChangeUserEmail] = useState<string | null>(null);
  const [changePassword, setChangePassword] = useState("");
  const [changeTwoFactorToken, setChangeTwoFactorToken] = useState("");
  const [changeEmailOtp, setChangeEmailOtp] = useState("");
  const [changeError, setChangeError] = useState("");
  const [isSendingChangeOtp, setIsSendingChangeOtp] = useState(false);
  const [changeOtpSent, setChangeOtpSent] = useState(false);
  const [changeResendCooldown, setChangeResendCooldown] = useState(0);
  const [pendingWalletAddress, setPendingWalletAddress] = useState<string | null>(null);
  const [pendingSignature, setPendingSignature] = useState<string | null>(null);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const currentWallet = (session?.user as any)?.walletAddress;

  const resetUnbindState = () => {
    setRequiresAuth(false);
    setHas2FA(false);
    setUserEmail(null);
    setUnbindPassword("");
    setUnbindTwoFactorToken("");
    setUnbindEmailOtp("");
    setUnbindError("");
    setOtpSent(false);
    setResendCooldown(0);
  };

  const handleUnbindModalClose = (open: boolean) => {
    setIsUnbindModalOpen(open);
    if (!open) {
      resetUnbindState();
    }
  };

  const sendEmailOtp = async () => {
    setIsSendingOtp(true);
    setUnbindError("");
    try {
      const res = await fetch("/api/settings/wallet/unbind/send-otp", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setOtpSent(true);
      toast.success("Verification code sent to your email");

      // Start cooldown timer (60 seconds)
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      setUnbindError(error.message || "Failed to send verification code");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const unbindWallet = async () => {
    setIsUnbinding(true);
    setUnbindError("");
    try {
      const body: { password?: string; twoFactorToken?: string; emailOtp?: string } = {};
      if (unbindPassword) body.password = unbindPassword;
      if (unbindTwoFactorToken) body.twoFactorToken = unbindTwoFactorToken;
      if (unbindEmailOtp) body.emailOtp = unbindEmailOtp;

      const res = await fetch("/api/settings/wallet/unbind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        // Check if re-authentication is required
        if (data.requiresAuth) {
          setRequiresAuth(true);
          setHas2FA(data.has2FA || false);
          setUserEmail(data.userEmail || null);
          return;
        }
        throw new Error(data.error || "Failed to unbind wallet");
      }

      toast.success("Wallet disconnected successfully");

      // Update session
      await update({
        user: {
          ...session?.user,
          walletAddress: null
        }
      });

      handleUnbindModalClose(false);
      // Also disconnect from wagmi if it's the same wallet
      if (address === currentWallet) {
        disconnect();
      }
    } catch (error: any) {
      setUnbindError(error.message || "Failed to unbind wallet");
    } finally {
      setIsUnbinding(false);
    }
  };

  // Check if form is valid for submission
  const isUnbindFormValid = () => {
    if (!requiresAuth) return true;
    if (!unbindPassword) return false;
    if (has2FA) {
      return unbindTwoFactorToken.length === 6;
    } else {
      return unbindEmailOtp.length === 6;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard");
  };

  const resetChangeState = () => {
    setChangeRequiresAuth(false);
    setChangeHas2FA(false);
    setChangeUserEmail(null);
    setChangePassword("");
    setChangeTwoFactorToken("");
    setChangeEmailOtp("");
    setChangeError("");
    setChangeOtpSent(false);
    setChangeResendCooldown(0);
    setPendingWalletAddress(null);
    setPendingSignature(null);
    setPendingMessage(null);
  };

  const handleChangeModalClose = (open: boolean) => {
    setIsChangeModalOpen(open);
    if (!open) {
      resetChangeState();
    }
  };

  const sendChangeEmailOtp = async () => {
    setIsSendingChangeOtp(true);
    setChangeError("");
    try {
      const res = await fetch("/api/settings/wallet/bind/send-otp", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      setChangeOtpSent(true);
      toast.success("Verification code sent to your email");

      // Start cooldown timer (60 seconds)
      setChangeResendCooldown(60);
      const interval = setInterval(() => {
        setChangeResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      setChangeError(error.message || "Failed to send verification code");
    } finally {
      setIsSendingChangeOtp(false);
    }
  };

  const isChangeFormValid = () => {
    if (!changeRequiresAuth) return true;
    if (!changePassword) return false;
    if (changeHas2FA) {
      return changeTwoFactorToken.length === 6;
    } else {
      return changeEmailOtp.length === 6;
    }
  };

  const initiateWalletChange = async (walletAddress: string) => {
    // If user already has a wallet, open the change modal first
    if (currentWallet) {
      setIsLoading(true);
      try {
        // 1. Get Nonce
        const nonceRes = await fetch("/api/settings/wallet/nonce");
        if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
        const { nonce } = await nonceRes.json();

        // 2. Sign Message
        const message = `Barzakh AI wants you to bind your wallet:\n${walletAddress}\n\nNonce: ${nonce}`;
        const signature = await signMessageAsync({ message });

        // Store pending data
        setPendingWalletAddress(walletAddress);
        setPendingSignature(signature);
        setPendingMessage(message);

        // 3. Try to bind - will fail with requiresAuth if changing wallet
        const res = await fetch("/api/settings/wallet/bind", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: walletAddress, signature, message }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.requiresAuth) {
            setChangeRequiresAuth(true);
            setChangeHas2FA(data.has2FA || false);
            setChangeUserEmail(data.userEmail || null);
            setIsChangeModalOpen(true);
            return;
          }
          throw new Error(data.error || "Failed to bind wallet");
        }

        toast.success("Wallet connected successfully!");
        await update({
          user: {
            ...session?.user,
            walletAddress: walletAddress
          }
        });
      } catch (error: any) {
        if (error.name === 'UserRejectedRequestError' ||
          error.message?.includes('User rejected the request') ||
          error.code === 4001) {
          toast.info("Wallet binding cancelled");
        } else if (error.message === "Wallet address already connected to another account") {
          setErrorAlert({
            title: "Wallet Address Already Linked to Another Account",
            description: (
              <div className="space-y-3 mt-2">
                <p>The associated wallet address is tied to another user account. If you are the owner, please sign in to that account and follow the steps below:</p>
                <div className="flex flex-col gap-1 pl-2 font-medium">
                  <span>• Settings</span>
                  <span>• Profile Settings</span>
                  <span>• Delete Account</span>
                </div>
                <p>Once the process is finalized, you can Bind the wallet address to your existing account.</p>
              </div>
            )
          });
          setTimeout(() => setErrorAlert(null), 30000);
        } else if (error.message?.includes("You need to set a password") || error.message?.includes("complete your account setup") || error.message?.includes("finalize your account setup")) {
          // Handle specific validation error without console.error to avoid Next.js overlay
          toast.error(error.message);
        } else {
          console.error(error);
          toast.error(error.message || "Failed to bind wallet");
        }
        disconnect();
      } finally {
        setIsLoading(false);
      }
    } else {
      // No existing wallet - proceed with normal bind
      await bindWallet(walletAddress);
    }
  };

  const completeWalletChange = async () => {
    if (!pendingWalletAddress || !pendingSignature || !pendingMessage) {
      setChangeError("Missing wallet data. Please try again.");
      return;
    }

    setIsLoading(true);
    setChangeError("");
    try {
      const body: {
        address: string;
        signature: string;
        message: string;
        password?: string;
        twoFactorToken?: string;
        emailOtp?: string;
      } = {
        address: pendingWalletAddress,
        signature: pendingSignature,
        message: pendingMessage,
      };

      if (changePassword) body.password = changePassword;
      if (changeTwoFactorToken) body.twoFactorToken = changeTwoFactorToken;
      if (changeEmailOtp) body.emailOtp = changeEmailOtp;

      const res = await fetch("/api/settings/wallet/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change wallet");
      }

      toast.success(currentWallet ? "Wallet changed successfully!" : "Wallet connected successfully!");
      await update({
        user: {
          ...session?.user,
          walletAddress: pendingWalletAddress
        }
      });

      handleChangeModalClose(false);
    } catch (error: any) {
      setChangeError(error.message || "Failed to change wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const bindWallet = async (walletAddress: string) => {
    setIsLoading(true);
    try {
      // 1. Get Nonce
      const nonceRes = await fetch("/api/settings/wallet/nonce");
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
      const { nonce } = await nonceRes.json();

      // 2. Sign Message
      const message = `Barzakh AI wants you to bind your wallet:\n${walletAddress}\n\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // 3. Call Bind API
      const res = await fetch("/api/settings/wallet/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, signature, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 && data.requiresAuth) {
          setPendingWalletAddress(walletAddress);
          setPendingSignature(signature);
          setPendingMessage(message);
          setChangeHas2FA(data.has2FA || false);
          setChangeUserEmail(data.userEmail || null);
          setIsChangeModalOpen(true);
          return;
        }
        throw new Error(data.error || "Failed to bind wallet");
      }

      toast.success("Wallet connected successfully!");

      // Update session
      await update({
        user: {
          ...session?.user,
          walletAddress: walletAddress
        }
      });

    } catch (error: any) {
      // Handle user rejection specifically
      if (error.name === 'UserRejectedRequestError' ||
        error.message?.includes('User rejected the request') ||
        error.code === 4001) {
        toast.info("Wallet binding cancelled");
      } else if (error.message === "Wallet address already connected to another account") {
        // Handle specific business logic errors without console.error to avoid Next.js overlay
        setErrorAlert({
          title: "Wallet Address Already Linked to Another Account",
          description: (
            <div className="space-y-3 mt-2">
              <p>The associated wallet address is tied to another user account. If you are the owner, please sign in to that account and follow the steps below:</p>
              <div className="flex flex-col gap-1 pl-2 font-medium">
                <span>• Settings</span>
                <span>• Profile Settings</span>
                <span>• Delete Account</span>
              </div>
              <p>Once the process is finalized, you can Bind the wallet address to your existing account.</p>
            </div>
          )
        });
        setTimeout(() => setErrorAlert(null), 30000);
      } else if (error.message?.includes("You need to set a password") || error.message?.includes("complete your account setup") || error.message?.includes("finalize your account setup")) {
        // Handle specific validation error without console.error to avoid Next.js overlay
        toast.error(error.message);
      } else {
        console.error(error);
        toast.error(error.message || "Failed to bind wallet");
      }
      disconnect(); // Disconnect on error so they can try again
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-stone-950 dark:to-stone-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
              <Wallet className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Wallet Connection</h1>
              <p className="text-sm md:text-base text-muted-foreground">Manage your connected Web3 wallet</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Card */}
          <div className="lg:col-span-2 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-stone-800/50 overflow-hidden backdrop-blur-sm">
            <div className="p-6 md:p-8 border-b border-gray-200 dark:border-stone-800/30">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Connected Wallet</h2>
              <p className="text-muted-foreground text-sm">
                Connect your wallet to sign in with Web3.
              </p>
            </div>

            <div className="p-6 md:p-8 space-y-6">
              {errorAlert && (
                <div className="bg-destructive/10 dark:bg-red-500/10 rounded-xl p-4 border border-destructive/20 dark:border-red-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-destructive dark:text-red-400 mb-1">{errorAlert.title}</h3>
                      <div className="text-sm text-destructive/90 dark:text-red-400/90 leading-relaxed">
                        {errorAlert.description}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentWallet ? (
                <div className="space-y-6">
                  <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
                    <div className="flex items-start gap-3 w-full min-w-0">
                      <div className="p-2 bg-primary/10 rounded-full shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground mb-1">Wallet Connected</p>
                        <div className="flex items-center gap-2 bg-muted/40 rounded-md px-3 py-1.5 w-full max-w-full border border-border overflow-hidden">
                          <p className="text-xs text-muted-foreground font-mono truncate flex-1 min-w-0">
                            {currentWallet}
                          </p>
                          <button
                            onClick={() => copyToClipboard(currentWallet)}
                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1.5 hover:bg-muted rounded-md"
                            title="Copy address"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <div className="w-px h-4 bg-border mx-1 shrink-0" />

                          <Dialog open={isUnbindModalOpen} onOpenChange={handleUnbindModalClose}>
                            <DialogTrigger asChild>
                              <button
                                className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors shrink-0 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                              >
                                <Unplug className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Disconnect</span>
                                <span className="lg:hidden">Unbind</span>
                              </button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  {requiresAuth ? "Verify Your Identity" : "Disconnect Wallet"}
                                </DialogTitle>
                                <DialogDescription>
                                  {requiresAuth
                                    ? "For security, please verify your identity to disconnect your wallet."
                                    : "Are you sure you want to disconnect your wallet? You won't be able to sign in with Web3 until you reconnect it."
                                  }
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4 py-2">
                                {unbindError && (
                                  <div className="p-3 bg-destructive/10 dark:bg-red-500/10 border border-destructive/20 dark:border-red-500/20 rounded-lg">
                                    <p className="text-sm text-destructive dark:text-red-400">{unbindError}</p>
                                  </div>
                                )}

                                {requiresAuth && (
                                  <div className="space-y-4">

                                    {/* Password field - always required */}
                                    <div className="space-y-2">
                                      <Label htmlFor="unbind-password">Password</Label>
                                      <Input
                                        id="unbind-password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={unbindPassword}
                                        onChange={(e) => setUnbindPassword(e.target.value)}
                                        autoComplete="current-password"
                                      />
                                    </div>

                                    {/* 2FA TOTP - if user has 2FA enabled */}
                                    {has2FA && (
                                      <div className="space-y-2">
                                        <Label htmlFor="unbind-2fa">2FA Code</Label>
                                        <Input
                                          id="unbind-2fa"
                                          type="text"
                                          inputMode="numeric"
                                          pattern="[0-9]*"
                                          maxLength={6}
                                          placeholder="Enter 6-digit code from authenticator"
                                          value={unbindTwoFactorToken}
                                          onChange={(e) => setUnbindTwoFactorToken(e.target.value.replace(/\D/g, ""))}
                                          autoComplete="one-time-code"
                                        />
                                      </div>
                                    )}

                                    {/* Email OTP - if user doesn't have 2FA */}
                                    {!has2FA && (
                                      <div className="space-y-2">
                                        <Label htmlFor="unbind-email-otp">Email Verification Code</Label>
                                        {!otpSent ? (
                                          <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground">
                                              We'll send a verification code to {userEmail || "your email"}.
                                            </p>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              onClick={sendEmailOtp}
                                              disabled={isSendingOtp}
                                              className="w-full"
                                            >
                                              {isSendingOtp ? (
                                                <>
                                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                  Sending...
                                                </>
                                              ) : (
                                                <>
                                                  <Mail className="w-4 h-4 mr-2" />
                                                  Send Verification Code
                                                </>
                                              )}
                                            </Button>
                                          </div>
                                        ) : (
                                          <div className="space-y-2">
                                            <Input
                                              id="unbind-email-otp"
                                              type="text"
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              maxLength={6}
                                              placeholder="Enter 6-digit code from email"
                                              value={unbindEmailOtp}
                                              onChange={(e) => setUnbindEmailOtp(e.target.value.replace(/\D/g, ""))}
                                              autoComplete="one-time-code"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                              Code sent to {userEmail || "your email"}.{" "}
                                              {resendCooldown > 0 ? (
                                                <span>Resend in {resendCooldown}s</span>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={sendEmailOtp}
                                                  disabled={isSendingOtp}
                                                  className="text-primary hover:underline"
                                                >
                                                  Resend code
                                                </button>
                                              )}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                              </div>

                              <DialogFooter>
                                {unbindError && !requiresAuth ? (
                                  <Button onClick={() => handleUnbindModalClose(false)}>Understood</Button>
                                ) : (
                                  <>
                                    <Button variant="outline" onClick={() => handleUnbindModalClose(false)}>Cancel</Button>
                                    <Button
                                      variant="destructive"
                                      onClick={unbindWallet}
                                      disabled={isUnbinding || (requiresAuth && !isUnbindFormValid())}
                                    >
                                      {isUnbinding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                      {requiresAuth ? "Verify & Disconnect" : "Disconnect"}
                                    </Button>
                                  </>
                                )}
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Change Wallet Section */}
                  <div className="border-t border-border pt-6">
                    <h3 className="text-sm font-medium text-foreground mb-4">Change Wallet</h3>

                    {isConnected && address && address !== currentWallet ? (
                      <div className="p-4 bg-muted/50 border border-border rounded-lg space-y-3">
                        <div className="flex items-start gap-3">
                          <RefreshCw className="w-5 h-5 text-primary mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-foreground">New Wallet Detected</h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              You are connected to <span className="font-mono font-bold text-foreground">{address}</span> in your browser extension.
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => initiateWalletChange(address)}
                          disabled={isLoading}
                          className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border-0"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
                          Switch to this Wallet
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                          To change your wallet, first connect a different wallet in your browser extension.
                        </p>
                        {isConnected ? (
                          <button
                            onClick={() => disconnect()}
                            className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground font-semibold transition-colors text-sm"
                          >
                            Disconnect Extension
                          </button>
                        ) : (
                          <button
                            onClick={openConnectModal}
                            className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground font-semibold transition-colors text-sm"
                          >
                            Connect Extension
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {!errorAlert && (
                    <div className="bg-muted/30 rounded-xl p-4 border border-border">
                      <div className="flex gap-3">
                        <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">Secure Connection</h3>
                          <p className="text-sm text-muted-foreground">
                            Connecting your wallet allows you to sign in securely without a password. We will ask you to sign a message to verify ownership.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isConnected && address ? (
                    <div className="p-5 bg-muted/50 border border-border rounded-xl space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                          <Wallet className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground">Wallet Detected</h3>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{address}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => bindWallet(address)}
                          disabled={isLoading}
                          className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                          Bind This Wallet
                        </button>
                        <button
                          onClick={() => disconnect()}
                          className="px-4 py-2.5 border border-border rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground text-sm font-medium transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={openConnectModal}
                      className="w-full py-4 px-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <Wallet className="w-5 h-5" />
                      Connect Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Tips */}
            <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-stone-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-stone-800/30">
                <h3 className="text-lg font-bold text-foreground mb-2">Wallet Safety</h3>
                <p className="text-muted-foreground text-sm">Keep your assets secure</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Key className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Private Keys</h4>
                    <p className="text-xs text-muted-foreground mt-1">Never share your private keys or seed phrase with anyone.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Verify URLs</h4>
                    <p className="text-xs text-muted-foreground mt-1">Always check you are on the correct website before connecting.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Hardware Wallets</h4>
                    <p className="text-xs text-muted-foreground mt-1">Use a hardware wallet like Ledger or Trezor for extra security.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-stone-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-stone-800/30">
                <h3 className="text-lg font-bold text-foreground mb-2">Web3 Features</h3>
                <p className="text-muted-foreground text-sm">Why connect your wallet?</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Passwordless Login</h4>
                    <p className="text-xs text-muted-foreground">Sign in securely with just your wallet signature.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Non-Custodial</h4>
                    <p className="text-xs text-muted-foreground">You maintain full control of your identity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-stone-800/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground mb-1">Need Help?</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Having trouble connecting your wallet? Our support team is here to help.
              </p>
            </div>
            <button onClick={() => window.open("https://barzakh.framer.ai/contact", "_blank")}
              className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-800 dark:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-300 dark:border-white/20 text-xs md:text-sm">
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* Change Wallet Verification Dialog */}
      <Dialog open={isChangeModalOpen} onOpenChange={handleChangeModalClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Identity</DialogTitle>
            <DialogDescription>
              For security, please verify your identity to {currentWallet ? "change" : "connect"} your wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {changeError && (
              <div className="p-3 bg-destructive/10 dark:bg-red-500/10 border border-destructive/20 dark:border-red-500/20 rounded-lg">
                <p className="text-sm text-destructive dark:text-red-400">{changeError}</p>
              </div>
            )}

            {/* Password field - always required */}
            <div className="space-y-2">
              <Label htmlFor="change-password">Password</Label>
              <Input
                id="change-password"
                type="password"
                placeholder="Enter your password"
                value={changePassword}
                onChange={(e) => setChangePassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {/* 2FA TOTP - if user has 2FA enabled */}
            {changeHas2FA && (
              <div className="space-y-2">
                <Label htmlFor="change-2fa">2FA Code</Label>
                <Input
                  id="change-2fa"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="Enter 6-digit code from authenticator"
                  value={changeTwoFactorToken}
                  onChange={(e) => setChangeTwoFactorToken(e.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                />
              </div>
            )}

            {/* Email OTP - if user doesn't have 2FA */}
            {!changeHas2FA && (
              <div className="space-y-2">
                <Label htmlFor="change-email-otp">Email Verification Code</Label>
                {!changeOtpSent ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      We'll send a verification code to {changeUserEmail || "your email"}.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendChangeEmailOtp}
                      disabled={isSendingChangeOtp}
                      className="w-full"
                    >
                      {isSendingChangeOtp ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Verification Code
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      id="change-email-otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="Enter 6-digit code from email"
                      value={changeEmailOtp}
                      onChange={(e) => setChangeEmailOtp(e.target.value.replace(/\D/g, ""))}
                      autoComplete="one-time-code"
                    />
                    <p className="text-xs text-muted-foreground">
                      Code sent to {changeUserEmail || "your email"}.{" "}
                      {changeResendCooldown > 0 ? (
                        <span>Resend in {changeResendCooldown}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={sendChangeEmailOtp}
                          disabled={isSendingChangeOtp}
                          className="text-primary hover:underline"
                        >
                          Resend code
                        </button>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleChangeModalClose(false)}>Cancel</Button>
            <Button
              onClick={completeWalletChange}
              disabled={isLoading || !isChangeFormValid()}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify & {currentWallet ? "Change" : "Connect"} Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
