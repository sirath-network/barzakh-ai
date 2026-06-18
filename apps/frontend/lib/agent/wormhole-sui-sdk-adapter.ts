import dns from "node:dns";
import { Wormhole, circle, routes } from "@wormhole-foundation/sdk";
import { CircleTransfer } from "@wormhole-foundation/sdk-connect";
import { EvmPlatform, getEvmSignerForKey } from "@wormhole-foundation/sdk-evm";
import { SolanaPlatform, getSolanaSigner } from "@wormhole-foundation/sdk-solana";
import { SuiPlatform, SuiSigner } from "@wormhole-foundation/sdk-sui";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import "@wormhole-foundation/sdk-evm-cctp";
import "@wormhole-foundation/sdk-solana-cctp";
import "@wormhole-foundation/sdk-sui-cctp";
import "@wormhole-foundation/sdk-sui-core";

import { getAgentPrivateKey, type WalletChain } from "./agent-wallet-store";
import type {
  WormholeSubmitTransferRequest,
  WormholeSubmitTransferResult,
  WormholeSuiBridgeQuote,
} from "./wormhole-sui-bridge-executor";

type WormholeSdkNetwork = "Mainnet" | "Testnet";

let circleSandboxDnsPatched = false;

function patchCircleSandboxDnsIfConfigured() {
  if (circleSandboxDnsPatched) return;
  const override = process.env.CIRCLE_IRIS_SANDBOX_RESOLVE_IP?.trim();
  if (!override) return;
  const ips = override.split(",").map((ip) => ip.trim()).filter(Boolean);
  if (ips.length === 0) return;

  circleSandboxDnsPatched = true;
  const originalLookup = dns.lookup.bind(dns);
  (dns as any).lookup = function patchedLookup(hostname: string, options: any, callback?: any) {
    if (hostname === "iris-api-sandbox.circle.com") {
      const addresses = ips.map((address) => ({ address, family: address.includes(":") ? 6 : 4 }));
      if (typeof options === "function") return options(null, addresses[0].address, addresses[0].family);
      if (options?.all) return callback(null, addresses);
      return callback(null, addresses[0].address, addresses[0].family);
    }
    return originalLookup(hostname as any, options as any, callback as any);
  };
}

type WormholeNetwork = "Mainnet" | "Testnet" | "mainnet" | "testnet";
type SdkChainName = string;

const TESTNET_CHAIN_ALIASES: Record<string, string> = {
  Ethereum: "Sepolia",
  EthereumSepolia: "Sepolia",
  Arbitrum: "ArbitrumSepolia",
  Base: "BaseSepolia",
  Optimism: "OptimismSepolia",
  Polygon: "PolygonSepolia",
};

const CHAIN_PLATFORM: Record<string, WalletChain> = {
  Sui: "sui",
  Solana: "solana",
  Sepolia: "evm",
  Ethereum: "evm",
  Arbitrum: "evm",
  ArbitrumSepolia: "evm",
  Avalanche: "evm",
  Base: "evm",
  BaseSepolia: "evm",
  Optimism: "evm",
  OptimismSepolia: "evm",
  Polygon: "evm",
  PolygonSepolia: "evm",
  Bsc: "evm",
};

function normalizeSdkChain(chain: string, network: WormholeSdkNetwork): SdkChainName {
  const cleaned = chain.trim();
  if (network === "Testnet" && TESTNET_CHAIN_ALIASES[cleaned]) return TESTNET_CHAIN_ALIASES[cleaned];
  return cleaned;
}

function walletChainForSdkChain(chain: string): WalletChain {
  return CHAIN_PLATFORM[chain] || "evm";
}

function envTokenKey(asset: string, network: string, chain: string) {
  return `WORMHOLE_TOKEN_${asset.toUpperCase()}_${network.toUpperCase()}_${chain.toUpperCase()}_ADDRESS`.replace(/[^A-Z0-9_]/g, "_");
}

function getConfiguredToken(asset: string, network: string, chain: string) {
  return process.env[envTokenKey(asset, network, chain)];
}

function isNativeAsset(asset: string) {
  return ["native", "gas", "eth", "sui", "sol", "avax", "matic", "bnb"].includes(asset.toLowerCase());
}

function assertAddressMatches(expected: string, actual: string, chain: WalletChain) {
  if (chain === "evm") {
    if (expected.toLowerCase() !== actual.toLowerCase()) {
      throw new Error("Wormhole signer address does not match the source agent wallet.");
    }
    return;
  }
  if (expected !== actual) {
    throw new Error("Wormhole signer address does not match the source agent wallet.");
  }
}

function findTxHash(value: unknown): string | null {
  return collectTxHashes(value)[0] || null;
}

function collectTxHashes(value: unknown): string[] {
  const hashes: string[] = [];
  const visit = (item: unknown) => {
    if (!item) return;
    if (typeof item === "string") {
      if (/^(0x)?[a-fA-F0-9]{32,}$/.test(item) || /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(item)) hashes.push(item);
      return;
    }
    if (Array.isArray(item)) {
      for (const nested of item) visit(nested);
      return;
    }
    if (typeof item === "object") {
      const record = item as Record<string, unknown>;
      for (const key of ["txid", "txId", "txHash", "transactionHash", "digest", "hash"]) {
        visit(record[key]);
      }
    }
  };
  visit(value);
  return [...new Set(hashes)];
}

function getAttestationHash(receipt: any): string | undefined {
  const hash = receipt?.attestation?.id?.hash;
  return typeof hash === "string" ? hash : undefined;
}

const autonomousCctpCompletions = new Set<string>();

function cctpCompletionInstruction(params: {
  sourceTxHash: string;
  destinationChain: string;
  recipientAddress: string;
  network: WormholeSdkNetwork;
}) {
  return `Complete Wormhole CCTP transfer from source burn tx ${params.sourceTxHash} to ${params.destinationChain} recipient ${params.recipientAddress} on ${params.network.toLowerCase()}.`;
}

function scheduleAutonomousCctpCompletion(params: {
  userId: string;
  sourceChain: string;
  destinationChain: string;
  sourceTxHash: string;
  recipientAddress: string;
  network: WormholeSdkNetwork;
  attempt?: number;
}) {
  if (process.env.WORMHOLE_CCTP_AUTONOMOUS_COMPLETION === "false") return false;
  const key = `${params.network}:${params.sourceChain}:${params.destinationChain}:${params.sourceTxHash}`;
  const attempt = params.attempt || 1;
  if (autonomousCctpCompletions.has(key) && attempt === 1) return true;
  autonomousCctpCompletions.add(key);
  // Circle testnet attestations are frequently not ready for several minutes.
  // Do not start the SDK completion loop immediately after the source burn: it
  // spams `Retrying Circle:GetAttestation .../300` and usually cannot succeed yet.
  const firstDelayMs = Number(process.env.WORMHOLE_CCTP_AUTONOMOUS_COMPLETION_DELAY_MS || "600000");
  const retryDelayMs = Number(process.env.WORMHOLE_CCTP_AUTONOMOUS_RETRY_DELAY_MS || "300000");
  const delayMs = attempt === 1 ? firstDelayMs : retryDelayMs;
  const safeDelayMs = Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : attempt === 1 ? 600000 : 300000;
  const timeoutMs = Number(process.env.WORMHOLE_CCTP_AUTONOMOUS_ATTESTATION_TIMEOUT_MS || "30000");
  const safeTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : 30000;
  const maxAttempts = Number(process.env.WORMHOLE_CCTP_AUTONOMOUS_MAX_ATTEMPTS || "6");
  const safeMaxAttempts = Number.isFinite(maxAttempts) && maxAttempts > 0 ? maxAttempts : 6;
  console.info("[wormhole-cctp] autonomous completion scheduled", {
    sourceTxHash: params.sourceTxHash,
    network: params.network,
    sourceChain: params.sourceChain,
    destinationChain: params.destinationChain,
    delayMs: safeDelayMs,
    attestationTimeoutMs: safeTimeoutMs,
    attempt,
    maxAttempts: safeMaxAttempts,
  });
  setTimeout(() => {
    void completeWormholeSuiCctpFromSourceTx({ ...params, attestationTimeoutMs: safeTimeoutMs })
      .then((result) => {
        console.info("[wormhole-cctp] autonomous completion succeeded", {
          sourceTxHash: params.sourceTxHash,
          destinationTxHash: result.destinationTxHash,
          network: params.network,
          sourceChain: params.sourceChain,
          destinationChain: params.destinationChain,
        });
      })
      .catch((error) => {
        const message = error?.message || String(error);
        console.error("[wormhole-cctp] autonomous completion attempt failed", {
          sourceTxHash: params.sourceTxHash,
          network: params.network,
          sourceChain: params.sourceChain,
          destinationChain: params.destinationChain,
          attempt,
          error: message,
        });
        if (attempt < safeMaxAttempts && /attestation|GetAttestation|timeout|not available|fetch|network|failed/i.test(message)) {
          setTimeout(() => {
            autonomousCctpCompletions.delete(key);
            scheduleAutonomousCctpCompletion({ ...params, attempt: attempt + 1 });
          }, 0).unref?.();
          return;
        }
        autonomousCctpCompletions.delete(key);
      });
  }, safeDelayMs).unref?.();
  return true;
}

async function getSdkSigner(params: {
  userId: string;
  walletChain: WalletChain;
  sdkChain: any;
  sourceWalletAddress: string;
}) {
  const secret = await getAgentPrivateKey(params.userId, params.walletChain);
  if (!secret) {
    throw new Error(`Missing encrypted ${params.walletChain} agent private key for Wormhole signing.`);
  }
  const rpc = await params.sdkChain.getRpc();
  let signer: any;
  if (params.walletChain === "evm") {
    signer = await getEvmSignerForKey(rpc, secret);
  } else if (params.walletChain === "sui") {
    const [, chain] = await SuiPlatform.chainFromRpc(rpc);
    signer = new (SuiSigner as any)(chain as any, rpc, Ed25519Keypair.fromSecretKey(secret as any));
  } else if (params.walletChain === "solana") {
    signer = await getSolanaSigner(rpc, secret);
  } else {
    throw new Error(`Unsupported Wormhole source wallet chain: ${params.walletChain}`);
  }
  assertAddressMatches(params.sourceWalletAddress, signer.address(), params.walletChain);
  return signer;
}

function routeFactoriesForQuote(quote: WormholeSuiBridgeQuote) {
  if (quote.routeKind === "cctp") {
    return [routes.AutomaticCCTPRoute, routes.CCTPRoute].filter(Boolean);
  }
  if (quote.routeKind === "wtt") {
    return [routes.AutomaticTokenBridgeRoute, routes.ExecutorTokenBridgeRoute, routes.TokenBridgeRoute].filter(Boolean);
  }
  return [
    routes.AutomaticCCTPRoute,
    routes.CCTPRoute,
    routes.AutomaticTokenBridgeRoute,
    routes.ExecutorTokenBridgeRoute,
    routes.TokenBridgeRoute,
  ].filter(Boolean);
}

export async function submitWormholeSuiSdkTransfer(
  request: WormholeSubmitTransferRequest,
): Promise<WormholeSubmitTransferResult> {
  patchCircleSandboxDnsIfConfigured();
  const network = request.plan.network as WormholeSdkNetwork;
  const sourceChainName = normalizeSdkChain(request.plan.sourceChain, network);
  const destinationChainName = normalizeSdkChain(request.plan.destinationChain, network);
  const walletChain = walletChainForSdkChain(sourceChainName);

  if (walletChain !== request.quote.sourceWalletChain) {
    throw new Error(`Wormhole route source signer mismatch. Expected ${request.quote.sourceWalletChain}, got ${walletChain}.`);
  }

  const wh = new Wormhole(network, [EvmPlatform, SolanaPlatform, SuiPlatform]);
  const sourceChain = wh.getChain(sourceChainName as any);
  const destinationChain = wh.getChain(destinationChainName as any);

  const asset = request.plan.asset.toUpperCase();
  const sourceTokenAddress = asset === "USDC"
    ? circle.usdcContract.get(network, sourceChain.chain as any)
    : getConfiguredToken(asset, network, sourceChainName);
  const sourceToken = sourceTokenAddress
    ? Wormhole.tokenId(sourceChain.chain as any, sourceTokenAddress)
    : isNativeAsset(asset)
      ? Wormhole.tokenId(sourceChain.chain as any, "native")
      : null;
  if (!sourceToken) {
    throw new Error(`Set ${envTokenKey(asset, network, sourceChainName)} for non-native Wormhole asset ${asset}.`);
  }

  const routeFactories = routeFactoriesForQuote(request.quote);
  const resolver = wh.resolver(routeFactories as any);

  let destinationToken: any;
  if (request.quote.routeKind === "cctp") {
    const destinationUsdc = circle.usdcContract.get(network, destinationChain.chain as any);
    if (!destinationUsdc) throw new Error(`USDC is not configured by Wormhole/Circle for ${network} ${destinationChainName}.`);
    destinationToken = Wormhole.tokenId(destinationChain.chain as any, destinationUsdc);
  } else {
    const supported = await resolver.supportedDestinationTokens(sourceToken, sourceChain as any, destinationChain as any);
    destinationToken = supported[0];
    if (!destinationToken) {
      throw new Error(`No Wormhole destination token found for ${asset} ${sourceChainName} -> ${destinationChainName}.`);
    }
  }

  const recipient = Wormhole.chainAddress(destinationChain.chain as any, request.plan.recipientAddress);
  const transferRequest = await routes.RouteTransferRequest.create(wh as any, {
    source: sourceToken,
    destination: destinationToken,
    recipient,
  } as any);

  const foundRoutes = await resolver.findRoutes(transferRequest as any);
  const bestRoute = foundRoutes[0];
  if (!bestRoute) {
    throw new Error(`No Wormhole route found for ${asset} ${sourceChainName} -> ${destinationChainName}.`);
  }

  const nativeGas = Number(request.plan.nativeGasDropoff || "0");
  const validated = await bestRoute.validate(transferRequest as any, {
    amount: request.plan.amount,
    options: { nativeGas: Number.isFinite(nativeGas) ? nativeGas : 0 },
  } as any);
  if (!validated.valid) {
    throw validated.error || new Error("Wormhole route validation failed.");
  }

  const liveQuote = await bestRoute.quote(transferRequest as any, validated.params);
  if (!liveQuote.success) {
    throw liveQuote.error || new Error("Wormhole route quote failed.");
  }

  const signer = await getSdkSigner({
    userId: request.userId,
    walletChain,
    sdkChain: sourceChain,
    sourceWalletAddress: request.sourceWalletAddress,
  });

  const receipt = await bestRoute.initiate(transferRequest as any, signer, liveQuote, recipient);
  const sourceTxHashes = collectTxHashes((receipt as any)?.originTxs || receipt);
  const sourceTxHash = sourceTxHashes[sourceTxHashes.length - 1] || findTxHash(receipt);
  if (!sourceTxHash) {
    throw new Error("Wormhole SDK initiated transfer but did not expose a source tx hash in the receipt.");
  }

  const routeName = (bestRoute.constructor as any)?.meta?.name || bestRoute.constructor?.name || request.quote.routeName;
  const isManualCctp = request.quote.routeKind === "cctp" && /ManualCCTP|CCTPRoute/i.test(String(routeName));
  if (isManualCctp) {
    const completeInline = process.env.WORMHOLE_CCTP_COMPLETE_INLINE === "true";
    if (!completeInline) {
      const autonomousCompletionScheduled = scheduleAutonomousCctpCompletion({
        userId: request.userId,
        sourceChain: sourceChainName,
        destinationChain: destinationChainName,
        sourceTxHash,
        recipientAddress: request.plan.recipientAddress,
        network,
      });
      return {
        txHash: sourceTxHash,
        sourceTxHash,
        sourceTxHashes,
        attestationHash: getAttestationHash(receipt),
        routeState: "SourceInitiated",
        finalized: false,
        requiresCompletion: true,
        autonomousCompletionScheduled,
        completionInstruction: cctpCompletionInstruction({
          sourceTxHash,
          destinationChain: destinationChainName,
          recipientAddress: request.plan.recipientAddress,
          network,
        }),
        provider: `wormhole-sdk:${routeName}:source-burn-pending`,
      };
    }

    const inlineTimeoutMs = Number(process.env.WORMHOLE_CCTP_INLINE_ATTESTATION_TIMEOUT_MS || "90000");
    const timeoutMs = Number.isFinite(inlineTimeoutMs) && inlineTimeoutMs >= 0 ? inlineTimeoutMs : 90000;
    let trackedReceipt: any = receipt;
    try {
      if (typeof (bestRoute as any).track === "function") {
        for await (const update of (bestRoute as any).track(receipt, Number.isFinite(timeoutMs) ? timeoutMs : 600000)) {
          trackedReceipt = update;
          if (trackedReceipt?.attestation?.attestation?.attestation) break;
        }
      }
      if (!trackedReceipt?.attestation?.attestation?.attestation) {
        throw new Error("Circle attestation was not available yet.");
      }
      const destinationWalletChain = walletChainForSdkChain(destinationChainName);
      const destinationSigner = await getSdkSigner({
        userId: request.userId,
        walletChain: destinationWalletChain,
        sdkChain: destinationChain,
        sourceWalletAddress: request.plan.recipientAddress,
      });
      const completedReceipt = await (bestRoute as any).complete(destinationSigner, trackedReceipt);
      const destinationTxHashes = collectTxHashes((completedReceipt as any)?.destinationTxs || completedReceipt);
      const destinationTxHash = destinationTxHashes[destinationTxHashes.length - 1];
      if (!destinationTxHash) {
        throw new Error("Wormhole ManualCCTP completed but did not expose a Sui destination tx digest.");
      }
      return {
        txHash: destinationTxHash,
        sourceTxHash,
        destinationTxHash,
        sourceTxHashes,
        destinationTxHashes,
        attestationHash: getAttestationHash(trackedReceipt),
        routeState: String((completedReceipt as any)?.state ?? "DestinationFinalized"),
        finalized: true,
        requiresCompletion: false,
        provider: `wormhole-sdk:${routeName}`,
      };
    } catch (error: any) {
      const attestationHash = getAttestationHash(trackedReceipt) || getAttestationHash(receipt);
      const message = error?.message || String(error);
      if (/attestation|timeout|GetAttestation|not available/i.test(message)) {
        return {
          txHash: sourceTxHash,
          sourceTxHash,
          sourceTxHashes,
          attestationHash,
          routeState: "SourceInitiated",
          finalized: false,
          requiresCompletion: true,
          autonomousCompletionScheduled: false,
          completionInstruction: cctpCompletionInstruction({
            sourceTxHash,
            destinationChain: destinationChainName,
            recipientAddress: request.plan.recipientAddress,
            network,
          }),
          provider: `wormhole-sdk:${routeName}:source-burn-pending`,
        };
      }
      throw new Error(
        `Wormhole ManualCCTP source burn submitted but destination completion did not finish. sourceTxHash=${sourceTxHash}${attestationHash ? ` attestationHash=${attestationHash}` : ""}. ${message}`,
      );
    }
  }

  const txHash = sourceTxHash;

  return {
    txHash,
    sourceTxHash,
    sourceTxHashes,
    attestationHash: getAttestationHash(receipt),
    provider: `wormhole-sdk:${routeName}`,
  };
}

export async function completeWormholeSuiCctpFromSourceTx(input: {
  userId: string;
  sourceChain: string;
  destinationChain: string;
  sourceTxHash: string;
  recipientAddress: string;
  network?: WormholeSdkNetwork;
  attestationTimeoutMs?: number;
}) {
  patchCircleSandboxDnsIfConfigured();
  const network: WormholeSdkNetwork = input.network === "Mainnet" ? "Mainnet" : "Testnet";
  const sourceChainName = normalizeSdkChain(input.sourceChain, network);
  const destinationChainName = normalizeSdkChain(input.destinationChain, network);
  if (destinationChainName !== "Sui" && sourceChainName !== "Sui") {
    throw new Error("CCTP recovery is only wired for transfers into or out of Sui.");
  }

  const wh = new Wormhole(network, [EvmPlatform, SolanaPlatform, SuiPlatform]);
  const sourceChain = wh.getChain(sourceChainName as any);
  const destinationChain = wh.getChain(destinationChainName as any);
  const configuredTimeoutMs = input.attestationTimeoutMs ?? Number(process.env.WORMHOLE_CCTP_ATTESTATION_TIMEOUT_MS || "600000");
  const timeoutMs = Number.isFinite(configuredTimeoutMs) ? configuredTimeoutMs : 600000;

  const xfer = await CircleTransfer.from(
    wh as any,
    { chain: sourceChain.chain as any, txid: input.sourceTxHash } as any,
    Math.max(0, timeoutMs),
  );

  const destinationSigner = await getSdkSigner({
    userId: input.userId,
    walletChain: walletChainForSdkChain(destinationChainName),
    sdkChain: destinationChain,
    sourceWalletAddress: input.recipientAddress,
  });
  const completed = await xfer.completeTransfer(destinationSigner as any);
  const destinationTxHashes = collectTxHashes(completed);
  const destinationTxHash = destinationTxHashes[destinationTxHashes.length - 1];
  if (!destinationTxHash) {
    throw new Error("CCTP recovery completed but no destination transaction hash/digest was returned.");
  }
  return {
    success: true,
    txHash: destinationTxHash,
    sourceTxHash: input.sourceTxHash,
    destinationTxHash,
    destinationTxHashes,
    attestationHash: getAttestationHash(xfer),
    provider: "wormhole-sdk:ManualCCTP:recovery",
    network,
    sourceChain: sourceChain.chain,
    destinationChain: destinationChain.chain,
  };
}
