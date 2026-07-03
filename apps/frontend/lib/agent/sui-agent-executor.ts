/**
 * Sui Agent Executor
 *
 * Autonomous Sui execution for Barzakh's embedded agent wallets.
 * This intentionally starts with a narrow allowlist: native SUI transfers only.
 * More complex Move calls / Walrus writes should be routed through explicit,
 * audited policy-object tools rather than arbitrary transaction bytes.
 */

import { SuiJsonRpcClient, getJsonRpcFullnodeUrl, type SuiTransactionBlockResponse } from "@mysten/sui/jsonRpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import {
  getAgentPrivateKey,
  getUserAgentWalletAddress,
  hasDelegation,
  recordAgentTransaction,
} from "@/lib/agent/agent-wallet-store";

type SuiNetwork = "mainnet" | "testnet" | "devnet";

export function getSuiVisionBaseUrl(network?: SuiNetwork): string {
  return network === "testnet" ? "https://testnet.suivision.xyz" : "https://suivision.xyz";
}

export function buildSuiVisionUrl(params: {
  kind: "account" | "object" | "txblock";
  id: string;
  network?: SuiNetwork;
}): string {
  return `${getSuiVisionBaseUrl(params.network)}/${params.kind}/${params.id}`;
}

export interface SuiAgentTransferParams {
  userId: string;
  recipient: string;
  amountSui: string;
  network?: SuiNetwork;
  memo?: string;
}

export interface SuiAgentTransferResult {
  success: boolean;
  digest?: string;
  explorerUrl?: string;
  sender?: string;
  recipient?: string;
  amountSui?: string;
  network?: SuiNetwork;
  effectsStatus?: string;
  error?: string;
}

export function getSuiNetwork(network?: SuiNetwork): SuiNetwork {
  const configured = (process.env.SUI_AGENT_NETWORK || "testnet").toLowerCase();
  const selected = network || (configured as SuiNetwork);
  if (["mainnet", "testnet", "devnet"].includes(selected)) return selected as SuiNetwork;
  return "testnet";
}

export function getSuiClient(network?: SuiNetwork) {
  const selected = getSuiNetwork(network);
  const customRpc = selected === "mainnet"
    ? process.env.SUI_MAINNET_RPC_URL || ""
    : selected === "testnet"
      ? process.env.SUI_TESTNET_RPC_URL || ""
      : process.env.SUI_DEVNET_RPC_URL || getJsonRpcFullnodeUrl("devnet");

  return {
    network: selected,
    client: new SuiJsonRpcClient({
      network: selected,
      url: customRpc,
    }),
  };
}

function suiToMist(amountSui: string): bigint {
  const clean = amountSui.trim();
  if (!/^\d+(\.\d{1,9})?$/.test(clean)) {
    throw new Error("amountSui must be a positive decimal string with up to 9 decimals");
  }

  const [whole, frac = ""] = clean.split(".");
  const mist = BigInt(whole) * 1_000_000_000n + BigInt(`${frac}000000000`.slice(0, 9));
  if (mist <= 0n) throw new Error("amountSui must be greater than zero");
  return mist;
}

function formatMistAsSui(mist: bigint): string {
  const whole = mist / 1_000_000_000n;
  const frac = (mist % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

function isValidSuiAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(address);
}

export async function getSuiKeypair(userId: string): Promise<Ed25519Keypair> {
  const privateKey = await getAgentPrivateKey(userId, "sui");
  if (!privateKey) {
    throw new Error("No Sui embedded agent wallet private key found. Create a Sui agent wallet in Settings → Wallet Settings first.");
  }
  return Ed25519Keypair.fromSecretKey(privateKey);
}

export async function getSuiAgentWalletSnapshot(userId: string, requestedNetwork?: SuiNetwork) {
  const walletAddress = await getUserAgentWalletAddress(userId, "sui");
  const enabled = await hasDelegation(userId, "sui");
  const { client, network } = getSuiClient(requestedNetwork);

  if (!walletAddress) {
    return {
      configured: false,
      enabled: false,
      network,
      message: "No Sui embedded agent wallet exists yet. Create one in Settings → Wallet Settings.",
    };
  }

  const balance = await client.getBalance({ owner: walletAddress, coinType: "0x2::sui::SUI" });
  const mist = BigInt(balance.totalBalance || "0");

  return {
    configured: true,
    enabled,
    network,
    address: walletAddress,
    suiBalance: formatMistAsSui(mist),
    mistBalance: mist.toString(),
    explorerUrl: buildSuiVisionUrl({ kind: "account", id: walletAddress, network }),
  };
}

export async function executeSuiAgentTransfer(params: SuiAgentTransferParams): Promise<SuiAgentTransferResult> {
  const network = getSuiNetwork(params.network);

  try {
    if (network === "mainnet" && process.env.SUI_AGENT_ENABLE_MAINNET_WRITES !== "true") {
      throw new Error("Sui mainnet autonomous writes are disabled. Set SUI_AGENT_ENABLE_MAINNET_WRITES=true only after funding/risk limits are ready.");
    }

    if (!isValidSuiAddress(params.recipient)) {
      throw new Error("recipient must be a normalized 0x-prefixed 64-byte Sui address");
    }

    const enabled = await hasDelegation(params.userId, "sui");
    if (!enabled) {
      throw new Error("Sui agent automation is not enabled. Enable Sui automation in Settings → Wallet Settings first.");
    }

    const sender = await getUserAgentWalletAddress(params.userId, "sui");
    if (!sender) {
      throw new Error("No Sui embedded agent wallet found. Create a Sui wallet in Settings → Wallet Settings first.");
    }

    const amountMist = suiToMist(params.amountSui);
    const { client } = getSuiClient(network);
    const keypair = await getSuiKeypair(params.userId);

    const tx = new Transaction();
    const [coin] = tx.splitCoins(tx.gas, [amountMist]);
    tx.transferObjects([coin], params.recipient);

    const response: SuiTransactionBlockResponse = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      },
    });

    const status = response.effects?.status?.status || "unknown";
    const digest = response.digest;

    await recordAgentTransaction({
      userId: params.userId,
      walletAddress: sender,
      operationType: "sui_transfer",
      amount: params.amountSui,
      signature: digest,
      metadata: {
        chain: "sui",
        network,
        recipient: params.recipient,
        amountMist: amountMist.toString(),
        memo: params.memo || undefined,
        effectsStatus: status,
      },
    });

    return {
      success: status === "success",
      digest,
      explorerUrl: buildSuiVisionUrl({ kind: "txblock", id: digest, network }),
      sender,
      recipient: params.recipient,
      amountSui: params.amountSui,
      network,
      effectsStatus: status,
      error: status === "success" ? undefined : response.effects?.status?.error,
    };
  } catch (error: any) {
    console.error("[SuiAgentExecutor] transfer failed:", error);
    return {
      success: false,
      network,
      recipient: params.recipient,
      amountSui: params.amountSui,
      error: error.message || "Failed to execute Sui transfer",
    };
  }
}
