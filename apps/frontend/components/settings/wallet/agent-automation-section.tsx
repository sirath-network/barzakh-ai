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
  Plus,
  Key,
  Eye,
  EyeOff,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type WalletChain = "evm" | "solana" | "sui";

interface WalletInfo {
  walletAddress: string;
  chain: WalletChain;
  createdAt: string;
}

interface AgentStatus {
  agentEnabled: boolean;
  evmEnabled: boolean;
  solanaEnabled: boolean;
  suiEnabled: boolean;
  serverConfigured: boolean;
  walletAddress: string | null;
  wallets: WalletInfo[];
  evmWalletAddress: string | null;
  solanaWalletAddress: string | null;
  suiWalletAddress: string | null;

  spent24h: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: string;
    signature: string;
    metadata?: Record<string, unknown>;
    explorerUrl?: string;
    chainName?: string;
    createdAt: string;
  }>;
}

const CHAIN_CONFIG = {
  evm: {
    label: "EVM",
    sublabel: "Ethereum, BSC, Base, etc.",
    iconDark: "/images/embeded-wallet-icon/dark-evm.png",
    iconLight: "/images/embeded-wallet-icon/light-evm.png",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    tag: "EVM",
    explorerPrefix: "https://etherscan.io/address/",
  },
  solana: {
    label: "Solana",
    sublabel: "SOL, SPL Tokens",
    iconDark: "/images/embeded-wallet-icon/dark-solana.png",
    iconLight: "/images/embeded-wallet-icon/light-solana.png",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    tag: "SOL",
    explorerPrefix: "https://solscan.io/account/",
  },
  sui: {
    label: "Sui",
    sublabel: "SUI, Move objects, Walrus demos",
    iconDark: "/images/icon/sui/sui-light.png",
    iconLight: "/images/icon/sui/sui-dark.png",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    tag: "SUI",
    explorerPrefix: "https://suiscan.xyz/mainnet/address/",
  },
} as const;

const getChainBadgeColor = (chainName: string) => {
  const name = chainName.toLowerCase();
  if (name.includes("sui")) return "bg-cyan-500/10 text-cyan-500";
  if (name.includes("solana")) return "bg-purple-500/10 text-purple-500";
  if (name.includes("arc")) return "bg-blue-500/10 text-blue-500";
  if (name.includes("bnb") || name.includes("binance")) return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
  if (name.includes("monad")) return "bg-fuchsia-500/10 text-fuchsia-500";
  if (name.includes("base")) return "bg-blue-500/10 text-blue-500";
  if (name.includes("arbitrum")) return "bg-sky-500/10 text-sky-500";
  if (name.includes("optimism")) return "bg-red-500/10 text-red-500";
  if (name.includes("polygon")) return "bg-violet-500/10 text-violet-500";
  if (name.includes("ethereum") || name.includes("mainnet")) return "bg-indigo-500/10 text-indigo-500";
  return "bg-zinc-500/10 text-zinc-500 dark:text-zinc-400";
};

const middleTruncateAddress = (address: string, prefix = 12, suffix = 10) => {
  if (address.length <= prefix + suffix + 3) return address;
  return `${address.slice(0, prefix)}…${address.slice(-suffix)}`;
};

export function AgentAutomationSection() {
  const { data: session } = useSession();

  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreatingWallet, setIsCreatingWallet] = useState<WalletChain | null>(null);

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportChain, setExportChain] = useState<WalletChain>("evm");
  const [isExporting, setIsExporting] = useState(false);
  const [exportedKey, setExportedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKeyVisible, setShowKeyVisible] = useState(false);

  // Delete wallet state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChain, setDeleteChain] = useState<WalletChain>("evm");
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCreateWallet = async (chain: WalletChain) => {
    setIsCreatingWallet(chain);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_agent_wallet", chain }),
      });
      const data = await res.json();

      if (data.success && data.walletAddress) {
        fetchStatus();
      } else {
        toast.error(data.message || `Failed to create ${CHAIN_CONFIG[chain].label} wallet`);
      }
    } catch (error: any) {
      console.error(`Failed to create ${chain} wallet:`, error);
      toast.error(error.message || `Failed to create ${CHAIN_CONFIG[chain].label} wallet`);
    } finally {
      setIsCreatingWallet(null);
    }
  };

  const handleToggleAutomation = async (chain: WalletChain, enable: boolean) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: enable ? "enable" : "revoke", chain }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStatus();
      } else {
        toast.error(data.message || `Failed to ${enable ? "enable" : "disable"} automation`);
      }
    } catch (error) {
      toast.error(`Failed to ${enable ? "enable" : "disable"} automation`);
    } finally {
      setIsUpdating(false);
    }
  };

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    toast.success("Wallet address copied");
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleExportKey = async (chain: WalletChain) => {
    setExportChain(chain);
    setShowExportModal(true);
    setIsExporting(true);
    setExportedKey(null);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export_wallet", chain }),
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

  const handleDeleteWallet = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch("/api/settings/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_wallet", chain: deleteChain }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${CHAIN_CONFIG[deleteChain].label} wallet deleted`);
        setShowDeleteModal(false);
        fetchStatus();
      } else {
        toast.error(data.message || "Failed to delete wallet");
      }
    } catch (error) {
      toast.error("Failed to delete wallet");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (chain: WalletChain) => {
    setDeleteChain(chain);
    setShowDeleteModal(true);
  };

  // Helper: check if a chain's automation is enabled
  const isChainEnabled = (chain: WalletChain) => {
    if (!status) return false;
    if (chain === "evm") return status.evmEnabled;
    if (chain === "solana") return status.solanaEnabled;
    return status.suiEnabled;
  };

  // Helper: get wallet address for a chain
  const getWalletForChain = (chain: WalletChain) => {
    return status?.wallets?.find(w => w.chain === chain)?.walletAddress || null;
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

  const renderWalletCard = (chain: WalletChain) => {
    const config = CHAIN_CONFIG[chain];
    const walletAddress = getWalletForChain(chain);
    const enabled = isChainEnabled(chain);

    const explorerUrl = walletAddress ? `${config.explorerPrefix}${walletAddress}` : null;

    return (
      <div key={chain} className={`flex h-full min-w-0 flex-col rounded-xl border border-border bg-muted/50 p-4 sm:p-5 ${chain === "sui" ? "sm:col-span-2 sm:w-full xl:col-span-1 xl:w-auto" : ""}`}>
        {/* Chain header */}
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3 text-sm font-medium text-foreground">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${config.borderColor} ${config.bgColor}`}>
              <img src={config.iconLight} alt="" className={`${chain === "sui" ? "h-3.5 w-3.5" : "h-5 w-5"} mx-auto block object-contain dark:hidden`} />
              <img src={config.iconDark} alt="" className={`${chain === "sui" ? "h-3.5 w-3.5" : "h-5 w-5"} mx-auto hidden object-contain dark:block`} />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold">{config.label}</span>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${config.bgColor} ${config.color}`}>
                  {config.tag}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] font-normal text-muted-foreground">
                {config.sublabel}
              </p>
            </div>
          </div>
          {enabled && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          )}
        </div>

        {walletAddress ? (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-3">
            {/* Address + actions */}
            <a
              href={explorerUrl ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              title={walletAddress}
              aria-label={`View ${config.label} wallet address on explorer`}
              className={`group flex min-w-0 items-center justify-between gap-3 rounded-lg border ${config.borderColor} bg-background/45 p-3 transition-colors hover:bg-background/70`}
            >
              <div className="min-w-0">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  Embedded agent address
                </p>
                <p className="font-mono text-xs text-foreground sm:text-[13px]">
                  <span className="sm:hidden">{middleTruncateAddress(walletAddress, 10, 8)}</span>
                  <span className="hidden sm:inline lg:hidden">{middleTruncateAddress(walletAddress, 14, 12)}</span>
                  <span className="hidden lg:inline xl:hidden">{middleTruncateAddress(walletAddress, 16, 14)}</span>
                  <span className="hidden xl:inline">{middleTruncateAddress(walletAddress, 18, 16)}</span>
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
            </a>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <button
                type="button"
                onClick={() => copyAddress(walletAddress)}
                className="inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground sm:justify-start sm:px-1 group"
              >
                <Copy className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                {copiedAddress === walletAddress ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => handleExportKey(chain)}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground sm:justify-start sm:px-1"
              >
                <Key className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                type="button"
                onClick={() => openDeleteModal(chain)}
                className="inline-flex min-w-0 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-500/70 transition-colors hover:bg-red-500/5 hover:text-red-500 sm:justify-start sm:px-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>

            {/* Automation toggle */}
            {enabled ? (
              <button
                type="button"
                onClick={() => handleToggleAutomation(chain, false)}
                disabled={isUpdating}
                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl border border-red-500/10 dark:border-red-500/20 text-red-500 dark:text-red-400 hover:bg-red-500/5 font-semibold text-[11px] sm:text-xs transition-all disabled:opacity-50"
              >
                {isUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <PowerOff className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">Stop {config.label} Automation</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleAutomation(chain, true)}
                disabled={isUpdating}
                className={`w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 rounded-xl ${config.bgColor} hover:opacity-90 ${config.color} font-semibold text-[11px] sm:text-xs transition-all border ${config.borderColor} disabled:opacity-50`}
              >
                {isUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Power className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">Enable {config.label} Automation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 sm:py-8">
            <p className="text-xs text-muted-foreground">
              No {config.label} wallet yet
            </p>
            <button
              type="button"
              onClick={() => handleCreateWallet(chain)}
              disabled={isCreatingWallet === chain}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl ${config.bgColor} ${config.color} hover:opacity-90 font-semibold text-xs transition-all border ${config.borderColor} disabled:opacity-50`}
            >
              {isCreatingWallet === chain ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Create {config.label} Wallet
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900/80 rounded-xl md:rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800/50 overflow-hidden backdrop-blur-sm transition-all duration-300">
      {/* Header */}
      <div className="p-5 sm:p-6 md:p-8 border-b border-gray-200 dark:border-zinc-800/30">
        <div className="flex items-center justify-between gap-4 sm:gap-5 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-border shadow-sm shrink-0">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">Agent Automation</h2>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                AI-driven autonomous transactions — EVM, Solana & Sui
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

        {/* ── Multi-chain wallet cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {renderWalletCard("evm")}
          {renderWalletCard("solana")}
          {renderWalletCard("sui")}
        </div>

        {/* Spend Summary — only if any automation is enabled */}
        {status?.agentEnabled && (
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
        )}

        {/* How it works — shown when no wallets exist */}
        {(!getWalletForChain("evm") && !getWalletForChain("solana") && !getWalletForChain("sui")) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">How it works</h3>
            <div className="space-y-2.5">
              {[
                {
                  icon: Wallet,
                  title: "Create agent wallets",
                  desc: "Generate EVM, Solana and Sui wallets for autonomous AI operations.",
                },
                {
                  icon: Shield,
                  title: "Enable automation per chain",
                  desc: "Enable automation independently for EVM, Solana and Sui chains.",
                },
                {
                  icon: Zap,
                  title: "Fully autonomous",
                  desc: "AI executes swaps, subscriptions, and on-chain queries without manual approval.",
                },
                {
                  icon: Settings2,
                  title: "You're in control",
                  desc: "Revoke access at any time, per chain.",
                },
              ].map((step) => (
                <div key={step.title} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
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
        )}

        {/* Safety notice — always show */}
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Safety first</p>
              <p className="text-xs text-amber-700 dark:text-amber-400/80">
                The AI operates autonomously. Total spent are visible here. You can revoke access instantly per chain if needed.
              </p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        {status?.recentTransactions && status.recentTransactions.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-zinc-800/30">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            </div>
            <div className="space-y-2">
              {status.recentTransactions.map((tx) => {
                const chainId = tx.metadata?.chainId;

                // Determine token symbol if missing (like Arc testnet payments)
                let tokenSymbol = tx.metadata?.inputToken || "";
                if (!tokenSymbol && chainId === 5042002) {
                  tokenSymbol = "USDC";
                }

                const explorerUrl = tx.explorerUrl || `https://etherscan.io/tx/${tx.signature}`;

                return (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/40 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        {tx.type === "relay_swap" ? (
                          <Zap className="w-4 h-4 text-primary" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground flex items-center gap-2">
                          <span className="truncate hidden sm:block">{tx.type === "relay_swap" ? "Autonomous Swap" : "Operation"}</span>
                          {tx.chainName && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium ${getChainBadgeColor(tx.chainName)}`}>
                              {tx.chainName}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {new Date(tx.createdAt).toLocaleString(undefined, {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          {tx.amount === "Approval" ? "Approval" : `${tx.amount} ${tokenSymbol}`}
                        </p>
                        {typeof tx.metadata?.outputToken === "string" && (
                          <p className="text-[10px] text-muted-foreground">
                            to {tx.metadata.outputToken as string}
                          </p>
                        )}
                      </div>

                      <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 hover:bg-muted/50 rounded-lg transition-colors shrink-0"
                        title="View on Explorer"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
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
              Export {CHAIN_CONFIG[exportChain].label} Private Key
            </DialogTitle>
            <DialogDescription>
              This is the private key for your {CHAIN_CONFIG[exportChain].label} agent wallet.
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
            <Label>Private Key <span className={`text-xs ${CHAIN_CONFIG[exportChain].color}`}>({CHAIN_CONFIG[exportChain].tag})</span></Label>
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

      {/* Delete Wallet Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Delete {CHAIN_CONFIG[deleteChain].label} Wallet
            </DialogTitle>
            <DialogDescription>
              This will permanently delete your {CHAIN_CONFIG[deleteChain].label} agent wallet and remove all associated keys from our servers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {isChainEnabled(deleteChain) && (
              <div className="p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div className="text-sm text-amber-800 dark:text-amber-300">
                    <p className="font-semibold mb-1">{CHAIN_CONFIG[deleteChain].label} Automation is active</p>
                    <p>Automation will be automatically disabled before the wallet is deleted.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                <div className="text-sm text-red-800 dark:text-red-300">
                  <p className="font-semibold mb-1">This action is irreversible</p>
                  <p>Make sure you have exported your private key and withdrawn all funds before deleting. A new wallet address will be generated if you create one again.</p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="gap-2"
              onClick={handleDeleteWallet}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Wallet
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
