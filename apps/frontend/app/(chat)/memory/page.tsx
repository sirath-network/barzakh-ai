"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain,
  RefreshCw,
  Search,
  Shield,
  Database,
  Trash2,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Memory {
  index: number;
  blobId?: string | null;
  text: string;
  relevance: string;
  status?: "synced" | "indexing";
}

interface MemoryData {
  userId: string;
  namespace: string;
  namespaceVersion?: number;
  tombstonesCount?: number;
  health: {
    configured: boolean;
    healthy: boolean;
    version?: string;
    error?: string;
  };
  query: string;
  memoryCount: number;
  memories: Memory[];
}

function getCategoryInfo(text: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes("executed") ||
    lower.includes("placed") ||
    lower.includes("swapped") ||
    lower.includes("redeemed") ||
    lower.includes("ordered") ||
    lower.includes("txhash") ||
    lower.includes("transaction")
  ) {
    return { label: "Action", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  }
  if (
    lower.includes("prefer") ||
    lower.includes("default") ||
    lower.includes("always") ||
    lower.includes("usually") ||
    lower.includes("bet size") ||
    lower.includes("pool duration") ||
    lower.includes("interval")
  ) {
    return { label: "Preference", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
  }
  if (
    lower.includes("0x") ||
    lower.includes("address") ||
    lower.includes("wallet") ||
    lower.includes("recipient") ||
    lower.includes("solana")
  ) {
    return { label: "Wallet", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
  }
  if (
    lower.includes("name is") ||
    lower.includes("user is") ||
    lower.includes("trader") ||
    lower.includes("risk")
  ) {
    return { label: "Profile", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
  }
  return { label: "Context", color: "bg-zinc-800 text-zinc-400 border-zinc-700/60" };
}

export default function MemoryDashboardPage() {
  const [data, setData] = useState<MemoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("What do you know about me?");
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);

  const fetchMemories = useCallback(async (searchQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        query: searchQuery !== undefined ? searchQuery : query,
        limit: "50",
      });
      const res = await fetch(`/api/memory?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories(query);
  };

  const handleDeleteMemory = async (memory: Memory) => {
    const key = memory.blobId || memory.text;
    setDeletingKey(key);

    // Optimistic UI update
    const previousMemories = data?.memories || [];
    const previousCount = data?.memoryCount || 0;
    setData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        memoryCount: Math.max(0, prev.memoryCount - 1),
        memories: prev.memories.filter((m) =>
          m.blobId ? m.blobId !== memory.blobId : m.text !== memory.text
        ),
      };
    });

    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blobId: memory.blobId || undefined,
          text: memory.text,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      toast.success("Memory forgotten successfully");
    } catch (err) {
      console.error("Failed to delete memory:", err);
      // Revert optimistic update
      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          memoryCount: previousCount,
          memories: previousMemories,
        };
      });
      toast.error(
        String(err instanceof Error ? err.message : "Failed to delete memory")
      );
    } finally {
      setDeletingKey(null);
    }
  };

  const handleClearAllMemories = async () => {
    setIsClearingAll(true);
    try {
      const res = await fetch("/api/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const result = await res.json();

      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          namespace: result.namespace || prev.namespace,
          namespaceVersion: result.newNamespaceVersion,
          memoryCount: 0,
          memories: [],
        };
      });

      setIsClearDialogOpen(false);
      toast.success("All memories have been cleared successfully");
    } catch (err) {
      console.error("Failed to clear all memories:", err);
      toast.error(
        String(err instanceof Error ? err.message : "Failed to clear all memories")
      );
    } finally {
      setIsClearingAll(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 mb-4 sm:mb-6 transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Chat
        </Link>

        {/* Header with Title and Clear All */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl shrink-0">
              <Brain className="w-6 h-6 sm:w-7 sm:h-7 text-zinc-200" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
                Walrus Memory Dashboard
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                What Barzakh AI remembers about you across sessions
              </p>
            </div>
          </div>

          {data && data.memories.length > 0 && (
            <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All Memories
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-100 max-w-md w-[calc(100vw-2rem)] sm:w-full">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-400 text-base sm:text-lg">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                    Clear All Memories?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-xs sm:text-sm text-zinc-400 mt-2">
                    This will reset your Walrus memory namespace. All previously
                    remembered preferences, trading history, and context will be
                    permanently forgotten by the AI.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2 flex-col-reverse sm:flex-row">
                  <AlertDialogCancel
                    disabled={isClearingAll}
                    className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      handleClearAllMemories();
                    }}
                    disabled={isClearingAll}
                    className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                  >
                    {isClearingAll ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Yes, Clear All
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Health Status & Meta Badges (Zinc Styled & Responsive) */}
        {data?.health && (
          <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium shrink-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${data.health.healthy ? "bg-emerald-500" : "bg-red-500"}`} />
              <span>{data.health.healthy ? "Relayer Healthy" : "Relayer Down"}</span>
              {data.health.version && (
                <span className="text-zinc-500 font-mono text-[11px]">v{data.health.version}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium max-w-full">
              <Database className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-zinc-500 shrink-0">Namespace:</span>
              <span className="font-mono text-zinc-300 max-w-[150px] sm:max-w-[260px] md:max-w-xs truncate" title={data.namespace}>
                {data.namespace}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium shrink-0">
              <Brain className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="font-semibold text-zinc-200">{data.memoryCount}</span>
              <span className="text-zinc-400">memories recalled</span>
            </div>
          </div>
        )}

        {/* Search */}
        <form onSubmit={handleSearch} className="mt-6 sm:mt-8 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your memories semantically..."
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 focus:border-zinc-600 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-3.5 sm:px-5 py-2.5 sm:py-3 bg-zinc-100 hover:bg-white text-zinc-950 font-semibold disabled:opacity-50 rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm shrink-0"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? "animate-spin" : ""}`}
            />
            <span>Recall</span>
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 sm:mt-6 p-3.5 sm:p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs sm:text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && !data && (
          <div className="mt-12 flex flex-col items-center gap-3 text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
            <p className="text-xs sm:text-sm">Recalling memories from Walrus...</p>
          </div>
        )}

        {/* Memories Grid */}
        {data && data.memories.length > 0 && (
          <div className="mt-6 sm:mt-8 space-y-3">
            <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1">
              <h2 className="text-xs sm:text-sm font-semibold text-zinc-300 uppercase tracking-wider">
                Recalled Memories ({data.memories.length})
              </h2>
              <span className="text-[11px] sm:text-xs text-zinc-500">
                Click trash icon to delete specific memory
              </span>
            </div>
            <div className="grid gap-2 sm:gap-2.5">
              {data.memories.map((memory) => {
                const itemKey = memory.blobId || memory.text || String(memory.index);
                const isItemDeleting = deletingKey === (memory.blobId || memory.text);
                const category = getCategoryInfo(memory.text);
                return (
                  <div
                    key={itemKey}
                    className="p-3.5 sm:p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-zinc-700 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3 sm:gap-4">
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${category.color}`}
                          >
                            {category.label}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-normal break-words">
                          {memory.text}
                        </p>
                        {memory.blobId ? (
                          <div className="flex items-center gap-2 pt-0.5">
                            <a
                              href={`https://walruscan.com/mainnet/blob/${memory.blobId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] text-cyan-400 hover:text-cyan-300 font-mono transition-colors group/link"
                              title="Inspect permanent blob certification on Walruscan Mainnet"
                            >
                              <span className="text-zinc-500">Blob:</span>{" "}
                              {memory.blobId.slice(0, 10)}...{memory.blobId.slice(-8)}
                              <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover/link:opacity-100" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(memory.blobId!);
                                toast.success("Blob ID copied to clipboard");
                              }}
                              className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
                              title="Copy full Blob ID"
                            >
                              <Copy className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <p
                            className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] text-zinc-400 font-mono"
                            title="Active now in AI memory. Background worker is currently SEAL-encrypting and storing this blob on decentralized Walrus nodes."
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span>Walrus storage syncing...</span>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                        <span className="px-1.5 sm:px-2 py-0.5 bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[10px] font-mono rounded" title="Semantic relevance score">
                          {(parseFloat(memory.relevance) * 100).toFixed(0)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMemory(memory)}
                          disabled={isItemDeleting}
                          title="Delete this memory"
                          className="p-1 sm:p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-70 group-hover:opacity-100 disabled:opacity-30 cursor-pointer"
                        >
                          {isItemDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-red-400" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {data && data.memories.length === 0 && (
          <div className="mt-10 sm:mt-16 text-center py-10 sm:py-14 px-4 border border-dashed border-zinc-800/80 rounded-2xl bg-zinc-900/20">
            <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-700 mx-auto mb-3" />
            <h3 className="text-sm sm:text-base font-semibold text-zinc-300">
              No memories found
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-md mx-auto">
              You currently have no stored memories in this namespace. As you chat
              with Barzakh AI, important facts and preferences will automatically be
              remembered.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 sm:mt-16 pt-5 sm:pt-6 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] sm:text-xs text-zinc-500">
            Powered by{" "}
            <a
              href="https://memory.walrus.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700 transition-colors"
            >
              Walrus Memory
            </a>{" "}
            — Portable, verifiable, decentralized AI memory on Sui & Walrus
          </p>
        </div>
      </div>
    </div>
  );
}
