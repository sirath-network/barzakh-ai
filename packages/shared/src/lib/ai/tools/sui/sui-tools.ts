/**
 * Sui + Agentic Web Tools
 *
 * Initial Sui Overflow 2026 integration for Barzakh AI.
 * These tools intentionally avoid private-key transaction execution. They provide
 * safe, public-read Sui RPC access plus an MCP/agentic ecosystem directory that
 * the assistant can use when answering hackathon/product questions.
 *
 * Public RPC: https://fullnode.{mainnet,testnet,devnet}.sui.io:443
 */

import { tool } from "ai";
import { z } from "zod";
import dotenv from "dotenv";

type SuiNetwork = "mainnet" | "testnet" | "devnet";

const SUI_RPC_ENDPOINTS: Record<SuiNetwork, string> = {
  mainnet: "https://sui-rpc.publicnode.com",
  testnet: "https://fullnode.testnet.sui.io:443",
  devnet: "https://fullnode.devnet.sui.io:443",
};

const SUI_EXPLORER_NETWORK: Record<SuiNetwork, string> = {
  mainnet: "mainnet",
  testnet: "testnet",
  devnet: "devnet",
};

const MIST_PER_SUI = 1_000_000_000n;

const SUISCAN_NETWORK: Record<SuiNetwork, string> = {
  mainnet: "mainnet",
  testnet: "testnet",
  devnet: "devnet",
};

type CoinBalance = {
  coinType: string;
  coinObjectCount: number;
  totalBalance: string;
  lockedBalance?: Record<string, string>;
};

function getRpcUrl(network: SuiNetwork) {
  return SUI_RPC_ENDPOINTS[network] ?? SUI_RPC_ENDPOINTS.mainnet;
}

function formatDecimalUnits(amount: string | number | bigint, decimals: number, suffix = "") {
  let raw = BigInt(String(amount || "0"));
  const isNegative = raw < 0n;
  if (isNegative) {
    raw = -raw;
  }
  const scale = 10n ** BigInt(Math.max(0, decimals));
  const whole = raw / scale;
  const fractional = raw % scale;
  const fractionalText = fractional.toString().padStart(Math.max(0, decimals), "0").replace(/0+$/, "");
  let value = fractionalText ? `${whole}.${fractionalText}` : `${whole}`;
  if (isNegative) {
    value = `-${value}`;
  }
  return suffix ? `${value} ${suffix}` : value;
}

function formatMist(mist: string | number | bigint) {
  return formatDecimalUnits(mist, 9, "SUI");
}

function shortAddress(address: string) {
  return address.length > 18 ? `${address.slice(0, 10)}…${address.slice(-8)}` : address;
}

type SuiPortfolioBalance = CoinBalance & {
  symbol: string;
  name: string;
  decimals: number;
  formattedBalance: string;
  displayBalance: string;
  coinUrl: string;
  spamScore: number;
  spamReasons: string[];
  isLikelySpam: boolean;
};

function addThousandsSeparators(value: string) {
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

function formatDisplayBalance(amount: string | number | bigint, decimals: number, symbol: string) {
  const formatted = formatDecimalUnits(amount, decimals);
  return `${addThousandsSeparators(formatted)} ${symbol}`;
}

const TRUSTED_SUI_COIN_TYPES = new Set([
  "0x2::sui::SUI",
  "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  "0xd1b72982e40348d069bb1ff701e634c117bb5f741f44dff91e472d3b01461e55::stsui::STSUI",
  "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP",
  "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL",
  "0xe1b45a0e641b9955a20aa0ad1c1f4ad86aad8afb07296d4085e349a50e90bdca::blue::BLUE",
]);

const SUSPICIOUS_TOKEN_TEXT_PATTERNS = [
  /https?:\/\//i,
  /www\./i,
  /\.(com|net|org|xyz|io|top|vip|app|claim|airdrop)(\b|\/)/i,
  /\bvisit\b/i,
  /\bclaim\b/i,
  /\bairdrop\b/i,
  /\breward\b/i,
  /\bbonus\b/i,
  /\bvoucher\b/i,
  /\bfree\b/i,
  /\bnft\s*received\b/i,
  /\bconnect\s*wallet\b/i,
];

function classifySuiPortfolioCoin(input: {
  coinType: string;
  symbol: string;
  name: string;
  totalBalance: string;
  coinObjectCount: number;
}): { spamScore: number; spamReasons: string[]; isLikelySpam: boolean } {
  const reasons: string[] = [];
  const text = `${input.symbol} ${input.name}`.trim();
  const normalizedSymbol = input.symbol.trim().toUpperCase();

  if (TRUSTED_SUI_COIN_TYPES.has(input.coinType)) {
    return { spamScore: 0, spamReasons: [], isLikelySpam: false };
  }

  for (const pattern of SUSPICIOUS_TOKEN_TEXT_PATTERNS) {
    if (pattern.test(text)) reasons.push("promotional URL/claim language");
  }

  if (normalizedSymbol.includes(".") && /\.(COM|NET|ORG|XYZ|IO|TOP|VIP|APP)/.test(normalizedSymbol)) {
    reasons.push("symbol is a domain name");
  }

  if (/::my_coin::MY_COIN$/i.test(input.coinType) && reasons.length > 0) {
    reasons.push("generic MY_COIN package paired with promotional metadata");
  }

  if (/\bNFT\b/i.test(text) && /\b(RECEIVED|CLAIM|AIRDROP)\b/i.test(text)) {
    reasons.push("NFT bait metadata");
  }

  const uniqueReasons = Array.from(new Set(reasons));
  const spamScore = uniqueReasons.length;
  return {
    spamScore,
    spamReasons: uniqueReasons,
    isLikelySpam: spamScore >= 1,
  };
}

function sortPortfolioBalances(a: SuiPortfolioBalance, b: SuiPortfolioBalance) {
  const priority = (coin: SuiPortfolioBalance) => {
    if (coin.coinType === "0x2::sui::SUI") return 1_000_000;
    if (coin.symbol.toUpperCase() === "USDC") return 900_000;
    if (coin.symbol.toUpperCase() === "STSUI" || coin.symbol.toUpperCase() === "STSUI") return 850_000;
    if (TRUSTED_SUI_COIN_TYPES.has(coin.coinType)) return 800_000;
    return 0;
  };
  const priorityDelta = priority(b) - priority(a);
  if (priorityDelta !== 0) return priorityDelta;
  return Number(BigInt(b.totalBalance || "0") - BigInt(a.totalBalance || "0"));
}

function suiScanUrl(kind: "address" | "object" | "tx" | "checkpoint" | "coin", id: string, network: SuiNetwork) {
  const net = SUISCAN_NETWORK[network];
  // SuiScan's coin route expects the canonical Move coin type with raw `::` separators.
  // Percent-encoding the colons makes the SPA parse the coin as undefined.
  if (kind === "coin") return `https://suiscan.xyz/${net}/coin/${id}`;

  const encoded = encodeURIComponent(id);
  if (kind === "tx") return `https://suiscan.xyz/${net}/tx/${encoded}`;
  if (kind === "checkpoint") return `https://suiscan.xyz/${net}/checkpoint/${encoded}`;
  return `https://suiscan.xyz/${net}/${kind}/${encoded}`;
}

function explorerUrl(kind: "address" | "object" | "tx" | "checkpoint", id: string, network: SuiNetwork) {
  const networkParam = SUI_EXPLORER_NETWORK[network];
  if (kind === "tx") return `https://suiexplorer.com/txblock/${id}?network=${networkParam}`;
  if (kind === "checkpoint") return `https://suiexplorer.com/checkpoint/${id}?network=${networkParam}`;
  return `https://suiexplorer.com/${kind}/${id}?network=${networkParam}`;
}

async function suiRpc<T>(network: SuiNetwork, method: string, params: unknown[] = []): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(getRpcUrl(network), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Sui RPC ${method} failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }

    return data.result as T;
  } finally {
    clearTimeout(timeoutId);
  }
}


function suiOwnerAddress(owner: any): string | undefined {
  if (!owner) return undefined;
  if (typeof owner === "string") return owner;
  if (typeof owner.AddressOwner === "string") return owner.AddressOwner;
  if (typeof owner.ObjectOwner === "string") return owner.ObjectOwner;
  return undefined;
}

type SuiWhaleScanOptions = {
  network: SuiNetwork;
  minSui: number;
  checkpoints: number;
  maxTransactions: number;
};

async function collectSuiWhaleActivity({ network, minSui, checkpoints, maxTransactions }: SuiWhaleScanOptions) {
  const latest = Number(await suiRpc<string>(network, "sui_getLatestCheckpointSequenceNumber"));
  const checkpointObjects = await Promise.all(
    Array.from({ length: checkpoints }, (_, index) => latest - index).map((seq) =>
      suiRpc<any>(network, "sui_getCheckpoint", [String(seq)])
    )
  );
  const digests = checkpointObjects.flatMap((checkpoint) => checkpoint.transactions || []).slice(0, maxTransactions);
  const txs = await Promise.all(
    digests.map((digest) =>
      suiRpc<any>(network, "sui_getTransactionBlock", [digest, {
        showEffects: true,
        showBalanceChanges: true,
        showInput: true,
      }]).catch((error) => ({ digest, error: error.message }))
    )
  );
  const thresholdMist = BigInt(Math.floor(minSui * 1_000_000_000));
  const whaleMoves = txs.flatMap((tx: any) => {
    if (tx.error) return [];
    return (tx.balanceChanges || [])
      .filter((change: any) => change.coinType === "0x2::sui::SUI")
      .map((change: any) => {
        const ownerAddress = suiOwnerAddress(change.owner);
        return {
          digest: tx.digest,
          owner: change.owner,
          ownerAddress,
          ownerUrl: ownerAddress ? suiScanUrl("address", ownerAddress, network) : undefined,
          arkhamAddressUrl: ownerAddress ? `https://intel.arkm.com/explorer/address/${ownerAddress}` : undefined,
          amountMist: change.amount,
          amountSui: formatMist(change.amount).replace(" SUI", ""),
          direction: BigInt(change.amount || "0") >= 0n ? "inflow" : "outflow",
          timestampMs: tx.timestampMs,
          status: tx.effects?.status,
          url: suiScanUrl("tx", tx.digest, network),
        };
      })
      .filter((move: any) => {
        const amount = BigInt(move.amountMist || "0");
        return (amount >= 0n ? amount : -amount) >= thresholdMist;
      });
  });

  whaleMoves.sort((a: any, b: any) => {
    const absA = BigInt(a.amountMist || "0");
    const absB = BigInt(b.amountMist || "0");
    const normA = absA >= 0n ? absA : -absA;
    const normB = absB >= 0n ? absB : -absB;
    return normA > normB ? -1 : normA < normB ? 1 : 0;
  });

  const ownerAddresses = Array.from(new Set(whaleMoves.map((move: any) => move.ownerAddress).filter(Boolean))).slice(0, 10);
  const candidateHolders = await Promise.all(
    ownerAddresses.map(async (address) => {
      try {
        const balance = await suiRpc<any>(network, "suix_getBalance", [address, "0x2::sui::SUI"]);
        return {
          address,
          shortAddress: shortAddress(address),
          currentSuiBalance: formatDisplayBalance(balance.totalBalance || "0", 9, "SUI"),
          currentSuiBalanceMist: balance.totalBalance || "0",
          coinObjectCount: balance.coinObjectCount,
          suiScanUrl: suiScanUrl("address", address, network),
          arkhamAddressUrl: `https://intel.arkm.com/explorer/address/${address}`,
        };
      } catch (error: any) {
        return {
          address,
          shortAddress: shortAddress(address),
          error: error.message || "Unable to fetch current SUI balance",
          suiScanUrl: suiScanUrl("address", address, network),
          arkhamAddressUrl: `https://intel.arkm.com/explorer/address/${address}`,
        };
      }
    })
  );

  candidateHolders.sort((a: any, b: any) => {
    const left = BigInt(a.currentSuiBalanceMist || "0");
    const right = BigInt(b.currentSuiBalanceMist || "0");
    return right > left ? 1 : right < left ? -1 : 0;
  });

  return {
    network,
    latestCheckpoint: String(latest),
    scannedCheckpoints: checkpointObjects.map((checkpoint) => ({
      sequenceNumber: checkpoint.sequenceNumber,
      transactions: checkpoint.transactions?.length || 0,
      url: suiScanUrl("checkpoint", checkpoint.sequenceNumber, network),
    })),
    inspectedTransactions: digests.length,
    minSui,
    whaleMoves: whaleMoves.slice(0, 25),
    candidateLargeSuiHolders: candidateHolders,
    dataMethod: "Live Sui RPC checkpoint sampling plus current suix_getBalance lookups for addresses observed in large SUI balance changes.",
    caveat: "This is a direct live sample for chat/alerts, not a complete global holder leaderboard. For production, persist checkpoint cursors and enrich with Arkham labels/API where available.",
  };
}

const networkParam = z.enum(["mainnet", "testnet", "devnet"]).optional().default("mainnet");

export const getSuiNetworkStatus = tool({
  description:
    "Get live Sui network status: latest checkpoint, reference gas price, protocol version, and chain identifier. Use this for Sui liveness or gas questions.",
  parameters: z.object({
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
  }),
  execute: async ({ network }) => {
    try {
      const [chainIdentifier, latestCheckpoint, referenceGasPrice, protocolConfig] = await Promise.all([
        suiRpc<string>(network, "sui_getChainIdentifier"),
        suiRpc<any>(network, "sui_getLatestCheckpointSequenceNumber"),
        suiRpc<string>(network, "suix_getReferenceGasPrice"),
        suiRpc<any>(network, "sui_getProtocolConfig"),
      ]);

      return {
        network,
        chainIdentifier,
        latestCheckpoint: String(latestCheckpoint),
        latestCheckpointUrl: explorerUrl("checkpoint", String(latestCheckpoint), network),
        referenceGasPriceMist: referenceGasPrice,
        referenceGasPriceSui: formatMist(referenceGasPrice),
        protocolVersion: protocolConfig?.protocolVersion,
        rpcUrl: getRpcUrl(network),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        message: "Failed to fetch Sui network status.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const getSuiBalance = tool({
  description:
    "Get a Sui address native SUI balance and coin object count. Address must be a 0x Sui address. Returns MIST and human-readable SUI.",
  parameters: z.object({
    address: z.string().describe("Sui address, e.g. 0x..."),
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
  }),
  execute: async ({ address, network }) => {
    try {
      const [balance, coins] = await Promise.all([
        suiRpc<any>(network, "suix_getBalance", [address, "0x2::sui::SUI"]),
        suiRpc<any>(network, "suix_getCoins", [address, "0x2::sui::SUI", null, 50]),
      ]);

      return {
        network,
        address,
        balanceMist: balance.totalBalance,
        balanceSui: formatMist(balance.totalBalance),
        coinObjectCount: coins?.data?.length ?? 0,
        hasNextPage: Boolean(coins?.hasNextPage),
        explorerUrl: explorerUrl("address", address, network),
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        address,
        message: "Failed to fetch Sui balance.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const getSuiPortfolio = tool({
  description:
    "Track a Sui wallet portfolio using live Sui RPC with built-in spam/scam filtering: trusted balances, metadata, coin object counts, locked balances, filtered airdrop bait tokens, and SuiScan links. Use for Sui portfolio, holdings, assets, treasury, or wallet overview questions.",
  parameters: z.object({
    address: z.string().describe("Sui address, e.g. 0x..."),
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
    includeRecentActivity: z.boolean().optional().default(true).describe("Include a small recent transaction sample for context."),
  }),
  execute: async ({ address, network, includeRecentActivity }) => {
    try {
      const balances = await suiRpc<CoinBalance[]>(network, "suix_getAllBalances", [address]);
      const enrichedBalances = await Promise.all(
        balances.map(async (balance): Promise<SuiPortfolioBalance> => {
          const metadata = await suiRpc<any>(network, "suix_getCoinMetadata", [balance.coinType]).catch(() => null);
          const symbol = metadata?.symbol || balance.coinType.split("::").pop() || "UNKNOWN";
          const decimals = Number.isFinite(Number(metadata?.decimals)) ? Number(metadata.decimals) : 0;
          const spamClassification = classifySuiPortfolioCoin({
            coinType: balance.coinType,
            symbol,
            name: metadata?.name || symbol,
            totalBalance: balance.totalBalance,
            coinObjectCount: balance.coinObjectCount,
          });
          return {
            coinType: balance.coinType,
            symbol,
            name: metadata?.name || symbol,
            decimals,
            totalBalance: balance.totalBalance,
            formattedBalance: formatDecimalUnits(balance.totalBalance, decimals, symbol),
            displayBalance: formatDisplayBalance(balance.totalBalance, decimals, symbol),
            coinObjectCount: balance.coinObjectCount,
            lockedBalance: balance.lockedBalance || {},
            coinUrl: suiScanUrl("coin", balance.coinType, network),
            ...spamClassification,
          };
        })
      );

      const cleanBalances = enrichedBalances
        .filter((coin) => !coin.isLikelySpam)
        .sort(sortPortfolioBalances);
      const filteredSpamBalances = enrichedBalances
        .filter((coin) => coin.isLikelySpam)
        .sort((a, b) => b.spamScore - a.spamScore || a.symbol.localeCompare(b.symbol));

      const recentActivity = includeRecentActivity
        ? await suiRpc<any>(network, "suix_queryTransactionBlocks", [
            { filter: { FromAddress: address } },
            { showInput: true, showEffects: true, showBalanceChanges: true },
            null,
            5,
            true,
          ]).catch(() => null)
        : null;

      return {
        network,
        address,
        addressShort: shortAddress(address),
        totalCoinTypes: cleanBalances.length,
        rawCoinTypes: enrichedBalances.length,
        filteredSpamCount: filteredSpamBalances.length,
        balances: cleanBalances,
        trustedBalances: cleanBalances,
        filteredSpamBalances: filteredSpamBalances.map((coin) => ({
          coinType: coin.coinType,
          symbol: coin.symbol,
          name: coin.name,
          displayBalance: coin.displayBalance,
          spamReasons: coin.spamReasons,
          coinUrl: coin.coinUrl,
        })),
        spamFilterPolicy: {
          enabled: true,
          summary: "Likely scam/airdrop bait tokens are excluded from main holdings and returned separately for safety.",
          rules: ["domain-like symbols", "claim/airdrop/reward/visit language", "NFT received bait", "generic MY_COIN metadata with promotional text"],
        },
        responseGuidance: {
          style: "Professional portfolio brief: concise headline verdict, primary holdings, smaller legitimate assets, risk notes, safety note, suggested next actions.",
          useBalancesForHoldings: "Use balances/trustedBalances only for holdings and allocation commentary.",
          spamHandling: "Mention filteredSpamCount briefly; do not list filteredSpamBalances unless the user asks or safety context requires it.",
        },
        suiBalance: cleanBalances.find((coin) => coin.coinType === "0x2::sui::SUI")?.displayBalance || "0 SUI",
        recentActivity: recentActivity?.data?.map((tx: any) => ({
          digest: tx.digest,
          status: tx.effects?.status,
          timestampMs: tx.timestampMs,
          balanceChanges: tx.balanceChanges || [],
          url: suiScanUrl("tx", tx.digest, network),
        })) || [],
        explorerUrl: suiScanUrl("address", address, network),
        dataSources: ["Sui JSON-RPC suix_getAllBalances", "Sui coin metadata", "SuiScan block explorer links"],
        agenticUse: "Portfolio tracker input for Barzakh Agentic Web: treasury monitoring, risk summaries, bridge/trade readiness, and Walrus-certified snapshots.",
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        address,
        message: "Failed to fetch Sui portfolio.",
        error: error.message || "Unknown error",
      };
    }
  },
});

/**
 * BlockVision SuiVision Indexing API helper.
 * Docs: https://docs.blockvision.org/reference/retrieve-account-activity
 *
 * GET https://api.blockvision.org/v2/sui/account/activities
 * Auth: x-api-key header
 * Query: address (required), cursor (optional), limit (optional, default 20, max 50)
 */
async function fetchBlockVisionActivity(
  address: string,
  limit: number,
  cursor?: string,
): Promise<{
  data: any[];
  nextPageCursor: string;
}> {
  // Dynamically load the latest .env variables to pick up any changes without a server restart
  try {
    dotenv.config({ path: "/home/kafir/barzakh-ai/apps/frontend/.env", override: true });
  } catch (e) {
    // Ignore config reload failures gracefully
  }

  const apiKey = process.env.BLOCKVISION_API_KEY;
  if (!apiKey) throw new Error("BLOCKVISION_API_KEY not configured");

  const url = new URL("https://api.blockvision.org/v2/sui/account/activities");
  url.searchParams.set("address", address);
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  if (cursor) url.searchParams.set("cursor", cursor);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3_000);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": apiKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`BlockVision API failed with HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.code !== 200) {
      throw new Error(json.message || `BlockVision API error code ${json.code}`);
    }

    return {
      data: json.result?.data || [],
      nextPageCursor: json.result?.nextPageCursor || "",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * JSON-RPC fallback for getSuiAddressActivity (testnet/devnet or missing BlockVision key).
 * Fixed parameter ordering: query object (filter+options) is the first param,
 * followed by cursor, limit, descending_order.
 */
async function fetchRpcActivity(
  address: string,
  network: SuiNetwork,
  limit: number,
): Promise<any[]> {
  const queries = [
    suiRpc<any>(network, "suix_queryTransactionBlocks", [
      {
        filter: { FromAddress: address },
        options: { showInput: true, showEffects: true, showEvents: true, showBalanceChanges: true, showObjectChanges: true },
      },
      null,
      limit,
      true,
    ]).then((data) => ({ direction: "sent" as const, data })),
    suiRpc<any>(network, "suix_queryTransactionBlocks", [
      {
        filter: { ToAddress: address },
        options: { showInput: true, showEffects: true, showEvents: true, showBalanceChanges: true, showObjectChanges: true },
      },
      null,
      limit,
      true,
    ]).then((data) => ({ direction: "received" as const, data })),
  ];

  const results = await Promise.allSettled(queries);
  const transactions = results.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    return (result.value.data?.data || []).map((tx: any) => {
      const programmable = tx.transaction?.data?.transaction?.transactions || [];
      const calls = programmable
        .map((item: any) => item?.MoveCall)
        .filter(Boolean)
        .map((call: any) => `${call.package}::${call.module}::${call.function}`);
      return {
        digest: tx.digest,
        type: "Transaction",
        status: tx.effects?.status?.status || "unknown",
        sender: tx.transaction?.data?.sender || "",
        timestampMs: tx.timestampMs,
        gasFee: (() => {
          if (!tx.effects?.gasUsed) return undefined;
          const cost =
            BigInt(tx.effects.gasUsed.computationCost || "0") +
            BigInt(tx.effects.gasUsed.storageCost || "0") -
            BigInt(tx.effects.gasUsed.storageRebate || "0");
          if (cost > 0n) return `-${formatDecimalUnits(cost, 9)}`;
          if (cost < 0n) return `+${formatDecimalUnits(-cost, 9)}`;
          return "0";
        })(),
        calls,
        coinChanges: (tx.balanceChanges || []).map((bc: any) => ({
          owner: suiOwnerAddress(bc.owner) || "",
          amount: bc.amount,
          coinAddress: bc.coinType,
          symbol: bc.coinType?.split("::")?.pop() || "",
          decimal: bc.coinType === "0x2::sui::SUI" ? 9 : 0,
        })),
        objectChanges: (tx.objectChanges || []).slice(0, 10),
        eventsCount: tx.events?.length || 0,
        url: suiScanUrl("tx", tx.digest, network),
      };
    });
  });

  return Array.from(new Map(transactions.map((tx) => [tx.digest, tx])).values())
    .sort((a: any, b: any) => Number(b.timestampMs || 0) - Number(a.timestampMs || 0))
    .slice(0, limit);
}

let isBlockVisionDisabled = false;

export const getSuiAddressActivity = tool({
  description:
    "Analyze recent Sui wallet or exchange activity with pre-classified transaction types (Send, Swap, Stake, Unstake, Deposit, Withdraw, etc.), coin changes with metadata, NFT activity, protocol identification, and SuiScan links. Powered by BlockVision SuiVision on mainnet; falls back to Sui JSON-RPC on testnet/devnet.",
  parameters: z.object({
    address: z.string().describe("Sui address, e.g. 0x..."),
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
    limit: z.number().int().min(1).max(50).optional().default(20),
    cursor: z.string().optional().describe("Pagination cursor from a previous response's nextPageCursor."),
  }),
  execute: async ({ address, network, limit, cursor }) => {
    try {
      const useBlockVision = network === "mainnet" && Boolean(process.env.BLOCKVISION_API_KEY) && !isBlockVisionDisabled;

      if (useBlockVision) {
        try {
          const result = await fetchBlockVisionActivity(address, limit, cursor);

          // Enrich each transaction with SuiScan link
          const transactions = result.data.map((tx: any) => ({
            ...tx,
            url: suiScanUrl("tx", tx.digest, "mainnet"),
          }));

          return {
            network,
            address,
            source: "blockvision" as const,
            count: transactions.length,
            transactions,
            nextPageCursor: result.nextPageCursor || undefined,
            explorerUrl: suiScanUrl("address", address, network),
            dataSources: ["BlockVision SuiVision Indexing API", "SuiScan block explorer links"],
          };
        } catch (bvError: any) {
          console.warn("BlockVision API failed, falling back to Sui RPC:", bvError.message || bvError);
          if (bvError.message?.includes("403") || bvError.message?.includes("429")) {
            isBlockVisionDisabled = true;
            console.warn("BlockVision API key disabled due to auth/rate limits. Direct RPC fallback will be used.");
          }
        }
      }

      // Fallback: fixed Sui JSON-RPC for testnet/devnet, missing API key, or failed BlockVision call
      const transactions = await fetchRpcActivity(address, network, limit);

      return {
        network,
        address,
        source: "sui-rpc" as const,
        count: transactions.length,
        transactions,
        explorerUrl: suiScanUrl("address", address, network),
        dataSources: ["Sui JSON-RPC suix_queryTransactionBlocks", "SuiScan block explorer links"],
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        address,
        message: "Failed to fetch Sui address activity.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const getSuiObject = tool({
  description:
    "Fetch a Sui object by object ID, including owner, type, content fields, display data, and previous transaction when available.",
  parameters: z.object({
    objectId: z.string().describe("Sui object ID, e.g. 0x..."),
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
  }),
  execute: async ({ objectId, network }) => {
    try {
      const object = await suiRpc<any>(network, "sui_getObject", [objectId, {
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showDisplay: true,
        showContent: true,
        showBcs: false,
        showStorageRebate: true,
      }]);

      return {
        network,
        objectId,
        exists: Boolean(object?.data),
        data: object?.data ?? null,
        explorerUrl: explorerUrl("object", objectId, network),
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        objectId,
        message: "Failed to fetch Sui object.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const getSuiTransaction = tool({
  description:
    "Look up a Sui transaction digest with effects, events, balance changes, object changes, and input summary.",
  parameters: z.object({
    digest: z.string().describe("Sui transaction digest"),
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
  }),
  execute: async ({ digest, network }) => {
    try {
      const tx = await suiRpc<any>(network, "sui_getTransactionBlock", [digest, {
        showInput: true,
        showEffects: true,
        showEvents: true,
        showObjectChanges: true,
        showBalanceChanges: true,
      }]);

      return {
        network,
        digest,
        status: tx?.effects?.status,
        timestampMs: tx?.timestampMs,
        transaction: tx,
        explorerUrl: explorerUrl("tx", digest, network),
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        digest,
        message: "Failed to fetch Sui transaction.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const searchSuiCheckpoints = tool({
  description:
    "Get recent Sui checkpoints for network activity and liveness summaries.",
  parameters: z.object({
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
    limit: z.number().int().min(1).max(20).optional().default(5),
  }),
  execute: async ({ network, limit }) => {
    try {
      const latest = await suiRpc<string>(network, "sui_getLatestCheckpointSequenceNumber");
      const latestNumber = Number(latest);
      const checkpoints = await Promise.all(
        Array.from({ length: limit }, (_, index) => latestNumber - index).map((seq) =>
          suiRpc<any>(network, "sui_getCheckpoint", [String(seq)])
        )
      );

      return {
        network,
        count: checkpoints.length,
        checkpoints: checkpoints.map((checkpoint) => ({
          sequenceNumber: checkpoint.sequenceNumber,
          digest: checkpoint.digest,
          epoch: checkpoint.epoch,
          timestampMs: checkpoint.timestampMs,
          transactions: checkpoint.transactions?.length ?? 0,
          url: explorerUrl("checkpoint", checkpoint.sequenceNumber, network),
        })),
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        message: "Failed to fetch Sui checkpoints.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const trackSuiWhaleActivity = tool({
  description:
    "Track recent large SUI movements by scanning recent checkpoints and transaction balance changes. Use for whale tracking, exchange inflows/outflows, and Agentic Web alert ideas. This is read-only and checkpoint-sampled, not a guaranteed full indexer.",
  parameters: z.object({
    network: networkParam.describe("Sui network to query. Defaults to mainnet."),
    minSui: z.number().min(1).max(10_000_000).optional().default(1_000).describe("Minimum absolute SUI balance change to report. Defaults to 1,000 SUI for useful live samples; raise to 10,000+ for stricter whale alerts."),
    checkpoints: z.number().int().min(1).max(25).optional().default(10).describe("Number of recent checkpoints to scan."),
    maxTransactions: z.number().int().min(5).max(500).optional().default(250).describe("Maximum transaction digests to inspect across checkpoints."),
  }),
  execute: async ({ network, minSui, checkpoints, maxTransactions }) => {
    try {
      const whaleScan = await collectSuiWhaleActivity({ network, minSui, checkpoints, maxTransactions });

      return {
        ...whaleScan,
        agenticUse: "Can power an autonomous whale-alert agent that commits summarized alerts to Walrus/Sui before delivering to chat or Telegram/Discord.",
      };
    } catch (error: any) {
      return {
        success: false,
        network,
        message: "Failed to track Sui whale activity.",
        error: error.message || "Unknown error",
      };
    }
  },
});

export const getSuiExchangeAndEntityIntelligence = tool({
  description:
    "Return direct Sui ecosystem entity intelligence for exchanges, whale/entity tracking, and Arkham/SuiScan drill-down links. For Arkham or whale focus, also returns a live Sui mainnet whale sample and candidate large SUI holders from RPC checkpoint sampling so the assistant can answer in-chat instead of only linking to Arkham.",
  parameters: z.object({
    focus: z.enum(["overview", "exchanges", "arkham", "whales", "agentic-plan"]).optional().default("overview"),
    network: networkParam.describe("Sui network for SuiScan links. Defaults to mainnet."),
  }),
  execute: async ({ focus, network }) => {
    const arkhamSuiEntityUrl = "https://intel.arkm.com/explorer/entity/sui-network";
    const knownVenues = [
      { name: "DeepBook", kind: "native CLOB", use: "Transparent on-chain spot liquidity and market-making substrate for agent strategies.", url: "https://docs.sui.io/onchain-finance/deepbookv3/deepbook" },
      { name: "Cetus", kind: "AMM / CLMM", use: "LP and swap venue to monitor for volume, range, and fee opportunities.", url: "https://www.cetus.zone/" },
      { name: "Aftermath", kind: "aggregator / AMM", use: "Route discovery and execution candidate source after SDK/API review.", url: "https://aftermath.finance/" },
      { name: "Bluefin", kind: "trading venue", use: "Market/perp intelligence and potential agentic trading integration.", url: "https://bluefin.io/" },
      { name: "Navi", kind: "lending", use: "Lending/yield risk monitoring for treasury agents.", url: "https://naviprotocol.io/" },
      { name: "Scallop", kind: "money market", use: "Borrow/lend market intelligence and risk dashboards.", url: "https://scallop.io/" },
    ];

    const hasArkhamKey = Boolean(process.env.ARKHAM_API_KEY);
    let arkhamProbe: any = {
      configured: hasArkhamKey,
      note: hasArkhamKey
        ? "ARKHAM_API_KEY is configured; use Arkham tools for entity/address/transfer intelligence. If Sui API chain coverage is unavailable, fall back to the Sui Network entity page and Sui RPC/SuiScan data."
        : "ARKHAM_API_KEY is not configured in this runtime; Barzakh can still link the Arkham Sui Network entity page and use Sui RPC/SuiScan-style public data.",
    };

    if (hasArkhamKey && focus === "arkham") {
      try {
        const response = await fetch("https://api.arkm.com/intelligence/search?query=sui%20network", {
          headers: { "API-Key": process.env.ARKHAM_API_KEY || "" },
        });
        arkhamProbe = {
          ...arkhamProbe,
          searchStatus: response.status,
          ok: response.ok,
          sample: response.ok ? await response.json() : await response.text(),
        };
      } catch (error: any) {
        arkhamProbe = { ...arkhamProbe, ok: false, error: error.message || "Arkham probe failed" };
      }
    }

    let liveWhaleSample: any = undefined;
    if (focus === "arkham" || focus === "whales") {
      try {
        liveWhaleSample = await collectSuiWhaleActivity({
          network,
          minSui: 1_000,
          checkpoints: 10,
          maxTransactions: 250,
        });
      } catch (error: any) {
        liveWhaleSample = {
          success: false,
          error: error.message || "Unable to collect live Sui whale sample",
        };
      }
    }

    return {
      focus,
      network,
      arkhamSuiEntityUrl,
      suiNetworkExplorerUrl: suiScanUrl("address", "0x2", network),
      knownVenues: focus === "exchanges" ? knownVenues : knownVenues.slice(0, 4),
      suggestedUserCommands: [
        "track this Sui wallet portfolio",
        "show recent activity for this Sui address",
        "scan Sui whales above 10000 SUI",
        "compare Sui exchange venues for an agentic trading strategy",
      ],
      arkhamProbe,
      liveWhaleSample,
      responseGuidance: focus === "arkham" || focus === "whales"
        ? "Answer with the liveWhaleSample.candidateLargeSuiHolders and whaleMoves data first. Do not just send users to Arkham; include SuiScan/Arkham links as supporting drill-down links. State clearly when Arkham API labels are unavailable."
        : "Use resource links as supporting context, but prefer direct Barzakh/Sui data when a user asks to trace or monitor activity.",
      agenticWebFeature: {
        name: "Sui Entity Intelligence Agent",
        thesis: "Combines Sui RPC/SuiScan-style live state with Arkham entity context so Barzakh can track portfolios, exchange flows, whale moves, and risk/opportunity alerts from chat.",
        nextSteps: [
          "Persist monitored addresses/entities with checkpoint cursors.",
          "Summarize large flows and portfolio deltas.",
          "Commit alert payload hashes or snapshots to Walrus/Sui before delivery.",
          "Add Telegram/Discord delivery after proof creation.",
        ],
      },
    };
  },
});

export const getSuiNativeBridgeInfo = tool({
  description:
    "Return legacy Sui Native Bridge facts plus Barzakh's current pivot guidance. Use only to explain native bridge behavior/risks; for new bridge plans prefer Wormhole CCTP/WTT/Connect.",
  parameters: z.object({
    direction: z.enum(["ethereum-to-sui", "sui-to-ethereum", "both"]).optional().default("both"),
    intent: z.enum(["overview", "agent-plan", "addresses", "safety"]).optional().default("overview"),
  }),
  execute: async ({ direction, intent }) => {
    return {
      direction,
      intent,
      docs: [
        {
          name: "Sui Bridging overview",
          url: "https://docs.sui.io/onchain-finance/fungible-tokens/sui-bridging#sui-bridge",
          use: "Supported assets, package IDs, Ethereum contract addresses, limits, and user-facing bridge behavior.",
        },
        {
          name: "Sui Native Bridge Primer for Agents",
          url: "https://github.com/MystenLabs/sui/blob/main/bridge/SUI_NATIVE_BRIDGE_PRIMER.md",
          use: "LLM-friendly map of EVM contracts, Move package, Rust bridge node, and Ethereum -> Sui flow.",
        },
        {
          name: "Bridge node configuration",
          url: "https://github.com/MystenLabs/sui/blob/main/docs/content/operators/bridge-node-configuration.mdx",
          use: "Bridge validator/node operation; not required for ordinary Barzakh user bridge UX.",
        },
      ],
      ethereumToSuiFlow: [
        "User/agent calls SuiBridge.bridgeETH or SuiBridge.bridgeERC20 on Ethereum; funds are locked in the EVM vault.",
        "Bridge node EthSyncer observes logs and BridgeOrchestrator routes bridge actions.",
        "BridgeAuthorityAggregator collects validator signatures.",
        "Sui side calls bridge::approve_token_transfer to insert a BridgeRecord.",
        "Sui side calls bridge::claim_token to mint/claim the bridged asset to the Sui recipient.",
      ],
      suiToEthereumFlow: [
        "Sui Move bridge package locks/burns the Sui-side asset and emits bridge events.",
        "Bridge nodes observe Sui events, aggregate signatures, and submit to EVM SuiBridge for release.",
      ],
      barzakhAgentPlan: [
        "Pivot default bridge planning to Wormhole: CCTP for native USDC where Sui route support exists, WTT/TokenBridge or Wormhole Connect for broad asset movement.",
        "Keep Sui Native Bridge as historical/reference knowledge only until the verified-before-claim loop is diagnosed and bounded by state checks.",
        "Use Wormholescan/Executor status APIs for tracking and recovery instructions by source transaction hash.",
        "Add reviewed SDK/Connect execution only after package dependencies, route validation, and signer safety gates are tested.",
      ],
      safety: [
        "Do not run a bridge validator node inside Barzakh for the MVP; use Wormhole SDK/Connect routes and public Wormholescan/Executor APIs for the pivot.",
        "Do not loop Sui Native Bridge approve/claim calls after a verified-before-claim state is observed; surface recovery/status instead.",
        "Autonomous Wormhole execution must check route support, destination asset semantics, amount, recipient address, source/destination chain IDs, and gas funding before signing.",
        "Mainnet bridge writes should require explicit env opt-in and per-user automation enablement, same as Sui transfers.",
      ],
    };
  },
});

export const getSuiDefiEcosystem = tool({
  description:
    "Return a Sui DeFi/agentic ecosystem map for hackathon strategy: DeepBook, Cetus, Bluefin, Navi, Suilend, Aftermath, Scallop, FlowX, Turbos, Walrus, Seal, Kiosk, SuiNS, and bridge opportunities.",
  parameters: z.object({
    focus: z.enum(["all", "trading", "lp", "lending", "bridge", "data", "agentic-stack"]).optional().default("all"),
  }),
  execute: async ({ focus }) => {
    const protocols = [
      { name: "DeepBook", category: "trading", role: "Native Sui central limit order book / liquidity layer; ideal for transparent agent trade routing and market making demos.", agentUse: "Read pools, quote/orderbook data, then add allowlisted place/cancel order tools after balance-manager support is wired." },
      { name: "Sui Native Bridge", category: "bridge", role: "Official Ethereum <-> Sui bridge for ETH/ERC20 flows.", agentUse: "Bridge-aware treasury agent: initiate on EVM, monitor bridge records, claim on Sui when safe." },
      { name: "Cetus", category: "lp", role: "Concentrated liquidity AMM on Sui.", agentUse: "LP strategist: monitor pool APR/volume/ranges; execute only after protocol SDK/policy allowlist." },
      { name: "Bluefin", category: "trading", role: "Sui trading venue/perps ecosystem.", agentUse: "Market/risk agent; potential MCP/execution via ecosystem integrations when access is available." },
      { name: "Navi", category: "lending", role: "Sui lending/liquidity protocol.", agentUse: "Treasury yield/risk monitor; autonomous deposits require strict caps and health-factor checks." },
      { name: "Suilend", category: "lending", role: "Lending and borrowing on Sui.", agentUse: "Risk-aware lending agent for idle SUI/stablecoins after health-factor tooling exists." },
      { name: "Aftermath", category: "trading", role: "Aggregator/AMM/staking ecosystem on Sui.", agentUse: "Route discovery/quote comparison; execution only via reviewed SDK/API." },
      { name: "Scallop", category: "lending", role: "Money market on Sui.", agentUse: "Yield monitor and lending strategist." },
      { name: "FlowX", category: "trading", role: "DEX/aggregator tooling on Sui.", agentUse: "Alternative route source for swap planning." },
      { name: "Turbos", category: "lp", role: "AMM/liquidity protocol on Sui.", agentUse: "LP opportunity monitoring and range/fee analysis." },
      { name: "Walrus", category: "data", role: "Decentralized storage for verifiable agent traces/memory.", agentUse: "Store certified plans, execution receipts, research caches, and risk attestations." },
      { name: "Seal", category: "data", role: "Decentralized secrets/access-control layer in the Sui ecosystem.", agentUse: "Protect private agent memory or premium strategy data." },
    ];

    const filtered = focus === "all" || focus === "agentic-stack"
      ? protocols
      : protocols.filter((p) => p.category === focus);

    return {
      focus,
      protocols: filtered,
      winningHackathonAngle: "Barzakh becomes an autonomous Sui treasury/DeFi copilot: embedded Sui wallet + read tools + bridge/DeepBook/Cetus/Navi intelligence + Walrus-certified memory + Move policy budgets.",
      safeExecutionLadder: [
        "Read-only intelligence and opportunity ranking.",
        "Dry-run PTB builders and explicit risk reports.",
        "Testnet native SUI transfers and allowlisted Move calls.",
        "Mainnet execution only behind env opt-in, per-user automation, spend caps, and audit logging.",
      ],
    };
  },
});

export const getSuiMcpEcosystem = tool({
  description:
    "Return known Sui/Walrus MCP and Agentic Web integration options for hackathon planning. Use before answering questions about Sui MCP servers, WaterX, Beep, or Barzakh's Sui Overflow direction.",
  parameters: z.object({
    focus: z.enum(["all", "mcp", "walrus", "agentic", "barzakh-plan"]).optional().default("all"),
  }),
  execute: async ({ focus }) => {
    const sources = [
      {
        name: "Sui Kapa MCP endpoint",
        kind: "remote MCP knowledge server",
        url: "https://sui.mcp.kapa.ai",
        status: "known public endpoint; requires MCP streamable HTTP client rather than browser GET",
        useForBarzakh: "Use as a Sui docs/knowledge source from an agent runtime; not exposed directly to end users yet.",
      },
      {
        name: "WaterX MCP server",
        kind: "Sui ecosystem MCP server",
        url: "https://blog.sui.io/moonshots-recipient-waterx-debuts-ai-native-trading/",
        status: "Sui ecosystem source says WaterX includes native MCP for market data and perpetual DEX trade execution.",
        useForBarzakh: "Potential future execution backend for agentic trading demos once WaterX access/docs are available.",
      },
      {
        name: "Beep a402 / agentic finance",
        kind: "agent-compatible finance protocol",
        url: "https://blog.sui.io/beep-agentic-economy-launch/",
        status: "Sui ecosystem source says Beep exposes a402 compatible with MCP, A2A, and AP2.",
        useForBarzakh: "Potential agent wallet/payment rail; investigate beta access at justbeep.it.",
      },
      {
        name: "@mysten-incubation/memwal-mcp",
        kind: "Walrus Memory MCP",
        url: "https://www.npmjs.com/package/@mysten-incubation/memwal-mcp",
        status: "npm package found: Walrus Memory MCP stdio server with browser wallet login on first run.",
        useForBarzakh: "Good match for long-lived verifiable chat/agent memory stored on Walrus.",
      },
      {
        name: "Community Sui MCP packages",
        kind: "community MCP servers",
        url: "https://www.npmjs.com/search?q=sui%20mcp",
        status: "npm search found @soli0222/sui-mcp, @expertvagabond/sui-mcp-server, @jasonruan/sui-mcp, sui-mcp-server, sui-mcp.",
        useForBarzakh: "Evaluate locally before trusting signing paths. Prefer read-only RPC tools in product until wallet/permission model is audited.",
      },
    ];

    const barzakhPlan = {
      recommendedTrack: "Agentic Web / AI on Sui",
      mvp: "Barzakh gains a Sui mode with live chain reads, MCP ecosystem knowledge, and a Sui Overflow-ready path to verifiable Walrus memory + Move-bounded agent actions.",
      currentIntegration: [
        "Read-only Sui RPC tools for network status, balances, objects, transactions, and checkpoints.",
        "MCP ecosystem directory tool so the assistant can discuss Sui MCP options from known sources.",
        "System prompt + Sui search group wiring so users can ask Barzakh direct Sui questions.",
      ],
      nextBuildSteps: [
        "Add Walrus staged write UX for saving signed chat/agent memories as certified blobs.",
        "Add Sui wallet connection with @mysten/dapp-kit or Dynamic Sui support in frontend.",
        "Add Move policy object for bounded agent permissions; default to testnet for demos.",
        "Add optional local MCP adapter/server only after choosing a trusted Sui MCP package or official endpoint transport.",
      ],
    };

    return {
      focus,
      sources: focus === "mcp" ? sources.filter((s) => s.kind.toLowerCase().includes("mcp") || s.name.toLowerCase().includes("mcp")) : sources,
      barzakhPlan,
      safetyNote: "No private-key transaction execution is enabled by these tools. Any future WaterX/Beep/community MCP signing path should be permissioned, testnet-first, and reviewed before production.",
    };
  },
});

export const suiTools = {
  getSuiNetworkStatus,
  getSuiBalance,
  getSuiPortfolio,
  getSuiAddressActivity,
  getSuiObject,
  getSuiTransaction,
  searchSuiCheckpoints,
  trackSuiWhaleActivity,
  getSuiExchangeAndEntityIntelligence,
  getSuiNativeBridgeInfo,
  getSuiDefiEcosystem,
  getSuiMcpEcosystem,
};
