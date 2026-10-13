'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Fingerprint,
  Plus,
  Trash2,
  Laptop,
  Smartphone,
  Loader2,
  Key,
  ShieldCheck,
} from 'lucide-react';
import {
  createMeraPasskey,
  isWebAuthnSupported,
  isPasskeyCancellation,
  formatPasskeyErrorMessage,
} from '@/lib/agent/mera-passkey';

interface PasskeyItem {
  id: string;
  credentialId: string;
  deviceName: string;
  walletAddress: string | null;
  prfSupported: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export function PasskeySettings() {
  const { data: session } = useSession();
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPasskeys = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/passkey/list');
      if (res.ok) {
        const data = await res.json();
        setPasskeys(data.passkeys || []);
      }
    } catch (err) {
      console.error('Failed to load passkeys:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const handleRegisterPasskey = async () => {
    if (!isWebAuthnSupported()) {
      toast.error('Passkeys are not supported on this device or browser.');
      return;
    }

    try {
      setIsRegistering(true);

      const challengeRes = await fetch('/api/auth/passkey/challenge');
      if (!challengeRes.ok) {
        throw new Error('Failed to initialize passkey challenge');
      }
      const challengeData = await challengeRes.json();
      const challenge = challengeData.challenge;
      const userEmail = challengeData.user?.email || session?.user?.email || '';
      const userName =
        challengeData.user?.name ||
        session?.user?.name ||
        (userEmail ? userEmail.split('@')[0] : '');
      const userId = challengeData.user?.id || session?.user?.id;

      toast.info('Touch your biometric sensor or security key...', {
        duration: 3000,
      });

      const regResult = await createMeraPasskey({
        challenge,
        email: userEmail,
        name: userName,
        userId: userId,
      });

      const res = await fetch('/api/auth/passkey/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regResult),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to link passkey');
      }

      toast.success(
        'Passkey added successfully! You can now use it to sign in.',
      );
      await fetchPasskeys();
    } catch (err: any) {
      if (isPasskeyCancellation(err)) {
        toast.info('Passkey setup was cancelled.');
      } else {
        console.error('Passkey registration failed:', err);
        toast.error(formatPasskeyErrorMessage(err));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/auth/passkey/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete passkey');
      }

      toast.success('Passkey removed successfully.');
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove passkey');
    } finally {
      setDeletingId(null);
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    if (/phone|android|ios|apple/i.test(deviceName)) {
      return <Smartphone className="w-4 h-4 text-muted-foreground" />;
    }
    return <Laptop className="w-4 h-4 text-muted-foreground" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2 md:mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center shadow-sm border border-border">
            <Fingerprint className="w-5 h-5 md:w-6 md:h-6 text-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              Passkeys
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage biometric passkeys for fast, passwordless sign-in
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
          {/* Card Header */}
          <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">
                Linked Passkeys
              </h2>
              <p className="text-muted-foreground text-sm">
                Use Touch ID, Face ID, or Windows Hello on your devices to sign
                in securely without passwords.
              </p>
            </div>
            <button
              onClick={handleRegisterPasskey}
              disabled={isRegistering}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 flex-shrink-0"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Passkey
                </>
              )}
            </button>
          </div>

          {/* Passkeys List */}
          <div className="p-6 md:p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading passkeys...
              </div>
            ) : passkeys.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-xl p-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Fingerprint className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  No passkeys linked yet
                </h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Add a passkey to sign in to your account with biometric
                  authentication instead of entering a password.
                </p>
                <button
                  onClick={handleRegisterPasskey}
                  disabled={isRegistering}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Passkey
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {passkeys.map((p) => (
                  <div
                    key={p.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center border border-border">
                        {getDeviceIcon(p.deviceName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {p.deviceName}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Added on {new Date(p.createdAt).toLocaleDateString()}
                          {p.lastUsedAt &&
                            ` • Last used ${new Date(p.lastUsedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeletePasskey(p.id)}
                      disabled={deletingId === p.id}
                      className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Remove passkey"
                    >
                      {deletingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
