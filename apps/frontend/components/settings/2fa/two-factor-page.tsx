"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  ShieldX,
  QrCode,
  Copy,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Key
} from "lucide-react";
import { OTPInput } from "@/components/ui/otp-input";

interface TwoFactorStatus {
  twoFactorEnabled: boolean;
  hasSecret: boolean;
}

interface SetupResponse {
  secret: string;
  qrCode: string;
  manualEntryKey: string;
}

interface BackupCodes {
  backupCodes: string[];
}

export default function TwoFactorSettingsPage() {
  const { data: session } = useSession();
  const [status, setStatus] = useState<TwoFactorStatus>({ twoFactorEnabled: false, hasSecret: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Setup state
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verificationToken, setVerificationToken] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [hasAutoSubmittedSetup, setHasAutoSubmittedSetup] = useState(false);
  const [hasAutoSubmittedDisable, setHasAutoSubmittedDisable] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/2fa/status");
      const data = await response.json();

      if (response.ok) {
        setStatus(data);
      } else {
        toast.error("Failed to fetch 2FA status");
      }
    } catch (error) {
      console.error("Error fetching 2FA status:", error);
      toast.error("Failed to fetch 2FA status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetup = async () => {
    setIsSettingUp(true);
    try {
      const response = await fetch("/api/2fa/setup", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setSetupData(data);
      } else {
        toast.error(data.error || "Failed to setup 2FA");
      }
    } catch (error) {
      console.error("Error setting up 2FA:", error);
      toast.error("Failed to setup 2FA");
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!verificationToken.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: verificationToken.trim(),
          action: "enable",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ twoFactorEnabled: true, hasSecret: true });
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setSetupData(null);
        setVerificationToken("");
        setHasAutoSubmittedSetup(false);
        toast.success("2FA enabled successfully!");
      } else {
        setHasAutoSubmittedSetup(false);
        toast.error(data.error || "Failed to verify 2FA code");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
      setHasAutoSubmittedSetup(false);
      toast.error("Failed to verify 2FA code");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisable = async () => {
    setIsDisabling(true);
    try {
      const response = await fetch("/api/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: verificationToken.trim(),
          action: "disable",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ twoFactorEnabled: false, hasSecret: false });
        setVerificationToken("");
        setShowDisableConfirm(false);
        setHasAutoSubmittedDisable(false);
        toast.success("2FA disabled successfully");
      } else {
        setHasAutoSubmittedDisable(false);
        toast.error(data.error || "Failed to disable 2FA");
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
      setHasAutoSubmittedDisable(false);
      toast.error("Failed to disable 2FA");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleRegenerateBackupCodes = async () => {
    setIsRegenerating(true);
    try {
      const response = await fetch("/api/2fa/backup-codes", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        toast.success("Backup codes regenerated");
      } else {
        toast.error(data.error || "Failed to regenerate backup codes");
      }
    } catch (error) {
      console.error("Error regenerating backup codes:", error);
      toast.error("Failed to regenerate backup codes");
    } finally {
      setIsRegenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadBackupCodes = () => {
    const content = `Barzakh 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}\n\nKeep these codes safe and secure. Each code can only be used once.`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'barzakh-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Backup codes downloaded");
  };

  const handleSetupOTPComplete = () => {
    if (!hasAutoSubmittedSetup && !isVerifying) {
      setHasAutoSubmittedSetup(true);
      setTimeout(() => {
        handleVerifyAndEnable();
      }, 150);
    }
  };

  const handleDisableOTPComplete = () => {
    if (!hasAutoSubmittedDisable && !isDisabling) {
      setHasAutoSubmittedDisable(true);
      setTimeout(() => {
        setShowDisableConfirm(true);
      }, 150);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground">Loading 2FA settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
              <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">Two-Factor Authentication</h1>
              <p className="text-sm md:text-base text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Card */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
            <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">Two-Factor Authentication</h2>
              <p className="text-muted-foreground text-sm">
                Add an extra layer of security to your account by requiring a code when you sign in.
              </p>
            </div>

            <div className="p-4 md:p-8 space-y-6">
              {/* Status Section */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/30 rounded-lg border border-border gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                    {status.twoFactorEnabled ? (
                      <ShieldCheck className="w-5 h-5 text-primary" />
                    ) : (
                      <ShieldX className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">
                      {status.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {status.twoFactorEnabled
                        ? "Your account is protected with two-factor authentication"
                        : "Enable 2FA to secure your account"
                      }
                    </p>
                  </div>
                </div>
                {!status.twoFactorEnabled && (
                  <button
                    onClick={handleSetup}
                    disabled={isSettingUp}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {isSettingUp ? (
                      <>
                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Enable 2FA
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Backup Codes Management Section - Only shown when 2FA is enabled */}
              {status.twoFactorEnabled && (
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                      <Key className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1">Backup Codes</h3>
                      <p className="text-sm text-muted-foreground">
                        Generate new backup codes to use when you don't have access to your authenticator app. Each code can only be used once.
                      </p>
                    </div>
                  </div>
                  <div className="pl-[52px]">
                    <button
                      onClick={handleRegenerateBackupCodes}
                      disabled={isRegenerating}
                      className="w-full sm:w-auto bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isRegenerating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span className="hidden sm:inline">Generate New Backup Codes</span>
                          <span className="sm:hidden">Generate Codes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Setup Flow */}
              {setupData && !status.twoFactorEnabled && (
                <div className="space-y-6">
                  {/* QR Code Section */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <QrCode className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">Scan QR Code</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
                    </p>
                    <div className="flex justify-center">
                      <img
                        src={setupData.qrCode}
                        alt="2FA QR Code"
                        className="w-40 h-40 sm:w-48 sm:h-48 border border-border rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  {/* Manual Entry Section */}
                  <div className="bg-muted/30 border border-border rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <Copy className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-semibold text-foreground">Manual Entry Key</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      If you can't scan the QR code, enter this key manually in your authenticator app:
                    </p>
                    <div className="flex items-center gap-2 p-3 bg-card rounded-lg border border-border">
                      <code className="flex-1 font-mono text-sm text-foreground break-all">
                        {showSecret ? setupData.manualEntryKey : "•".repeat(setupData.manualEntryKey.length)}
                      </code>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowSecret(!showSecret)}
                          tabIndex={-1}
                          className="p-2 text-muted-foreground hover:text-foreground"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(setupData.manualEntryKey)}
                          className="p-2 text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Verification Section */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 md:p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100">Verify Setup</h3>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                      Enter the 6-digit code from your authenticator app to complete the setup:
                    </p>
                    <div className="space-y-4">
                      <OTPInput
                        length={6}
                        value={verificationToken}
                        onChange={(value) => {
                          setVerificationToken(value);
                          if (value.length < 6) {
                            setHasAutoSubmittedSetup(false);
                          }
                        }}
                        onComplete={handleSetupOTPComplete}
                      />
                      <button
                        onClick={handleVerifyAndEnable}
                        disabled={isVerifying || verificationToken.length !== 6}
                        className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isVerifying ? (
                          <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            Verify & Enable 2FA
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Disable Section */}
              {status.twoFactorEnabled && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-zinc-700/50 rounded-xl p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldX className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <h3 className="font-semibold text-red-800 dark:text-red-300">Disable 2FA</h3>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-200 mb-4">
                    To disable 2FA, enter a current 2FA code from your authenticator app:
                  </p>
                  <div className="space-y-4">
                    <OTPInput
                      length={6}
                      value={verificationToken}
                      onChange={(value) => {
                        setVerificationToken(value);
                        if (value.length < 6) {
                          setHasAutoSubmittedDisable(false);
                        }
                      }}
                      onComplete={handleDisableOTPComplete}
                    />
                    <button
                      onClick={() => setShowDisableConfirm(true)}
                      disabled={isDisabling || verificationToken.length !== 6}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isDisabling ? (
                        <>
                          <div className="w-4 h-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin"></div>
                          Disabling...
                        </>
                      ) : (
                        <>
                          <ShieldX className="w-4 h-4" />
                          Disable 2FA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Backup Codes */}
              {showBackupCodes && backupCodes.length > 0 && (
                <div className="bg-muted/30 border border-border rounded-xl p-4 md:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Backup Codes</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Save these backup codes in a safe place. Each code can only be used once:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {backupCodes.map((code, index) => (
                      <div
                        key={index}
                        className="p-3 bg-card rounded border border-border font-mono text-xs sm:text-sm text-center break-all text-foreground"
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={downloadBackupCodes}
                      className="flex-1 bg-muted text-foreground hover:bg-muted/80 px-4 py-2 rounded-lg font-medium transition-colors border border-border text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Codes
                    </button>
                    <button
                      onClick={() => setShowBackupCodes(false)}
                      className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* 2FA Tips */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
                <h3 className="text-lg font-bold text-foreground mb-2">Security Tips</h3>
                <p className="text-muted-foreground text-sm">Keep your account secure</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Use a trusted app</h4>
                    <p className="text-xs text-muted-foreground mt-1">Google Authenticator, Authy, or Microsoft Authenticator</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Save backup codes</h4>
                    <p className="text-xs text-muted-foreground mt-1">Store them in a secure location</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Secure your device</h4>
                    <p className="text-xs text-muted-foreground mt-1">Keep your authenticator app protected</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Update regularly</h4>
                    <p className="text-xs text-muted-foreground mt-1">Regenerate backup codes periodically</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
                <h3 className="text-lg font-bold text-foreground mb-2">Why Enable 2FA?</h3>
                <p className="text-muted-foreground text-sm">Benefits of two-factor authentication</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Extra Protection</h4>
                    <p className="text-xs text-muted-foreground">Even if password is compromised</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Login Alerts</h4>
                    <p className="text-xs text-muted-foreground">Unauthorized access prevention</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground text-sm">Peace of Mind</h4>
                    <p className="text-xs text-muted-foreground">Enhanced account security</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-4 md:mt-6 bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-foreground mb-1">Need Help?</h3>
              <p className="text-xs md:text-sm text-muted-foreground">
                Having trouble with two-factor authentication? Our support team is here to help.
              </p>
            </div>
            <button onClick={() => window.open("https://barzakh.framer.ai/contact", "_blank")}
              className="bg-white dark:bg-white/10 hover:bg-gray-100 dark:hover:bg-white/20 text-gray-800 dark:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-300 dark:border-white/20 text-xs md:text-sm">
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Dialog */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-800/50 max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-zinc-800/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center shadow-lg border border-red-200 dark:border-zinc-700/50">
                  <ShieldX className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Disable Two-Factor Authentication
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    This action will reduce your account security
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      Security Warning
                    </h4>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Disabling 2FA will make your account less secure. You'll lose the extra protection against unauthorized access.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    What happens when you disable 2FA:
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Your account will only be protected by your password</li>
                    <li>• Backup codes will be deleted</li>
                    <li>• You'll need to set up 2FA again to re-enable it</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-zinc-800/30 bg-gray-50 dark:bg-zinc-900/80">
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  className="flex-1 bg-gray-100 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-zinc-800/30 px-4 py-3 rounded-lg font-medium transition-colors border border-gray-200 dark:border-zinc-800/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDisable}
                  disabled={isDisabling}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDisabling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Disabling...
                    </>
                  ) : (
                    "Yes, Disable 2FA"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}