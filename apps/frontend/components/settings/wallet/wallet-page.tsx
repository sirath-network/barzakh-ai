"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Wallet, Shield, CheckCircle, Loader2, AlertCircle, Unplug, RefreshCw } from "lucide-react";
import { useAccount, useSignMessage, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function WalletSettingsPage() {
  const { data: session, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isUnbinding, setIsUnbinding] = useState(false);
  const [isUnbindModalOpen, setIsUnbindModalOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();

  const currentWallet = (session?.user as any)?.walletAddress;

  const unbindWallet = async () => {
    setIsUnbinding(true);
    try {
      const res = await fetch("/api/settings/wallet/unbind", {
        method: "POST",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to unbind wallet");
      }

      toast.success("Wallet disconnected successfully");
      
      // Update session
      await update({
        user: {
          ...session?.user,
          walletAddress: null
        }
      });
      
      setIsUnbindModalOpen(false);
      // Also disconnect from wagmi if it's the same wallet
      if (address === currentWallet) {
        disconnect();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to unbind wallet");
    } finally {
      setIsUnbinding(false);
    }
  };

  const bindWallet = async (walletAddress: string) => {
    setIsLoading(true);
    try {
      // 1. Get Nonce
      const nonceRes = await fetch(`/api/auth/nonce?address=${walletAddress}`);
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
      const { nonce } = await nonceRes.json();

      // 2. Sign Message
      const message = `Barzakh AI wants you to bind your wallet:\n${walletAddress}\n\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message });

      // 3. Call Bind API
      const res = await fetch("/api/settings/wallet/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, signature, message }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to bind wallet");
      }

      toast.success("Wallet connected successfully!");
      
      // Update session
      await update({
        user: {
          ...session?.user,
          walletAddress: walletAddress
        }
      });

    } catch (error: any) {
      console.error(error);
      // Handle user rejection specifically
      if (error.name === 'UserRejectedRequestError' || 
          error.message?.includes('User rejected the request') ||
          error.code === 4001) {
        toast.info("Wallet binding cancelled");
      } else {
        toast.error(error.message || "Failed to bind wallet");
      }
      disconnect(); // Disconnect on error so they can try again
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gradient-to-br dark:from-black dark:via-red-950 dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-100 dark:bg-gradient-to-br dark:from-red-600 dark:to-red-700 rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-red-700/50">
              <Wallet className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Wallet Connection</h1>
              <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">Manage your connected Web3 wallet</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
          <div className="p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">Connected Wallet</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              Connect your wallet to sign in with Web3.
            </p>
          </div>
          
          <div className="p-6 md:p-8 space-y-6">
            {currentWallet ? (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">Wallet Connected</p>
                      <p className="text-xs text-green-700 dark:text-green-300 font-mono mt-1 break-all">{currentWallet}</p>
                    </div>
                  </div>
                  
                  <Dialog open={isUnbindModalOpen} onOpenChange={setIsUnbindModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="shrink-0 w-full sm:w-auto">
                        <Unplug className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Disconnect Wallet</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to disconnect your wallet? You won't be able to sign in with Web3 until you reconnect it.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUnbindModalOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={unbindWallet} disabled={isUnbinding}>
                          {isUnbinding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Disconnect
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Change Wallet Section */}
                <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Change Wallet</h3>
                  
                  {isConnected && address && address !== currentWallet ? (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg space-y-3">
                      <div className="flex items-start gap-3">
                        <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">New Wallet Detected</h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            You are connected to <span className="font-mono font-bold">{address}</span> in your browser extension.
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => bindWallet(address)} 
                        disabled={isLoading}
                        className="w-full sm:w-auto"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
                        Switch to this Wallet
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex-1">
                        To change your wallet, first connect a different wallet in your browser extension.
                      </p>
                      {isConnected ? (
                        <Button variant="outline" onClick={() => disconnect()} size="sm">
                          Disconnect Extension
                        </Button>
                      ) : (
                        <Button variant="outline" onClick={openConnectModal} size="sm">
                          Connect Extension
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200">Secure Connection</h3>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      Connecting your wallet allows you to sign in securely without a password. We will ask you to sign a message to verify ownership.
                    </p>
                  </div>
                </div>

                {isConnected && address ? (
                   <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Detected wallet: <span className="font-mono text-gray-900 dark:text-white">{address}</span>
                      </p>
                      <button
                        onClick={() => bindWallet(address)}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-gray-900 dark:bg-red-600 hover:bg-gray-800 dark:hover:bg-red-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                        Bind This Wallet
                      </button>
                      <button
                        onClick={() => disconnect()}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                      >
                        Use a different wallet
                      </button>
                   </div>
                ) : (
                  <button
                    onClick={openConnectModal}
                    className="w-full py-3 px-4 bg-gray-900 dark:bg-red-600 hover:bg-gray-800 dark:hover:bg-red-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
