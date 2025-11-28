"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, Check, Wallet, AlertCircle, ExternalLink, ChevronDown, ChevronUp, LogOut } from "lucide-react";
import { parseUnits, encodeFunctionData, formatUnits } from "viem";

interface X402PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  billingCycle: string;
  onSuccess: () => void;
}

const USDC_ABI = [
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const DialogAny = Dialog as any;
const DialogContentAny = DialogContent as any;
const DialogHeaderAny = DialogHeader as any;
const DialogTitleAny = DialogTitle as any;
const DialogDescriptionAny = DialogDescription as any;
const ButtonAny = Button as any;
const InputAny = Input as any;
const LabelAny = Label as any;

export function X402PaymentModal({
  isOpen,
  onClose,
  planId,
  billingCycle,
  onSuccess,
}: X402PaymentModalProps) {
  const [step, setStep] = useState<"init" | "payment" | "verifying">("init");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [txHash, setTxHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string | null>(null);
  const [isWaitingConfirmation, setIsWaitingConfirmation] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep("init");
      setPaymentDetails(null);
      setTxHash("");
      setIsLoading(false);
      setCopied(false);
      setConnectedAddress(null);
      setUserBalance(null);
      setIsWaitingConfirmation(false);
      setShowManualEntry(false);
    }
  }, [isOpen, planId, billingCycle]);

  const initPayment = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/billing/x402/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, billingCycle }),
      });

      if (res.status === 402) {
        const data = await res.json();
        setPaymentDetails(data.paymentDetails);
        setStep("payment");
      } else {
        toast.error("Failed to initiate payment");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error initiating payment");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const disconnectWallet = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        await (window as any).ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      }
    } catch (error) {
      console.log("Revoke permissions not supported or cancelled", error);
    }
    setConnectedAddress(null);
    setUserBalance(null);
    toast.info("Wallet disconnected");
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast.error("MetaMask not found");
      return;
    }

    try {
      setIsLoading(true);
      const ethereum = (window as any).ethereum;
      await ethereum.request({ method: "eth_requestAccounts" });
      
      // Switch to Base Mainnet
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2105" }], // 8453 in hex
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x2105",
                chainName: "Base",
                rpcUrls: ["https://mainnet.base.org"],
                nativeCurrency: {
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://basescan.org"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      const userAddress = ethereum.selectedAddress;
      setConnectedAddress(userAddress);

      // Fetch user's USDC balance
      const balanceOfData = encodeFunctionData({
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [userAddress as `0x${string}`],
      });

      const balanceHex = await ethereum.request({
        method: "eth_call",
        params: [
          {
            to: paymentDetails.token,
            data: balanceOfData,
          },
          "latest",
        ],
      });

      const balance = BigInt(balanceHex);
      const formattedBalance = formatUnits(balance, 6);
      setUserBalance(parseFloat(formattedBalance).toFixed(2));

    } catch (error: any) {
      if (error.code === 4001) {
        toast.info("Connection cancelled");
        return;
      }
      console.error("Connection error:", error);
      toast.error(error.message || "Failed to connect wallet");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyWithRetry = async (hash: string, maxRetries = 5) => {
    let retries = maxRetries;
    const toastId = toast.loading("Verifying payment...");

    while (retries > 0) {
      try {
        const res = await fetch("/api/billing/x402/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionHash: hash, planId, billingCycle }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          toast.dismiss(toastId);
          toast.success("Payment verified! Subscription active.");
          onSuccess();
          onClose();
          return true;
        } else if (res.status === 409 && data.code === "BLOCK_NOT_FOUND") {
           // Retryable error
           console.log(`Block not found, retrying verification... (${retries} left)`);
           toast.loading(`Verifying... Block confirmation pending (${retries} retries left)`, { id: toastId });
           retries--;
           await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
           continue;
        } else {
          toast.dismiss(toastId);
          toast.error(data.error || "Verification failed");
          setStep("payment");
          return false;
        }
      } catch (error) {
        console.error(error);
        // Network error, maybe retry?
        retries--;
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    toast.dismiss(toastId);
    toast.error("Verification timed out. Please try again manually.");
    setStep("payment");
    return false;
  };

  const handlePayWithMetaMask = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast.error("MetaMask not found");
      return;
    }

    if (!connectedAddress) {
      await connectWallet();
      return;
    }

    try {
      setIsLoading(true);
      const ethereum = (window as any).ethereum;
      
      // Check balance again before payment
      const requiredAmount = parseUnits(paymentDetails.amount, 6);
      const currentBalance = parseUnits(userBalance || "0", 6);
      
      if (currentBalance < requiredAmount) {
        toast.error(
          `Insufficient USDC balance. You have ${userBalance} USDC but need ${paymentDetails.amount} USDC.`
        );
        setIsLoading(false);
        return;
      }

      const newTxHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            to: paymentDetails.token,
            from: connectedAddress,
            data: encodeFunctionData({
              abi: USDC_ABI,
              functionName: "transfer",
              args: [
                paymentDetails.receiver as `0x${string}`,
                parseUnits(paymentDetails.amount, 6),
              ],
            }),
          },
        ],
      });

      setTxHash(newTxHash);
      
      const confirmationToastId = toast.loading("Waiting for transaction confirmation...");
      
      // Wait for transaction confirmation
      const waitForConfirmation = async (hash: string): Promise<boolean> => {
        const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
        let attempts = 0;
        
        while (attempts < maxAttempts) {
          try {
            const receipt = await ethereum.request({
              method: "eth_getTransactionReceipt",
              params: [hash],
            });
            
            if (receipt) {
              // Check if transaction was successful (status 0x1)
              if (receipt.status === "0x1") {
                toast.dismiss(confirmationToastId);
                return true;
              } else {
                toast.dismiss(confirmationToastId);
                toast.error("Transaction failed on-chain");
                return false;
              }
            }
          } catch (err) {
            console.log("Waiting for receipt...", err);
          }
          
          // Wait 2 seconds before next check
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
        
        toast.dismiss(confirmationToastId);
        return false; // Timeout
      };

      // Wait minimum 5 seconds then check for confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const confirmed = await waitForConfirmation(newTxHash);
      setIsWaitingConfirmation(false);
      
      if (confirmed) {
        // Auto-trigger verification (toast is handled inside verifyWithRetry)
        setStep("verifying");
        await verifyWithRetry(newTxHash);
      } else {
        toast.info("Could not confirm transaction automatically. Please verify manually.");
      }
    } catch (error: any) {
      if (error.code === 4001) {
        toast.info("Transaction cancelled");
        return;
      }
      
      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async () => {
    if (!txHash) return;
    try {
      setStep("verifying");
      await verifyWithRetry(txHash);
    } catch (error) {
      console.error(error);
      toast.error("Error verifying payment");
      setStep("payment");
    }
  };

  return (
    <DialogAny open={isOpen} onOpenChange={onClose}>
      <DialogContentAny className="sm:max-w-md w-[90%] rounded-xl">
        <DialogHeaderAny>
          <DialogTitleAny>Pay with Crypto (x402)</DialogTitleAny>
          <DialogDescriptionAny>
            Secure payment via Base
          </DialogDescriptionAny>
        </DialogHeaderAny>

        <div className="overflow-y-auto max-h-[60vh] sm:max-h-[70vh] px-1">
        {step === "init" && (
          <div className="flex flex-col items-center justify-center py-6 space-y-5">
            <div className="p-3 bg-primary/10 rounded-full">
                <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="font-medium">Crypto Payment</h3>
                <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
                  Subscribe to the <strong>{planId.toUpperCase()}</strong> plan using USDC on Base.
                </p>
            </div>
            <ButtonAny onClick={initPayment} disabled={isLoading} className="w-full max-w-xs">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Proceed to Payment
            </ButtonAny>
          </div>
        )}

        {step === "payment" && paymentDetails && (
          <div className="space-y-6">
            {/* Payment Details Card */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-4 border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{paymentDetails.amount}</span>
                    <span className="text-sm font-medium text-muted-foreground">USDC</span>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Send to address</span>
                    <span className="text-[10px] uppercase tracking-wider font-medium text-primary/70">Base</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-background rounded border shadow-sm">
                  <code className="flex-1 text-xs font-mono truncate text-muted-foreground">
                    {paymentDetails.receiver}
                  </code>
                  <ButtonAny
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 hover:bg-muted"
                    onClick={() => handleCopy(paymentDetails.receiver)}
                  >
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  </ButtonAny>
                </div>
              </div>
            </div>

            {/* Wallet Section */}
            <div className="space-y-3">
                {!connectedAddress ? (
                    <ButtonAny onClick={connectWallet} disabled={isLoading} className="w-full" size="lg">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                        Connect Wallet to Pay
                    </ButtonAny>
                ) : (
                    <div className="space-y-3">
                        <div className={`p-3 rounded-lg border transition-colors ${
                            userBalance && parseFloat(userBalance) < parseFloat(paymentDetails.amount)
                            ? "bg-red-50/50 border-red-200 dark:bg-red-950/20 dark:border-red-900"
                            : "bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-900"
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-full ${
                                        userBalance && parseFloat(userBalance) < parseFloat(paymentDetails.amount)
                                        ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                                        : "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400"
                                    }`}>
                                        <Wallet className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium">
                                            {connectedAddress.slice(0, 6)}...{connectedAddress.slice(-4)}
                                        </span>
                                        <button 
                                            onClick={disconnectWallet}
                                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-500 transition-colors"
                                        >
                                            <LogOut className="h-3 w-3" />
                                            Disconnect
                                        </button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground">Balance</div>
                                    <div className={`font-mono font-medium ${
                                        userBalance && parseFloat(userBalance) < parseFloat(paymentDetails.amount)
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-green-600 dark:text-green-400"
                                    }`}>
                                        {userBalance ?? "..."} USDC
                                    </div>
                                </div>
                            </div>
                            
                            {userBalance && parseFloat(userBalance) < parseFloat(paymentDetails.amount) && (
                                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-2 pt-2 border-t border-red-200 dark:border-red-900/50">
                                    <AlertCircle className="h-3 w-3" />
                                    <span>Insufficient balance. You need {paymentDetails.amount} USDC.</span>
                                </div>
                            )}
                        </div>

                        <ButtonAny 
                            onClick={handlePayWithMetaMask} 
                            disabled={isLoading || isWaitingConfirmation || (userBalance !== null && parseFloat(userBalance) < parseFloat(paymentDetails.amount))} 
                            className="w-full"
                            size="lg"
                        >
                            {isLoading || isWaitingConfirmation ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isWaitingConfirmation ? "Confirming Transaction..." : "Processing..."}
                                </>
                            ) : (
                                `Pay ${paymentDetails.amount} USDC`
                            )}
                        </ButtonAny>
                    </div>
                )}
            </div>
              
            {/* Transaction Status */}
            {isWaitingConfirmation && txHash && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start gap-3">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Waiting for block confirmation</p>
                        <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                            This usually takes a few seconds. Please don't close this window.
                        </p>
                        <a 
                            href={`https://basescan.org/tx/${txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300 hover:underline mt-1"
                        >
                            View on Explorer <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                  </div>
                </div>
            )}
              
            {/* Manual Entry Toggle */}
            <div className="pt-2 border-t">
                <button 
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    className="flex items-center justify-center w-full gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                    <span>Having trouble? Enter transaction hash manually</span>
                    {showManualEntry ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                
                {showManualEntry && (
                    <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <LabelAny htmlFor="txHash" className="text-xs">Transaction Hash</LabelAny>
                            <InputAny
                                id="txHash"
                                placeholder="0x..."
                                value={txHash}
                                onChange={(e: any) => setTxHash(e.target.value)}
                                disabled={isWaitingConfirmation}
                                className="font-mono text-xs"
                            />
                        </div>
                        <ButtonAny 
                            onClick={verifyPayment} 
                            disabled={!txHash || isLoading || isWaitingConfirmation} 
                            variant="secondary" 
                            className="w-full"
                        >
                            Verify Payment Manually
                        </ButtonAny>
                    </div>
                )}
            </div>
          </div>
        )}

        {step === "verifying" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying transaction on-chain...</p>
          </div>
        )}
        </div>
      </DialogContentAny>
    </DialogAny>
  );
}
