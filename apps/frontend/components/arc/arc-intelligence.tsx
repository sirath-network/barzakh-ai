"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
	ArrowUpRight,
	Check,
	Copy,
	Loader2,
	LogOut,
	ShieldCheck,
	Sparkles,
	Wallet,
	Zap,
} from "lucide-react";
import {
	createPublicClient,
	createWalletClient,
	custom,
	formatUnits,
	getAddress,
	http,
	parseGwei,
	type Address,
	type EIP1193Provider,
} from "viem";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAccount, useDisconnect } from "wagmi";
import {
	ARC_CHAIN_ID,
	ARC_MAINNET_RPC_URL,
	ARC_TESTNET_RPC_URL,
	ARC_TESTNET_CHAIN_ID,
	arcMainnet,
	arcTestnet,
	arcTransactionUrl,
} from "@barzakh/shared/lib/arc/config";
import {
	analysisRequestSchema,
	invoiceCommitment,
	invoiceTransaction,
	validateInvoiceForPayment,
	type ArcInvoice,
	type AnalysisResult,
} from "@barzakh/shared/lib/arc/protocol";
import styles from "./arc-intelligence.module.css";
import { ReceiptCard } from "./receipt-card";

type Status = {
	ready: boolean;
	readinessReason?: string | null;
	network?: string;
	chainId?: number;
	blockNumber: string;
	recipient: string | null;
	paymentContract?: string | null;
	price: string;
};
type Quote = {
	invoice: ArcInvoice;
	token: string;
	gas: string;
	maxFeePerGas: string;
	maxPriorityFeePerGas: string;
};
type Pending = {
	request: { token_name: string; payer: string; prompt?: string };
	invoiceToken: string;
	hash: string;
};
type Proof = {
	invoice: ArcInvoice;
	request?: { token_name: string; payer: string; prompt?: string };
	resultHash: string;
	verifiedAt?: string;
	payment: {
		chainId: number;
		transactionHash: string;
		payer: string;
		recipient: string;
		amount: string;
		gasUsdc: string;
		blockNumber: string;
		settledAt: string;
		explorerUrl: string;
	};
	result: AnalysisResult & {
		model: string;
		generatedAt: string;
		snapshot: {
			source: string;
			priceUsd: number;
			observedAt: string;
			symbol: string;
			name?: string;
			imageUrl?: string | null;
		};
	};
};
const pendingKey = "barzakh.arc.pending.v1";
const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;
const POPULAR_TOKENS = [
	"BTC",
	"ETH",
	"SOL",
	"NVDA",
	"CRCL",
	"TSLA",
	"AAPL",
	"DOGE",
	"SUI",
];
function getArcPublicClient(chainId: number = ARC_CHAIN_ID) {
	const chain = chainId === ARC_TESTNET_CHAIN_ID ? arcTestnet : arcMainnet;
	const rpc = chainId === ARC_TESTNET_CHAIN_ID ? ARC_TESTNET_RPC_URL : ARC_MAINNET_RPC_URL;
	return createPublicClient({
		chain,
		transport: http(rpc),
	});
}

function useSafeDynamicContext() {
	try {
		return useDynamicContext();
	} catch {
		return {
			setShowAuthFlow: (() => {}) as (show: boolean) => void,
			handleLogOut: async () => {},
			primaryWallet: null,
		};
	}
}

function injectedWallet(primaryWallet?: any): EIP1193Provider {
	if (
		primaryWallet?.connector &&
		typeof primaryWallet.connector.getProvider === "function"
	) {
		try {
			const p = primaryWallet.connector.getProvider();
			if (p) return p;
		} catch {}
	}
	const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
	if (!provider)
		throw new Error(
			"Open this page in a browser with MetaMask, Rabby, or connect via Dynamic wallet.",
		);
	return provider;
}

export function ArcIntelligence({ receiptHash }: { receiptHash?: string }) {
	const searchParams = useSearchParams();
	const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();
	const { disconnect: wagmiDisconnect } = useDisconnect();
	const dynamicContext = useSafeDynamicContext();
	const [status, setStatus] = useState<Status | null>(null);
	const [networkError, setNetworkError] = useState(false);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const activeChainId = mounted && status?.chainId ? status.chainId : ARC_CHAIN_ID;
	const activeChain = activeChainId === ARC_TESTNET_CHAIN_ID ? arcTestnet : arcMainnet;
	const activeNetworkName = mounted && status?.network ? status.network : activeChain.name;
	const isTestnet = activeChainId === ARC_TESTNET_CHAIN_ID;
	const publicClient = getArcPublicClient(activeChainId);

	const [account, setAccount] = useState<string>("");

	useEffect(() => {
		if (wagmiAddress) {
			setAccount(getAddress(wagmiAddress));
			try {
				sessionStorage.removeItem("arc_wallet_disconnected");
			} catch {}
		} else if (!isWagmiConnected && sessionStorage.getItem("arc_wallet_disconnected") === "true") {
			setAccount("");
		}
	}, [wagmiAddress, isWagmiConnected]);

	const [symbol, setSymbol] = useState("BTC");
	const [customInput, setCustomInput] = useState("");
	const [userPrompt, setUserPrompt] = useState("");
	const promptRef = useRef<HTMLTextAreaElement>(null);
	const [walletChainId, setWalletChainId] = useState<number | null>(null);
	const [quote, setQuote] = useState<Quote | null>(null);
	const [pending, setPending] = useState<Pending | null>(null);
	const [proof, setProof] = useState<Proof | null>(null);
	const [busy, setBusy] = useState("");
	const [error, setError] = useState("");
	const actionLock = useRef(false);
	const [copied, setCopied] = useState(false);

	const copyAddress = () => {
		if (!account) return;
		void navigator.clipboard.writeText(account);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	async function disconnectWallet() {
		setAccount("");
		setQuote(null);
		setWalletChainId(null);
		try {
			sessionStorage.setItem("arc_wallet_disconnected", "true");
		} catch {
			/* ignore */
		}

		// 1. Dynamic SDK logout
		try {
			if (dynamicContext?.handleLogOut) {
				await dynamicContext.handleLogOut();
			}
		} catch {}

		// 2. Wagmi disconnect
		try {
			wagmiDisconnect();
		} catch {}

		// 3. EIP-2255 revokePermissions directly on injected extensions
		try {
			const ethereum = (
				window as Window & {
					ethereum?: any;
				}
			).ethereum;

			if (ethereum) {
				const providerList: any[] = [];
				if (Array.isArray(ethereum.providers)) {
					providerList.push(...ethereum.providers);
				}
				if (
					ethereum.providerMap &&
					typeof ethereum.providerMap.values === "function"
				) {
					try {
						providerList.push(...Array.from(ethereum.providerMap.values()));
					} catch {}
				}
				if (providerList.length === 0) {
					providerList.push(ethereum);
				}

				await Promise.allSettled(
					providerList.map(async (p) => {
						if (!p) return;
						// 1. EIP-2255 / MetaMask standard method to revoke site connection
						if (typeof p.request === "function") {
							try {
								await p.request({
									method: "wallet_revokePermissions",
									params: [{ eth_accounts: {} }],
								});
							} catch {
								/* ignore */
							}
						}
						// 2. Some providers (e.g., Coinbase Wallet, WalletConnect) implement .disconnect()
						if (typeof p.disconnect === "function") {
							try {
								await p.disconnect();
							} catch {
								/* ignore */
							}
						}
						// 3. Alternative close method
						if (typeof p.close === "function") {
							try {
								await p.close();
							} catch {
								/* ignore */
							}
						}
					}),
				);
			}
		} catch (err) {
			console.warn("Wallet disconnect error:", err);
		}
	}

	async function connectWallet() {
		try {
			sessionStorage.removeItem("arc_wallet_disconnected");
		} catch {
			/* ignore */
		}
		if (dynamicContext?.setShowAuthFlow) {
			dynamicContext.setShowAuthFlow(true);
			return;
		}
		setBusy("Connecting wallet");
		const provider = injectedWallet(dynamicContext?.primaryWallet);
		const addresses = (await provider.request({
			method: "eth_requestAccounts",
		})) as string[];
		if (addresses && addresses.length > 0) {
			const payer = getAddress(addresses[0]);
			setAccount(payer);
			try {
				const chainIdHex = (await provider.request({
					method: "eth_chainId",
				})) as string;
				if (chainIdHex) setWalletChainId(parseInt(chainIdHex, 16));
			} catch {
				/* ignore */
			}
		}
	}

	const [searchResults, setSearchResults] = useState<
		Array<{
			name: string;
			symbol: string;
			chainId: string;
			network?: string;
			address: string;
			priceUsd: number;
			liquidityUsd: number;
			volume24hUsd: number;
			change24h: number | null;
			imageUrl?: string | null;
			verified?: boolean;
			pairUrl?: string;
		}>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [showDropdown, setShowDropdown] = useState(false);
	const searchContainerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const initialToken = searchParams.get("token");
		const initialPrompt = searchParams.get("prompt");
		if (initialToken) {
			setSymbol(initialToken);
			setCustomInput(initialToken);
		}
		if (initialPrompt) {
			setUserPrompt(initialPrompt);
		}
	}, [searchParams]);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				searchContainerRef.current &&
				!searchContainerRef.current.contains(event.target as Node)
			) {
				setShowDropdown(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
		const query = customInput.trim();
		if (query.length < 2) {
			setSearchResults([]);
			setShowDropdown(false);
			return;
		}
		if (query.includes(" · ")) {
			return;
		}

		const timer = setTimeout(async () => {
			setIsSearching(true);
			try {
				const res = await fetch(
					`/api/arc/tokens/search?q=${encodeURIComponent(query)}`,
				);
				if (res.ok) {
					const data = await res.json();
					setSearchResults(data.results || []);
					setShowDropdown((data.results || []).length > 0);
				}
			} catch {
				setSearchResults([]);
			} finally {
				setIsSearching(false);
			}
		}, 280);

		return () => clearTimeout(timer);
	}, [customInput]);

	const selectToken = (item: {
		name: string;
		symbol: string;
		chainId: string;
		network?: string;
		address: string;
		priceUsd: number;
		assetType?: string;
	}) => {
		if (
			item.address === "native" ||
			!item.address ||
			item.address.startsWith("equity:")
		) {
			setSymbol(item.symbol);
			setCustomInput(
				`${item.name} (${item.symbol} · ${item.network || item.chainId.toUpperCase()})`,
			);
		} else {
			setSymbol(item.address);
			setCustomInput(
				`${item.name} (${item.symbol} · ${item.network || item.chainId.toUpperCase()} · ${short(item.address)})`,
			);
		}
		setShowDropdown(false);
		setQuote(null);
	};

	useEffect(() => {
		const ethereum = (
			window as Window & {
				ethereum?: EIP1193Provider & {
					on?: (event: string, listener: (...args: any[]) => void) => void;
					removeListener?: (
						event: string,
						listener: (...args: any[]) => void,
					) => void;
				};
			}
		).ethereum;
		if (!ethereum?.on) return;

		// Auto-check if already connected (unless explicitly disconnected in session)
		try {
			const isDisconnected = sessionStorage.getItem("arc_wallet_disconnected") === "true";
			if (!isDisconnected && ethereum.request) {
				ethereum
					.request({ method: "eth_accounts" })
					.then((accounts: any) => {
						if (Array.isArray(accounts) && accounts.length > 0) {
							setAccount(getAddress(accounts[0]));
							ethereum
								.request({ method: "eth_chainId" })
								.then((hex: any) => {
									if (typeof hex === "string") setWalletChainId(parseInt(hex, 16));
								})
								.catch(() => {});
						}
					})
					.catch(() => {});
			}
		} catch {
			/* ignore */
		}

		const handleChain = (chainIdHex: string) => {
			const id = parseInt(chainIdHex, 16);
			setWalletChainId(id);
			if (id !== activeChainId) {
				setQuote(null);
			}
		};
		const handleAccounts = (accounts: string[]) => {
			if (accounts.length > 0) {
				setAccount(getAddress(accounts[0]));
			} else {
				setAccount("");
				setQuote(null);
			}
		};
		ethereum.on("chainChanged", handleChain);
		ethereum.on("accountsChanged", handleAccounts);
		return () => {
			ethereum.removeListener?.("chainChanged", handleChain);
			ethereum.removeListener?.("accountsChanged", handleAccounts);
		};
	}, [activeChainId]);

	useEffect(() => {
		let active = true;
		const refresh = async () => {
			try {
				const response = await fetch("/api/arc/status");
				if (!response.ok) throw new Error();
				const data = await response.json();
				if (active) {
					setStatus(data);
					setNetworkError(false);
				}
			} catch {
				if (active) setNetworkError(true);
			}
		};
		void refresh();
		const interval = setInterval(refresh, 20_000);
		try {
			const stored = localStorage.getItem(pendingKey);
			if (stored && !receiptHash) setPending(JSON.parse(stored));
		} catch {
			/* Storage may be disabled by the browser. */
		}
		return () => {
			active = false;
			clearInterval(interval);
		};
	}, [receiptHash]);

	useEffect(() => {
		if (!receiptHash) return;
		let active = true;
		setBusy("Verifying payment on Arc");
		fetch(`/api/arc/receipts/${encodeURIComponent(receiptHash)}`)
			.then(async (response) => {
				const data = await response.json();
				if (!response.ok) throw new Error(data.error);
				if (active) setProof(data);
			})
			.catch((e) => {
				if (active) setError(e.message);
			})
			.finally(() => {
				if (active) setBusy("");
			});
		return () => {
			active = false;
		};
	}, [receiptHash]);

	async function run(action: () => Promise<void>) {
		if (actionLock.current) return;
		actionLock.current = true;
		setError("");
		try {
			await action();
		} catch (e: any) {
			let message = e instanceof Error ? e.message : "Request failed";
			// Handle ZodError directly or JSON-stringified error array
			if (e?.errors && Array.isArray(e.errors) && e.errors[0]?.message) {
				message = e.errors[0].message;
			} else if (typeof message === "string" && message.startsWith("[") && message.includes('"message"')) {
				try {
					const parsed = JSON.parse(message);
					if (Array.isArray(parsed) && parsed[0]?.message) {
						message = parsed[0].message;
					}
				} catch {}
			}
			setError(message);
		} finally {
			setBusy("");
			actionLock.current = false;
		}
	}

	async function generatePrompt(focus = "General research") {
		if (pending || quote) return;
		setBusy("Generating AI prompt");
		const response = await fetch("/api/arc/prompt", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ asset: symbol, context: userPrompt, focus }),
			signal: AbortSignal.timeout(40_000),
		});
		const data = await response.json();
		if (!response.ok) throw new Error(data.error || "Unable to generate a prompt.");
		if (typeof data.prompt !== "string" || !data.prompt.trim() || data.prompt.length > 4000) {
			throw new Error("The AI returned an invalid prompt. Please try again.");
		}
		setUserPrompt(data.prompt);
		// The textarea is disabled until run() clears the busy state.
		requestAnimationFrame(() => promptRef.current?.focus());
	}

	async function switchOrAddArcChain(provider: EIP1193Provider) {
		const wallet = createWalletClient({
			chain: activeChain,
			transport: custom(provider),
		});
		setBusy(`Switching to ${activeChain.name}`);
		try {
			await wallet.switchChain({ id: activeChainId });
			setWalletChainId(activeChainId);
		} catch (e: any) {
			const code = e?.code || e?.cause?.code;
			if (code === 4902 || e?.message?.includes("Unrecognized chain")) {
				await wallet.addChain({ chain: activeChain });
				await wallet.switchChain({ id: activeChainId });
				setWalletChainId(activeChainId);
			} else {
				throw new Error(
					`Please switch your wallet to ${activeChain.name} to proceed.`,
				);
			}
		}
	}


	async function reviewInvoice() {
		try {
			sessionStorage.removeItem("arc_wallet_disconnected");
		} catch {
			/* ignore */
		}
		let payer = account;
		if (!payer) {
			if (dynamicContext?.setShowAuthFlow) {
				dynamicContext.setShowAuthFlow(true);
				return;
			}
			setBusy("Connecting wallet");
			const provider = injectedWallet(dynamicContext?.primaryWallet);
			const addresses = (await provider.request({
				method: "eth_requestAccounts",
			})) as string[];
			payer = getAddress(addresses[0]);
			setAccount(payer);
		}
		const payerAddress = getAddress(payer);
		if (!status?.ready || networkError) {
			throw new Error(`Wallet connected. ${networkError ? "Arc connection is unavailable. Please retry shortly." : status?.readinessReason || "Payment service is not ready yet. Please retry shortly."}`);
		}

		const provider = injectedWallet(dynamicContext?.primaryWallet);
		// Ensure the wallet matches the selected Arc network.
		await switchOrAddArcChain(provider);

		setBusy("Preparing your invoice");
		const request = analysisRequestSchema.parse({
			token_name: symbol,
			payer: payerAddress,
			prompt: userPrompt.trim() || undefined,
		});
		const response = await fetch("/api/arc/analyze", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(request),
		});
		const data = await response.json();
		if (response.status !== 402)
			throw new Error(data.error || "Unable to prepare an invoice");
		const invoice = validateInvoiceForPayment(
			data.x402_invoice,
			request,
			status?.recipient || "",
			undefined,
			status?.paymentContract || "0x0000000000000000000000000000000000000000",
			status?.chainId || activeChainId,
		);
		if ((await publicClient.getChainId()) !== activeChainId)
			throw new Error(`RPC is not ${activeChain.name}`);

		const transaction = invoiceTransaction(invoice);

		// 2. Pre-check balance before gas estimation to prevent raw OutOfFunds revert
		const balance = await publicClient.getBalance({ address: payerAddress });
		if (balance < transaction.value) {
			const formattedBal = formatUnits(balance, 18);
			throw new Error(
				`Insufficient native USDC on ${activeChain.name}. Your wallet (${short(payerAddress)}) has ${Number(formattedBal).toFixed(4)} USDC. You need at least 0.002 USDC for the briefing plus gas on ${activeChain.name}.`,
			);
		}

		let estimate = 65_000n;
		const fees = await publicClient.estimateFeesPerGas();
		try {
			estimate = await publicClient.estimateGas({
				...transaction,
				account: payerAddress,
			});
		} catch (err: any) {
			const msg = (err?.message || "").toLowerCase();
			if (
				msg.includes("outoffunds") ||
				msg.includes("insufficient funds") ||
				msg.includes("exceeds balance")
			) {
				throw new Error(
					`Insufficient native USDC on ${activeChain.name} to cover gas fees. Your wallet (${short(payer)}) has ${formatUnits(balance, 18)} USDC. You need at least 0.002 USDC plus network gas.`,
				);
			}
			console.warn("Gas estimation warning, using fallback limit:", err);
		}

		const gas = (estimate * 120n) / 100n;
		const maxFeePerGas =
			fees.maxFeePerGas < parseGwei("20") ? parseGwei("20") : fees.maxFeePerGas;

		if (balance < transaction.value + gas * maxFeePerGas) {
			throw new Error(
				`Insufficient funds for gas. You have ${formatUnits(balance, 18)} USDC, but need 0.002 USDC + estimated network gas (${formatUnits(gas * maxFeePerGas, 18)} USDC).`,
			);
		}

		setQuote({
			invoice,
			token: data.invoice_token,
			gas: gas.toString(),
			maxFeePerGas: maxFeePerGas.toString(),
			maxPriorityFeePerGas: fees.maxPriorityFeePerGas.toString(),
		});
	}

	async function fulfill(payment: Pending) {
		setBusy("Verifying payment and preparing your briefing");
		const response = await fetch("/api/arc/analyze", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-402-receipt": payment.hash,
				"x-arc-invoice": payment.invoiceToken,
			},
			body: JSON.stringify(payment.request),
		});
		const data = await response.json();
		if (!response.ok)
			throw new Error(
				`${data.error} Your payment is saved below. Resume without paying again.`,
			);
		setProof(data.proof);
		setPending(null);
		setQuote(null);
		try {
			localStorage.removeItem(pendingKey);
		} catch {
			/* Already fulfilled. */
		}
	}

	async function resumePayment(payment: Pending) {
		setBusy("Checking the saved payment");
		const receipt = await publicClient.getTransactionReceipt({
			hash: payment.hash as `0x${string}`,
		});
		if (receipt.status !== "success") {
			setPending(null);
			setQuote(null);
			try {
				localStorage.removeItem(pendingKey);
			} catch {
				/* Definitively reverted. */
			}
			throw new Error(
				"The saved transaction reverted. No analysis payment settled; gas may have been charged. You can review a new invoice.",
			);
		}
		await fulfill(payment);
	}

	async function payInvoice() {
		if (!quote) return;
		const provider = injectedWallet(dynamicContext?.primaryWallet);
		await switchOrAddArcChain(provider);

		const wallet = createWalletClient({
			chain: activeChain,
			transport: custom(provider),
		});
		const addresses = await wallet.getAddresses();
		const payer = addresses[0] || (account ? getAddress(account) : undefined);
		if (!payer) throw new Error("No wallet address available for payment");
		const request = analysisRequestSchema.parse({
			token_name: symbol,
			payer,
			prompt: userPrompt.trim() || undefined,
		});
		const invoice = validateInvoiceForPayment(
			quote.invoice,
			request,
			status?.recipient || "",
			undefined,
			status?.paymentContract || "0x0000000000000000000000000000000000000000",
			status?.chainId || activeChainId,
		);

		setBusy("Confirm 0.002 USDC in your wallet");
		const hash = await wallet.sendTransaction({
			...invoiceTransaction(invoice),
			account: payer,
			chain: activeChain,
			gas: BigInt(quote.gas),
			maxFeePerGas: BigInt(quote.maxFeePerGas),
			maxPriorityFeePerGas: BigInt(quote.maxPriorityFeePerGas),
		});
		const payment = { request, invoiceToken: quote.token, hash };
		setPending(payment);
		// Save immediately after broadcast, before waiting on RPC or inference.
		try {
			localStorage.setItem(pendingKey, JSON.stringify(payment));
		} catch {
			/* In-memory resume remains available. */
		}
		setBusy("Waiting for Arc settlement");
		const receipt = await publicClient.waitForTransactionReceipt({
			hash,
			timeout: 45_000,
		});
		if (receipt.status !== "success") {
			setPending(null);
			try {
				localStorage.removeItem(pendingKey);
			} catch {
				/* No successful payment. */
			}
			throw new Error(
				"Transaction reverted. The analysis was not paid; the network may have charged gas.",
			);
		}
		await fulfill(payment);
	}

	function download(value: unknown, name: string) {
		const url = URL.createObjectURL(
			new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
		);
		const link = document.createElement("a");
		link.href = url;
		link.download = name;
		link.click();
		URL.revokeObjectURL(url);
	}

	const stages = [
		"Request",
		"Review invoice",
		"Settle on Arc",
		"Verify + deliver",
	];
	const stage = proof ? 4 : pending ? 3 : quote ? 2 : 1;

	return (
		<main className={styles.page}>
			<div className={styles.grain} aria-hidden="true" />
			<nav className={styles.nav} aria-label="Arc navigation">
				<Link href="/" className={styles.brand}>
					<img
						src="/images/barzakh/logo-white.svg"
						alt=""
						width="24"
						height="24"
					/>{" "}
					BARZAKH AI
				</Link>
				<div className={styles.network} suppressHydrationWarning>
					<span className={networkError ? styles.offline : styles.dot} />
					{networkError
						? "RPC unavailable"
						: status
							? `${(status.network || activeNetworkName).toUpperCase()} · #${status.blockNumber}`
							: "CONNECTING TO ARC"}
				</div>
				<div className={styles.navRight}>
					{mounted && account ? (
						<div className={styles.navWallet}>
							<div
								className={styles.walletPill}
								onClick={copyAddress}
								title="Click to copy full address"
								role="button"
								tabIndex={0}
							>
								<span className={styles.connectedDot} />
								<Wallet size={12} className={styles.walletIcon} />
								<code className={styles.walletAddress}>{short(account)}</code>
								<span className={styles.copyIndicator}>
									{copied ? (
										<Check size={11} className={styles.copySuccess} />
									) : (
										<Copy size={11} />
									)}
								</span>
							</div>
							<button
								type="button"
								className={styles.disconnectNavBtn}
								onClick={() => void disconnectWallet()}
								title="Disconnect wallet"
							>
								<LogOut size={12} />
								<span>Disconnect</span>
							</button>
						</div>
					) : mounted ? (
						<button
							type="button"
							className={styles.navConnectBtn}
							onClick={() => void run(connectWallet)}
							disabled={!!busy}
						>
							<Wallet size={12} />
							<span>Connect</span>
						</button>
					) : null}
					<a
						href="https://github.com/sirath-network/barzakh-ai"
						target="_blank"
						rel="noreferrer"
						className={styles.source}
					>
						Source <ArrowUpRight size={15} />
					</a>
				</div>
			</nav>

			<section className={styles.hero}>
				<div>
					<p className={styles.eyebrow}>INTELLIGENCE HAS A RECEIPT.</p>
					<h1>
						Don’t just trust
						<br />
						the answer.
						<br />
						<em>Follow the money.</em>
					</h1>
					<p className={styles.intro}>
						An AI briefing. A tiny USDC payment. A public trail.
						<br />
						Watch Barzakh turn a question into verifiable commerce on Arc.
					</p>
					<div className={styles.chips}>
						<span>
							<Zap size={13} /> USDC FOR PAYMENT + GAS
						</span>
						<span>
							<ShieldCheck size={13} /> REQUEST BOUND ONCHAIN
						</span>
					</div>
				</div>
				<div className={styles.orbit} aria-hidden="true">
					<div className={styles.orbitRing} />
					<div className={styles.orbitRingInner} />
					<div className={styles.orbitCenter}>
						<span>PROOF OF</span>
						<strong>Intelligence</strong>
						<span>BARZAKH AI × ARC</span>
					</div>
					<div className={styles.orbitTag}>01 / QUESTION</div>
					<div className={styles.orbitTagTwo}>02 / USDC</div>
					<div className={styles.orbitTagThree}>03 / RECEIPT</div>
				</div>
			</section>

			<div className={styles.pipeline} aria-label="Payment progress">
				{stages.map((name, i) => {
					const isCompleted = proof ? true : i < stage - 1;
					return (
						<div key={name} className={i < stage ? styles.activeStage : ""}>
							<span>{isCompleted ? <Check size={14} /> : `0${i + 1}`}</span>
							{name}
							<span className={styles.stageLine} />
						</div>
					);
				})}
			</div>

			<section className={styles.workspace}>
				<div className={styles.console}>
					<p className={styles.eyebrow}>THE INTELLIGENCE DESK</p>
					<h2>
						{receiptHash
							? "Inspect the evidence."
							: "One question. Three perspectives."}
					</h2>
					<p className={styles.muted}>
						Bull case, bear case, risk check. One model, grounded in a fresh
						market snapshot.
					</p>
					{!receiptHash && !proof && (
						<>
							<label className={styles.label} htmlFor="arc-token">
								CHOOSE A MARKET OR ENTER CUSTOM CRYPTO, STOCK / RWA, OR CONTRACT ADDRESS (CA)
							</label>
							<div className={styles.tokenPicker}>
								{POPULAR_TOKENS.map((token) => (
									<button
										id={token === "BTC" ? "arc-token" : undefined}
										key={token}
										disabled={!!busy || !!pending || !!quote}
										aria-pressed={symbol === token && !customInput}
										className={
											symbol === token && !customInput
												? styles.selectedToken
												: ""
										}
										onClick={() => {
											setSymbol(token);
											setCustomInput("");
											setQuote(null);
										}}
									>
										{token}
									</button>
								))}
							</div>
							<div
								className={styles.customTokenContainer}
								ref={searchContainerRef}
							>
								<input
									type="text"
									className={styles.customTokenInput}
									placeholder="Search ticker (e.g. NVDA, CRCL, ETH, SOL) or custom token / CA..."
									value={customInput}
									disabled={!!busy || !!pending || !!quote}
									onFocus={() => {
										if (searchResults.length > 0) setShowDropdown(true);
									}}
									onChange={(e) => {
										const val = e.target.value;
										setCustomInput(val);
										const trimmed = val.trim();
										if (trimmed) {
											setSymbol(trimmed);
											setQuote(null);
										}
									}}
								/>
								<div className={styles.inputEndAdornment}>
									{isSearching && (
										<Loader2 size={13} className={styles.spin} />
									)}
									{customInput && (
										<span className={styles.customBadge}>
											{symbol.startsWith("equity:") ||
											[
												"NVDA",
												"CRCL",
												"TSLA",
												"AAPL",
												"MSTR",
												"COIN",
												"MSFT",
												"GOOGL",
												"AMZN",
											].includes(symbol.toUpperCase()) ||
											customInput.includes("(Stock / RWA)")
												? "Stock / RWA"
												: /^0x[0-9a-fA-F]{40}$/.test(symbol)
													? "EVM CA"
													: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(symbol)
														? "Solana CA"
														: customInput.includes(" · ")
															? "Selected Asset"
															: "Symbol"}
										</span>
									)}
								</div>
								{showDropdown && searchResults.length > 0 && (
									<div className={styles.searchResultsDropdown}>
										<div className={styles.searchDropdownHeader}>
											<span>Select verified market (Stock / RWA / Crypto)</span>
											<span>{searchResults.length} matches</span>
										</div>
										{searchResults.map((item) => (
											<div
												key={`${item.chainId}:${item.address}`}
												className={styles.searchResultItem}
												onClick={() => selectToken(item)}
											>
												<div className={styles.tokenAvatar}>
													{item.imageUrl ? (
														<img
															src={item.imageUrl}
															alt={item.symbol}
															className={styles.tokenImg}
															onError={(e) => {
																(e.currentTarget as HTMLElement).style.display =
																	"none";
																const fallback =
																	e.currentTarget.parentElement?.querySelector(
																		`.${styles.tokenImgFallback}`,
																	) as HTMLElement | null;
																if (fallback) fallback.style.display = "flex";
															}}
														/>
													) : null}
													<div
														className={styles.tokenImgFallback}
														style={{ display: item.imageUrl ? "none" : "flex" }}
													>
														{item.symbol.slice(0, 2).toUpperCase()}
													</div>
												</div>
												<div className={styles.searchResultLeft}>
													<div className={styles.searchResultTitle}>
														<span className={styles.tokenNameText}>
															{item.name}
														</span>
														<span className={styles.searchSymbolBadge}>
															{item.symbol}
														</span>
														<span className={styles.searchChainBadge}>
															{item.network || item.chainId.toUpperCase()}
														</span>
														{item.verified && (
															<span className={styles.verifiedBadge}>
																✓ Verified
															</span>
														)}
													</div>
													<span className={styles.searchResultAddress}>
														{item.address === "native"
															? "Native L1 Asset"
															: `CA: ${short(item.address)}`}
													</span>
												</div>
												<div className={styles.searchResultRight}>
													<span className={styles.searchResultPrice}>
														$
														{item.priceUsd < 0.0001
															? item.priceUsd.toExponential(3)
															: item.priceUsd < 0.01
																? item.priceUsd.toPrecision(3)
																: item.priceUsd.toLocaleString(undefined, {
																		minimumFractionDigits: 2,
																		maximumFractionDigits: 4,
																	})}
													</span>
													<span className={styles.searchResultLiq}>
														{item.change24h != null ? (
															<span
																style={{
																	color:
																		item.change24h >= 0
																			? "#4ade80"
																			: "#f87171",
																}}
															>
																{item.change24h >= 0 ? "+" : ""}
																{item.change24h.toFixed(2)}%
															</span>
														) : item.volume24hUsd > 0 ? (
															`Vol: $${Math.round(item.volume24hUsd).toLocaleString()}`
														) : (
															`Liq: $${Math.round(item.liquidityUsd).toLocaleString()}`
														)}
													</span>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
							<label className={styles.label} htmlFor="arc-prompt">
								RESEARCH QUESTION / CUSTOM INSTRUCTION
							</label>
							<div className={styles.promptContainer}>
								<div className={styles.promptToolbar}>
									<span>AI-generated prompts · add context or choose a focus</span>
									<button
										type="button"
										className={styles.draftPrompt}
										disabled={!!busy || !!pending || !!quote}
										onClick={() => void run(() => generatePrompt())}
									>
										{busy === "Generating AI prompt" ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
										{busy === "Generating AI prompt" ? "Generating…" : userPrompt.trim() ? "Rewrite with AI" : "Generate with AI"}
									</button>
								</div>
								<textarea
									ref={promptRef}
									id="arc-prompt"
									className={styles.promptInput}
									rows={3}
									maxLength={4000}
									placeholder={`What is the case for and against ${symbol.length > 20 ? short(symbol) : symbol} right now?`}
									value={userPrompt}
									disabled={!!busy || !!pending || !!quote}
									onChange={(e) => {
										setUserPrompt(e.target.value);
										setQuote(null);
									}}
								/>
								<div className={styles.promptFooter}>
									<div className={styles.promptPresets}>
										{[
											"Bull vs Bear Case",
											"Short-term Momentum & Levels",
											"Risk & Liquidation Audit",
											"Fundamental & Macro Drivers",
										].map((preset) => (
											<button
												key={preset}
												type="button"
												disabled={!!busy || !!pending || !!quote}
												className={styles.presetChip}
													onClick={() => void run(() => generatePrompt(preset))}
											>
												{preset}
											</button>
										))}
									</div>
									{userPrompt.length > 0 && (
										<span className={styles.promptCharCount}>
											{userPrompt.length} / 4,000
										</span>
									)}
								</div>
							</div>
							<div className={styles.price}>
								<span>PRICE PER BRIEFING</span>
								<strong>
									0.002 <small>USDC</small>
								</strong>
								<span suppressHydrationWarning>+ Arc network fee · {isTestnet ? "testnet funds" : "real mainnet funds"}</span>
							</div>
							{quote && !pending && (
								<div className={styles.invoice}>
									<div>
										<span>From</span>
										<code>{short(account)}</code>
									</div>
									<div>
										<span>Merchant</span>
										<code>{short(quote.invoice.destination_wallet)}</code>
									</div>
									{quote.invoice.payment_contract && <div><span>Payment contract</span><code>{short(quote.invoice.payment_contract)}</code></div>}
									<div>
										<span>Maximum network fee</span>
										<strong>
											{formatUnits(
												BigInt(quote.gas) * BigInt(quote.maxFeePerGas),
												18,
											)}{" "}
											USDC
										</strong>
									</div>
									<div>
										<span>Invoice expires</span>
										<span>
											{new Date(
												quote.invoice.expires_at * 1000,
											).toLocaleTimeString()}
										</span>
									</div>
									<p>
										Your wallet address, selected market, and result will be
										public in the receipt.
									</p>
								</div>
							)}
							{walletChainId && walletChainId !== activeChainId && (
								<div className={styles.wrongNetworkAlert}>
									<span>
										⚠️ Connected to Chain {walletChainId}. Please switch to{" "}
										{activeChain.name}.
									</span>
									<button
										type="button"
										className={styles.switchChainBtn}
										onClick={() =>
											void run(() =>
												switchOrAddArcChain(
													injectedWallet(dynamicContext?.primaryWallet),
												),
											)
										}
									>
										Switch to {activeChain.name}
									</button>
								</div>
							)}
							{mounted && account && !pending && (
								<div className={styles.connectedWalletBar}>
									<div className={styles.connectedWalletInfo}>
										<span className={styles.connectedDot} />
										<span className={styles.connectedLabel}>Connected:</span>
										<code className={styles.connectedAddress} title={account}>
											{short(account)}
										</code>
										<button
											type="button"
											className={styles.copyAddressBtn}
											onClick={copyAddress}
											title="Copy address"
										>
											{copied ? (
												<Check size={12} className={styles.copySuccess} />
											) : (
												<Copy size={12} />
											)}
										</button>
									</div>
									<button
										type="button"
										className={styles.disconnectWalletBtn}
										onClick={() => void disconnectWallet()}
										title="Disconnect wallet"
									>
										<LogOut size={12} />
										<span>Disconnect</span>
									</button>
								</div>
							)}
							{pending ? (
								<div className={styles.pending}>
									<strong>Payment submitted. Keep this receipt.</strong>
									<a
										href={arcTransactionUrl(pending.hash)}
										target="_blank"
										rel="noreferrer"
									>
										{short(pending.hash)} <ArrowUpRight size={14} />
									</a>
									<button
										className={styles.primary}
										disabled={!!busy}
										onClick={() => void run(() => resumePayment(pending))}
									>
										{busy && <Loader2 className={styles.spin} size={17} />}
										{busy ? busy : "Resume without paying again"}
										{!busy && <ArrowUpRight size={17} />}
									</button>
									<button
										className={styles.textButton}
										onClick={() =>
											download(pending, "arc-payment-recovery.json")
										}
									>
										Download recovery details
									</button>
								</div>
							) : (
								<>
									<button
										className={styles.primary}
										disabled={!!busy || (!!account && (!status?.ready || networkError))}
										onClick={() => void run(quote ? payInvoice : reviewInvoice)}
									>
										{busy ? (
											<Loader2 className={styles.spin} size={17} />
										) : (
											<Wallet size={17} />
										)}
										{busy
											? busy
											: quote
												? "Approve & pay 0.002 USDC"
													: account ? "Review invoice" : status?.ready ? "Connect wallet & review invoice" : "Connect wallet"}
										{!busy && <ArrowUpRight size={17} />}
									</button>
									{quote && (
										<button
											className={styles.textButton}
											disabled={!!busy}
											onClick={() => setQuote(null)}
										>
											Cancel invoice
										</button>
									)}
								</>
							)}
							{status && !status.ready && (
								<p className={styles.notice}>
									{status.readinessReason || "Paid briefings are temporarily unavailable."} You can still connect your wallet.
								</p>
							)}
						</>
					)}
					{error && (
						<p role="alert" className={styles.error}>
							{error}
						</p>
					)}
					{proof && (
						<>
							<div className={styles.verdict}>
								{proof.result.snapshot.imageUrl && (
									<img
										src={proof.result.snapshot.imageUrl}
										alt={proof.result.snapshot.symbol}
										className={styles.proofTokenImg}
										onError={(e) => {
											(e.currentTarget as HTMLElement).style.display =
												"none";
										}}
									/>
								)}
								<div style={{ flex: 1, minWidth: 0 }}>
									<span>
										{proof.result.snapshot.name ||
											proof.result.snapshot.symbol}{" "}
										({proof.result.snapshot.symbol}) /{" "}
										{proof.result.trading_signal.replace("_", " ")}
									</span>
								</div>
								<strong>
									{proof.result.sentiment_score}
									<small>/100 sentiment</small>
								</strong>
							</div>
							{proof.request?.prompt && (
								<div className={styles.question} style={{ margin: "14px 0" }}>
									“{proof.request.prompt}”
								</div>
							)}
							<p className={styles.analysis}>{proof.result.analysis}</p>
							<div className={styles.perspectives}>
								{[
									["BULL CASE", proof.result.bull_case],
									["BEAR CASE", proof.result.bear_case],
									["RISK CHECK", proof.result.risk_check],
								].map(([title, content], i) => (
									<article key={title}>
										<span>
											0{i + 1} / {title}
										</span>
										<p>{content}</p>
									</article>
								))}
							</div>
							<p className={styles.footnote} suppressHydrationWarning>
								Snapshot: ${proof.result.snapshot.priceUsd.toLocaleString()} ·{" "}
								{new Date(proof.result.snapshot.observedAt).toLocaleString()} ·{" "}
								<a
									href={proof.result.snapshot.source}
									target="_blank"
									rel="noreferrer"
								>
									CoinGecko ↗
								</a>
								<br />
								Model: {proof.result.model}. Research opinions; payment
								verification does not validate prediction accuracy.
							</p>
							<Link
								className={styles.textButton}
								href="/arc"
								onClick={() => {
									if (!receiptHash) {
										setProof(null);
										setQuote(null);
									}
								}}
							>
								Start a new briefing →
							</Link>
						</>
					)}
				</div>

				<aside className={styles.receipt}>
					<div className={styles.receiptTop}>
						<span>PROOF OF INTELLIGENCE</span>
						<ShieldCheck size={22} />
					</div>
					<h2>{proof ? "Payment verified." : "A receipt you can verify."}</h2>
					<p>
						{proof
							? (proof.payment.chainId === ARC_TESTNET_CHAIN_ID
								? "Settled on Arc testnet. Independently inspect the transaction."
								: "Settled on Arc mainnet. Independently inspect the transaction.")
							: "After settlement, inspect your payment and invoice commitment directly on Arc."}
					</p>
					<div className={styles.receiptRows}>
						<div>
							<span>NETWORK</span>
							<strong suppressHydrationWarning>
								{proof
									? (proof.payment.chainId === ARC_TESTNET_CHAIN_ID
										? "Arc Testnet"
										: "Arc Mainnet")
									: activeNetworkName}{" "}
								<span className={styles.receiptDot} />
							</strong>
						</div>
						<div>
							<span>CHAIN ID</span>
							<strong suppressHydrationWarning>
								{proof ? proof.payment.chainId : activeChainId}
							</strong>
						</div>
						<div>
							<span>PAYMENT</span>
							<strong>{proof ? proof.payment.amount : "0.002"} USDC</strong>
						</div>
						<div>
							<span>GAS PAID</span>
							<strong>
								{proof
									? `${proof.payment.gasUsdc} USDC`
									: "Estimated before approval"}
							</strong>
						</div>
						<div>
							<span>SETTLEMENT BLOCK</span>
							<strong>
								{proof ? `#${proof.payment.blockNumber}` : "Awaiting payment"}
							</strong>
						</div>
					</div>
					{proof ? (
						<>
							<ReceiptCard
								data={{
									...proof.payment,
									asset: proof.result.snapshot.name || proof.result.snapshot.symbol,
									signal: proof.result.trading_signal,
									score: proof.result.sentiment_score,
									analysis: proof.result.analysis,
									resultHash: proof.resultHash,
								}}
								receipt={proof}
							/>
							{proof.invoice.payment_contract && <a className={styles.receiptLink} href={`${proof.payment.explorerUrl.split("/tx/")[0]}/address/${proof.invoice.payment_contract}`} target="_blank" rel="noreferrer">View payment smart contract ↗</a>}
							{proof.request?.prompt && (
								<div className={styles.receiptPrompt}>
									<span>RESEARCH INSTRUCTION</span>
									<p>“{proof.request.prompt}”</p>
								</div>
							)}
							<div className={styles.hash}>
								<span>INVOICE COMMITMENT · ONCHAIN</span>
								<code>{invoiceCommitment(proof.invoice)}</code>
							</div>
							<div className={styles.hash}>
								<span>RESULT HASH · PROVIDER RECORD</span>
								<code>{proof.resultHash}</code>
							</div>
							<a
								className={styles.explorerButton}
								href={proof.payment.explorerUrl}
								target="_blank"
								rel="noreferrer"
							>
								Inspect transaction <ArrowUpRight size={17} />
							</a>
							<Link
								className={styles.receiptLink}
								href={`/arc/receipts/${proof.payment.transactionHash}`}
							>
								Open public receipt ↗
							</Link>
						</>
					) : (
						<div className={styles.emptyReceipt}>
							<span>?</span>
							<p>
								A question becomes a payment.
								<br />A payment becomes a receipt.
							</p>
						</div>
					)}
					<div className={styles.receiptBottom}>
						ARC PROVES THE PAYMENT + INVOICE COMMITMENT.
						<br />
						THE RESULT HASH IDENTIFIES THE PROVIDER RESPONSE.
					</div>
				</aside>
			</section>

			<footer className={styles.footer}>
				<Link href="/">← Back to Barzakh AI</Link>
				<span>SMALL PAYMENTS | VISIBLE PROOF | BUILT BY SIRATH NETWORK</span>
				<a
					href="https://docs.arc.io/arc/references/connect-to-arc"
					target="_blank"
					rel="noreferrer"
				>
					Built on Arc ↗
				</a>
			</footer>
		</main>
	);
}
