"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Bot,
  Wallet,
  Shield,
  Loader2,
  AlertTriangle,
  Settings2,
  Power,
  PowerOff,
  HandCoins,
  Copy,
  CheckCircle,
  Zap,
  Info,
  Plus,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface AgentStatus {
  agentEnabled: boolean;
  serverConfigured: boolean;
  walletAddress: string | null;

  spent24h: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: string;
    signature: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
  }>;
}

export function AgentAutomationSection() {
  const { data: session } = useSession();

  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  const [copiedAddress, setCopiedAddress] = useState(false);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKeyVisible, setShowKeyVisible] = useState(false);


  // Embedded wallet address comes ONLY from the backend — never from client-side detection
  // This prevents confusion with the user's external wallet
  const displayAddress = status?.walletAddress || null;

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/agent");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch agent status:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchStatus();
    } else {
      setIsLoading(false);
    }
  }, [session, fetchStatus]);

  const handleCreateEmbeddedWallet = async () => {
    setIsCreatingWallet(true);
    try {
      // Create the agent wallet server-side (Dynamic's client-side createEmbeddedWallet
      // requires Dynamic auth, which we don't use in connect-only mode)
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_agent_wallet" }),
      });
      const data = await res.json();

      if (data.success && data.walletAddress) {
        toast.success("Agent wallet created!");
        fetchStatus(); // Refresh to show the new address from backend
      } else {
        toast.error(data.message || "Failed to create agent wallet");
      }
    } catch (error: any) {
      console.error("Failed to create agent wallet:", error);
      toast.error(error.message || "Failed to create agent wallet");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleRevoke = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Agent automation disabled");
        fetchStatus();
      } else {
        toast.error(data.message || "Failed to disable agent automation");
      }
    } catch (error) {
      toast.error("Failed to disable agent automation");
    } finally {
      setIsUpdating(false);
    }
  };



  const copyAddress = () => {
    const addr = displayAddress;
    if (addr) {
      navigator.clipboard.writeText(addr);
      setCopiedAddress(true);
      toast.success("Embedded wallet address copied");
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleExportKey = async () => {
    setIsExporting(true);
    setExportedKey(null);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_wallet" }),
      });
      const data = await res.json();
      if (data.success && data.privateKey) {
        setExportedKey(data.privateKey);
      } else {
        toast.error(data.message || "Failed to export private key");
      }
    } catch (error) {
      toast.error("Failed to export private key");
    } finally {
      setIsExporting(false);
    }
  };

  const copyPrivateKey = () => {
    if (exportedKey) {
      navigator.clipboard.writeText(exportedKey);
      setCopiedKey(true);
      toast.success("Private key copied to clipboard");
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };



  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
        <div className="p-6 md:p-8 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm transition-all duration-300">
      {/* Header */}
      <div className="p-5 sm:p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-border shadow-sm shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">Agent Automation</h2>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                AI-driven autonomous transactions
              </p>
            </div>
          </div>
          {status?.agentEnabled && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 md:p-8 space-y-6">

        {/* ── Step 1: Embedded Wallet ── */}
        {displayAddress ? (
          /* Show embedded wallet address */
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground min-w-0">
                <Wallet className="w-4 h-4 text-primary shrink-0" />
                <span className="truncate hidden xs:inline">Your Embedded Wallet</span>
                <span className="truncate xs:hidden">Wallet</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                  MPC
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => {
                    setShowExportModal(true);
                    if (!exportedKey) handleExportKey();
                  }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Key className="w-3.5 h-3.5" />
                  Export
                </button>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
                >
                  <Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  {copiedAddress ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground/80 break-all bg-muted/30 p-2 rounded-lg border border-border/30">{displayAddress}</p>
            <div className="flex items-start gap-2 mt-3 p-2.5 rounded-lg bg-primary/5 text-[11px] text-muted-foreground leading-relaxed">
              <Info className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Dedicated MPC wallet for autonomous operations.</span>
            </div>
          </div>
        ) : (
          /* No embedded wallet — show create button */
          <div className="p-5 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5">
            <div className="text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-border">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Embedded Wallet Required</p>
                <p className="text-xs text-muted-foreground mt-1">
                  A dedicated agent wallet will be generated for AI automation. This is separate from your connected wallet.
                </p>
              </div>
              <button
                onClick={handleCreateEmbeddedWallet}
                disabled={isCreatingWallet}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
              >
                {isCreatingWallet ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Embedded Wallet
              </button>
            </div>
          </div>
        )}

        {status?.agentEnabled ? (
          /* ── Agent is ENABLED ── */
          <div className="space-y-4">
            {/* Spend Summary */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/40 transition-colors">
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Spent (24h)</p>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  ${(status.spent24h || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-primary/5 rounded-lg border border-primary/10">
                <HandCoins className="w-4 h-4 text-primary/80" />
              </div>
            </div>


            {/* Disable Button */}
            <button
              onClick={handleRevoke}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border border-red-500/10 dark:border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/5 font-semibold text-sm transition-all disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PowerOff className="w-4 h-4" />
              )}
              Stop Agent Automation
            </button>
          </div>
        ) : (
          /* ── Agent is DISABLED ── */
          <div className="space-y-4">
            {/* How it works */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">How it works</h3>
              <div className="space-y-2.5">
                {[
                  {
                    icon: Wallet,
                    title: "Fund your agent wallet",
                    desc: "Send USDC, ETH, or tokens to the address above (separate from your connected wallet).",
                  },
                  {
                    icon: Shield,
                    title: "Enable automation",
                    desc: "Click 'Enable Agent Automation' to let the AI sign transactions from your agent wallet.",
                  },
                  {
                    icon: Zap,
                    title: "Fully autonomous",
                    desc: "AI executes swaps, subscriptions, and on-chain queries without manual approval.",
                  },
                  {
                    icon: Settings2,
                    title: "You're in control",
                    desc: "Revoke access at any time.",
                  },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5 shrink-0">
                      <step.icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{step.title}</p>
                      <p className="text-xs text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety notice */}
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Safety first</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400/80">
                    The AI operates autonomously. Total spent are visible here. You can revoke access instantly if needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Enable button — only if embedded wallet exists */}
            {!displayAddress ? (
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground text-center">
                  Create an agent wallet first to enable automation.
                </p>
              </div>
            ) : (
              <button
                onClick={async () => {
                  setIsUpdating(true);
                  try {
                    const res = await fetch("/api/settings/agent", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "enable" }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      toast.success("Agent automation enabled!");
                      fetchStatus();
                    } else {
                      toast.error(data.message || "Failed to enable agent automation");
                    }
                  } catch (error) {
                    toast.error("Failed to enable agent automation");
                  } finally {
                    setIsUpdating(false);
                  }
                }}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-50"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Power className="w-4 h-4" />
                )}
                Enable Agent Automation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Export Private Key Modal */}
      <Dialog open={showExportModal} onOpenChange={(open: boolean) => {
        setShowExportModal(open);
        if (!open) {
          // Clear sensitive data from memory when closed
          setTimeout(() => {
            setExportedKey(null);
            setShowKeyVisible(false);
            setCopiedKey(false);
          }, 300);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Export Private Key
            </DialogTitle>
            <DialogDescription>
              This is the private key for your embedded agent wallet.
              Anyone with this key has full control over the funds in this wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl mb-2">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-300">
                <p className="font-semibold mb-1">Warning: Never share this key</p>
                <p>Do not share this key with anyone. We will never ask you for this key. Keep it safe and secure.</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Private Key</Label>
            {isExporting ? (
              <div className="flex items-center justify-center p-4 border rounded-md bg-muted/50 h-[68px]">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : exportedKey ? (
              <div className="relative">
                <div className="flex items-center justify-between border rounded-md bg-muted/50 p-3 pr-12 break-all font-mono text-xs w-full min-h-[68px]">
                  {showKeyVisible ? exportedKey : "•".repeat(64)}
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyVisible(!showKeyVisible)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showKeyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            ) : (
              <div className="flex justify-center p-4 text-sm text-muted-foreground border rounded-md bg-muted/50">
                Failed to load private key.
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExportModal(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="default"
              className="gap-2"
              onClick={copyPrivateKey}
              disabled={!exportedKey}
            >
              {copiedKey ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Key
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
