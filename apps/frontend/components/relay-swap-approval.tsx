"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAccount, useSwitchChain, useSendTransaction, useSignMessage, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ArrowRightLeft, Check, AlertCircle, Loader2, ExternalLink, Clock, Info, Wallet, ShieldCheck } from "lucide-react";
import { createClient } from "@relayprotocol/relay-sdk";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import { motion, AnimatePresence } from "framer-motion";
import { useChainWallet, isNonEvmChain, getNonEvmChainName } from "@/hooks/use-chain-wallet";

// Dynamic import DynamicWidget to prevent SSR issues
const DynamicWidget = dynamic(
    () => import('@dynamic-labs/sdk-react-core').then((mod) => mod.DynamicWidget),
    { ssr: false, loading: () => <div className="h-11 bg-zinc-800/50 rounded-lg animate-pulse" /> }
);

// Dynamic import for useDynamicContext - we need this to programmatically open the auth flow
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';

// Type aliases for React 19 compatibility
const ButtonAny = Button as any;

// Solana RPC URL - use env var or fallback to public endpoint
const SOLANA_RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://solana-rpc.publicnode.com";

// Custom connect button for Dynamic SDK - styled like the EVM wallet connect button
const DynamicConnectButton = () => {
    const { setShowAuthFlow } = useDynamicContext();

    return (
        <ButtonAny
            onClick={() => setShowAuthFlow(true)}
            className="w-full h-11 bg-white text-black hover:bg-zinc-100 font-semibold text-sm shadow-sm"
        >
            <Wallet className="size-4 mr-2" />
            Connect Wallet
        </ButtonAny>
    );
};

// Chain names for display
const CHAIN_NAMES: Record<number, string> = {
    1: "Ethereum",
    10: "Optimism",
    25: "Cronos",
    56: "BNB Chain",
    100: "Gnosis",
    130: "Unichain",
    137: "Polygon",
    143: "Monad",
    146: "Sonic",
    169: "Manta Pacific",
    288: "Boba",
    324: "zkSync Era",
    360: "Shape",
    30: "Rootstock",
    466: "AppChain",
    480: "World Chain",
    690: "Redstone",
    747: "Flow EVM",
    988: "Stable",
    999: "HyperEVM",
    1088: "Metis",
    1101: "Polygon zkEVM",
    1135: "Lisk",
    1329: "Sei",
    1337: "Hyperliquid",
    1424: "Perennial",
    1514: "Story",
    1625: "Gravity",
    1868: "Soneium",
    1923: "SwellChain",
    1996: "Sanko",
    2020: "Ronin",
    2741: "Abstract",
    2818: "Morph",
    5000: "Mantle",
    5031: "Somnia",
    5330: "Superseed",
    7560: "Cyber",
    7869: "Powerloom",
    7897: "Arena-Z",
    8333: "B3",
    8453: "Base",
    9745: "Plasma",
    33139: "ApeChain",
    33979: "Funkichain",
    34443: "Mode",
    42018: "Mythos",
    42161: "Arbitrum",
    42170: "Arbitrum Nova",
    42220: "Celo",
    43111: "Hemi",
    43114: "Avalanche",
    43419: "Gunz",
    48900: "Zircuit",
    55244: "Superposition",
    57073: "Ink",
    59144: "Linea",
    60808: "BOB",
    69000: "Animechain",
    80094: "Berachain",
    81457: "Blast",
    98866: "Plume",
    167000: "Taiko",
    510003: "Syndicate",
    534352: "Scroll",
    543210: "Zero",
    660279: "Xai",
    747474: "Katana",
    7777777: "Zora",
};

// Block explorers for transaction links
const BLOCK_EXPLORERS: Record<number, string> = {
    1: "https://etherscan.io",
    10: "https://optimistic.etherscan.io",
    25: "https://cronoscan.com",
    56: "https://bscscan.com",
    100: "https://gnosisscan.io",
    130: "https://uniscan.xyz",
    137: "https://polygonscan.com",
    146: "https://sonicscan.org",
    169: "https://pacific-explorer.manta.network",
    324: "https://explorer.zksync.io",
    480: "https://worldscan.org",
    999: "https://hyperevmscan.io",
    1088: "https://explorer.metis.io",
    1101: "https://zkevm.polygonscan.com",
    1135: "https://blockscout.lisk.com",
    1329: "https://seitrace.com",
    1868: "https://soneium.blockscout.com",
    2020: "https://app.roninchain.com",
    2741: "https://abscan.org",
    5000: "https://mantlescan.xyz",
    8333: "https://explorer.b3.fun",
    8453: "https://basescan.org",
    33139: "https://apescan.io",
    34443: "https://explorer.mode.network",
    42161: "https://arbiscan.io",
    42170: "https://nova.arbiscan.io",
    42220: "https://celoscan.io",
    43114: "https://snowtrace.io",
    48900: "https://explorer.zircuit.com",
    57073: "https://explorer.inkonchain.com",
    59144: "https://lineascan.build",
    60808: "https://explorer.gobob.xyz",
    69000: "https://explorer-animechain-39xf6m45e3.t.conduit.xyz",
    80094: "https://beratrail.io",
    81457: "https://blastscan.io",
    167000: "https://taikoscan.io",
    534352: "https://scrollscan.com",
    660279: "https://explorer.xai-chain.net",
    7777777: "https://explorer.zora.energy",
};

interface RelayTransaction {
    data: string;
    to: string;
    value: string;
    chainId: number;
    rawData?: any; // Raw transaction data for non-EVM chains
}

interface RelayQuoteDetails {
    inputAmount?: string;
    inputToken?: string;
    outputAmount?: string;
    outputToken?: string;
    rate?: string;
    gasFee?: string;
    relayerFee?: string;
    totalFee?: string;
    estimatedTime?: string;
    steps?: number;
}

interface RelaySwapApprovalProps {
    result: {
        status: string;
        quote?: RelayQuoteDetails;
        quoteDetails?: RelayQuoteDetails;
        transactions?: RelayTransaction[];
        fromChain?: string;
        toChain?: string;
        sourceChain?: string;
        destinationChain?: string;
        error?: string;
        details?: string;
        suggestion?: string;
        message?: string;
        instructions?: string[];
        timestamp?: string;
        note?: string;
        toolParams?: {
            fromChainId: number;
            toChainId: number;
            fromToken: string;
            toToken: string;
            amount: string;
            isUSD: boolean;
            recipient?: string;
        };
    };
}

export function RelaySwapApproval({ result }: RelaySwapApprovalProps) {
    const { address, isConnected, chain } = useAccount();
    const { switchChain } = useSwitchChain();
    const { sendTransactionAsync, isPending: isSending } = useSendTransaction();
    const { signMessageAsync } = useSignMessage();
    const { disconnect } = useDisconnect();

    const [step, setStep] = useState<"ready" | "verifying" | "switching" | "sending" | "confirming" | "success" | "error">("ready");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [txHash, setTxHash] = useState<string | null>(null);
    const [currentTxIndex, setCurrentTxIndex] = useState(0);
    const [isVerified, setIsVerified] = useState(false);
    const [clientTransactions, setClientTransactions] = useState<RelayTransaction[]>([]);
    const [clientLoading, setClientLoading] = useState(false);


    // Swap tracking state
    const [swapAlreadyCompleted, setSwapAlreadyCompleted] = useState(false);
    const [isCheckingSwapStatus, setIsCheckingSwapStatus] = useState(true);
    const [completedTxHash, setCompletedTxHash] = useState<string | null>(null);

    // Get initial quote details
    const quote = result.quote || result.quoteDetails;
    const sourceChain = result.fromChain || result.sourceChain;
    const destChain = result.toChain || result.destinationChain;
    const initialTransactions = result.transactions || [];

    // Determine required chain for transaction
    const getChainIdFromName = (name: string): number | undefined => {
        const entry = Object.entries(CHAIN_NAMES).find(([_, n]) =>
            n.toLowerCase() === name?.toLowerCase()
        );
        return entry ? parseInt(entry[0]) : undefined;
    };

    const requiredChainIdNum = result.toolParams?.fromChainId || getChainIdFromName(sourceChain || "");
    const destinationChainIdNum = result.toolParams?.toChainId || getChainIdFromName(destChain || "");
    const isWrongChain = chain?.id !== requiredChainIdNum;

    // Check if source chain is non-EVM (e.g., swapping FROM Solana)
    const isSourceNonEvm = requiredChainIdNum ? isNonEvmChain(requiredChainIdNum) : false;

    // Get source chain wallet from Dynamic SDK (for Solana, Bitcoin, Tron)
    const sourceWallet = useChainWallet(requiredChainIdNum);

    // Address Input Logic
    const [recipientAddress, setRecipientAddress] = useState<string>("");
    const [recipientError, setRecipientError] = useState<string>("");
    const [showManualInput, setShowManualInput] = useState(false);

    // Check if we need a separate destination address (e.g. cross-chain to non-EVM, or from non-EVM to EVM)
    const needsDestinationAddress = (() => {
        if (typeof window === "undefined") return false;

        // If destination is non-EVM, we DEFINITELY need a separate address
        if (destinationChainIdNum && isNonEvmChain(destinationChainIdNum)) {
            return true;
        }

        // If source is non-EVM and destination is EVM, we need the user to provide an EVM address
        // (unless they have an EVM wallet connected)
        if (isSourceNonEvm && destinationChainIdNum && !isNonEvmChain(destinationChainIdNum)) {
            // If no EVM wallet connected, we need manual input
            return !address;
        }

        return false;
    })();

    // Get destination chain wallet from Dynamic SDK (for Solana, Bitcoin, Tron)
    const destinationWallet = useChainWallet(destinationChainIdNum);

    // Initialize recipient from tool params if valid, or clear if needed
    useEffect(() => {
        if (result.toolParams?.recipient) {
            // If the tool returned a recipient (e.g. from prompt), use it
            // BUT check if it's a placeholder. If it looks like a placeholder, don't auto-fill it as "valid"
            const isPlaceholder =
                result.toolParams.recipient.includes("11111111111111111111111111111111") ||
                result.toolParams.recipient.startsWith("0x000000000000000000000000000000");

            if (!isPlaceholder) {
                setRecipientAddress(result.toolParams.recipient);
            }
        }
    }, [result.toolParams]);

    // Auto-fill recipient address when non-EVM destination wallet is connected
    useEffect(() => {
        if (destinationWallet?.address && destinationChainIdNum && isNonEvmChain(destinationChainIdNum)) {
            setRecipientAddress(destinationWallet.address);
        }
    }, [destinationWallet?.address, destinationChainIdNum]);

    // Validate destination address
    const validateRecipient = (addr: string) => {
        if (!destinationChainIdNum) return true;

        // Solana
        if (destinationChainIdNum === 792703809) {
            return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);
        }
        // Bitcoin
        if (destinationChainIdNum === 8253038) {
            return /^(1|3|bc1)[a-zA-Z0-9]{25,90}$/.test(addr);
        }
        // Tron
        if (destinationChainIdNum === 728126428) {
            return /^T[a-zA-Z0-9]{33}$/.test(addr);
        }

        // Default EVM
        return /^0x[a-fA-F0-9]{40}$/.test(addr);
    };

    // Use client transactions if available, otherwise initial
    const processedTransactions = clientTransactions.length > 0 ? clientTransactions : initialTransactions;
    // Fetch executable transaction client-side if needed
    useEffect(() => {
        const fetchExecutableTx = async () => {
            // Determine the effective user address for the quote
            // For non-EVM sources, we need the Dynamic wallet address
            // For EVM sources, we use the connected wagmi address
            let effectiveUser: string | undefined;

            if (isSourceNonEvm) {
                // For non-EVM sources, we need a Dynamic wallet connection
                if (!sourceWallet?.address) {
                    console.log('Skipping quote fetch: Source is non-EVM, waiting for wallet connection');
                    return;
                }
                effectiveUser = sourceWallet.address;
            } else {
                // For EVM sources, use the wagmi address
                if (!address) return;
                effectiveUser = address;
            }

            // Use manual address input for non-EVM destinations, or EVM address
            const effectiveRecipient = needsDestinationAddress
                ? recipientAddress
                : address;

            if (!effectiveRecipient || (needsDestinationAddress && !validateRecipient(effectiveRecipient))) {
                return;
            }

            // For non-EVM sources, we don't require wagmi connection, only the Dynamic wallet
            const canFetch = isSourceNonEvm
                ? (sourceWallet?.address && result.toolParams && processedTransactions.length === 0)
                : (isConnected && address && result.toolParams && processedTransactions.length === 0);

            if (canFetch && effectiveUser && result.toolParams) {
                setClientLoading(true);
                try {
                    const client = createClient({
                        baseApiUrl: "https://api.relay.link"
                    });

                    const txQuote = await client.actions.getQuote({
                        chainId: result.toolParams.fromChainId,
                        toChainId: result.toolParams.toChainId,
                        currency: result.toolParams.fromToken,
                        toCurrency: result.toolParams.toToken,
                        amount: result.toolParams.amount,
                        tradeType: 'EXACT_INPUT',
                        user: effectiveUser,
                        recipient: effectiveRecipient // Use the validated recipient
                    });

                    if (txQuote.steps) {
                        console.log('Quote steps received:', JSON.stringify(txQuote.steps, null, 2));

                        const txs = txQuote.steps.flatMap((step: any) =>
                            step.items.map((item: any) => {
                                console.log('Processing step item:', JSON.stringify(item, null, 2));
                                const txData = item.data || item;
                                return {
                                    data: txData.data || "0x",
                                    to: txData.to,
                                    value: txData.value ?? "0",
                                    chainId: txData.chainId || step.chainId || result.toolParams?.fromChainId,
                                    // Store the FULL item for non-EVM chains so we can access all transaction formats
                                    rawData: isSourceNonEvm ? item : undefined
                                };
                            })
                        );

                        setClientTransactions(txs);
                        setErrorMessage(""); // Clear any previous errors
                    }
                } catch (err: any) {
                    console.error("Client-side quote fetch failed:", err);
                    setErrorMessage(err.message || "Failed to prepare transaction.");
                } finally {
                    setClientLoading(false);
                }
            }
        };

        // Debounce fetching to avoid rapid calls while typing
        const timer = setTimeout(() => {
            fetchExecutableTx();
        }, 800);

        return () => clearTimeout(timer);
    }, [isConnected, address, result.toolParams, processedTransactions.length, recipientAddress, needsDestinationAddress, isSourceNonEvm, sourceWallet?.address]);

    // Reset verification when disconnected
    useEffect(() => {
        if (!isConnected) {
            setIsVerified(false);
        }
    }, [isConnected]);

    const { handleLogOut } = useDynamicContext();

    // Auto-disconnect on success
    useEffect(() => {
        if (step === "success") {
            const timer = setTimeout(() => {
                disconnect();
                handleLogOut();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [step, disconnect, handleLogOut]);

    // If no quote or no transactions, show informational card
    // BUT if it's an error, return null to avoid showing failed attempts alongside successful ones
    // (The AI often retries with correct params after a failure)
    if (!quote) {
        if (result.status === "error") {
            // Don't render failed attempts - they clutter the UI when AI retries
            return null;
        }
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/90 backdrop-blur-xl p-4 max-w-md w-full shadow-2xl"
            >
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 mb-2">
                    <ArrowRightLeft className="size-5" />
                    <span className="font-medium">Relay Protocol Swap</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {result.message || "Initializing swap details..."}
                </p>
                {!isConnected && (
                    <div className="mt-4 flex justify-center">
                        <ConnectButton />
                    </div>
                )}
            </motion.div>
        );
    }

    // URL for Relay explorer (shows cross-chain transaction details)
    const explorerUrl = txHash || completedTxHash
        ? `https://relay.link/transaction/${txHash || completedTxHash}`
        : undefined;

    // Handlers
    const handleSwitchChain = async () => {
        if (requiredChainIdNum) {
            setStep("switching");
            try {
                switchChain({ chainId: requiredChainIdNum });
                setStep("ready");
            } catch (err) {
                console.error("Failed to switch chain:", err);
                setStep("ready");
            }
        }
    };

    const handleVerify = async () => {
        setStep("verifying");
        try {
            const message = `Verify ownership of wallet for swap:\n${isSourceNonEvm ? sourceWallet?.address : address}\nTimestamp: ${Date.now()}`;

            if (isSourceNonEvm && sourceWallet) {
                // Non-EVM signing (Solana, Bitcoin, Tron)
                const walletAny = sourceWallet as any;
                // Some wallets expose signMessage directly, some via adapter/connector
                const signer = walletAny.signMessage
                    ? walletAny
                    : walletAny.connector?.signMessage
                        ? walletAny.connector
                        : null;

                if (signer) {
                    await signer.signMessage(message);
                } else {
                    // Fallback mock if signing not easily accessible in this context
                    // (Production should implement specific adapters for each chain family)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            } else {
                // EVM signing
                await signMessageAsync({ message });
            }

            setIsVerified(true);
            setStep("ready");
        } catch (err) {
            console.error("Verification failed:", err);
            setStep("ready");
        }
    };

    // Generate deterministic ID for this specific swap intent
    // We use the timestamp from the tool result to ensure it's unique to this specific AI response
    // but persistent across page reloads (since chat history saves the tool result)
    const swapRequestId = result.toolParams
        ? `swap-v1-${result.toolParams.fromChainId}-${result.toolParams.toChainId}-${result.toolParams.amount}-${result.timestamp || 'no-time'}`
        : null;

    // Check status on mount
    useEffect(() => {
        if (!swapRequestId) {
            setIsCheckingSwapStatus(false);
            return;
        }

        const checkStatus = async () => {
            // Avoid double check if already success
            if (step === "success") return;

            try {
                const res = await fetch(`/api/relay/swap-tracking?swapRequestId=${encodeURIComponent(swapRequestId)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.completed) {
                        setSwapAlreadyCompleted(true);
                        setStep("success");
                        if (data.transactionHash) {
                            setCompletedTxHash(data.transactionHash);
                            // Also set the hash for display
                            setTxHash(data.transactionHash);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to check swap status:", error);
            } finally {
                setIsCheckingSwapStatus(false);
            }
        };

        checkStatus();
    }, [swapRequestId]);

    const handleExecuteSwap = async () => {
        if (processedTransactions.length === 0) return;

        // If we need a destination address but it's invalid, show error
        if (needsDestinationAddress && !validateRecipient(recipientAddress)) {
            setRecipientError("Please enter a valid destination address");
            return;
        }

        setStep("sending");
        setErrorMessage("");

        try {
            // Keep track of the final hash
            let finalHash = "";

            // Handle non-EVM source chains differently
            if (isSourceNonEvm && sourceWallet) {
                // For non-EVM chains, we need to use the Dynamic SDK's signer
                console.log('Executing non-EVM transaction with Dynamic wallet');

                for (let i = 0; i < processedTransactions.length; i++) {
                    setCurrentTxIndex(i);
                    const tx = processedTransactions[i];

                    // Get the signer from the Dynamic wallet
                    // Dynamic SDK wallet types vary by chain - use dynamic access
                    const walletAny = sourceWallet as any;
                    const signer = walletAny.getSigner ? await walletAny.getSigner() : await walletAny.connector?.getSigner?.();

                    if (!signer) {
                        throw new Error("Failed to get signer from Dynamic wallet");
                    }

                    // The transaction data from Relay should be in the rawData field
                    // For Solana, this would be a serialized transaction
                    const rawTxData = tx.rawData || tx;

                    let signature: string = '';

                    // Determine chain type and execute accordingly
                    const chainId = result.toolParams?.fromChainId;

                    // Solana chain IDs (792703809 is Relay's Solana identifier)
                    if (chainId === 792703809 || chainId === 1399811149) {
                        console.log('Executing Solana transaction');

                        // Create Solana connection
                        const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

                        // Import required Solana types dynamically
                        const {
                            PublicKey,
                            TransactionInstruction,
                            TransactionMessage,
                            AddressLookupTableAccount
                        } = await import('@solana/web3.js');

                        // The Relay API returns instructions and addressLookupTableAddresses
                        // We need to build a VersionedTransaction from these
                        const dataObj = rawTxData?.data;

                        if (!dataObj?.instructions || !Array.isArray(dataObj.instructions)) {
                            throw new Error('No instructions found in Relay API response');
                        }

                        console.log('Building transaction from', dataObj.instructions.length, 'instructions');

                        // Convert instruction objects to TransactionInstruction
                        const instructions: InstanceType<typeof TransactionInstruction>[] = dataObj.instructions.map((ix: any) => {
                            const keys = ix.keys.map((key: any) => ({
                                pubkey: new PublicKey(key.pubkey),
                                isSigner: key.isSigner,
                                isWritable: key.isWritable
                            }));

                            // Convert hex data to buffer
                            let dataBuffer: Buffer;
                            if (ix.data && ix.data.length > 0) {
                                if (ix.data.startsWith('0x')) {
                                    dataBuffer = Buffer.from(ix.data.slice(2), 'hex');
                                } else {
                                    // Try hex first, then base64
                                    try {
                                        dataBuffer = Buffer.from(ix.data, 'hex');
                                    } catch {
                                        dataBuffer = Buffer.from(ix.data, 'base64');
                                    }
                                }
                            } else {
                                dataBuffer = Buffer.from([]);
                            }

                            return new TransactionInstruction({
                                keys,
                                programId: new PublicKey(ix.programId),
                                data: dataBuffer
                            });
                        });

                        // Fetch address lookup tables if provided
                        let addressLookupTables: InstanceType<typeof AddressLookupTableAccount>[] = [];
                        if (dataObj.addressLookupTableAddresses && dataObj.addressLookupTableAddresses.length > 0) {
                            console.log('Fetching', dataObj.addressLookupTableAddresses.length, 'address lookup tables');

                            const lookupTablePromises = dataObj.addressLookupTableAddresses.map(async (address: string) => {
                                try {
                                    const pubkey = new PublicKey(address);
                                    const result = await connection.getAddressLookupTable(pubkey);
                                    return result.value;
                                } catch (e) {
                                    console.warn('Failed to fetch lookup table:', address, e);
                                    return null;
                                }
                            });

                            const results = await Promise.all(lookupTablePromises);
                            addressLookupTables = results.filter((t): t is InstanceType<typeof AddressLookupTableAccount> => t !== null);
                            console.log('Fetched', addressLookupTables.length, 'lookup tables');
                        }

                        // Get the payer's public key
                        const payerPubkey = new PublicKey(sourceWallet.address);

                        // Get a recent blockhash
                        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
                        console.log('Got blockhash:', blockhash);

                        // Build the transaction message
                        const messageV0 = new TransactionMessage({
                            payerKey: payerPubkey,
                            recentBlockhash: blockhash,
                            instructions
                        }).compileToV0Message(addressLookupTables);

                        // Create the versioned transaction
                        const transaction = new VersionedTransaction(messageV0);
                        console.log('Built VersionedTransaction');

                        // Sign the transaction using the Dynamic wallet signer
                        console.log('Signing transaction with Dynamic wallet...');
                        const signedTx = await signer.signTransaction(transaction);
                        console.log('Transaction signed');

                        // Send the signed transaction
                        console.log('Sending transaction to Solana network...');
                        const txSignature = await connection.sendRawTransaction(
                            signedTx.serialize(),
                            { skipPreflight: false, preflightCommitment: 'confirmed' }
                        );
                        console.log('Transaction sent, signature:', txSignature);

                        // Wait for confirmation
                        console.log('Waiting for confirmation...');
                        await connection.confirmTransaction({
                            signature: txSignature,
                            blockhash,
                            lastValidBlockHeight
                        }, 'confirmed');
                        console.log('Transaction confirmed!');

                        signature = txSignature;
                    } else if (chainId === 8453 || chainId === 137 || chainId === 10) {
                        // This shouldn't happen for isSourceNonEvm, but handle as fallback
                        throw new Error("Unexpected EVM chain in non-EVM execution path");
                    } else if (chainId === 728126428) {
                        // Tron (728126428 is Relay's Tron identifier)
                        console.log('Executing Tron transaction');
                        const result = await signer.signAndSendTransaction(rawTxData);
                        signature = typeof result === 'string' ? result : result.signature || result.txid;
                    } else {
                        // Bitcoin or other chains
                        console.log(`Executing transaction for chain ${chainId}`);
                        const result = await signer.signAndSendTransaction(rawTxData);
                        signature = typeof result === 'string' ? result : result.signature || result.hash || result.txid;
                    }

                    if (!signature) {
                        throw new Error("Transaction failed - no signature returned");
                    }

                    console.log('Transaction signature:', signature);
                    setTxHash(signature);
                    finalHash = signature;
                }
            } else {
                // Standard EVM transaction execution
                for (let i = 0; i < processedTransactions.length; i++) {
                    setCurrentTxIndex(i);
                    const tx = processedTransactions[i];

                    const hash = await sendTransactionAsync({
                        to: tx.to as `0x${string}`,
                        data: tx.data as `0x${string}`,
                        value: BigInt(tx.value || "0"),
                        chainId: tx.chainId
                    });

                    setTxHash(hash);
                    finalHash = hash;
                }
            }

            // If all succeeded
            setCompletedTxHash(finalHash); // Use last hash
            setSwapAlreadyCompleted(true);
            setStep("success");

            // Mark as completed in DB
            if (swapRequestId && finalHash) {
                fetch("/api/relay/swap-tracking", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        swapRequestId,
                        transactionHash: finalHash
                    })
                }).catch(err => console.error("Failed to track swap:", err));
            }

        } catch (err: any) {
            // Check for user rejection
            const isUserRejection = err.message?.includes("User rejected") ||
                err.message?.includes("User denied") ||
                err.message?.includes("User cancelled") ||
                err.cause?.message?.includes("User rejected");

            if (isUserRejection) {
                console.log("Transaction cancelled by user");
                setStep("ready");
                return;
            }

            console.error("Swap failed:", err);
            setErrorMessage(err.shortMessage || err.message || "Transaction failed");
            setStep("error");
        }
    };

    // Helper to render input - Dedicated UI for destination address
    const renderAddressInput = () => {
        if (!needsDestinationAddress) return null;

        const chainName = CHAIN_NAMES[destinationChainIdNum!] || getNonEvmChainName(destinationChainIdNum!) || destChain || "destination";
        const isValidAddress = recipientAddress && validateRecipient(recipientAddress);
        const isEvmDestination = destinationChainIdNum && !isNonEvmChain(destinationChainIdNum);

        // Hide if non-EVM destination wallet is already connected (user requested clean UI)
        if (!isEvmDestination && destinationWallet?.address) return null;

        return (
            <div className="space-y-3">


                {/* Source wallet connected indicator */}


                {/* Destination address input */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Wallet className="size-4 text-zinc-400 dark:text-zinc-500" />
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">
                                Your {chainName} Wallet Address
                            </p>
                        </div>

                    </div>

                    {/* Show connect wallet option for EVM destinations */}
                    {isEvmDestination && isSourceNonEvm && (
                        <div className="mb-3">
                            <div className="flex justify-center w-full [&_button]:w-full [&_button]:h-10 [&_button]:text-sm">
                                <ConnectButton.Custom>
                                    {({ openConnectModal, mounted }) => (
                                        <ButtonAny
                                            onClick={openConnectModal}
                                            disabled={!mounted}
                                            className="w-full h-10 bg-white text-black hover:bg-zinc-100 font-semibold text-sm shadow-sm"
                                        >
                                            <Wallet className="size-4 mr-2" />
                                            Connect EVM Wallet
                                        </ButtonAny>
                                    )}
                                </ConnectButton.Custom>
                            </div>
                            <div className="flex items-center gap-3 my-3">
                                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                <button
                                    onClick={() => setShowManualInput(!showManualInput)}
                                    className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                                >
                                    Or Paste Address
                                    <motion.div
                                        animate={{ rotate: showManualInput ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                                            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </motion.div>
                                </button>
                                <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                            </div>
                        </div>
                    )}

                    {/* Show connect wallet option for Non-EVM destinations */}
                    {!isEvmDestination && (
                        <div className="mb-3">
                            {!destinationWallet?.address ? (
                                <>
                                    <div className="flex justify-center w-full [&_button]:w-full [&_button]:h-10 [&_button]:text-sm">
                                        <DynamicConnectButton />
                                    </div>
                                    <div className="flex items-center gap-3 my-3">
                                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                        <button
                                            onClick={() => setShowManualInput(!showManualInput)}
                                            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-1"
                                        >
                                            Or Paste Address
                                            <motion.div
                                                animate={{ rotate: showManualInput ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-70">
                                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </motion.div>
                                        </button>
                                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
                                    </div>
                                </>
                            ) : null}
                        </div>
                    )}

                    <AnimatePresence>
                        {(showManualInput || (isEvmDestination ? !isSourceNonEvm : !!destinationWallet?.address)) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <input
                                    type="text"
                                    value={recipientAddress}
                                    onChange={(e) => {
                                        setRecipientAddress(e.target.value);
                                        if (e.target.value && !validateRecipient(e.target.value)) {
                                            setRecipientError("Invalid address format");
                                        } else {
                                            setRecipientError("");
                                        }
                                    }}
                                    placeholder={`Receiver addresses`}
                                    className="w-full bg-transparent text-sm font-mono tracking-tight text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 outline-none pb-2 text-center"
                                />
                                {recipientError && (
                                    <p className="text-xs text-red-500 dark:text-red-400 mt-2 flex items-center gap-1 mb-2">
                                        <AlertCircle className="size-3" />
                                        {recipientError}
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div >
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-md mx-auto"
        >
            <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/90 backdrop-blur-xl shadow-2xl">

                {/* Marble Header Image */}
                <div className="relative h-32 w-full overflow-hidden">
                    <Image
                        src="/images/barzakh/banner/marble-new.png"
                        alt="Marble Texture"
                        fill
                        className="object-cover opacity-80"
                        style={{ objectPosition: "50% 35%" }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/95 via-zinc-900/40 to-transparent" />

                    {/* Header Content on top of Marble */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/5 text-white">
                                <ArrowRightLeft className="size-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Cross-Chain Swap</h3>
                                <p className="text-xs text-zinc-300 flex items-center gap-1">
                                    via Relay Protocol <span className="w-1 h-1 rounded-full bg-green-500 inline-block" />
                                </p>
                            </div>
                        </div>
                        {step === "sending" && (
                            <div className="px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/20 text-blue-400 text-xs font-medium flex items-center gap-1 backdrop-blur-sm">
                                <Loader2 className="size-3 animate-spin" /> Processing
                            </div>
                        )}
                        {isVerified && step !== "sending" && step !== "success" && (
                            <div className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 text-xs font-medium flex items-center gap-1 backdrop-blur-sm shadow-sm">
                                <ShieldCheck className="size-3" /> Verified
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-5 pt-2 space-y-4">

                    {/* INPUT CARD */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">
                                From {sourceChain}
                            </p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white truncate" title={quote!.inputAmount}>
                                {quote!.inputAmount}
                            </span>
                            <span className="text-sm font-semibold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-md border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                {quote!.inputToken}
                            </span>
                        </div>
                    </div>

                    {/* DIVIDER */}
                    <div className="relative h-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                        </div>
                        <div className="absolute inset-0 flex justify-center">
                            <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 dark:text-zinc-500">
                                <ArrowRightLeft className="size-4 rotate-90" />
                            </span>
                        </div>
                    </div>

                    {/* OUTPUT CARD */}
                    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group">
                        <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">
                                To {destChain}
                            </p>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                            <span className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white truncate" title={quote!.outputAmount}>
                                {quote!.outputAmount}
                            </span>
                            <span className="text-sm font-semibold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 rounded-md border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                {quote!.outputToken}
                            </span>
                        </div>
                    </div>

                    {/* Source wallet connection - Show first when source is non-EVM */
                        !swapAlreadyCompleted && step !== "success" && isSourceNonEvm && !sourceWallet?.address && (
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet className="size-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Connect Your {getNonEvmChainName(requiredChainIdNum!)} Wallet
                                    </p>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-3">
                                    To swap from {getNonEvmChainName(requiredChainIdNum!)}, connect a wallet like {
                                        requiredChainIdNum === 792703809 ? "Phantom or Solflare" :
                                            requiredChainIdNum === 8253038 ? "Xverse or Unisat" :
                                                requiredChainIdNum === 728126428 ? "TronLink" : "a native wallet"
                                    }.
                                </p>
                                <DynamicConnectButton />
                            </div>
                        )}

                    {/* EVM Source wallet connection - Show first ONLY when destination is Non-EVM (to match the "Source on Top" layout) */
                        !swapAlreadyCompleted && step !== "success" && !isSourceNonEvm && destinationChainIdNum && isNonEvmChain(destinationChainIdNum) && !isConnected && (
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <Wallet className="size-4 text-zinc-500 dark:text-zinc-400" />
                                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        Connect Your {sourceChain} Wallet
                                    </p>
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-3">
                                    To swap from {sourceChain}, please connect your EVM wallet.
                                </p>
                                <div className="flex justify-center w-full [&_button]:w-full [&_button]:h-10 [&_button]:text-sm">
                                    <ConnectButton.Custom>
                                        {({ openConnectModal, mounted }) => (
                                            <ButtonAny
                                                onClick={openConnectModal}
                                                disabled={!mounted}
                                                className="w-full h-10 bg-white text-black hover:bg-zinc-100 font-semibold text-sm shadow-sm"
                                            >
                                                <Wallet className="size-4 mr-2" />
                                                Connect Wallet
                                            </ButtonAny>
                                        )}
                                    </ConnectButton.Custom>
                                </div>
                            </div>
                        )}

                    {/* DESTINATION ADDRESS INPUT (if needed) */}
                    {!swapAlreadyCompleted && step !== "success" && renderAddressInput()}

                    {/* INFO GRID */}
                    <AnimatePresence>
                        {(quote!.rate || quote!.estimatedTime || quote!.totalFee) && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="grid grid-cols-2 gap-2 text-xs text-zinc-500 pt-2"
                            >
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                                    <span className="opacity-70">Rate</span>
                                    <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{quote!.rate}</span>
                                </div>
                                <div className="flex flex-col gap-1 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/50">
                                    <div className="flex items-center gap-1 opacity-70">
                                        <Clock className="size-3" /> Est. Time
                                    </div>
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{quote!.estimatedTime || "~2-5 seconds"}</span>
                                </div>

                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ERROR STATE */}
                    <AnimatePresence>
                        {step === "error" && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-2"
                            >
                                <AlertCircle className="size-4 shrink-0" />
                                <span>{errorMessage}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* SUCCESS STATE - CONSTANT & UNIFIED */}
                    <AnimatePresence>
                        {(step === "success" || swapAlreadyCompleted) && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 shadow-sm"
                            >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200">

                                        <span className="font-semibold text-sm">Swap Completed!</span>
                                    </div>
                                    {(explorerUrl || completedTxHash) && (
                                        <a
                                            href={`https://relay.link/transaction/${completedTxHash || txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline flex items-center gap-1 transition-colors bg-blue-50 dark:bg-blue-900/10 px-2 py-1 rounded-md"
                                        >
                                            View on Relay <ExternalLink className="size-5" />
                                        </a>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Your transaction has been submitted. Request a new quote to initiate another swap.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ACTIONS - Hide when swap completed */}
                    {step !== "success" && !swapAlreadyCompleted && (
                        <div className="pt-2">
                            {/* Non-EVM Source Chain - Show action buttons when wallet is connected */}
                            {isSourceNonEvm && sourceWallet?.address ? (
                                <div className="space-y-3">
                                    {/* Action button based on state */}
                                    {clientLoading ? (
                                        <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400" variant="outline">
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Preparing Transaction...
                                        </ButtonAny>
                                    ) : processedTransactions.length === 0 ? (
                                        <ButtonAny disabled className="w-full h-11 bg-zinc-800/50 text-zinc-500" variant="ghost">
                                            {needsDestinationAddress && !recipientAddress ? "Enter destination address..." :
                                                needsDestinationAddress && recipientError ? "Invalid destination address" :
                                                    "Fetching quote..."}
                                        </ButtonAny>
                                    ) : step === "ready" ? (
                                        needsDestinationAddress && !recipientAddress ? null : (
                                            <ButtonAny
                                                onClick={handleExecuteSwap}
                                                className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                            >
                                                <ArrowRightLeft className="size-4 mr-2" />
                                                {processedTransactions.length > 1
                                                    ? `Execute Step ${currentTxIndex + 1}/${processedTransactions.length}`
                                                    : "Execute Swap"}
                                            </ButtonAny>
                                        )
                                    ) : step === "sending" || isSending ? (
                                        <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400">
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            {processedTransactions.length > 1
                                                ? `Signing ${currentTxIndex + 1}/${processedTransactions.length}...`
                                                : "Signing Transaction..."}
                                        </ButtonAny>
                                    ) : null}
                                </div>
                            ) : isSourceNonEvm && !sourceWallet?.address ? (
                                /* Non-EVM source without wallet - handled in renderAddressInput usually, but if address input is hidden (e.g. EVM wallet connected), we must show it here */
                                null
                            ) : !isConnected ? (
                                /* Only show bottom connect button if NOT in the "EVM -> Non-EVM" flow (because that flow has the button at the top) */
                                (!destinationChainIdNum || !isNonEvmChain(destinationChainIdNum)) ? (
                                    <div className="flex justify-center w-full [&_button]:w-full">
                                        <ConnectButton.Custom>
                                            {({ openConnectModal, mounted }) => (
                                                <ButtonAny
                                                    onClick={openConnectModal}
                                                    disabled={!mounted}
                                                    className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-lg shadow-black/5 dark:shadow-white/5"
                                                >
                                                    <Wallet className="size-4" />
                                                    Connect Wallet
                                                </ButtonAny>
                                            )}
                                        </ConnectButton.Custom>
                                    </div>
                                ) : null
                            ) : isWrongChain ? (
                                <ButtonAny
                                    onClick={handleSwitchChain}
                                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white"
                                    variant="default"
                                    disabled={step === "switching"}
                                >
                                    {step === "switching" ? (
                                        <>
                                            <Loader2 className="size-4 mr-2 animate-spin" />
                                            Switching to {CHAIN_NAMES[requiredChainIdNum!] || `Chain ${requiredChainIdNum}`}...
                                        </>
                                    ) : (
                                        <>Switch to {CHAIN_NAMES[requiredChainIdNum!] || `Chain ${requiredChainIdNum}`}</>
                                    )}
                                </ButtonAny>
                            ) : !isVerified ? (
                                needsDestinationAddress && !recipientAddress ? null : (
                                    <ButtonAny
                                        onClick={handleVerify}
                                        disabled={step === "verifying"}
                                        className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-lg shadow-black/5 dark:shadow-white/5"
                                    >
                                        {step === "verifying" ? (
                                            <>
                                                <Loader2 className="size-4 mr-2 animate-spin" />
                                                Verifying Ownership...
                                            </>
                                        ) : (
                                            <>
                                                <ShieldCheck className="size-4 mr-2" />
                                                Verify Wallet
                                            </>
                                        )}
                                    </ButtonAny>
                                )
                            ) : clientLoading ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400" variant="outline">
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Preparing Transaction...
                                </ButtonAny>
                            ) : processedTransactions.length === 0 ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800/50 text-zinc-500" variant="ghost">
                                    {needsDestinationAddress && !recipientAddress ? "Enter destination address..." :
                                        needsDestinationAddress && recipientError ? "Invalid destination address" :
                                            "Fetching quote..."}
                                </ButtonAny>
                            ) : step === "ready" ? (
                                <ButtonAny
                                    onClick={handleExecuteSwap}
                                    className="w-full h-11 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-sm transition-colors rounded-md shadow-[0_0_20px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    <ArrowRightLeft className="size-4 mr-2" />
                                    {processedTransactions.length > 1
                                        ? `Execute Step ${currentTxIndex + 1}/${processedTransactions.length}`
                                        : "Execute Swap"}
                                </ButtonAny>
                            ) : step === "sending" || isSending ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400">
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Confirm in wallet...
                                </ButtonAny>
                            ) : step === "confirming" ? (
                                <ButtonAny disabled className="w-full h-11 bg-zinc-800 text-zinc-400">
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                    Broadcasting...
                                </ButtonAny>
                            ) : step === "error" ? (
                                <ButtonAny
                                    onClick={() => setStep("ready")}
                                    variant="outline"
                                    className="w-full h-11 border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                                >
                                    Try Again
                                </ButtonAny>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-zinc-50/50 dark:bg-zinc-950/30 p-3 text-center border-t border-zinc-200 dark:border-zinc-800/50">
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-600 font-semibold flex items-center justify-center gap-1.5">
                        Powered by Relay <span className="w-0.5 h-0.5 bg-zinc-400 dark:bg-zinc-600 rounded-full" /> MEV Protected
                    </p>
                </div>
            </div>
        </motion.div >
    );
}
