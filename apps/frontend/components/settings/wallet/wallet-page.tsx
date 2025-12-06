"use client";

import { useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Wallet, Shield, CheckCircle, Loader2, AlertCircle, Unplug, RefreshCw, Key, Lock, Globe, Copy } from "lucide-react";
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
  const [errorAlert, setErrorAlert] = useState<{title: string, description: ReactNode} | null>(null);

  const currentWallet = (session?.user as any)?.walletAddress;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard");
  };

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
      // Handle user rejection specifically
      if (error.name === 'UserRejectedRequestError' || 
          error.message?.includes('User rejected the request') ||
          error.code === 4001) {
        toast.info("Wallet binding cancelled");
      } else if (error.message === "Wallet address already connected to another account") {
        // Handle specific business logic errors without console.error to avoid Next.js overlay
        setErrorAlert({
          title: "Wallet Address Already Linked to Another Account",
          description: (
            <div className="space-y-3 mt-2">
              <p>The associated wallet address is tied to another user account. If you are the owner, please sign in to that account and follow the steps below:</p>
              <div className="flex flex-col gap-1 pl-2 font-medium">
                <span>• Settings</span>
                <span>• Profile Settings</span>
                <span>• Delete Account</span>
              </div>
              <p>Once the process is finalized, you can Bind the wallet address to your existing account.</p>
            </div>
          )
        });
        setTimeout(() => setErrorAlert(null), 30000);
      } else {
        console.error(error);
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Card */}
          <div className="lg:col-span-2 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
            <div className="p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-2">Connected Wallet</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Connect your wallet to sign in with Web3.
              </p>
            </div>
            
            <div className="p-6 md:p-8 space-y-6">
              {errorAlert && (
                <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 border border-red-200 dark:border-red-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">{errorAlert.title}</h3>
                      <div className="text-sm text-red-700 dark:text-red-200 leading-relaxed">
                        {errorAlert.description}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentWallet ? (
                <div className="space-y-6">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg">
                    <div className="flex items-start gap-3 w-full min-w-0">
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Wallet Connected</p>
                        <div className="flex items-center gap-2 bg-white dark:bg-black/20 rounded-md px-3 py-1.5 w-full max-w-full border border-green-100 dark:border-green-800/50 overflow-hidden">
                          <p className="text-xs text-green-800 dark:text-green-200 font-mono truncate flex-1 min-w-0">
                            {currentWallet}
                          </p>
                          <button 
                            onClick={() => copyToClipboard(currentWallet)}
                            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors shrink-0 p-1.5 hover:bg-green-100 dark:hover:bg-green-800/50 rounded-md"
                            title="Copy address"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          
                          <div className="w-px h-4 bg-green-200 dark:bg-green-800 mx-1 shrink-0" />
                          
                          <Dialog open={isUnbindModalOpen} onOpenChange={setIsUnbindModalOpen}>
                            <DialogTrigger asChild>
                              <button 
                                className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors shrink-0 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                              >
                                <Unplug className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Disconnect</span>
                                <span className="lg:hidden">Unbind</span>
                              </button>
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
                      </div>
                    </div>
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
                          className="w-full sm:w-auto bg-gray-900 text-white dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 hover:bg-gray-800 dark:hover:from-red-700 dark:hover:to-red-800 shadow-lg border-0"
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
                          <button
                            onClick={() => disconnect()}
                            className="px-4 py-2 border border-gray-300 dark:border-red-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-red-900/20 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors text-sm"
                          >
                            Disconnect Extension
                          </button>
                        ) : (
                          <button
                            onClick={openConnectModal}
                            className="px-4 py-2 border border-gray-300 dark:border-red-900/30 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-red-900/20 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors text-sm"
                          >
                            Connect Extension
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {!errorAlert && (
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 border border-red-200 dark:border-red-700/50">
                      <div className="flex gap-3">
                        <Shield className="w-5 h-5 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Secure Connection</h3>
                          <p className="text-sm text-red-700 dark:text-red-200">
                            Connecting your wallet allows you to sign in securely without a password. We will ask you to sign a message to verify ownership.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {isConnected && address ? (
                     <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg shrink-0">
                                <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Wallet Detected</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate">{address}</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => bindWallet(address)}
                            disabled={isLoading}
                            className="flex-1 py-2.5 px-4 bg-gray-900 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 hover:bg-gray-800 dark:hover:from-red-700 dark:hover:to-red-800 text-white rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                            Bind This Wallet
                          </button>
                          <button
                            onClick={() => disconnect()}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-colors"
                          >
                            Change
                          </button>
                        </div>
                     </div>
                  ) : (
                    <button
                      onClick={openConnectModal}
                      className="w-full py-4 px-4 bg-gray-900 dark:bg-gradient-to-r dark:from-red-600 dark:to-red-700 hover:bg-gray-800 dark:hover:from-red-700 dark:hover:to-red-800 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Wallet className="w-5 h-5" />
                      Connect Wallet
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Tips */}
            <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Wallet Safety</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Keep your assets secure</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Private Keys</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Never share your private keys or seed phrase with anyone.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Verify URLs</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Always check you are on the correct website before connecting.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Hardware Wallets</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Use a hardware wallet like Ledger or Trezor for extra security.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-2xl border border-gray-200 dark:border-red-900/50 overflow-hidden backdrop-blur-sm">
              <div className="p-6 md:p-8 border-b border-gray-200 dark:border-red-900/30">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Web3 Features</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">Why connect your wallet?</p>
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-red-500 dark:text-red-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Passwordless Login</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Sign in securely with just your wallet signature.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-red-500 dark:text-red-400" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Non-Custodial</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">You maintain full control of your identity.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 bg-white dark:bg-black/80 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 dark:border-red-900/50 p-4 md:p-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-1">Need Help?</h3>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                Having trouble connecting your wallet? Our support team is here to help.
              </p>
            </div>
            <button onClick={() => window.open("https://barzakh.framer.ai/contact", "_blank")}
              className="bg-gray-100 dark:bg-red-950/40 hover:bg-gray-200 dark:hover:bg-red-900/50 text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white px-3 py-2 md:px-4 md:py-3 rounded-lg font-medium transition-colors border border-gray-200 dark:border-red-900/50 text-xs md:text-sm">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
