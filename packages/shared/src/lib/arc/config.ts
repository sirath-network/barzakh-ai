import { defineChain } from "viem";

export const ARC_MAINNET_CHAIN_ID = 5042;
export const ARC_TESTNET_CHAIN_ID = 5042002;

export const ARC_MAINNET_RPC_URL = "https://rpc.mainnet.arc.io";
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";

export const ARC_MAINNET_EXPLORER_URL =
	process.env.ARC_MAINNET_EXPLORER_URL ||
	process.env.NEXT_PUBLIC_ARC_MAINNET_EXPLORER_URL ||
	"https://explorer.arc.io";
export const ARC_TESTNET_EXPLORER_URL = "https://explorer.testnet.arc.io";

export const arcMainnet = defineChain({
	id: ARC_MAINNET_CHAIN_ID,
	name: "Arc Mainnet",
	nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
	rpcUrls: {
		default: {
			http: [process.env.ARC_MAINNET_RPC_URL || ARC_MAINNET_RPC_URL],
		},
	},
	blockExplorers: {
		default: { name: "Arc Explorer", url: ARC_MAINNET_EXPLORER_URL },
	},
	testnet: false,
});

export const arcTestnet = defineChain({
	id: ARC_TESTNET_CHAIN_ID,
	name: "Arc Testnet",
	nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
	rpcUrls: {
		default: {
			http: [process.env.ARC_TESTNET_RPC_URL || ARC_TESTNET_RPC_URL],
		},
	},
	blockExplorers: {
		default: {
			name: "Arc Testnet Explorer",
			url: ARC_TESTNET_EXPLORER_URL,
		},
	},
	testnet: true,
});

export function isArcTestnet(): boolean {
	if (typeof process === "undefined" || !process.env) return false;
	const val = process.env.ARC_TESTNET ?? process.env.NEXT_PUBLIC_ARC_TESTNET;
	if (!val) return false;
	const normalized = val.trim().toLowerCase();
	return normalized === "true" || normalized === "1";
}

export const getArcChain = () => (isArcTestnet() ? arcTestnet : arcMainnet);
export const getArcChainId = () =>
	isArcTestnet() ? ARC_TESTNET_CHAIN_ID : ARC_MAINNET_CHAIN_ID;
export const getArcRpcUrl = () =>
	isArcTestnet()
		? process.env.ARC_TESTNET_RPC_URL || ARC_TESTNET_RPC_URL
		: process.env.ARC_MAINNET_RPC_URL || ARC_MAINNET_RPC_URL;
export const getArcExplorerUrl = () =>
	isArcTestnet() ? ARC_TESTNET_EXPLORER_URL : ARC_MAINNET_EXPLORER_URL;

// Active defaults reflecting environment toggle
export const arcActiveChain = isArcTestnet() ? arcTestnet : arcMainnet;
export const arcChain = arcActiveChain;

export const ARC_CHAIN_ID = isArcTestnet()
	? ARC_TESTNET_CHAIN_ID
	: ARC_MAINNET_CHAIN_ID;

export const ARC_RPC_URL = isArcTestnet()
	? process.env.ARC_TESTNET_RPC_URL || ARC_TESTNET_RPC_URL
	: process.env.ARC_MAINNET_RPC_URL || ARC_MAINNET_RPC_URL;

export const ARC_EXPLORER_URL = isArcTestnet()
	? ARC_TESTNET_EXPLORER_URL
	: ARC_MAINNET_EXPLORER_URL;

export const ARC_USDC_ADDRESS =
	"0x3600000000000000000000000000000000000000" as const;

export const ARC_ANALYSIS_PRICE = "0.002";

export const arcTransactionUrl = (hash: string) =>
	`${getArcExplorerUrl()}/tx/${hash}`;
