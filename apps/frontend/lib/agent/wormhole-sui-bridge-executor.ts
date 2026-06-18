import {
  getUserAgentWalletAddress,
  hasDelegation,
  recordAgentTransaction,
  type WalletChain,
} from "./agent-wallet-store";
import { executeSuiBridgeEthDeposit } from "./sui-bridge-executor";
import { submitWormholeSuiSdkTransfer } from "./wormhole-sui-sdk-adapter";

export type WormholeNetwork = "Mainnet" | "Testnet";
export type WormholeSuiRoutePreference = "auto" | "cctp" | "wtt" | "connect";
export type WormholeSuiRouteKind = "cctp" | "wtt" | "connect";

export interface WormholeSuiBridgePlanInput {
  asset: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
  recipientAddress: string;
  network?: string;
  routePreference?: WormholeSuiRoutePreference;
  sourceAddress?: string;
  nativeGasDropoff?: string;
}

export interface WormholeSuiBridgeExecutionInput extends WormholeSuiBridgePlanInput {
  userId: string;
  execute?: boolean;
}

export interface WormholeSuiBridgeQuote {
  routeKind: WormholeSuiRouteKind;
  routeName: string;
  sourceChain: string;
  destinationChain: string;
  asset: string;
  amount: string;
  estimatedRelayFee: string;
  estimatedDuration: string;
  sourceWalletChain: WalletChain;
  requiresNativeGas: boolean;
  note: string;
}

export interface WormholeSuiBridgeExecutionResult {
  success: boolean;
  dryRun: boolean;
  executionReady: boolean;
  plan: WormholeSuiBridgePlan;
  quote?: WormholeSuiBridgeQuote;
  blockers: string[];
  transactionHash?: string;
  explorerUrl?: string;
  provider?: string;
  sourceTxHash?: string;
  destinationTxHash?: string;
  attestationHash?: string;
  routeState?: string;
  finalized?: boolean;
  requiresCompletion?: boolean;
  autonomousCompletionScheduled?: boolean;
  completionInstruction?: string;
  error?: string;
}

export interface WormholeSubmitTransferRequest {
  userId: string;
  plan: WormholeSuiBridgePlan;
  quote: WormholeSuiBridgeQuote;
  sourceWalletAddress: string;
}

export interface WormholeSubmitTransferResult {
  txHash: string;
  provider?: string;
  sourceTxHash?: string;
  destinationTxHash?: string;
  sourceTxHashes?: string[];
  destinationTxHashes?: string[];
  attestationHash?: string;
  routeState?: string;
  finalized?: boolean;
  requiresCompletion?: boolean;
  autonomousCompletionScheduled?: boolean;
  completionInstruction?: string;
}

type WormholeExecutionDeps = {
  hasDelegation?: (userId: string, chain: WalletChain) => Promise<boolean>;
  getWalletAddress?: (userId: string, chain: WalletChain) => Promise<string | null>;
  recordTransaction?: (input: {
    userId: string;
    walletAddress: string;
    operationType: string;
    amount: string;
    signature: string;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  submitTransfer?: (request: WormholeSubmitTransferRequest) => Promise<WormholeSubmitTransferResult>;
  nativeBridgeFallback?: (input: {
    userId: string;
    asset: string;
    amount: string;
    suiRecipient: string;
    ethereumChain: "sepolia";
    dryRun: false;
  }) => Promise<any>;
  env?: Record<string, string | undefined>;
};

export interface WormholeSuiBridgePlan {
  success: true;
  protocol: "wormhole";
  usesNativeSuiBridge: false;
  manualClaimRequired: boolean;
  network: WormholeNetwork;
  asset: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
  sourceAddress: string | null;
  recipientAddress: string;
  nativeGasDropoff: string | null;
  destinationAsset: string;
  route: {
    kind: WormholeSuiRouteKind;
    name: string;
    automatic: boolean;
    packageHints: string[];
  };
  summary: string;
  steps: string[];
  warnings: string[];
  blockers: string[];
  links: Array<{ label: string; url: string }>;
  executionReady: false;
}

const CCTP_MAINNET_CHAINS = new Set([
  "Ethereum",
  "Solana",
  "Aptos",
  "Arbitrum",
  "Avalanche",
  "Base",
  "Optimism",
  "Polygon",
  "Sui",
  "Unichain",
]);

const CCTP_TESTNET_CHAINS = new Set([
  "Ethereum",
  "Sepolia",
  "EthereumSepolia",
  "Solana",
  "Aptos",
  "ArbitrumSepolia",
  "Avalanche",
  "BaseSepolia",
  "OptimismSepolia",
  "Polygon",
  "Sui",
  "UnichainSepolia",
]);

const WTT_SUPPORTED_SUI_PAIRS = new Set([
  "Ethereum",
  "Sepolia",
  "EthereumSepolia",
  "Solana",
  "Aptos",
  "Arbitrum",
  "ArbitrumSepolia",
  "Avalanche",
  "Base",
  "BaseSepolia",
  "BNB",
  "Bsc",
  "Optimism",
  "OptimismSepolia",
  "Polygon",
  "PolygonAmoy",
  "Sui",
  "Unichain",
]);

function toPascalChainName(chain: string): string {
  const clean = chain.trim().replace(/[-_\s]+/g, " ").toLowerCase();
  const aliases: Record<string, string> = {
    eth: "Ethereum",
    ethereum: "Ethereum",
    mainnet: "Ethereum",
    sepolia: "Sepolia",
    // Wormhole SDK 4.20.0's testnet Ethereum chain key is `Sepolia`, not `EthereumSepolia`.
    ethereumsepolia: "Sepolia",
    "ethereum sepolia": "Sepolia",
    base: "Base",
    basesepolia: "BaseSepolia",
    "base sepolia": "BaseSepolia",
    arbitrum: "Arbitrum",
    arbitrumsepolia: "ArbitrumSepolia",
    "arbitrum sepolia": "ArbitrumSepolia",
    optimism: "Optimism",
    optimismsepolia: "OptimismSepolia",
    "optimism sepolia": "OptimismSepolia",
    polygon: "Polygon",
    polygonamoy: "PolygonAmoy",
    "polygon amoy": "PolygonAmoy",
    avax: "Avalanche",
    avalanche: "Avalanche",
    sui: "Sui",
    solana: "Solana",
    aptos: "Aptos",
    bsc: "Bsc",
    bnb: "Bsc",
    unichain: "Unichain",
    unichainsepolia: "UnichainSepolia",
    "unichain sepolia": "UnichainSepolia",
  };
  const compact = clean.replace(/\s/g, "");
  if (aliases[clean]) return aliases[clean];
  if (aliases[compact]) return aliases[compact];
  return clean
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function normalizeWormholeNetwork(network?: string): WormholeNetwork {
  const clean = (network || "Testnet").trim().toLowerCase();
  if (["mainnet", "main", "production", "prod"].includes(clean)) return "Mainnet";
  return "Testnet";
}

function isSuiChain(chain: string) {
  return toPascalChainName(chain) === "Sui";
}

function isNativeSui(asset: string) {
  return asset.trim().toUpperCase() === "SUI";
}

function isUsdc(asset: string) {
  return asset.trim().toUpperCase() === "USDC";
}

function supportsCctp(network: WormholeNetwork, sourceChain: string, destinationChain: string) {
  const supported = network === "Mainnet" ? CCTP_MAINNET_CHAINS : CCTP_TESTNET_CHAINS;
  return supported.has(sourceChain) && supported.has(destinationChain);
}

function supportsWtt(sourceChain: string, destinationChain: string) {
  return WTT_SUPPORTED_SUI_PAIRS.has(sourceChain) && WTT_SUPPORTED_SUI_PAIRS.has(destinationChain);
}

function buildRoute(params: {
  asset: string;
  sourceChain: string;
  destinationChain: string;
  network: WormholeNetwork;
  routePreference: WormholeSuiRoutePreference;
}) {
  const { asset, sourceChain, destinationChain, network, routePreference } = params;
  const packageHints = [
    "@wormhole-foundation/sdk@4.20.0",
    "@wormhole-foundation/sdk/platforms/sui",
    "@wormhole-foundation/sdk/platforms/evm",
    "@wormhole-foundation/sdk/platforms/solana",
  ];

  if (routePreference === "connect") {
    return {
      kind: "connect" as const,
      name: "Wormhole Connect widget route",
      automatic: true,
      packageHints: ["@wormhole-foundation/wormhole-connect"],
    };
  }

  const cctpOk = isUsdc(asset) && supportsCctp(network, sourceChain, destinationChain);
  if ((routePreference === "cctp" || routePreference === "auto") && cctpOk) {
    return {
      kind: "cctp" as const,
      name: network === "Testnet" && (sourceChain === "Sui" || destinationChain === "Sui")
        ? "Wormhole CCTP / ManualCCTP route for native Circle USDC"
        : "Wormhole CCTP Executor route for native USDC",
      automatic: true,
      packageHints: [...packageHints, "@wormhole-labs/cctp-executor-route"],
    };
  }

  return {
    kind: "wtt" as const,
    name: "Wormhole Wrapped Token Transfers route",
    automatic: true,
    packageHints,
  };
}

export function buildWormholeSuiBridgePlan(input: WormholeSuiBridgePlanInput): WormholeSuiBridgePlan {
  const network = normalizeWormholeNetwork(input.network);
  const sourceChain = toPascalChainName(input.sourceChain);
  const destinationChain = toPascalChainName(input.destinationChain);
  const routePreference = input.routePreference || "auto";
  const asset = input.asset.trim().toUpperCase();

  if (!isSuiChain(sourceChain) && !isSuiChain(destinationChain)) {
    throw new Error("Wormhole Sui bridge plans must include Sui as the source or destination chain.");
  }

  const warnings: string[] = [
    "Native Sui Bridge is intentionally bypassed for this path because it previously reached a verified-before-claim loop; this plan uses Wormhole routes instead.",
  ];
  const blockers: string[] = [];

  if (!input.amount || Number(input.amount) <= 0) {
    blockers.push("Provide a positive amount.");
  }
  if (!input.recipientAddress) {
    blockers.push("Provide a destination recipient address.");
  }

  const route = buildRoute({ asset, sourceChain, destinationChain, network, routePreference });

  if (route.kind === "cctp" && network === "Testnet" && (sourceChain === "Sui" || destinationChain === "Sui")) {
    warnings.push("Wormhole SDK returned a valid testnet ManualCCTP quote for Sui USDC. This uses Circle testnet USDC and may require manual/SDK completion after source burn depending on route support.");
  }

  if (route.kind === "wtt" && !supportsWtt(sourceChain, destinationChain)) {
    blockers.push(`WTT support for ${sourceChain} -> ${destinationChain} is not confirmed in the local support matrix.`);
  }

  let destinationAsset = `${asset} via Wormhole route`;
  if (route.kind === "cctp") {
    destinationAsset = "Native USDC on Sui";
  } else if (isNativeSui(asset) && destinationChain !== "Sui") {
    destinationAsset = `Wormhole-wrapped SUI on ${destinationChain}`;
  } else if (!isNativeSui(asset) && destinationChain === "Sui") {
    destinationAsset = route.kind === "wtt" ? `Wormhole-wrapped ${asset} on Sui unless the token has a native route` : destinationAsset;
    warnings.push("For non-USDC assets through WTT, the destination asset may be Wormhole-wrapped rather than a native Sui asset.");
  }

  if (route.kind === "wtt") {
    warnings.push("WTT may require token attestation before the first transfer and may deliver a wrapped asset on the destination chain.");
  }
  if (route.kind === "cctp") {
    warnings.push("CCTP is USDC-only and requires native Circle-issued USDC on both source and destination chains.");
  }

  const steps = route.kind === "cctp"
    ? [
        "Initialize Wormhole SDK with EVM/Solana/Sui platforms and @wormhole-labs/cctp-executor-route.",
        "Create a RouteTransferRequest for native USDC with sourceDecimals=6 and destinationDecimals=6.",
        "Validate amount/nativeGas options with the available CCTP route (ManualCCTP on current Sui testnet quotes; Executor route where supported).",
        "Quote the route, then initiate the transfer; CCTP burns native Circle USDC on source and completes/mints native USDC on destination through the route's completion flow.",
        "Track CCTP source transaction, Circle attestation, and destination completion; for ManualCCTP, completion can take up to 15 minutes or more, and the source burn is not final bridge success.",
      ]
    : route.kind === "connect"
      ? [
          "Render Wormhole Connect in the frontend with chains including Sui and the selected counterparty chain.",
          "Whitelist the needed tokens and routes; use DEFAULT_ROUTES or executorTokenBridgeRoute/CCTP routes where available.",
          "Let user/browser wallet sign the source-chain transfer; Connect handles route UX and progress.",
          "Track the transaction with chain block explorers and Barzakh status APIs; only use Wormhole status/debugging if automatic delivery fails.",
        ]
      : [
          "Use Wormhole SDK TokenBridge / Wrapped Token Transfers or Wormhole Connect instead of Sui Native Bridge.",
          "Check whether the token is already attested/wrapped on the destination chain; submit attestation first if needed.",
          "Initiate the source transfer with automatic relay/executor where supported, otherwise fetch VAA and redeem manually.",
          "Track the source transaction with the chain block explorer; use recovery by source transaction hash if automatic completion stalls.",
        ];

  return {
    success: true,
    protocol: "wormhole",
    usesNativeSuiBridge: false,
    manualClaimRequired: false,
    network,
    asset,
    amount: input.amount,
    sourceChain,
    destinationChain,
    sourceAddress: input.sourceAddress || null,
    recipientAddress: input.recipientAddress,
    nativeGasDropoff: input.nativeGasDropoff || null,
    destinationAsset,
    route,
    summary: `${asset} ${sourceChain} -> ${destinationChain} should use ${route.name}, not the Sui Native Bridge claim flow.`,
    steps,
    warnings,
    blockers,
    links: [
      { label: "Wormhole Connect", url: "https://wormhole.com/docs/products/connect/overview/" },
      { label: "CCTP Bridge with Wormhole", url: "https://wormhole.com/docs/products/cctp-bridge/overview/" },
      { label: "WTT / Token Bridge", url: "https://wormhole.com/docs/products/token-transfers/wrapped-token-transfers/overview/" },
    ],
    executionReady: false,
  };
}

function sourceChainToWalletChain(sourceChain: string): WalletChain {
  const chain = toPascalChainName(sourceChain);
  if (chain === "Sui") return "sui";
  if (chain === "Solana") return "solana";
  return "evm";
}

function buildDryRunQuote(plan: WormholeSuiBridgePlan): WormholeSuiBridgeQuote {
  const sourceWalletChain = sourceChainToWalletChain(plan.sourceChain);
  return {
    routeKind: plan.route.kind,
    routeName: plan.route.name,
    sourceChain: plan.sourceChain,
    destinationChain: plan.destinationChain,
    asset: plan.asset,
    amount: plan.amount,
    estimatedRelayFee: "quote-required-from-wormhole-route",
    estimatedDuration: plan.route.kind === "cctp" ? "up to 15 minutes or more; depends on Circle attestation and autonomous destination completion" : "minutes; depends on VAA finality and delivery route",
    sourceWalletChain,
    requiresNativeGas: true,
    note: "Dry-run only. A live Wormhole SDK/Connect quote must be fetched immediately before execution because route fees and gas change.",
  };
}

function envEnabled(env: Record<string, string | undefined>, key: string) {
  return env[key] === "true";
}

function shouldTryNativeBridgeTestnetUsdcFallback(plan: WormholeSuiBridgePlan, error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  return plan.network === "Testnet"
    && plan.asset === "USDC"
    && plan.destinationChain === "Sui"
    && ["Ethereum", "Sepolia", "EthereumSepolia"].includes(plan.sourceChain)
    && /No Wormhole destination token found|USDC is not configured/i.test(message);
}

function getExecutionBlockers(params: {
  plan: WormholeSuiBridgePlan;
  quote: WormholeSuiBridgeQuote;
  env: Record<string, string | undefined>;
  execute: boolean;
}) {
  const blockers = [...params.plan.blockers];
  if (!params.execute) {
    blockers.push("execute=false: dry-run quote only. Re-run with execute=true after user confirmation.");
    return blockers;
  }
  if (!envEnabled(params.env, "WORMHOLE_SUI_BRIDGE_ENABLE_WRITES")) {
    blockers.push("Set WORMHOLE_SUI_BRIDGE_ENABLE_WRITES=true to allow Wormhole bridge execution.");
  }
  if (params.plan.network === "Mainnet" && !envEnabled(params.env, "WORMHOLE_SUI_BRIDGE_ENABLE_MAINNET_WRITES")) {
    blockers.push("Mainnet Wormhole bridge writes disabled. Set WORMHOLE_SUI_BRIDGE_ENABLE_MAINNET_WRITES=true only after risk controls are ready.");
  }
  return blockers;
}

async function defaultSubmitWormholeTransfer(
  request: WormholeSubmitTransferRequest,
  env: Record<string, string | undefined>,
): Promise<WormholeSubmitTransferResult> {
  if (env.WORMHOLE_SUI_BRIDGE_EXECUTOR_MODE === "sdk" || env.WORMHOLE_SUI_BRIDGE_USE_INTERNAL_SDK === "true") {
    return submitWormholeSuiSdkTransfer(request);
  }

  const adapterUrl = env.WORMHOLE_SUI_BRIDGE_EXECUTOR_ADAPTER_URL;
  if (!adapterUrl) {
    throw new Error(
      "No Wormhole execution adapter configured. Set WORMHOLE_SUI_BRIDGE_EXECUTOR_ADAPTER_URL to a reviewed server-side SDK/Connect executor, or keep execute=false.",
    );
  }

  const res = await fetch(adapterUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(env.WORMHOLE_SUI_BRIDGE_EXECUTOR_ADAPTER_TOKEN
        ? { authorization: `Bearer ${env.WORMHOLE_SUI_BRIDGE_EXECUTOR_ADAPTER_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({
      userId: request.userId,
      sourceWalletAddress: request.sourceWalletAddress,
      plan: request.plan,
      quote: request.quote,
    }),
  });

  if (!res.ok) {
    throw new Error(`Wormhole execution adapter failed with HTTP ${res.status}`);
  }

  const json = await res.json();
  const txHash = json?.txHash || json?.transactionHash || json?.digest;
  if (!txHash || typeof txHash !== "string") {
    throw new Error("Wormhole execution adapter did not return txHash/transactionHash/digest.");
  }
  return {
    txHash,
    provider: String(json?.provider || "wormhole-adapter"),
    sourceTxHash: typeof json?.sourceTxHash === "string" ? json.sourceTxHash : undefined,
    destinationTxHash: typeof json?.destinationTxHash === "string" ? json.destinationTxHash : undefined,
    sourceTxHashes: Array.isArray(json?.sourceTxHashes) ? json.sourceTxHashes.filter((hash: unknown) => typeof hash === "string") : undefined,
    destinationTxHashes: Array.isArray(json?.destinationTxHashes) ? json.destinationTxHashes.filter((hash: unknown) => typeof hash === "string") : undefined,
    attestationHash: typeof json?.attestationHash === "string" ? json.attestationHash : undefined,
    routeState: typeof json?.routeState === "string" ? json.routeState : undefined,
  };
}

export async function executeWormholeSuiBridgeTransfer(
  input: WormholeSuiBridgeExecutionInput,
  deps: WormholeExecutionDeps = {},
): Promise<WormholeSuiBridgeExecutionResult> {
  const env = deps.env || process.env;
  const plan = buildWormholeSuiBridgePlan(input);
  const quote = buildDryRunQuote(plan);
  const execute = input.execute === true;
  const blockers = getExecutionBlockers({ plan, quote, env, execute });
  const getWallet = deps.getWalletAddress || getUserAgentWalletAddress;
  const checkDelegation = deps.hasDelegation || hasDelegation;
  const record = deps.recordTransaction || recordAgentTransaction;
  const submit = deps.submitTransfer || ((request) => defaultSubmitWormholeTransfer(request, env));
  const nativeBridgeFallback = deps.nativeBridgeFallback || executeSuiBridgeEthDeposit;

  if (!execute) {
    return {
      success: true,
      dryRun: true,
      executionReady: false,
      plan,
      quote,
      blockers,
    };
  }

  const sourceWalletChain = quote.sourceWalletChain;
  const [enabled, sourceWalletAddress] = await Promise.all([
    checkDelegation(input.userId, sourceWalletChain),
    getWallet(input.userId, sourceWalletChain),
  ]);

  if (!enabled) blockers.push(`Agent automation is not enabled for ${sourceWalletChain} source-chain signing.`);
  if (!sourceWalletAddress) blockers.push(`No embedded ${sourceWalletChain} source wallet found for Wormhole execution.`);

  if (blockers.length > 0) {
    return {
      success: false,
      dryRun: true,
      executionReady: false,
      plan,
      quote,
      blockers,
      error: blockers[0],
    };
  }

  try {
    const submitted = await submit({
      userId: input.userId,
      plan,
      quote,
      sourceWalletAddress: sourceWalletAddress!,
    });
    const sourceTxHash = submitted.sourceTxHash || submitted.txHash;
    const destinationTxHash = submitted.destinationTxHash;
    const sourceExplorerUrl = buildChainBlockExplorerTxUrl({ txHash: sourceTxHash, chain: plan.sourceChain, network: plan.network });
    const destinationExplorerUrl = destinationTxHash
      ? buildChainBlockExplorerTxUrl({ txHash: destinationTxHash, chain: plan.destinationChain, network: plan.network })
      : undefined;
    const explorerUrl = destinationExplorerUrl || sourceExplorerUrl;

    await record({
      userId: input.userId,
      walletAddress: sourceWalletAddress!,
      operationType: "wormhole_sui_bridge",
      amount: input.amount,
      signature: submitted.txHash,
      metadata: {
        bridge: "wormhole",
        routeKind: quote.routeKind,
        routeName: quote.routeName,
        network: plan.network,
        sourceChain: plan.sourceChain,
        destinationChain: plan.destinationChain,
        asset: plan.asset,
        recipientAddress: plan.recipientAddress,
        sourceWalletChain,
        explorerUrl,
        sourceExplorerUrl,
        destinationExplorerUrl,
        provider: submitted.provider || "wormhole-adapter",
        sourceTxHash: submitted.sourceTxHash,
        destinationTxHash: submitted.destinationTxHash,
        sourceTxHashes: submitted.sourceTxHashes,
        destinationTxHashes: submitted.destinationTxHashes,
        attestationHash: submitted.attestationHash,
        routeState: submitted.routeState,
        finalized: submitted.finalized ?? Boolean(submitted.destinationTxHash),
        requiresCompletion: submitted.requiresCompletion,
        autonomousCompletionScheduled: submitted.autonomousCompletionScheduled,
        completionInstruction: submitted.completionInstruction,
      },
    });

    return {
      success: true,
      dryRun: false,
      executionReady: true,
      plan,
      quote,
      blockers: [],
      transactionHash: submitted.txHash,
      explorerUrl,
      provider: submitted.provider || "wormhole-adapter",
      sourceTxHash: submitted.sourceTxHash,
      destinationTxHash: submitted.destinationTxHash,
      attestationHash: submitted.attestationHash,
      routeState: submitted.routeState,
      finalized: submitted.finalized ?? Boolean(submitted.destinationTxHash),
      requiresCompletion: submitted.requiresCompletion,
      autonomousCompletionScheduled: submitted.autonomousCompletionScheduled,
      completionInstruction: submitted.completionInstruction,
    };
  } catch (error: any) {
    if (shouldTryNativeBridgeTestnetUsdcFallback(plan, error)) {
      try {
        const fallback = await nativeBridgeFallback({
          userId: input.userId,
          asset: plan.asset,
          amount: plan.amount,
          suiRecipient: plan.recipientAddress,
          ethereumChain: "sepolia",
          dryRun: false,
        });
        if (fallback?.success && fallback?.transactionHash) {
          return {
            success: true,
            dryRun: false,
            executionReady: true,
            plan: {
              ...plan,
              summary: `${plan.asset} ${plan.sourceChain} -> ${plan.destinationChain} used Sui Native Bridge testnet fallback because Wormhole WTT had no Sepolia USDC destination token mapping.`,
              warnings: [
                ...plan.warnings,
                "Wormhole WTT did not expose a Sepolia USDC -> Sui testnet wrapped-token mapping, so Barzakh used the official Sui Native Bridge testnet USDC route instead.",
              ],
            },
            quote: {
              ...quote,
              routeKind: "connect",
              routeName: "Sui Native Bridge testnet USDC fallback",
              note: "Executed through official Sui Native Bridge testnet ERC20 deposit fallback after Wormhole WTT route mapping was unavailable.",
            },
            blockers: [],
            transactionHash: fallback.transactionHash,
            explorerUrl: fallback.explorerUrl,
            provider: "sui-native-bridge:testnet-usdc-fallback",
          };
        }
        const fallbackError = fallback?.error || "Sui Native Bridge testnet USDC fallback did not return a transaction hash.";
        return {
          success: false,
          dryRun: true,
          executionReady: false,
          plan: {
            ...plan,
            summary: `${plan.asset} ${plan.sourceChain} -> ${plan.destinationChain} switched from Wormhole WTT to Sui Native Bridge testnet fallback because Wormhole had no Sepolia USDC destination token mapping.`,
            warnings: [
              ...plan.warnings,
              "Wormhole WTT mapping was unavailable, but that is not the active blocker after fallback; resolve the Sui Native Bridge fallback error below.",
            ],
          },
          quote: {
            ...quote,
            routeKind: "connect",
            routeName: "Sui Native Bridge testnet USDC fallback",
            note: "Wormhole WTT had no Sepolia USDC mapping, so execution moved to official Sui Native Bridge testnet USDC fallback.",
          },
          blockers: [fallbackError],
          error: fallbackError,
        };
      } catch (fallbackError: any) {
        const fallbackMessage = fallbackError?.message || "Sui Native Bridge testnet USDC fallback failed.";
        return {
          success: false,
          dryRun: true,
          executionReady: false,
          plan: {
            ...plan,
            summary: `${plan.asset} ${plan.sourceChain} -> ${plan.destinationChain} switched from Wormhole WTT to Sui Native Bridge testnet fallback because Wormhole had no Sepolia USDC destination token mapping.`,
            warnings: [
              ...plan.warnings,
              "Wormhole WTT mapping was unavailable, but that is not the active blocker after fallback; resolve the Sui Native Bridge fallback error below.",
            ],
          },
          quote: {
            ...quote,
            routeKind: "connect",
            routeName: "Sui Native Bridge testnet USDC fallback",
            note: "Wormhole WTT had no Sepolia USDC mapping, so execution moved to official Sui Native Bridge testnet USDC fallback.",
          },
          blockers: [fallbackMessage],
          error: fallbackMessage,
        };
      }
    }

    return {
      success: false,
      dryRun: true,
      executionReady: false,
      plan,
      quote,
      blockers: [error?.message || "Wormhole bridge execution failed."],
      error: error?.message || "Wormhole bridge execution failed.",
    };
  }
}

export function buildChainBlockExplorerTxUrl(params: { chain: string; txHash: string; network?: string }) {
  const chain = toPascalChainName(params.chain);
  const network = normalizeWormholeNetwork(params.network);
  const tx = encodeURIComponent(params.txHash);
  if (chain === "Sui") return `https://suiscan.xyz/${network === "Mainnet" ? "mainnet" : "testnet"}/tx/${tx}`;
  if (network === "Testnet" || chain === "Sepolia") {
    if (chain === "Base" || chain === "BaseSepolia") return `https://sepolia.basescan.org/tx/${tx}`;
    if (chain === "Arbitrum" || chain === "ArbitrumSepolia") return `https://sepolia.arbiscan.io/tx/${tx}`;
    if (chain === "Optimism" || chain === "OptimismSepolia") return `https://sepolia-optimism.etherscan.io/tx/${tx}`;
    return `https://sepolia.etherscan.io/tx/${tx}`;
  }
  if (chain === "Base") return `https://basescan.org/tx/${tx}`;
  if (chain === "Arbitrum") return `https://arbiscan.io/tx/${tx}`;
  if (chain === "Optimism") return `https://optimistic.etherscan.io/tx/${tx}`;
  return `https://etherscan.io/tx/${tx}`;
}

export function buildWormholeScanTxUrl(params: { txHash: string; network?: string }) {
  return `https://wormholescan.io/#/tx/${params.txHash}?network=${normalizeWormholeNetwork(params.network)}`;
}

export async function getWormholeOperationStatus(params: {
  txHash?: string;
  address?: string;
  network?: string;
  pageSize?: number;
}) {
  const network = normalizeWormholeNetwork(params.network);
  const base = network === "Mainnet" ? "https://api.wormholescan.io" : "https://api.testnet.wormholescan.io";
  const pageSize = Math.max(1, Math.min(params.pageSize || 5, 20));

  if (params.txHash) {
    const url = `${base}/api/v1/operations?txHash=${encodeURIComponent(params.txHash)}&pageSize=${pageSize}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Wormholescan status request failed: ${res.status}`);
    return {
      network,
      txHash: params.txHash,
      explorerUrl: buildWormholeScanTxUrl({ txHash: params.txHash, network }),
      data: await res.json(),
    };
  }

  if (params.address) {
    const url = `${base}/api/v1/operations?address=${encodeURIComponent(params.address)}&pageSize=${pageSize}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`Wormholescan address request failed: ${res.status}`);
    return {
      network,
      address: params.address,
      data: await res.json(),
    };
  }

  throw new Error("Provide txHash or address to query Wormholescan operation status.");
}
