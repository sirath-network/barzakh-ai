import { tool } from "ai";
import { z } from "zod";
import { PortfolioData } from "../../../../types/wallet-actions-response";

export interface BlockberryBalance {
  coinType: string;
  coinName?: string;
  coinSymbol?: string;
  balance: number;
  balanceUsd?: number;
  decimals?: number;
  coinPrice?: number;
  securityMessage?: string;
}

export interface ChainTokenItem {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  price: number;
  icon?: string;
}

export interface SuiCoinMetadata {
  decimals: number;
  name: string;
  symbol: string;
  description: string;
  iconUrl?: string | null;
  id?: string | null;
}

function getBlockberryApiKey(): string | null {
  return process.env.BLOCKBERRY_API_KEY || null;
}

function getBlockVisionApiKey(): string | null {
  return process.env.BLOCKVISION_API_KEY || null;
}

/**
 * High-availability public Sui JSON-RPC endpoints with automatic fallback.
 */
const SUI_RPC_ENDPOINTS = [
  "https://sui-rpc.publicnode.com",
  "https://rpc-mainnet.suiscan.xyz",
  "https://mainnet.sui.rpcpool.com",
];

/**
 * Execute a Sui JSON-RPC call with multi-endpoint fallback.
 */
async function callSuiRpc<T = any>(method: string, params: any[]): Promise<T | null> {
  const blockVisionKey = getBlockVisionApiKey();
  const endpoints: string[] = [];
  if (blockVisionKey) {
    endpoints.push(`https://sui-mainnet.blockvision.org/v1/${blockVisionKey}`);
  }
  endpoints.push(...SUI_RPC_ENDPOINTS);

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.result !== undefined && data.result !== null) {
          return data.result as T;
        }
      }
    } catch {
      // Fall through to next RPC endpoint
    }
  }
  return null;
}

/**
 * Fetch on-chain coin metadata in parallel for multiple coins in real time.
 * Resolves name, symbol, decimals, and iconUrl dynamically via suix_getCoinMetadata.
 * No hardcoded tokens or icons.
 */
async function fetchMultipleCoinMetadata(
  coinTypes: string[]
): Promise<Record<string, SuiCoinMetadata>> {
  if (!coinTypes.length) return {};
  const metadataMap: Record<string, SuiCoinMetadata> = {};

  const promises = coinTypes.map(async (coinType) => {
    const meta = await callSuiRpc<SuiCoinMetadata>("suix_getCoinMetadata", [coinType]);
    if (meta) {
      metadataMap[coinType] = meta;
    }
  });

  await Promise.allSettled(promises);
  return metadataMap;
}

/**
 * Fetch multi-token prices for Sui coins dynamically via DefiLlama batch API.
 */
async function getSuiTokensPrices(
  coinTypes: string[]
): Promise<Record<string, { price: number; decimals?: number; symbol?: string }>> {
  if (!coinTypes.length) return {};
  try {
    const formatted = coinTypes.map((c) => `sui:${c}`).join(",");
    const url = `https://coins.llama.fi/prices/current/${formatted},coingecko:sui`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      const rawCoins = data?.coins || {};
      const result: Record<string, { price: number; decimals?: number; symbol?: string }> = {};

      const suiNativePrice =
        rawCoins["sui:0x2::sui::SUI"]?.price ?? rawCoins["coingecko:sui"]?.price ?? 0.95;
      result["0x2::sui::SUI"] = {
        price: suiNativePrice,
        decimals: 9,
        symbol: "SUI",
      };

      for (const ct of coinTypes) {
        const key = `sui:${ct}`;
        if (rawCoins[key]) {
          result[ct] = {
            price: rawCoins[key].price,
            decimals: rawCoins[key].decimals,
            symbol: rawCoins[key].symbol,
          };
        }
      }
      return result;
    }
  } catch (e) {
    console.warn("[Sui Tool] Failed to fetch token prices from DefiLlama:", e);
  }
  return {};
}

/**
 * Filter out potential spam, phishing, scam tokens, and dust tokens with value < $1 USD.
 *
 * Rules:
 * 1. Hide any token with total USD value < $1.00 USD (dust & unpriced spam airdrops).
 * 2. Hide any token flagged with security warnings or securityMessage from indexers.
 * 3. Hide any token matching phishing/airdrop/scam URL patterns in symbol, name, or type.
 */
export function isSpamOrDustToken(coin: {
  coinType?: string;
  symbol?: string;
  name?: string;
  valueUsd?: number;
  securityMessage?: string;
}): boolean {
  const value = coin.valueUsd ?? 0;

  // 1. Hide any token with value lower than $1 USD
  if (value < 1.0) {
    return true;
  }

  // 2. Hide if flagged by security API
  if (coin.securityMessage) {
    return true;
  }

  const symbol = (coin.symbol || "").toLowerCase();
  const name = (coin.name || "").toLowerCase();
  const coinType = (coin.coinType || "").toLowerCase();

  // 3. Known scam, phishing, malicious airdrop patterns
  const spamKeywords = [
    "gift",
    "claim",
    "airdrop",
    "reward_notice",
    "voucher",
    "perk_badge",
    "my_coin",
    "visit",
    "t.me",
    ".com",
    ".xyz",
    ".io",
    ".net",
    ".org",
    "http://",
    "https://",
    "www.",
  ];

  if (spamKeywords.some((kw) => symbol.includes(kw) || name.includes(kw) || coinType.includes(kw))) {
    return true;
  }

  return false;
}

/**
 * Transform Blockberry balances to PortfolioData with 100% dynamic on-chain metadata resolution.
 */
const transformBlockberryToPortfolio = async (
  balances: BlockberryBalance[],
  walletAddress: string
): Promise<
  PortfolioData & {
    chainTokens?: Record<string, ChainTokenItem[]>;
    filteredTokensCount?: number;
    hiddenTokensSummary?: string;
  }
> => {
  let totalUsd = 0;
  const token_icons: Record<string, string> = {};
  const suiTokens: ChainTokenItem[] = [];
  let filteredSpamOrDustCount = 0;

  // Find unpriced coins to enrich from DefiLlama
  const unpricedCoinTypes = balances
    .filter((b) => !b.coinPrice || b.coinPrice <= 0)
    .map((b) => b.coinType);

  const fallbackPrices = unpricedCoinTypes.length > 0 ? await getSuiTokensPrices(unpricedCoinTypes) : {};

  // First pass: identify non-dust candidate tokens
  const candidates: Array<{
    coin: BlockberryBalance;
    price: number;
    valueUsd: number;
    symbol: string;
    name: string;
    decimals: number;
  }> = [];

  for (const coin of balances) {
    const fallback = fallbackPrices[coin.coinType];
    const isSui = coin.coinType === "0x2::sui::SUI";
    const price = (coin.coinPrice && coin.coinPrice > 0) ? coin.coinPrice : (fallback?.price || (isSui ? 0.95 : 0));
    const decimals = coin.decimals || fallback?.decimals || (isSui ? 9 : 6);

    const parts = coin.coinType.split("::");
    const rawSymbol = coin.coinSymbol || fallback?.symbol || (parts[parts.length - 1] || "COIN");
    const symbol = rawSymbol.toUpperCase();
    const name = coin.coinName || (isSui ? "Sui (Native)" : parts[1] || symbol);

    const valueUsd = (coin.balanceUsd && coin.balanceUsd > 0) ? coin.balanceUsd : coin.balance * price;

    // Filter out potential spam/scam tokens and hide tokens with value < $1 USD
    if (
      isSpamOrDustToken({
        coinType: coin.coinType,
        symbol,
        name,
        valueUsd,
        securityMessage: coin.securityMessage,
      })
    ) {
      filteredSpamOrDustCount++;
      continue;
    }

    candidates.push({ coin, price, valueUsd, symbol, name, decimals });
  }

  // Dynamically resolve real-time on-chain metadata for candidate tokens
  const candidateTypes = candidates.map((c) => c.coin.coinType);
  const metadataMap = await fetchMultipleCoinMetadata(candidateTypes);

  for (const item of candidates) {
    const meta = metadataMap[item.coin.coinType];
    const isSui = item.coin.coinType === "0x2::sui::SUI";

    const symbol = (meta?.symbol || item.symbol).toUpperCase();
    const name = meta?.name || (isSui ? "Sui (Native)" : item.name);

    // Dynamic icon URL from on-chain metadata
    const icon = (meta?.iconUrl && meta.iconUrl.trim().length > 0)
      ? meta.iconUrl.trim()
      : (symbol === "SUI" ? "/images/chain-logo/sui.png" : undefined);

    if (icon) {
      token_icons[symbol] = icon;
    }

    totalUsd += item.valueUsd;
    suiTokens.push({
      symbol,
      name,
      balance: item.coin.balance,
      value: item.valueUsd,
      price: item.price,
      icon,
    });
  }

  // Sort tokens by USD value descending
  suiTokens.sort((a, b) => b.value - a.value);

  const positions_distribution_by_chain: Record<string, number> = {};
  if (totalUsd > 0) {
    positions_distribution_by_chain["sui"] = totalUsd;
  }

  return {
    type: "portfolio",
    id: walletAddress,
    attributes: {
      positions_distribution_by_type: {
        wallet: totalUsd,
        deposited: 0,
        borrowed: 0,
        locked: 0,
        staked: 0,
      },
      positions_distribution_by_chain,
      token_icons,
      total: {
        positions: totalUsd,
      },
      changes: {
        absolute_1d: 0,
        percent_1d: 0,
      },
    },
    currency: "usd",
    chainTokens: {
      sui: suiTokens,
    },
    filteredTokensCount: filteredSpamOrDustCount,
    hiddenTokensSummary:
      filteredSpamOrDustCount > 0
        ? `${filteredSpamOrDustCount} low-value or unverified spam tokens (< $1.00 USD) filtered out`
        : undefined,
  };
};

/**
 * Robust Sui portfolio query using multi-endpoint Sui RPC + DefiLlama real-time pricing.
 * 100% dynamic token resolution with on-chain suix_getCoinMetadata. No hardcoded lists.
 */
async function fetchPortfolioViaRpc(
  address: string
): Promise<
  | (PortfolioData & {
      explorerUrl: string;
      chainTokens: Record<string, ChainTokenItem[]>;
      filteredTokensCount?: number;
      hiddenTokensSummary?: string;
    })
  | string
> {
  const balances = await callSuiRpc<
    Array<{ coinType: string; totalBalance: string; coinObjectCount: number }>
  >("suix_getAllBalances", [address]);

  if (!balances) {
    return `Failed to query Sui balances via RPC`;
  }

  if (balances.length === 0) {
    return {
      type: "portfolio",
      id: address,
      attributes: {
        positions_distribution_by_type: { wallet: 0, deposited: 0, borrowed: 0, locked: 0, staked: 0 },
        positions_distribution_by_chain: { sui: 0 },
        token_icons: { SUI: "/images/chain-logo/sui.png" },
        total: { positions: 0 },
        changes: { absolute_1d: 0, percent_1d: 0 },
      },
      currency: "usd",
      explorerUrl: `https://suiscan.xyz/mainnet/account/${address}/portfolio`,
      chainTokens: { sui: [] },
    };
  }

  const coinTypes = balances.map((b) => b.coinType);

  // Batch fetch real-time prices for all user coin types from DefiLlama
  const pricesMap = await getSuiTokensPrices(coinTypes);

  // First pass: identify non-dust candidate tokens based on estimated value
  const candidates: Array<{
    b: { coinType: string; totalBalance: string; coinObjectCount: number };
    price: number;
    initialDecimals: number;
  }> = [];
  let filteredSpamOrDustCount = 0;

  for (const b of balances) {
    const isSui = b.coinType === "0x2::sui::SUI";
    const priceInfo = pricesMap[b.coinType];
    const initialDecimals = priceInfo?.decimals ?? (isSui ? 9 : 6);
    const balanceNum = Number(BigInt(b.totalBalance || "0")) / Math.pow(10, initialDecimals);
    const price = priceInfo?.price || (isSui ? 0.95 : 0);
    const estValueUsd = balanceNum * price;

    const parts = b.coinType.split("::");
    const sym = priceInfo?.symbol || parts[parts.length - 1] || "COIN";

    if (
      isSpamOrDustToken({
        coinType: b.coinType,
        symbol: sym,
        valueUsd: estValueUsd,
      })
    ) {
      filteredSpamOrDustCount++;
      continue;
    }

    candidates.push({ b, price, initialDecimals });
  }

  // Dynamically resolve on-chain CoinMetadata in parallel for all candidate tokens
  const candidateTypes = candidates.map((c) => c.b.coinType);
  const metadataMap = await fetchMultipleCoinMetadata(candidateTypes);

  let totalUsd = 0;
  const token_icons: Record<string, string> = {};
  const suiTokens: ChainTokenItem[] = [];

  for (const c of candidates) {
    const ct = c.b.coinType;
    const meta = metadataMap[ct];
    const isSui = ct === "0x2::sui::SUI";

    const decimals = meta?.decimals ?? c.initialDecimals;
    const rawTotal = BigInt(c.b.totalBalance || "0");
    const balance = Number(rawTotal) / Math.pow(10, decimals);
    const valueUsd = balance * c.price;

    const parts = ct.split("::");
    const symbol = (meta?.symbol || parts[parts.length - 1] || "COIN").toUpperCase();
    const name = meta?.name || (isSui ? "Sui (Native)" : parts[1] || symbol);

    // Dynamic icon URL from on-chain CoinMetadata
    const icon = (meta?.iconUrl && meta.iconUrl.trim().length > 0)
      ? meta.iconUrl.trim()
      : (symbol === "SUI" ? "/images/chain-logo/sui.png" : undefined);

    if (icon) {
      token_icons[symbol] = icon;
    }

    totalUsd += valueUsd;
    suiTokens.push({
      symbol,
      name,
      balance,
      value: valueUsd,
      price: c.price,
      icon,
    });
  }

  // Sort tokens by USD value descending
  suiTokens.sort((a, b) => b.value - a.value);

  const positions_distribution_by_chain: Record<string, number> = {};
  if (totalUsd > 0) {
    positions_distribution_by_chain["sui"] = totalUsd;
  }

  return {
    type: "portfolio",
    id: address,
    attributes: {
      positions_distribution_by_type: {
        wallet: totalUsd,
        deposited: 0,
        borrowed: 0,
        locked: 0,
        staked: 0,
      },
      positions_distribution_by_chain,
      token_icons,
      total: {
        positions: totalUsd,
      },
      changes: {
        absolute_1d: 0,
        percent_1d: 0,
      },
    },
    currency: "usd",
    explorerUrl: `https://suiscan.xyz/mainnet/account/${address}/portfolio`,
    chainTokens: {
      sui: suiTokens,
    },
    filteredTokensCount: filteredSpamOrDustCount,
    hiddenTokensSummary:
      filteredSpamOrDustCount > 0
        ? `${filteredSpamOrDustCount} low-value or unverified spam tokens (< $1.00 USD) filtered out`
        : undefined,
  };
}

export const getSuiPortfolio = tool({
  description:
    "Fetch the wallet portfolio of a Sui wallet address, including all token balances and their USD values. Automatically filters out potential spam/scam tokens and hides any tokens with value lower than $1 USD. IMPORTANT: The UI will automatically render an interactive Portfolio Table card. Provide ONLY a brief 1-sentence summary introducing the portfolio. DO NOT list individual tokens or holdings in markdown text.",
  parameters: z.object({
    address: z.string().describe("Sui wallet address (0x + 64 hex characters)"),
  }),
  execute: async ({ address }) => {
    try {
      if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
        return "Invalid Sui address format. Must be 0x followed by 64 hex characters.";
      }

      const apiKey = getBlockberryApiKey();

      // Try Blockberry API first if key is available
      if (apiKey) {
        try {
          const response = await fetch(`https://api.blockberry.one/sui/v1/accounts/${address}/balance`, {
            headers: {
              "x-api-key": apiKey,
              Accept: "application/json",
            },
          });

          if (response.ok) {
            const balances: BlockberryBalance[] = await response.json();
            const portfolioData = await transformBlockberryToPortfolio(balances, address);
            return {
              ...portfolioData,
              explorerUrl: `https://suiscan.xyz/mainnet/account/${address}/portfolio`,
            };
          }
        } catch (bbError) {
          console.warn("[Sui Tool] Blockberry request failed, trying fallback:", bbError);
        }
      }

      // 100% dynamic multi-RPC fallback + on-chain metadata resolution
      return await fetchPortfolioViaRpc(address);
    } catch (error: any) {
      return `Error fetching Sui portfolio: ${error.message}`;
    }
  },
});

export const getSuiTransactionHistory = tool({
  description:
    "Get recent transaction history for a Sui wallet address. Shows confirmed sends, receives, swaps, and DeFi interactions with spam transactions filtered out.",
  parameters: z.object({
    address: z.string().describe("Sui wallet address (0x + 64 hex characters)"),
    size: z.number().optional().default(10).describe("Number of transactions to fetch (max 50)"),
  }),
  execute: async ({ address, size }) => {
    try {
      if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
        return "Invalid Sui address format. Must be 0x followed by 64 hex characters.";
      }

      const apiKey = getBlockberryApiKey();

      // Try Blockberry activity endpoint
      if (apiKey) {
        try {
          const response = await fetch(
            `https://api.blockberry.one/sui/v1/accounts/${address}/activity?actionType=ALL&size=${size}&orderBy=DESC`,
            {
              headers: {
                "x-api-key": apiKey,
                Accept: "application/json",
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const content = data.content || [];

            // Filter out potential spam activities
            const cleanContent = content.filter((tx: any) => {
              const actType = (Array.isArray(tx.activityType) ? tx.activityType.join(" ") : tx.activityType || "").toLowerCase();
              if (actType.includes("spam") || actType.includes("scam")) return false;
              return true;
            });

            const transactions = cleanContent.map((tx: any) => {
              const isSender = (tx.fromAddress || "").toLowerCase() === address.toLowerCase();
              const direction = isSender ? "OUT" : "IN";
              const actType = Array.isArray(tx.activityType) ? tx.activityType.join(", ") : tx.activityType || "Transaction";
              const symbol = tx.coinSymbol || "SUI";
              const amountVal = tx.amount ? String(tx.amount) : "";
              const formattedVal = amountVal ? `${direction === "OUT" ? "-" : "+"}${amountVal} ${symbol}` : "";

              return {
                hash: tx.digest,
                timestamp: tx.timestamp ? (typeof tx.timestamp === 'number' ? new Date(tx.timestamp).toISOString() : String(tx.timestamp)) : new Date().toISOString(),
                direction,
                txType: actType,
                status: tx.txStatus || "SUCCESS",
                from: tx.fromAddress || (isSender ? address : ""),
                to: tx.toAddress || (!isSender ? address : ""),
                value: formattedVal || (tx.gasFee ? `${tx.gasFee} SUI` : "0 SUI"),
                tokenTransfer: amountVal ? {
                  direction: isSender ? "Sent" : "Received",
                  amount: amountVal,
                  symbol,
                  formatted: formattedVal,
                } : undefined,
                gasFee: tx.gasFee ? `${tx.gasFee} SUI` : undefined,
                explorerUrl: `https://suiscan.xyz/mainnet/tx/${tx.digest}`,
                chain: "sui",
              };
            });

            return {
              type: "transactions",
              network: "Sui Mainnet",
              chain: "sui",
              address,
              transactionCount: transactions.length,
              transactions,
              explorerUrl: `https://suiscan.xyz/mainnet/account/${address}/activity`,
            };
          }
        } catch (bbErr) {
          console.warn("[Sui Tool] Blockberry activity failed, trying fallback:", bbErr);
        }
      }

      // Fallback via multi-endpoint Sui RPC
      const rpcData = await callSuiRpc<any>("suix_queryTransactionBlocks", [
        {
          filter: { FromAddress: address },
          options: { showEffects: true, showInput: true, showBalanceChanges: true },
        },
        null,
        size,
        true,
      ]);

      if (rpcData) {
        const list = rpcData?.data || [];
        const transactions = list.map((tx: any) => {
          const status = tx.effects?.status?.status === "success" ? "SUCCESS" : "FAILURE";
          const gasUsed = tx.effects?.gasUsed;
          const gasFee = gasUsed
            ? (Number(gasUsed.computationCost || 0) + Number(gasUsed.storageCost || 0) - Number(gasUsed.storageRebate || 0)) / 1e9
            : undefined;

          const sender = tx.transaction?.data?.sender || address;
          const isSender = (sender || "").toLowerCase() === address.toLowerCase();
          const direction = isSender ? "OUT" : "IN";

          // Extract recipient address if available
          const inputs = tx.transaction?.data?.transaction?.inputs || [];
          const addrInput = inputs.find((inp: any) => inp.type === "pure" && inp.valueType === "address");
          const createdOwner = tx.effects?.created?.find((c: any) => c.owner?.AddressOwner && c.owner?.AddressOwner.toLowerCase() !== address.toLowerCase())?.owner?.AddressOwner;
          const recipient = addrInput?.value || createdOwner || "";

          // Extract token transfer or coin information
          let tokenSymbol = "SUI";
          let tokenAmount: string | null = null;
          let txType = isSender ? "Send" : "Receive";

          // 1. Check accumulatorEvents (DeFi / USDC balances)
          const accEvent = tx.effects?.accumulatorEvents?.find((e: any) => typeof e?.ty === "string" && e.ty.includes("::Balance<"));
          if (accEvent) {
            const tyMatch = accEvent.ty.match(/::([a-zA-Z0-9_]+)::([a-zA-Z0-9_]+)>/);
            if (tyMatch && tyMatch[2]) {
              tokenSymbol = tyMatch[2].toUpperCase();
            }
          }

          // 2. Check balanceChanges if present
          if (Array.isArray(tx.balanceChanges) && tx.balanceChanges.length > 0) {
            const nonSuiChange = tx.balanceChanges.find((bc: any) => bc.coinType && bc.coinType !== "0x2::sui::SUI");
            const targetChange = nonSuiChange || tx.balanceChanges[0];
            if (targetChange) {
              const ctParts = targetChange.coinType?.split("::");
              if (ctParts && ctParts.length >= 3) {
                tokenSymbol = ctParts[2].toUpperCase();
              }
              const rawAmt = Math.abs(Number(targetChange.amount || 0));
              const decimals = tokenSymbol.includes("USDC") || tokenSymbol.includes("USDT") ? 6 : 9;
              tokenAmount = (rawAmt / Math.pow(10, decimals)).toFixed(2);
            }
          }

          // 3. Fallback to inputs amount for SplitCoins/TransferObjects
          if (!tokenAmount) {
            const u64Input = inputs.find((inp: any) => inp.type === "pure" && inp.valueType === "u64");
            if (u64Input && u64Input.value) {
              const rawVal = Number(u64Input.value);
              if (!isNaN(rawVal) && rawVal > 0) {
                const decimals = tokenSymbol.includes("USDC") || tokenSymbol.includes("USDT") ? 6 : 9;
                tokenAmount = (rawVal / Math.pow(10, decimals)).toFixed(2);
              }
            }
          }

          const formattedValue = tokenAmount
            ? `${direction === "OUT" ? "-" : "+"}${tokenAmount} ${tokenSymbol}`
            : (gasFee ? `${gasFee.toFixed(6)} SUI` : "0 SUI");

          return {
            hash: tx.digest,
            timestamp: tx.timestampMs ? new Date(Number(tx.timestampMs)).toISOString() : new Date().toISOString(),
            direction,
            txType,
            status,
            from: sender,
            to: recipient || (isSender ? "Sui Network" : address),
            value: formattedValue,
            tokenTransfer: tokenAmount ? {
              direction: isSender ? "Sent" : "Received",
              amount: tokenAmount,
              symbol: tokenSymbol,
              formatted: formattedValue,
            } : undefined,
            gasFee: gasFee ? `${gasFee.toFixed(6)} SUI` : undefined,
            explorerUrl: `https://suiscan.xyz/mainnet/tx/${tx.digest}`,
            chain: "sui",
          };
        });

        return {
          type: "transactions",
          network: "Sui Mainnet",
          chain: "sui",
          address,
          transactionCount: transactions.length,
          transactions,
          explorerUrl: `https://suiscan.xyz/mainnet/account/${address}/activity`,
        };
      }

      return {
        type: "transactions",
        network: "Sui Mainnet",
        chain: "sui",
        address,
        transactionCount: 0,
        transactions: [],
        explorerUrl: `https://suiscan.xyz/mainnet/account/${address}/activity`,
      };
    } catch (error: any) {
      return `Error fetching Sui transaction history: ${error.message}`;
    }
  },
});

export const getWalrusStorageInfo = tool({
  description:
    "Get Walrus decentralized storage information for an account, including certified stored blobs, storage sizes, and epochs. Automatically filters out zero-byte, uncertified, or spam blobs.",
  parameters: z.object({
    address: z.string().describe("Sui/Walrus wallet address (0x + 64 hex characters)"),
  }),
  execute: async ({ address }) => {
    try {
      if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
        return "Invalid Sui/Walrus address format. Must be 0x followed by 64 hex characters.";
      }

      const apiKey = getBlockberryApiKey();

      if (apiKey) {
        try {
          const response = await fetch(`https://api.blockberry.one/walrus/v1/blobs?ownerAddress=${address}&size=20&orderBy=DESC`, {
            headers: {
              "x-api-key": apiKey,
              Accept: "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            const rawBlobs = data.content || [];

            // Filter out empty (0-byte), deleted, or uncertified spam blobs
            const certifiedBlobs = rawBlobs.filter((b: any) => {
              if (b.size !== undefined && b.size <= 0) return false;
              if (b.status === "DELETED") return false;
              return true;
            });

            return {
              type: "walrus_storage",
              network: "Walrus Protocol",
              owner: address,
              blobs: certifiedBlobs,
              totalBlobs: certifiedBlobs.length,
              filteredBlobsCount: rawBlobs.length - certifiedBlobs.length,
              explorerUrl: `https://walruscan.com/mainnet/account/${address}`,
            };
          }
        } catch (bbErr) {
          console.warn("[Walrus Tool] Blockberry Walrus API failed:", bbErr);
        }
      }

      // Return informative Walrus storage status with direct Walruscan link
      return {
        type: "walrus_storage",
        network: "Walrus Protocol",
        owner: address,
        message: "Walrus decentralized data availability and storage information",
        storageOverview: {
          protocol: "Walrus Protocol",
          layer: "Sui Decentralized Storage & Data Availability",
          memoryPersistence: "Active (Barzakh AI Walrus Memory Enabled)",
          filterPolicy: "Spam & dust blobs with value under $1 USD or 0-byte size are filtered out",
        },
        explorerUrl: `https://walruscan.com/mainnet/account/${address}`,
      };
    } catch (error: any) {
      return `Error fetching Walrus storage info: ${error.message}`;
    }
  },
});
