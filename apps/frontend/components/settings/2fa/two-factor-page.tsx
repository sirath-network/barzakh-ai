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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        toast.success("2FA enabled successfully!");
      } else {
        toast.error(data.error || "Failed to verify 2FA code");
      }
    } catch (error) {
      console.error("Error verifying 2FA:", error);
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
        toast.success("2FA disabled successfully");
      } else {
        toast.error(data.error || "Failed to disable 2FA");
      }
    } catch (error) {
      console.error("Error disabling 2FA:", error);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-900 dark:text-white">Loading 2FA settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-3 sm:p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-black/80 rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
          <div className="p-4 sm:p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-red-800/50 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-red-700/50 flex-shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-red-300" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Add an extra layer of security to your account
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6 md:space-y-8">
            {/* Current Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 sm:gap-4">
                {status.twoFactorEnabled ? (
                  <ShieldCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                ) : (
                  <ShieldX className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                    {status.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {status.twoFactorEnabled 
                      ? "Your account is protected with two-factor authentication"
                      : "Enable 2FA to secure your account with an additional verification step"
                    }
                  </p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {!status.twoFactorEnabled && (
                  <Button
                    onClick={handleSetup}
                    disabled={isSettingUp}
                    className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none text-sm sm:text-base"
                  >
                    {isSettingUp ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Setting up...</span>
                        <span className="sm:hidden">Setting up...</span>
                      </div>
                    ) : (
                      "Enable 2FA"
                    )}
                  </Button>
                )}
                {status.twoFactorEnabled && (
                  <Button
                    onClick={handleRegenerateBackupCodes}
                    disabled={isRegenerating}
                    variant="outline"
                    className="border-gray-300 dark:border-gray-600 flex-1 sm:flex-none text-sm sm:text-base"
                  >
                    {isRegenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span className="hidden sm:inline">Regenerate Backup Codes</span>
                        <span className="sm:hidden">Regenerate</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Setup Flow */}
            {setupData && !status.twoFactorEnabled && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-black-900 dark:text-black-100 text-sm sm:text-base">
                      Scan QR Code
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-white-800 dark:text-white-200 mb-4">
                    Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
                  </p>
                  <div className="flex justify-center mb-4">
                    <img 
                      src={setupData.qrCode} 
                      alt="2FA QR Code" 
                      className="w-40 h-40 sm:w-48 sm:h-48 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 border border-red-200 dark:border-red-700 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Copy className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                      Manual Entry Key
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
                    If you can&apos;t scan the QR code, enter this key manually in your authenticator app:
                  </p>
                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600">
                    <code className="flex-1 font-mono text-xs sm:text-sm text-gray-900 dark:text-white break-all">
                      {showSecret ? setupData.manualEntryKey : "•".repeat(setupData.manualEntryKey.length)}
                    </code>
                    <div className="flex gap-1">
                      <Button
                        onClick={() => setShowSecret(!showSecret)}
                        variant="ghost"
                        size="sm"
                        className="p-2"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(setupData.manualEntryKey)}
                        variant="ghost"
                        size="sm"
                        className="p-2"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm sm:text-base">
                      Verify Setup
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                    Enter the 6-digit code from your authenticator app to complete the setup:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="text"
                      placeholder="000000"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="flex-1 text-center text-base sm:text-lg font-mono tracking-widest"
                      maxLength={6}
                    />
                    <Button
                      onClick={handleVerifyAndEnable}
                      disabled={isVerifying || verificationToken.length !== 6}
                      className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto text-sm sm:text-base"
                    >
                      {isVerifying ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Verifying...
                        </div>
                      ) : (
                        "Verify & Enable"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Disable Flow */}
            {status.twoFactorEnabled && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <ShieldX className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-900 dark:text-red-100 text-sm sm:text-base">
                    Disable 2FA
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-red-800 dark:text-red-200 mb-4">
                  To disable 2FA, enter a current 2FA code from your authenticator app:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="flex-1 text-center text-base sm:text-lg font-mono tracking-widest"
                    maxLength={6}
                  />
                  <Button
                    onClick={() => setShowDisableConfirm(true)}
                    disabled={isDisabling || verificationToken.length !== 6}
                    variant="destructive"
                    className="w-full sm:w-auto text-sm sm:text-base"
                  >
                    {isDisabling ? (
                      <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Disabling...
                      </div>
                    ) : (
                      "Disable 2FA"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Backup Codes */}
            {showBackupCodes && backupCodes.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100 text-sm sm:text-base">
                    Backup Codes
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 mb-4">
                  Save these backup codes in a safe place. Each code can only be used once:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="p-2 bg-white dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 font-mono text-xs sm:text-sm text-center"
                    >
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={downloadBackupCodes}
                    variant="outline"
                    className="border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 flex-1 sm:flex-none text-sm sm:text-base"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Codes
                  </Button>
                  <Button
                    onClick={() => setShowBackupCodes(false)}
                    variant="ghost"
                    className="flex-1 sm:flex-none text-sm sm:text-base"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Dialog */}
      {showDisableConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-black rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-red-900/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center shadow-lg border border-red-200 dark:border-red-700/50">
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
                      Disabling 2FA will make your account less secure. You&apos;ll lose the extra protection against unauthorized access.
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
                    <li>• You&apos;ll need to set up 2FA again to re-enable it</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-red-900/30 bg-gray-50 dark:bg-black/80">
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowDisableConfirm(false)}
                  variant="outline"
                  className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDisable}
                  disabled={isDisabling}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {isDisabling ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Disabling...
                    </div>
                  ) : (
                    "Yes, Disable 2FA"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
