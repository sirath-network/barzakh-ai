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
  History,
  Settings2,
  Power,
  PowerOff,
  DollarSign,
  ArrowUpRight,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronUp,
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
  const [showHistory, setShowHistory] = useState(false);

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

  const formatTxType = (type: string) => {
    switch (type) {
      case "x402_subscription": return "Subscription";
      case "relay_swap": return "Swap";
      case "on_chain_tx": return "Transaction";
      case "transfer": return "Transfer";
      case "erc20_approve": return "Approval";
      default: return type;
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
    <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-xl">
              <Bot className="w-5 h-5 text-violet-500 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-foreground">Agent Automation</h2>
              <p className="text-sm text-muted-foreground">
                Let AI execute transactions from your embedded wallet
              </p>
            </div>
          </div>
          {status?.agentEnabled && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Active</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-6">

        {/* ── Step 1: Embedded Wallet ── */}
        {displayAddress ? (
          /* Show embedded wallet address */
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Wallet className="w-4 h-4 text-primary" />
                Your Embedded Wallet
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 font-semibold">
                  MPC
                </span>
              </div>
              <div className="flex items-center gap-3">
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
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedAddress ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copiedAddress ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-xs font-mono text-muted-foreground break-all">{displayAddress}</p>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              This is a separate wallet from your linked wallet. Fund it to enable autonomous AI operations.
            </p>
          </div>
        ) : (
          /* No embedded wallet — show create button */
          <div className="p-5 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5">
            <div className="text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-violet-600 dark:text-violet-400" />
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50"
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
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Total Spent by Agent (24h)</p>
              <p className="text-lg font-bold text-foreground">
                ${(status.spent24h || 0).toFixed(2)}
              </p>
            </div>

            {/* Transaction History */}
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <History className="w-4 h-4 text-muted-foreground" />
                  Recent Agent Transactions
                  {status.recentTransactions.length > 0 && (
                    <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                      {status.recentTransactions.length}
                    </span>
                  )}
                </div>
                {showHistory ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {showHistory && (
                <div className="border-t border-border">
                  {status.recentTransactions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No agent transactions yet. The AI will log all autonomous operations here.
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {status.recentTransactions.map((tx) => (
                        <div key={tx.id} className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {formatTxType(tx.type)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {tx.amount.startsWith('$') ? tx.amount : (tx.amount.toLowerCase() === 'all' || tx.amount.toLowerCase() === 'max' ? tx.amount : `$${tx.amount}`)}
                            </p>
                            <a
                              href={(function(chainId, hash) {
                                if (!hash) return '#';
                                // Default to Basescan if no chainId is known
                                const map: Record<number, string> = {
                                  1: 'https://etherscan.io',
                                  10: 'https://optimistic.etherscan.io',
                                  56: 'https://bscscan.com',
                                  137: 'https://polygonscan.com',
                                  8453: 'https://basescan.org',
                                  42161: 'https://arbiscan.io'
                                };
                                const base = (chainId && map[chainId as number]) ? map[chainId as number] : 'https://basescan.org';
                                return `${base}/tx/${hash}`;
                              })(tx.metadata?.chainId as number | undefined, tx.signature)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors flex items-center justify-end gap-1 mt-0.5"
                              title="View on Explorer"
                            >
                              View on Explorer
                              <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Disable Button */}
            <button
              onClick={handleRevoke}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 font-medium text-sm transition-colors disabled:opacity-50"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PowerOff className="w-4 h-4" />
              )}
              Disable Agent Automation
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
                    <div className="p-1.5 rounded-lg bg-primary/10 mt-0.5">
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
                    The AI operates autonomously. All transactions are logged and visible here. You can revoke access instantly if needed.
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
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 disabled:opacity-50"
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

          <DialogFooter className="sm:justify-between mt-4">
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
