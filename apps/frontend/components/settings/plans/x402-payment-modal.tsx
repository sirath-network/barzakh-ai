"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, Check } from "lucide-react";
import { parseUnits, encodeFunctionData } from "viem";

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
] as const;

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

  useEffect(() => {
    if (isOpen) {
      setStep("init");
      setPaymentDetails(null);
      setTxHash("");
      setIsLoading(false);
      setCopied(false);
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

  const handlePayWithMetaMask = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      toast.error("MetaMask not found");
      return;
    }

    try {
      setIsLoading(true);
      const ethereum = (window as any).ethereum;
      await ethereum.request({ method: "eth_requestAccounts" });
      
      // Switch to Base Sepolia
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x14a34" }], // 84532 in hex
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0x14a34",
                chainName: "Base Sepolia",
                rpcUrls: ["https://sepolia.base.org"],
                nativeCurrency: {
                  name: "Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://sepolia.basescan.org"],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            to: paymentDetails.token, // USDC Contract Address
            from: ethereum.selectedAddress,
            data: encodeFunctionData({
              abi: USDC_ABI,
              functionName: "transfer",
              args: [
                paymentDetails.receiver as `0x${string}`,
                parseUnits(paymentDetails.amount, 6), // USDC has 6 decimals
              ],
            }),
          },
        ],
      });

      setTxHash(txHash);
      toast.success("Transaction sent! Please wait for confirmation.");
    } catch (error: any) {
      // MetaMask user rejection error code is 4001
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
      const res = await fetch("/api/billing/x402/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionHash: txHash, planId, billingCycle }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Payment verified! Subscription active.");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Verification failed");
        setStep("payment");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error verifying payment");
      setStep("payment");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay with Crypto (x402)</DialogTitle>
          <DialogDescription>
            Secure payment via Base Sepolia
          </DialogDescription>
        </DialogHeader>

        {step === "init" && (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              You are about to subscribe to the <strong>{planId.toUpperCase()}</strong> plan.
            </p>
            <Button onClick={initPayment} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Proceed to Payment
            </Button>
          </div>
        )}

        {step === "payment" && paymentDetails && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-mono font-bold">{paymentDetails.amount} USDC</span>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Receiver Address:</span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-xs break-all">
                    {paymentDetails.receiver}
                  </code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleCopy(paymentDetails.receiver)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Button onClick={handlePayWithMetaMask} disabled={isLoading} className="w-full">
                Pay with MetaMask
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or enter TX Hash</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="txHash">Transaction Hash</Label>
                <Input
                  id="txHash"
                  placeholder="0x..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                />
              </div>
              <Button onClick={verifyPayment} disabled={!txHash || isLoading} className="w-full">
                Verify Payment
              </Button>
            </div>
          </div>
        )}

        {step === "verifying" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying transaction on-chain...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
