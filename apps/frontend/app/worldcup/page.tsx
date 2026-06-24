"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Coins, 
  Flame, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw,
  Database
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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

interface Prediction {
  id: string;
  type: string;
  match: string;
  pick: string;
  timestamp: string;
  status?: "pending" | "correct" | "incorrect";
}

interface Bet {
  id: string;
  txHash: string;
  market: string;
  outcome: string;
  amount: string;
  timestamp: string;
  isMock: boolean;
}

interface Contradiction {
  prediction: string;
  bet: string;
  description: string;
  timestamp: string;
}

interface WorldCupMemory {
  predictions: Prediction[];
  opinions: any[];
  bets: Bet[];
  contradictions: Contradiction[];
  roast: string;
  blobId: string | null;
  lastUpdated?: string;
}

const CLEAN_SCORERS_REGEX = /[\{\}\"]/g;

export default function WorldCupDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submittingBet, setSubmittingBet] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [matchFilter, setMatchFilter] = useState("all");
  
  const [memory, setMemory] = useState<WorldCupMemory>({
    predictions: [],
    opinions: [],
    bets: [],
    contradictions: [],
    roast: "",
    blobId: null,
  });

  // Live tournament data states
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [liveGroups, setLiveGroups] = useState<any[]>([]);
  const [liveTeams, setLiveTeams] = useState<any[]>([]);
  const [liveDataLoading, setLiveDataLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "matches" | "standings">("profile");

  // Simulated bet form states
  const [market, setMarket] = useState("FIFA World Cup 2026 Winner");
  const [outcome, setOutcome] = useState("Spain");
  const [amount, setAmount] = useState("100");

  const fetchLiveData = async () => {
    try {
      setLiveDataLoading(true);
      const res = await fetch("/api/worldcup/live");
      if (!res.ok) throw new Error("Failed to load live tournament data");
      const data = await res.json();
      if (data.success) {
        setLiveMatches(data.matches || []);
        setLiveGroups(data.groups || []);
        setLiveTeams(data.teams || []);
      }
    } catch (error) {
      console.error("Error loading live tournament data:", error);
    } finally {
      setLiveDataLoading(false);
    }
  };

  const fetchMemory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/worldcup/memory");
      if (res.status === 401) {
        setAuthError(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch memory");
      }
      const data = await res.json();
      setMemory(data);
      setAuthError(false);
    } catch (error: any) {
      console.error("Error fetching memory:", error);
      toast.error("Failed to load Walrus memory records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
    fetchLiveData();
  }, []);

  const handleCopyBlobId = () => {
    if (!memory.blobId) return;
    navigator.clipboard.writeText(memory.blobId);
    setCopiedId(true);
    toast.success("Walrus Blob ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSimulateBet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!market || !outcome || !amount) {
      toast.error("Please fill in all simulation fields");
      return;
    }

    try {
      setSubmittingBet(true);
      const res = await fetch("/api/worldcup/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market,
          outcome,
          amount: `${amount} USDC`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to place simulated bet");
      }

      const updatedMemory = await res.json();
      setMemory(updatedMemory);
      toast.success("Mock Polymarket bet placed & saved on Walrus!");
    } catch (error: any) {
      console.error("Simulated bet error:", error);
      toast.error(error.message || "Failed to execute mock bet");
    } finally {
      setSubmittingBet(false);
    }
  };

  const handleResetMemory = async () => {
    try {
      setResetting(true);
      const res = await fetch("/api/worldcup/memory", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to reset memory");
      
      setMemory({
        predictions: [],
        opinions: [],
        bets: [],
        contradictions: [],
        roast: "No roast yet. Go to the chat and make some World Cup predictions first so the Oracle can evaluate your football takes!",
        blobId: null,
      });
      toast.success("Walrus Memory successfully reset!");
    } catch (err: any) {
      toast.error(err.message || "Failed to reset memory");
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <RefreshCw className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground font-mono text-sm">Hydrating persistent records from Walrus Protocol</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground px-4">
        <Card className="w-full max-w-md bg-muted border-border text-foreground shadow-2xl">
          <CardHeader className="text-center">
            <Flame className="w-12 h-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <CardTitle className="text-2xl font-bold">Barzakh World Oracle</CardTitle>
            <CardDescription className="text-muted-foreground">Memory-powered FIFA World Cup 2026 analytics</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-foreground text-sm">
              Please log in to your Barzakh account to view your persistent prediction memory, on-chain contradictions, and custom roasts.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/login">Go to Login</Link>
            </Button>
            <Button variant="ghost" asChild className="w-full text-muted-foreground hover:text-foreground">
              <Link href="/">Back to Chat</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const tweetText = `I got rated by the Barzakh AI product World Cup Oracle! My takes are stored persistently on Walrus Memory. Check out my roast: "${memory.roast ? (memory.roast.slice(0, 150) + '...') : 'No roasts yet'}" #Walrus #Sui`;
  const twitterShareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8 selection:bg-sky-500 selection:text-black">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center text-muted-foreground hover:text-foreground transition-colors mr-2">
                <ArrowLeft className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">Chat</span>
              </Link>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Barzakh World Oracle
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Verifiable persistent FIFA World Cup predictions mapped against live on-chain activity.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={resetting || !memory.blobId} variant="outline" className="border-red-600/40 dark:border-red-400/40 bg-red-600/10 dark:bg-red-400/10 text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 gap-2">
                  <Flame className="w-3.5 h-3.5" />
                  Reset Memory
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border text-foreground max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-zinc-100 flex items-center gap-2 text-xl font-bold">
                    <Flame className="text-muted-foreground w-5 h-5 animate-pulse" />
                    Reset Verifiable Memory?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Are you sure you want to reset your persistent Walrus Memory? This will clear all prediction history, stated opinions, and mock Polymarket bets from your profile on-chain records and restore Day-One status.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                  <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-zinc-800 hover:text-foreground transition-all">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetMemory}
                    className="bg-rose-600 hover:bg-rose-700 text-foreground font-medium transition-all"
                  >
                    Reset Now
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={fetchMemory} variant="outline" className="border-border bg-muted/50 text-foreground hover:text-foreground hover:bg-zinc-800 gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh State
            </Button>
         </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border gap-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
              activeTab === "profile"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-zinc-200"
            }`}
          >
            My Oracle Profile
          </button>
          <button
            onClick={() => setActiveTab("matches")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
              activeTab === "matches"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-zinc-200"
            }`}
          >
            Live Match Center
          </button>
          <button
            onClick={() => setActiveTab("standings")}
            className={`pb-3 text-sm font-semibold transition-all border-b-2 px-1 ${
              activeTab === "standings"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-zinc-200"
            }`}
          >
            Group Standings
          </button>
        </div>

        {activeTab === "profile" && (
          <>
            {/* Top Cards: Walrus Attestation & AI Roast */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Walrus Attestation */}
          <Card className="lg:col-span-5 bg-muted border-border  text-foreground shadow-xl flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center gap-2 text-foreground mb-1">
                <Database className="w-5 h-5" />
                <span className="font-mono text-xs font-semibold uppercase tracking-wider">Walrus Decentralized Memory</span>
              </div>
              <CardTitle className="text-xl font-bold">Onchain Memory Attestation</CardTitle>
              <CardDescription className="text-muted-foreground">
                All agent memory is snapshotted, cryptographically certified, and saved on the Walrus storage network.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <span className="text-muted-foreground/80 block">WALRUS BLOB ID:</span>
                {memory.blobId ? (
                  <div className="flex items-center justify-between gap-2 bg-black/5 dark:bg-black/40 border border-border p-2 rounded-md">
                    <span className="truncate text-foreground select-all pr-2 max-w-[280px]">
                      {memory.blobId}
                    </span>
                    <button onClick={handleCopyBlobId} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                      {copiedId ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ) : (
                  <div className="bg-black/5 dark:bg-black/20 border border-dashed border-border p-3 text-center rounded-md text-muted-foreground/80">
                    No active Walrus memory blob found. Make a prediction in the chat!
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <span className="text-muted-foreground/80 block">STORAGE PRICE:</span>
                  <span className="text-foreground font-medium">~0.01 WAL</span>
                </div>
                <div className="space-y-1">
                  <span className="text-muted-foreground/80 block">EPOCH DURATION:</span>
                  <span className="text-foreground font-medium">1 Epoch (14 Days)</span>
                </div>
              </div>
              
              {memory.lastUpdated && (
                <div className="space-y-1 pt-2">
                  <span className="text-muted-foreground/80 block">LAST METADATA SYNC:</span>
                  <span className="text-muted-foreground text-[10px]">
                    {new Date(memory.lastUpdated).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-border/50 bg-black/10 p-4 flex flex-col sm:flex-row gap-2">
              {memory.blobId ? (
                <>
                  <Button asChild variant="outline" className="w-full border-border bg-muted/30 text-foreground hover:text-foreground hover:bg-zinc-800 text-xs gap-1.5">
                    <a href={`https://walruscan.com/mainnet/blob/${memory.blobId}`} target="_blank" rel="noreferrer">
                      View on Walruscan
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" className="w-full border-border bg-muted/30 text-foreground hover:text-foreground hover:bg-zinc-800 text-xs gap-1.5">
                    <a href={`https://aggregator.walrus-mainnet.walrus.space/v1/blobs/${memory.blobId}`} target="_blank" rel="noreferrer">
                      Raw Blob JSON
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </>
              ) : (
                <Button disabled variant="outline" className="w-full border-border opacity-50 text-xs">
                  Awaiting First Attestation
                </Button>
              )}
            </CardFooter>
          </Card>

          {/* AI Roast */}
          <Card className="lg:col-span-7 bg-muted border-border  text-foreground shadow-xl flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 bg-muted text-muted-foreground border-l border-b border-border px-3 py-1 text-[10px] font-mono rounded-bl-lg font-semibold uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3 h-3 animate-bounce" />
              AI Roast Panel
            </div>
            <CardHeader>
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Oracle Verdict & Sarcasm Log
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                The agent keeps track of biases and highlights gaps between what you state and what you bet.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-center justify-center p-6">
              {memory.roast ? (
                <div className="relative bg-muted border border-border p-5 rounded-xl shadow-inner max-w-full">
                  <span className="text-5xl text-muted-foreground/20 absolute -top-4 -left-1 font-serif">“</span>
                  <p className="text-foreground text-sm md:text-base leading-relaxed relative z-10 italic">
                    {memory.roast}
                  </p>
                  <span className="text-5xl text-muted-foreground/20 absolute -bottom-10 -right-1 font-serif">”</span>
                </div>
              ) : (
                <div className="text-muted-foreground/80 italic text-center p-4">
                  The Oracle has not generated a roast yet. Create some contradictions or prediction picks in the chat first!
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t border-border/50 bg-black/10 p-4 justify-between flex-wrap gap-2">
              <span className="text-xs text-muted-foreground font-mono">Verifiability Index: 99.8%</span>
              <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground text-primary-foreground font-bold gap-1.5">
                <a href={twitterShareUrl} target="_blank" rel="noreferrer">
                  <img src="/images/x/x-dark.png" alt="X logo" className="w-3.5 h-3.5 object-contain hidden dark:block" />
                  <img src="/images/x/x-light.png" alt="X logo" className="w-3.5 h-3.5 object-contain block dark:hidden" />
                  Post Roast to X
                </a>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Prediction Profile */}
        <div className="grid grid-cols-1 gap-6">
          {/* Stated Predictions */}
          <Card className="bg-muted border-border  text-foreground shadow-xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-foreground" />
                Stated Predictions
              </CardTitle>
              <CardDescription className="text-muted-foreground">What you stated to the AI chatbot</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {memory.predictions && memory.predictions.length > 0 ? (
                <div className="max-h-[350px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-medium">Match</th>
                        <th className="px-4 py-3 font-medium text-center">Date</th>
                        <th className="px-4 py-3 font-medium text-center">Status</th>
                        <th className="px-4 py-3 font-medium text-right">Prediction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {memory.predictions.map((p: any) => {
                        const matchParts = p.match ? p.match.split(" vs ") : [];
                        let teamAFlag = null;
                        let teamBFlag = null;
                        if (matchParts.length === 2 && liveTeams.length > 0) {
                          const tA = liveTeams.find(t => t.name_en?.toLowerCase() === matchParts[0].toLowerCase());
                          const tB = liveTeams.find(t => t.name_en?.toLowerCase() === matchParts[1].toLowerCase());
                          if (tA) teamAFlag = tA.flag;
                          if (tB) teamBFlag = tB.flag;
                        }
                        
                        return (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3">
                              <span className="font-medium text-sm text-foreground flex items-center gap-2 truncate">
                                {matchParts.length === 2 ? (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <span>{matchParts[0]}</span>
                                      {teamAFlag && <img src={teamAFlag} alt="flag" className="w-4 h-3 object-cover rounded-[1px] shadow-sm" />}
                                    </div>
                                    <span className="text-muted-foreground/60 text-xs mx-0.5">vs</span>
                                    <div className="flex items-center gap-1.5">
                                      {teamBFlag && <img src={teamBFlag} alt="flag" className="w-4 h-3 object-cover rounded-[1px] shadow-sm" />}
                                      <span>{matchParts[1]}</span>
                                    </div>
                                  </>
                                ) : (
                                  p.match
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="text-[11px] text-muted-foreground/80 font-mono">
                                {new Date(p.timestamp).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {p.status && (
                                <span className={`text-[10px] font-mono font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 leading-none ${
                                  p.status === "correct"
                                    ? "bg-emerald-950/80 text-emerald-400 border border-emerald-900/40"
                                    : p.status === "incorrect"
                                    ? "bg-destructive/20 text-destructive border border-destructive/40"
                                    : "bg-muted text-muted-foreground border border-border"
                                }`}>
                                  {p.status}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Badge className="bg-primary/20 text-foreground border border-primary/30 hover:bg-primary/20 shrink-0 font-semibold font-mono">
                                {p.pick}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground/80 italic text-sm">
                  No predictions recorded in this session. Ask the agent to save a pick!
                </div>
              )}
            </CardContent>
          </Card>
        </div>
          </>
        )}

        {activeTab === "matches" && (
          <Card className="bg-muted border-border  text-foreground shadow-xl">
            <CardHeader className="border-b border-border/40 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-foreground" />
                  FIFA World Cup 2026 Match Center
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-1">
                  Real-time scores, scorers, and stadiums for the expanded 104 matches.
                </CardDescription>
              </div>
              <div className="shrink-0 flex items-center my-0">
                <Select value={matchFilter} onValueChange={setMatchFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-card border border-border text-foreground h-10 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0">
                    <SelectValue placeholder="Filter matches" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border text-foreground">
                    <SelectItem value="all">All Matches</SelectItem>
                    <SelectItem value="live">Live Now</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {liveDataLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-muted-foreground text-sm font-mono">Fetching latest match updates...</span>
                </div>
              ) : liveMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveMatches.filter(m => {
                    if (matchFilter === "all") return true;
                    if (matchFilter === "finished") return m.finished === "TRUE";
                    if (matchFilter === "scheduled") return m.time_elapsed === "notstarted" && m.finished !== "TRUE";
                    if (matchFilter === "live") return m.time_elapsed !== "notstarted" && m.finished !== "TRUE";
                    return true;
                  }).map((m) => {
                    const homeTeamInfo = liveTeams.find((t) => String(t.id) === String(m.home_team_id));
                    const awayTeamInfo = liveTeams.find((t) => String(t.id) === String(m.away_team_id));
                    const homeFlag = homeTeamInfo ? homeTeamInfo.flag : null;
                    const awayFlag = awayTeamInfo ? awayTeamInfo.flag : null;
                    return (
                      <div key={m.id} className="p-4 rounded-xl bg-card border border-border space-y-3 shadow-sm hover:border-primary/50 transition-all">
                        <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                          <span>Group {m.group} • Matchday {m.matchday}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                            m.finished === "TRUE"
                              ? "bg-muted text-muted-foreground border border-border"
                              : m.time_elapsed === "notstarted"
                              ? "bg-blue-950 text-blue-400 border border-blue-900/40"
                              : "bg-red-950/80 text-destructive animate-pulse border border-red-900/40"
                          }`}>
                            {m.finished === "TRUE" ? "Finished" : m.time_elapsed === "notstarted" ? "Scheduled" : `Live: ${m.time_elapsed}`}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between gap-3 py-1">
                          {/* Home Team */}
                          <div className="flex-1 flex items-center justify-end gap-2 truncate">
                            <span className="text-xs font-semibold text-foreground truncate">{m.home_team_name_en}</span>
                            {homeFlag && (
                              <img src={homeFlag} alt="" className="w-4 h-3 rounded object-cover shadow-sm shrink-0" />
                            )}
                          </div>
                          
                          {/* Scoreline */}
                          <div className="shrink-0 bg-muted border border-border rounded px-2.5 py-1 text-xs font-bold font-mono text-foreground shadow-inner min-w-[65px] text-center whitespace-nowrap">
                            {m.finished === "TRUE" || m.time_elapsed !== "notstarted" ? `${m.home_score} - ${m.away_score}` : "vs"}
                          </div>

                          {/* Away Team */}
                          <div className="flex-1 flex items-center justify-start gap-2 truncate">
                            {awayFlag && (
                              <img src={awayFlag} alt="" className="w-4 h-3 rounded object-cover shadow-sm shrink-0" />
                            )}
                            <span className="text-xs font-semibold text-foreground truncate">{m.away_team_name_en}</span>
                          </div>
                        </div>

                      {/* Scorers */}
                      {((m.home_scorers && m.home_scorers !== "null") || (m.away_scorers && m.away_scorers !== "null")) && (
                        <div className="text-[10px] text-muted-foreground font-mono border-t border-border/50 pt-2 space-y-0.5">
                          {m.home_scorers && m.home_scorers !== "null" && (
                            <div>
                              <strong className="text-foreground">{m.home_team_name_en}:</strong> {m.home_scorers.replace(CLEAN_SCORERS_REGEX, "")}
                            </div>
                          )}
                          {m.away_scorers && m.away_scorers !== "null" && (
                            <div>
                              <strong className="text-foreground">{m.away_team_name_en}:</strong> {m.away_scorers.replace(CLEAN_SCORERS_REGEX, "")}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono pt-1">
                        <span>Stadium #{m.stadium_id}</span>
                        <span>{m.local_date} {m.local_time}</span>
                      </div>
                    </div>
                  );
                })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground/80 italic text-sm">
                  No tournament matches found.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "standings" && (
          <Card className="bg-muted border-border  text-foreground shadow-xl">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-foreground" />
                FIFA World Cup 2026 Standings
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Official group stage tables for all 12 groups (A-L).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {liveDataLoading ? (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-muted-foreground text-sm font-mono">Fetching standings...</span>
                </div>
              ) : liveGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {liveGroups.map((g: any) => (
                    <div key={g._id || g.name || g.group} className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-md">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <h3 className="font-bold text-foreground text-sm">Group {g.name || g.group}</h3>
                        <span className="text-[10px] font-mono text-muted-foreground/80">48 Teams Format</span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left font-mono">
                          <thead>
                            <tr className="text-muted-foreground/80 border-b border-border">
                              <th className="py-1.5 font-medium">Team</th>
                              <th className="py-1.5 text-center font-medium">P</th>
                              <th className="py-1.5 text-center font-medium">GD</th>
                              <th className="py-1.5 text-right font-medium">Pts</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900/30">
                            {g.teams && g.teams.map((t: any, idx: number) => {
                              const teamInfo = liveTeams.find((team: any) => team.id === t.team_id);
                              const teamName = teamInfo ? teamInfo.name_en : `Team #${t.team_id}`;
                              const teamFlag = teamInfo ? teamInfo.flag : t.flag;
                              return (
                                <tr key={t.team_id || idx} className="hover:bg-muted/50 text-foreground">
                                  <td className="py-2 font-medium flex items-center gap-2 truncate max-w-[120px]">
                                    {teamFlag && (
                                      <img src={teamFlag} alt="" className="w-4 h-3 rounded object-cover shadow-sm" />
                                    )}
                                    <span className="truncate">{teamName}</span>
                                  </td>
                                  <td className="py-2 text-center text-muted-foreground">{t.mp}</td>
                                  <td className="py-2 text-center text-muted-foreground">{t.gd > 0 ? `+${t.gd}` : t.gd}</td>
                                  <td className="py-2 text-right font-bold text-foreground">{t.pts}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground/80 italic text-sm">
                  No group standings found.
                </div>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
