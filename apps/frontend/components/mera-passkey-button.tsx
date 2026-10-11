"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Fingerprint, Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";
import {
  createMeraPasskey,
  authenticateWithMeraPasskey,
  isWebAuthnSupported,
  isPasskeyCancellation,
} from "@/lib/agent/mera-passkey";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MeraPasskeyButtonProps {
  mode?: "auto" | "login" | "register";
  variant?: "default" | "header" | "compact";
  email?: string;
  disabled?: boolean;
  onLoadingChange?: (loading: boolean) => void;
  className?: string;
}

export function MeraPasskeyButton({
  mode = "auto",
  variant = "default",
  email,
  disabled = false,
  onLoadingChange,
  className = "",
}: MeraPasskeyButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState("");
  const [activeChallenge, setActiveChallenge] = useState<string | null>(null);

  // Helper to fetch challenge
  const fetchChallenge = async (): Promise<{ challenge: string; user?: any }> => {
    const challengeRes = await fetch("/api/auth/passkey/challenge");
    if (!challengeRes.ok) {
      throw new Error("Failed to initialize passkey challenge.");
    }
    return await challengeRes.json();
  };

  // Helper to perform passkey registration
  const performRegistration = async (targetEmail: string, challengeStr: string) => {
    toast.info("Touch your biometric sensor or security key...", { duration: 3000 });

    const regResult = await createMeraPasskey({
      challenge: challengeStr,
      email: targetEmail,
      name: targetEmail.split("@")[0],
    });

    const saveRes = await fetch("/api/auth/passkey/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regResult),
    });

    const saveJson = await saveRes.json();
    if (!saveRes.ok) {
      throw new Error(saveJson.error || "Failed to create account with passkey.");
    }

    const signInRes = await signIn("credentials-passkey", {
      credentialId: saveJson.credentialId,
      sessionToken: saveJson.sessionToken,
      redirect: false,
    });

    if (signInRes?.error) {
      throw new Error(signInRes.error);
    }

    toast.success(`Welcome ${saveJson.user.name || targetEmail}! Account ready.`);
    setIsRegisterModalOpen(false);
    router.push("/");
    router.refresh();
  };

  // Helper to perform passkey login
  const performLogin = async (challengeStr: string): Promise<boolean> => {
    toast.info("Touch your biometric sensor or security key to sign in...", { duration: 3000 });
    const authResult = await authenticateWithMeraPasskey({ challenge: challengeStr });

    const verifyRes = await fetch("/api/auth/passkey/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authResult),
    });

    const verifyJson = await verifyRes.json();
    if (!verifyRes.ok) {
      throw new Error(verifyJson.error || "Passkey authentication failed.");
    }

    const signInRes = await signIn("credentials-passkey", {
      credentialId: verifyJson.credentialId,
      sessionToken: verifyJson.sessionToken,
      redirect: false,
    });

    if (signInRes?.error) {
      throw new Error(signInRes.error);
    }

    toast.success(`Welcome back, ${verifyJson.user.name || "User"}!`);
    router.push("/");
    router.refresh();
    return true;
  };

  const handlePasskeyAuth = async () => {
    if (!isWebAuthnSupported()) {
      toast.error("Passkeys are not supported on this browser or device.");
      return;
    }

    setIsLoading(true);
    onLoadingChange?.(true);

    try {
      const { challenge, user } = await fetchChallenge();
      setActiveChallenge(challenge);

      // Check if email is already available from props or from an input on the page
      let currentEmail = email?.trim() || user?.email || "";
      if (!currentEmail && typeof document !== "undefined") {
        const emailInput = document.querySelector('input[type="email"], input[name="email"]') as HTMLInputElement | null;
        if (emailInput?.value?.trim()) {
          currentEmail = emailInput.value.trim();
        }
      }

      if (mode === "register") {
        if (!currentEmail) {
          setIsRegisterModalOpen(true);
          return;
        }
        await performRegistration(currentEmail, challenge);
        return;
      }

      if (mode === "login") {
        await performLogin(challenge);
        return;
      }

      // Smart "auto" mode: Try login first (resident / discoverable key)
      try {
        await performLogin(challenge);
      } catch (authErr: any) {
        console.debug("[Smart Passkey] Login attempt yielded:", authErr?.message || authErr);

        // If user actively cancelled biometric dialog, cleanly exit without error or opening modal
        if (isPasskeyCancellation(authErr)) {
          toast.info("Passkey prompt was cancelled.");
          return;
        }

        // If no credential was found on device or login was not possible:
        // Transition seamlessly to registration without navigating to /register!
        if (currentEmail) {
          toast.info("Setting up your new passkey...", { duration: 3000 });
          await performRegistration(currentEmail, challenge);
        } else {
          // Open quick registration modal in place
          setIsRegisterModalOpen(true);
        }
      }
    } catch (err: any) {
      if (isPasskeyCancellation(err)) {
        toast.info("Passkey prompt was cancelled.");
      } else {
        console.error("[Passkey Error]:", err);
        toast.error(err.message || "Failed to authenticate with passkey.");
      }
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmail.trim() || !modalEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    onLoadingChange?.(true);

    try {
      let challengeToUse = activeChallenge;
      if (!challengeToUse) {
        const res = await fetchChallenge();
        challengeToUse = res.challenge;
        setActiveChallenge(challengeToUse);
      }
      await performRegistration(modalEmail.trim(), challengeToUse);
    } catch (err: any) {
      if (isPasskeyCancellation(err)) {
        toast.info("Passkey registration cancelled.");
      } else {
        console.error("[Passkey Modal Registration Error]:", err);
        toast.error(err.message || "Failed to register passkey.");
      }
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  // Render variant styles
  if (variant === "header") {
    return (
      <>
        <button
          type="button"
          onClick={handlePasskeyAuth}
          disabled={disabled || isLoading}
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border border-border bg-card/80 hover:bg-muted text-foreground transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Fingerprint className="w-3.5 h-3.5 text-foreground" />
          )}
          <span>Quick Passkey</span>
        </button>

        <PasskeyOnboardingDialog
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          email={modalEmail}
          setEmail={setModalEmail}
          onSubmit={handleModalSubmit}
          isLoading={isLoading}
        />
      </>
    );
  }

  const getButtonText = () => {
    if (isLoading) {
      if (mode === "register") return "Creating Account...";
      if (mode === "login") return "Signing in...";
      return "Authenticating...";
    }
    if (mode === "register") return "Sign Up with Passkey";
    if (mode === "login") return "Sign In with Passkey";
    return "Continue with Passkey";
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePasskeyAuth}
        disabled={disabled || isLoading}
        className={`group w-full flex items-center justify-center gap-2.5 h-10 px-4 rounded-md font-medium text-sm transition-all duration-200 border border-border bg-card/60 dark:bg-zinc-900/60 hover:bg-muted dark:hover:bg-zinc-800 text-foreground shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">{getButtonText()}</span>
          </>
        ) : (
          <>
            <Fingerprint className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors duration-200" />
            <span className="tracking-tight font-medium">{getButtonText()}</span>
          </>
        )}
      </button>

      <PasskeyOnboardingDialog
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        email={modalEmail}
        setEmail={setModalEmail}
        onSubmit={handleModalSubmit}
        isLoading={isLoading}
      />
    </>
  );
}

/**
 * Clean monochrome modal that prompts for email to link/create account seamlessly
 */
function PasskeyOnboardingDialog({
  isOpen,
  onClose,
  email,
  setEmail,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  setEmail: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-border text-foreground p-6 sm:p-7 rounded-xl shadow-xl">
        <DialogHeader className="space-y-2 text-center items-center">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-1">
            <Fingerprint className="w-6 h-6 text-foreground" />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
            Passkey Instant Access
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground max-w-xs mx-auto">
            No passkey found on this device yet. Enter your email to register and log in instantly with Touch ID, Face ID, or Windows Hello.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
              Email Address
            </label>
            <input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
            />
          </div>

          <div className="pt-1 space-y-2">
            <button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full h-10 rounded-lg bg-foreground text-background font-medium text-sm hover:bg-foreground/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting Biometrics...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Passkey & Sign In</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-muted-foreground">
              Zero passwords required. Biometrics never leave your device.
            </p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
