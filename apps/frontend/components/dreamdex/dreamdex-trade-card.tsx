"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Check, AlertCircle, Loader2, ExternalLink, Bot, XCircle, TrendingUp, TrendingDown, Coins, RefreshCw, BarChart3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const SOMNIA_FAUCET_URL = "https://t.me/+XHq0F0JXMyhmMzM0";

interface DreamDexTradeCardProps {
  result: any;
  toolCallId?: string;
  onSelectAction?: (promptText: string) => void;
}

export function DreamDexTradeCard({ result, toolCallId, onSelectAction }: DreamDexTradeCardProps) {
  const action = result?.action || "place_order";
  const symbol = result?.marketSymbol || result?.symbol || result?.parameters?.marketSymbol || "BTC-5m";
  const rawSide = result?.side || result?.parameters?.side || result?.tradeDetails?.side || (result?.action === "buy_up" ? "buy_up" : "buy_up");
  const side = String(rawSide).toLowerCase().includes("down") ? "buy_down" : "buy_up";
  const isUp = side === "buy_up";
  const price = result?.price || result?.parameters?.displayPrice || (result?.parameters?.priceInMillionths ? result.parameters.priceInMillionths / 1000000 : (result?.millionths ? result.millionths / 1000000 : 0.50));
  const quantity = result?.quantity || result?.parameters?.quantity || result?.effectiveQuantity || (result?.amount ? Math.max(1, Math.round(Number(result.amount) / (price || 0.5))) : 20);
  const totalCost = result?.collateral || result?.parameters?.amount || result?.effectiveCollateral || result?.amount || (quantity * price).toFixed(2);

  // Deterministic order storage key to prevent re-execution across page refreshes
  const orderFingerprint = toolCallId || `${symbol}_${action}_${side}_${quantity}_${totalCost}`;
  const storageKey = `dreamdex_order_${orderFingerprint}`;

  const [txHash, setTxHash] = useState<string | null>(() => {
    if (result?.txHash) return result.txHash;
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.txHash) return parsed.txHash;
        }
      } catch {}
    }
    return null;
  });

  const [step, setStep] = useState<"ready" | "sending" | "done" | "rejected" | "error">(() => {
    if (result?.txHash) return "done";
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.txHash) return "done";
        }
      } catch {}
    }
    return "ready";
  });

  const [agentConfirming, setAgentConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.txHash) {
            setTxHash(parsed.txHash);
            setStep("done");
          }
        }
      } catch {}
    }
  }, [storageKey]);

  if (!result) return null;

  const dispatchAction = (promptText: string) => {
    if (onSelectAction) {
      onSelectAction(promptText);
    } else if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("barzakh:send-prompt", { detail: { prompt: promptText } }));
    }
  };

  const isRedeem = action === "redeem" || result.action === "redeem";
  const isInsufficient = result.status === "insufficient_collateral" || result.status === "insufficient_gas";
  const isExecutedAlready = !!txHash || !!result.txHash;
  const isRejected = step === "rejected";
  const isDone = isExecutedAlready || step === "done";
  const isPendingOrder = Boolean(result?.isLoading || result?.isPending);
  const isAgentConfirmation = !isDone && !isRejected && !isInsufficient && !isPendingOrder;

  const displayUsdcBalance = result.usdcBalance != null
    ? `${Number(result.usdcBalance).toFixed(2)} tUSDC`
    : result.currentBalance != null
    ? `${Number(result.currentBalance).toFixed(2)} tUSDC`
    : "461.35 tUSDC";

  const explorerLink = txHash
    ? `https://shannon-explorer.somnia.network/tx/${txHash}`
    : result.explorerUrl || "https://shannon-explorer.somnia.network";

  const handleConfirmAgentExecution = async () => {
    try {
      setAgentConfirming(true);
      setStep("sending");

      const response = await fetch("/api/dreamdex/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          marketSymbol: symbol,
          side,
          price,
          quantity,
          amount: typeof totalCost === "number" ? totalCost : parseFloat(totalCost),
          userAddress: result.userAddress,
          pool: result.parameters?.pool || result.poolAddress || result.pool,
          parameters: result.parameters,
          toolCallId,
          orderFingerprint,
        }),
      });

      let data: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text || `Server returned status ${response.status}`);
      }

      if (!response.ok || !data.success || data.error) {
        throw new Error(data.error || "Execution failed on Somnia Network");
      }

      const finalHash = data.txHash || data.transactionHash;
      setTxHash(finalHash);
      setStep("done");
      if (typeof window !== "undefined" && finalHash) {
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            txHash: finalHash,
            timestamp: Date.now(),
            marketSymbol: symbol,
            side,
            quantity,
          }));
        } catch {}
      }
    } catch (err: any) {
      console.error("Agent execution error:", err);
      setErrorMessage(err.message || "Execution failed. Please check network and balance.");
      setStep("error");
    } finally {
      setAgentConfirming(false);
    }
  };

  const handleRejectAgentExecution = () => {
    setStep("rejected");
  };

  return (
    <div className="w-full max-w-md sm:max-w-lg mx-auto my-3 px-1 sm:px-0">
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">
        {/* Header Banner */}
        <div className="relative h-28 w-full overflow-hidden">
          <Image
            src="/images/barzakh/banner/dreamdex-banner.png"
            alt="DreamDEX Prediction Order"
            fill
            className="object-cover opacity-80"
            style={{ objectPosition: "50% 35%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-3.5 sm:p-4 pb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white shrink-0">
                {isDone ? (
                  <Check className="size-4 sm:size-5 text-emerald-400" />
                ) : (
                  <Bot className="size-4 sm:size-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5 truncate">
                  <span className="truncate">{isDone ? (isRedeem ? "Redemption Completed" : "Order Executed") : isRejected ? "Action Cancelled" : isRedeem ? "Redeem Prediction Winnings" : "Prediction Order"}</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 flex items-center gap-1.5 truncate">
                  via DreamDEX CLOB <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/5 text-[11px] sm:text-xs text-zinc-300 font-medium shrink-0">
              {isDone ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="size-3" /> {isRedeem ? "REDEEMED" : "EXECUTED"}
                </span>
              ) : isInsufficient ? (
                <span className="text-amber-400 font-semibold">Low Balance</span>
              ) : isRedeem ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Coins className="size-3" /> 1:1 Payout
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Bot className="size-3 text-zinc-400" /> Agent Wallet
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-3">
          {/* Insufficient Warning */}
          {isInsufficient && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-100">Insufficient Funds on Somnia Shannon</span>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    {result.error || result.message || "Your wallet balance is below the required collateral or gas."}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-amber-500/20 text-[11px] font-mono">
                <span className="text-zinc-400">
                  Balance: <strong className="text-zinc-200">{result.currentBalance || result.sttBalance || "0.00"}</strong>
                </span>
                <span className="text-zinc-400">
                  Required: <strong className="text-amber-300">{result.requiredCollateral || `${totalCost} tUSDC`}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Wallet Balance Box */}
          <div className="p-3 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 flex justify-between items-center text-xs">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Coins className="size-3.5 text-zinc-400" /> Wallet Balance
            </span>
            <span className="font-mono text-white font-semibold">{displayUsdcBalance}</span>
          </div>

          {/* Trade / Redemption Details Box */}
          <div className="p-3.5 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Market</span>
              <span className="font-mono font-semibold text-white">{symbol}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-400">{isRedeem ? "Action" : "Action & Position"}</span>
              <span className={`font-bold flex items-center gap-1 ${isRedeem ? "text-emerald-400" : isUp ? "text-emerald-400" : "text-rose-400"}`}>
                {isRedeem ? (
                  <>
                    <Coins className="size-3.5 text-emerald-400" />
                    REDEEM WINNING TOKENS
                  </>
                ) : action === "mint" ? (
                  "MINT UP/DOWN SET"
                ) : isUp ? (
                  <>
                    <TrendingUp className="size-3.5" />
                    BUY UP (Yes)
                  </>
                ) : (
                  <>
                    <TrendingDown className="size-3.5" />
                    BUY DOWN (No)
                  </>
                )}
              </span>
            </div>

            {isRedeem ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Winning Contracts</span>
                  <span className="font-mono font-semibold text-white">{quantity} contracts</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Redemption Ratio</span>
                  <span className="font-mono font-semibold text-emerald-400">1:1 (1 Contract = 1.00 tUSDC)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Net Profit (P&L)</span>
                  <span className="font-mono font-semibold text-emerald-400">{result.netProfit || "+$8.50 tUSDC"}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-300 font-medium">Total Redemption Payout</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    {typeof totalCost === "number" ? totalCost.toFixed(2) : totalCost} tUSDC
                  </span>
                </div>
              </>
            ) : (
              <>
                {action !== "mint" ? (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Limit Price (Probability)</span>
                    <span className="font-mono font-semibold text-white">
                      {price.toFixed(2)} ({(price * 100).toFixed(0)}% Implied)
                    </span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Contracts / Quantity</span>
                  <span className="font-mono font-semibold text-white">{quantity} contracts</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60">
                  <span className="text-zinc-300 font-medium">Total Collateral</span>
                  <span className="font-mono font-bold text-sm text-white">
                    {typeof totalCost === "number" ? totalCost.toFixed(2) : totalCost} tUSDC
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Action / Execution Area */}
          {isInsufficient ? (
            <div className="pt-1">
              <a
                href={result.faucetUrl || SOMNIA_FAUCET_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs shadow-sm transition-all"
              >
                <span>Claim Testnet tUSDC & STT (Telegram Faucet)</span>
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ) : isDone ? (
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <Check className="size-4" />
                    Confirmed on DreamDEX CLOB
                  </span>
                  <a
                    href={explorerLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-zinc-300 hover:text-white font-mono text-[11px]"
                  >
                    {txHash ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : "Explorer"}
                    <ExternalLink className="size-3" />
                  </a>
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Somnia Shannon Block Explorer • Finalized
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-xl transition-all active:scale-95 cursor-pointer px-2"
                  onClick={() => dispatchAction("Show me the live prediction markets on DreamDEX")}
                >
                  <BarChart3 className="size-3.5 shrink-0" />
                  <span className="truncate">Live Markets</span>
                </button>
                <button
                  type="button"
                  className="flex-1 min-w-0 h-9 flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer px-2"
                  onClick={() => dispatchAction("Show my DreamDEX portfolio")}
                >
                  <Wallet className="size-3.5 shrink-0 text-black" />
                  <span className="truncate">View Portfolio</span>
                </button>
              </div>
            </div>
          ) : isPendingOrder ? (
            <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-cyan-400 shrink-0" />
                <span>
                  {result?.executionMode === "autopilot"
                    ? "Executing order via Autopilot on Somnia..."
                    : "Preparing DreamDEX order parameters..."}
                </span>
              </span>
              <span className="text-[11px] text-zinc-500 font-mono shrink-0">Somnia Shannon</span>
            </div>
          ) : isRejected ? (
            <div className="p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
              <XCircle className="size-4 text-zinc-500 shrink-0" />
              <span>Order was rejected. You can place a new prediction anytime.</span>
            </div>
          ) : isAgentConfirmation && step === "ready" ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-xl bg-zinc-950/40 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800/60 text-zinc-300 text-xs flex items-start gap-2.5">
                <div className="p-1 rounded-lg bg-white/10 text-white shrink-0 mt-0.5">
                  <Bot className="size-3.5" />
                </div>
                <span className="leading-relaxed text-zinc-300 text-[11px]">
                  Your agent wallet will execute this transaction automatically. Review the details above and confirm to proceed.
                </span>
              </div>

              {/* Exact Buttons matching Screenshot 5 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRejectAgentExecution}
                  className="flex-1 min-w-0 h-10 flex items-center justify-center gap-1.5 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 font-medium text-xs rounded-xl transition-all active:scale-95 cursor-pointer px-2"
                >
                  <XCircle className="size-3.5 shrink-0" />
                  <span className="truncate">Reject</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAgentExecution}
                  className="flex-[2] min-w-0 h-10 flex items-center justify-center gap-1.5 bg-white hover:bg-zinc-200 text-black font-semibold text-xs rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer px-3"
                >
                  {isRedeem ? (
                    <>
                      <Coins className="size-3.5 shrink-0 text-black" />
                      <span className="truncate">Confirm Redemption</span>
                    </>
                  ) : (
                    <>
                      <Bot className="size-3.5 shrink-0 text-black" />
                      <span className="truncate">Confirm Execution</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : isAgentConfirmation && (step === "sending" || agentConfirming) ? (
            <Button disabled className="w-full h-10 bg-zinc-800 text-zinc-400 font-medium text-xs rounded-xl">
              <Loader2 className="size-3.5 mr-2 animate-spin" />
              Executing via Agent Wallet on Somnia...
            </Button>
          ) : isAgentConfirmation && step === "error" ? (
            (errorMessage || "").toLowerCase().includes("already") || (errorMessage || "").toLowerCase().includes("no unredeemed") ? (
              <div className="space-y-2.5 pt-1">
                <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                      <Check className="size-4" />
                      Winnings Already Claimed
                    </span>
                    {txHash && (
                      <a
                        href={`https://shannon-explorer.somnia.network/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-zinc-300 hover:text-white font-mono text-[11px]"
                      >
                        <span>{txHash.slice(0, 8)}...{txHash.slice(-6)}</span>
                        <ExternalLink className="size-3" />
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    All winning contracts have already been redeemed into your tUSDC collateral balance on Somnia Shannon testnet.
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-9 border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-xl"
                    onClick={() => dispatchAction("Show me the live prediction markets on DreamDEX")}
                  >
                    <BarChart3 className="size-3.5 mr-1.5" />
                    Live Markets
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 h-9 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl shadow-sm"
                    onClick={() => dispatchAction("Show my DreamDEX portfolio")}
                  >
                    <Wallet className="size-3.5 mr-1.5" />
                    View Portfolio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="size-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-rose-200">Execution Failed</div>
                    <p className="text-[11px] text-zinc-300 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRejectAgentExecution}
                    variant="outline"
                    className="flex-1 h-9 border-zinc-800 text-zinc-400 text-xs rounded-xl"
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={handleConfirmAgentExecution}
                    className="flex-[2] h-9 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-xl"
                  >
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Retry Execution
                  </Button>
                </div>
              </div>
            )
          ) : null}
        </div>

        {/* Footer */}
        <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold flex items-center justify-center gap-1.5">
            Powered by DreamDEX <span className="w-0.5 h-0.5 bg-zinc-600 rounded-full" /> Somnia Shannon Testnet
          </p>
        </div>
      </div>
    </div>
  );
}
