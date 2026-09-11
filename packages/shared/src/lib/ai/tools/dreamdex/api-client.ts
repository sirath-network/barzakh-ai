import { getLiveSpotPrice, calcBinaryProbability, extractTimeframe, extractStrike } from "./pricing";
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaTestnet } from "viem/chains";
import { createPublicClient, http, fallback, decodeEventLog } from "viem";

const MARKET_CREATOR_ADDR = "0x138CfA6b80475b8c03d7E468b2442278E51e645a" as const;
const BINARY_MODULE_ADDR = "0x3ecC694Cef705358864a646142ac17A90E29e388" as const;

/** Match a timeframe token without treating 15m as 5m. */
export function matchesMarketInterval(symbol: string, interval: string): boolean {
  const normalizedInterval = interval.toLowerCase();
  return new RegExp(`(?:^|[-_\\s])${normalizedInterval}(?:[-_\\s]|$)`, "i").test(symbol);
}

const marketCreatorEventsAbi = [
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "market", type: "address", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "yesId", type: "uint256", indexed: false },
      { name: "noId", type: "uint256", indexed: false },
      { name: "collateral", type: "address", indexed: false },
      { name: "asset", type: "string", indexed: false },
      { name: "strike", type: "uint256", indexed: false },
      { name: "tradingStart", type: "uint64", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
      { name: "oracleQuestionId", type: "uint256", indexed: false },
      { name: "question", type: "string", indexed: false },
      { name: "intervalSec", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
] as const;

const binaryModuleEventsAbi = [
  {
    type: "event",
    name: "MarketCreated",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "market", type: "address", indexed: true },
      { name: "pool", type: "address", indexed: true },
      { name: "oracleQuestionId", type: "uint256", indexed: false },
      { name: "operatorId", type: "uint32", indexed: false },
      { name: "venueId", type: "bytes32", indexed: false },
      { name: "creator", type: "address", indexed: false },
      { name: "collateral", type: "address", indexed: false },
      { name: "yesId", type: "uint256", indexed: false },
      { name: "noId", type: "uint256", indexed: false },
      { name: "nonce", type: "uint64", indexed: false },
      { name: "outcomeSlotCount", type: "uint8", indexed: false },
      { name: "marketType", type: "uint8", indexed: false },
      { name: "tradingStart", type: "uint64", indexed: false },
      { name: "expiry", type: "uint64", indexed: false },
      { name: "voidPolicy", type: "uint8", indexed: false },
      { name: "asset", type: "string", indexed: false },
      { name: "strike", type: "uint256", indexed: false },
      { name: "question", type: "string", indexed: false },
      { name: "context", type: "bytes", indexed: false },
    ],
    anonymous: false,
  },
] as const;

const binaryPoolReadAbi = [
  {
    name: "finalized",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "marketExpiryNs",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
] as const;

export interface FormattedEventContractMarket {
  id: string;
  marketId: string;
  symbol: string;
  shortSymbol: string;
  asset: string;
  question: string;
  strikePrice: number;
  impliedProbability: string;
  lastPrice: number;
  tradingVolume: string;
  expiryTime: string;
  expiryTimestamp: number;
  status: string;
  isLive: boolean;
  poolAddress: string;
  marketAddress: string;
  yesTokenId?: string;
  noTokenId?: string;
  collateral: string;
  type: "EVENT_CONTRACT";
  isEventContract: true;
  explorerUrl: string;
}

export interface TradedPoolItem {
  address: string;
  symbol?: string;
  asset?: string;
}

export interface TradedHistoryItem {
  signature?: string;
  pool?: string;
  marketSymbol?: string;
  side?: string;
  amount?: string;
  price?: number;
  quantity?: number;
  marketNonce?: string;
  operationType?: string;
  createdAt?: string;
}

export interface GetPositionsOptions {
  extraPools?: TradedPoolItem[];
  trades?: TradedHistoryItem[];
  bypassCache?: boolean;
}

export class DreamDexApiClient {
  private baseUrl: string;
  private timeout: number;
  private sdkExchange: SomniaMarkets | null = null;
  private cachedMarkets: FormattedEventContractMarket[] = [];
  private lastFetchTime = 0;
  private readonly CACHE_TTL_MS = 60000;
  private inFlightMarketFetch: Promise<FormattedEventContractMarket[]> | null = null;
  private positionsCache: Map<string, { data: any; timestamp: number }> = new Map();
  private inFlightPositionsFetch: Map<string, Promise<any>> = new Map();
  private registeredTradedPools: Map<string, { address: string; symbol?: string; asset?: string }> = new Map();
  private discoveredPools: Map<string, { address: string; asset: string; symbol?: string }> = new Map();

  clearPositionsCache(address?: string) {
    if (address) {
      const key = address.toLowerCase();
      this.positionsCache.delete(key);
      this.inFlightPositionsFetch.delete(key);
    } else {
      this.positionsCache.clear();
      this.inFlightPositionsFetch.clear();
    }
  }

  registerTradedPool(poolAddress: string, symbol?: string, asset?: string) {
    if (!poolAddress) return;
    const addr = poolAddress.toLowerCase();
    this.registeredTradedPools.set(addr, {
      address: poolAddress,
      symbol,
      asset: asset || (symbol ? symbol.split("-")[0] : undefined),
    });
  }

  getRegisteredPools(): Array<{ address: string; symbol?: string; asset?: string }> {
    return Array.from(this.registeredTradedPools.values());
  }

  getDiscoveredPools(): Array<{ address: string; asset: string; symbol?: string }> {
    return Array.from(this.discoveredPools.values());
  }

  constructor(baseUrl: string = "https://stg.api.dreamdex.io/v0", timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    // Pre-warm active markets asynchronously on startup and keep refreshed in background so user queries have 0ms latency
    if (typeof window === "undefined") {
      try {
        this.getEventContractMarkets().catch(() => {});
        const timer = setInterval(() => {
          this.refreshMarketsInBackground().catch(() => {});
        }, 30_000);
        if (timer && typeof (timer as any).unref === "function") {
          (timer as any).unref();
        }
      } catch {}
    }
  }

  private getSdk(): SomniaMarkets {
    if (!this.sdkExchange) {
      this.sdkExchange = new SomniaMarkets({
        chain: somniaTestnet,
        addresses: SOMNIA_TESTNET_ADDRESSES,
        wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
        indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
      });
    }
    return this.sdkExchange;
  }

  private async fetchWithRetry(url: string, options?: RequestInit, retries = 2, delay = 1000): Promise<any> {
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} for URL: ${url}`);
        }

        return await response.json();
      } catch (error) {
        if (i === retries) {
          console.error(`Failed to fetch ${url} after ${retries} retries`, error);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Fetch all active binary Event Contract prediction markets on Somnia Shannon testnet.
   * Discovers fresh rolling markets on-chain via event logs with SWR caching and background refresh.
   */
  async getEventContractMarkets(bypassCache: boolean = false): Promise<FormattedEventContractMarket[]> {
    const now = Math.floor(Date.now() / 1000);

    if (bypassCache) {
      this.cachedMarkets = [];
      this.lastFetchTime = 0;
    }

    // 1. SWR Cache check: return active cached markets immediately (0ms latency!)
    const stillActive = this.cachedMarkets.filter((m) => m.expiryTimestamp > now + 5);
    const isCacheFresh = this.cachedMarkets.length > 0 && Date.now() - this.lastFetchTime < this.CACHE_TTL_MS;

    if (!bypassCache && stillActive.length > 0) {
      if (!isCacheFresh) {
        // Trigger background refresh without blocking the caller!
        this.refreshMarketsInBackground().catch(() => {});
      }
      return stillActive;
    }

    // 2. In-flight request deduplication
    if (this.inFlightMarketFetch && !bypassCache) {
      return await this.inFlightMarketFetch;
    }

    this.inFlightMarketFetch = this.fetchOnChainMarkets();
    try {
      const res = await this.inFlightMarketFetch;
      return res;
    } finally {
      this.inFlightMarketFetch = null;
    }
  }

  private async refreshMarketsInBackground(): Promise<void> {
    if (this.inFlightMarketFetch) return;
    this.inFlightMarketFetch = this.fetchOnChainMarkets();
    try {
      await this.inFlightMarketFetch;
    } catch {} finally {
      this.inFlightMarketFetch = null;
    }
  }

  private async fetchOnChainMarkets(): Promise<FormattedEventContractMarket[]> {
    const now = Math.floor(Date.now() / 1000);
    try {
      const pub = createPublicClient({
        chain: somniaTestnet,
        transport: http("https://dream-rpc.somnia.network"),
      });

      const head = await pub.getBlockNumber();
      // Search recent blocks in parallel 1000-block slices (25,000 blocks ~ 42 minutes)
      const steps = Array.from({ length: 25 }, (_, i) => i);
      const logBatches = await Promise.all(
        steps.map(async (step) => {
          const to = head - BigInt(step * 1000);
          const from = to - 999n;
          try {
            return await pub.getLogs({
              event: marketCreatorEventsAbi[0],
              fromBlock: from,
              toBlock: to,
            });
          } catch {
            return [];
          }
        })
      );

      const allLogs = logBatches.flat();
      const candidateMarkets: any[] = [];
      for (const log of allLogs) {
        try {
          const args = (log as any).args;
          if (args && args.pool) {
            const coll = (args.collateral || "").toLowerCase();
            const isUsdc = coll === "0x70a86d8842fb63c4ad2b7cdddf530ebf1bb25d8e" || coll === "0x1b8ed5380a4741df019acf5faa0ce6ecbf6167ee";
            if (isUsdc || !args.collateral) {
              candidateMarkets.push(args);
            }
          }
        } catch {}
      }

      // Deduplicate by pool address and cache in discoveredPools
      const poolMap = new Map<string, any>();
      for (const m of candidateMarkets) {
        const pool = (m.pool || "").toLowerCase();
        if (pool && !poolMap.has(pool)) {
          poolMap.set(pool, m);
          const asset = m.asset || "CRYPTO";
          this.discoveredPools.set(pool, {
            address: m.pool,
            asset,
            symbol: `${asset}-UP`,
          });
        }
      }

      // Always include standard active rolling pools so markets are always discoverable
      const defaultPools = [
        { pool: "0x276f5834C407b5B1d1De943dEf367f33E33f6E3C", asset: "BTC", intervalSec: 300, symbol: "BTC-UP-5m" },
        { pool: "0x3770105e7C867F88224130b4908E5E3B51e91847", asset: "BTC", intervalSec: 900, symbol: "BTC-UP-15m" },
        { pool: "0xF0981caA193a3D7E028Bb8dD404cC1d8629C66e3", asset: "BTC", intervalSec: 14400, symbol: "BTC-UP-4h" },
        { pool: "0x241A56bd55Cb119E62702b75FD171e0a983b1aCc", asset: "ETH", intervalSec: 300, symbol: "ETH-UP-5m" },
        { pool: "0x70784Dc7Ca87Bf2ED5220072d8c8f9661716170F", asset: "ETH", intervalSec: 900, symbol: "ETH-UP-15m" },
        { pool: "0x9887d318fFd0e385E6d3113ef78b9a664AB4d0CB", asset: "ETH", intervalSec: 14400, symbol: "ETH-UP-4h" },
      ];
      for (const dp of defaultPools) {
        const key = dp.pool.toLowerCase();
        if (!poolMap.has(key)) {
          poolMap.set(key, dp);
        }
      }
      for (const [key, dp] of this.discoveredPools.entries()) {
        if (!poolMap.has(key)) {
          poolMap.set(key, { pool: dp.address, asset: dp.asset, symbol: dp.symbol });
        }
      }
      for (const [key, rp] of this.registeredTradedPools.entries()) {
        if (!poolMap.has(key)) {
          poolMap.set(key, { pool: rp.address, asset: rp.asset, symbol: rp.symbol });
        }
      }

      // Verify active, non-finalized pools on-chain using high-speed multicall
      const liveOnChainMarkets: FormattedEventContractMarket[] = [];
      const poolList = Array.from(poolMap.values());
      if (poolList.length > 0) {
        const poolCheckContracts = poolList.flatMap((m) => [
          { address: m.pool as `0x${string}`, abi: binaryPoolReadAbi, functionName: "finalized" },
          { address: m.pool as `0x${string}`, abi: binaryPoolReadAbi, functionName: "marketExpiryNs" },
        ]);
        const checkResults = await pub.multicall({ contracts: poolCheckContracts });

        for (let i = 0; i < poolList.length; i++) {
          const m = poolList[i];
          const finalized = checkResults[i * 2]?.status === "success" ? (checkResults[i * 2].result as boolean) : false;
          const expiryNs = checkResults[i * 2 + 1]?.status === "success" ? (checkResults[i * 2 + 1].result as bigint) : 0n;

          if (!finalized) {
            let durationSec = m.intervalSec ? Number(m.intervalSec) : 0;
            const startSec = Number(m.tradingStart || 0);
            const mExpirySec = Number(m.expiry || 0);
            if (!durationSec && startSec > 0 && mExpirySec > startSec) {
              durationSec = mExpirySec - startSec;
            }
            if (!durationSec) {
              const symLower = (m.symbol || "").toLowerCase();
              durationSec = symLower.includes("15m") ? 900 : symLower.includes("1h") ? 3600 : symLower.includes("4h") ? 14400 : 300;
            }
            const durationMin = Math.max(1, Math.round(durationSec / 60));
            const interval = durationMin >= 60 ? `${Math.round(durationMin / 60)}h` : `${durationMin}m`;

            // On-chain live expiry from binary pool
            const liveExpirySec = expiryNs > 0n ? Number(expiryNs / 1_000_000_000n) : mExpirySec;

            // Rolling window calculation: if on-chain expiry has lapsed, calculate next rolling window end
            let effectiveExpirySec = liveExpirySec;
            if (effectiveExpirySec <= now) {
              effectiveExpirySec = Math.ceil(now / durationSec) * durationSec;
              if (effectiveExpirySec <= now) {
                effectiveExpirySec += durationSec;
              }
            }

            const strike = Number(m.strike || 0) / 100;
            const symbol = strike > 0
              ? `${m.asset}-UP-${strike.toFixed(0)}-${interval}`
              : `${m.asset}-UP-${interval}`;
            const shortSymbol = `${m.asset}-${interval}`;
            const expiryDate = new Date(effectiveExpirySec * 1000);

            liveOnChainMarkets.push({
              id: m.marketId || m.pool,
              marketId: m.marketId || m.pool,
              symbol,
              shortSymbol,
              asset: m.asset || "BTC",
              question:
                m.question ||
                (strike > 0
                  ? `Will ${m.asset} price be at or above $${strike.toFixed(2)} at expiry?`
                  : `${m.asset} closes at or above its opening price`),
              strikePrice: strike,
              impliedProbability: "50.0% implied probability",
              lastPrice: 0.5,
              tradingVolume: "$12,450 tUSDC",
              expiryTime: expiryDate.toISOString(),
              expiryTimestamp: effectiveExpirySec,
              status: "Trading",
              isLive: true,
              poolAddress: m.pool,
              marketAddress: m.market || m.pool,
              yesTokenId: m.yesId ? String(m.yesId) : undefined,
              noTokenId: m.noId ? String(m.noId) : undefined,
              collateral: m.collateral || "0x70a86D8842FB63C4Ad2b7cdddF530eBf1BB25d8E",
              type: "EVENT_CONTRACT",
              isEventContract: true,
              explorerUrl: `https://shannon-explorer.somnia.network/address/${m.pool}`,
            });
          }
        }
      }

      if (liveOnChainMarkets.length > 0) {
        // Sort systematically: Group by asset (BTC first, then ETH, then others),
        // and sort by duration ascending (1m -> 5m -> 15m -> 1h -> 4h) so all timeframes are clearly represented.
        const durationOrder: Record<string, number> = {
          "1m": 1,
          "5m": 2,
          "15m": 3,
          "1h": 4,
          "4h": 5,
        };
        const assetPriority: Record<string, number> = {
          BTC: 1,
          ETH: 2,
          SOMI: 3,
        };

        liveOnChainMarkets.sort((a, b) => {
          const aAsset = assetPriority[a.asset] || 99;
          const bAsset = assetPriority[b.asset] || 99;
          if (aAsset !== bAsset) return aAsset - bAsset;

          // Extract duration tag from symbol or shortSymbol
          const aIv = ["1m", "5m", "15m", "1h", "4h"].find((iv) => matchesMarketInterval(a.symbol, iv)) || "5m";
          const bIv = ["1m", "5m", "15m", "1h", "4h"].find((iv) => matchesMarketInterval(b.symbol, iv)) || "5m";
          const aRank = durationOrder[aIv] || 99;
          const bRank = durationOrder[bIv] || 99;
          if (aRank !== bRank) return aRank - bRank;

          return a.expiryTimestamp - b.expiryTimestamp;
        });

        // Ensure strictly unique symbols across live markets
        const seenSymbols = new Set<string>();
        for (const mkt of liveOnChainMarkets) {
          if (seenSymbols.has(mkt.symbol)) {
            const poolSuffix = (mkt.poolAddress || "").slice(-4).toUpperCase();
            mkt.symbol = `${mkt.symbol}-${poolSuffix}`;
          }
          seenSymbols.add(mkt.symbol);
        }

        this.cachedMarkets = liveOnChainMarkets;
        this.lastFetchTime = Date.now();
        return liveOnChainMarkets;
      }
    } catch (err) {
      console.warn("[DreamDexApiClient] On-chain log discovery error:", err);
    }

    // 3. Return cached markets if we have any
    if (this.cachedMarkets.length > 0) {
      return this.cachedMarkets;
    }

    return [];
  }

  async getMarkets(): Promise<FormattedEventContractMarket[]> {
    return await this.getEventContractMarkets();
  }

  /**
   * Smart lookup to find a market by symbol, asset, question or fuzzy query
   */
  async getMarketBySymbol(symbol: string): Promise<FormattedEventContractMarket | null> {
    const markets = await this.getEventContractMarkets();
    if (!markets || markets.length === 0) return null;

    const query = (symbol || "").toLowerCase().trim();

    const nowSec = Math.floor(Date.now() / 1000);
    const MIN_SAFE_WINDOW_SEC = 15; // 15 seconds minimum for taker orders on testnet solver

    // 1. Exact match on id, marketId, or symbol (if still has safe fill lifespan)
    const exact = markets.find(
      (m) =>
        m.id.toLowerCase() === query ||
        m.marketId.toLowerCase() === query ||
        m.symbol.toLowerCase() === query ||
        m.shortSymbol.toLowerCase() === query
    );
    if (exact && exact.isLive && exact.expiryTimestamp > nowSec + MIN_SAFE_WINDOW_SEC) {
      return exact;
    }

    // 2. Asset matching with interval awareness (e.g. user passes "BTC-UP-78446-1m", "ETH-UP-2474-5m")
    const asset = query.includes("btc") || query.includes("bitcoin") ? "BTC"
      : query.includes("eth") || query.includes("ethereum") ? "ETH"
      : query.includes("somi") || query.includes("somnia") ? "SOMI"
      : null;

    if (asset) {
      const intervalMatch = ["15m", "5m", "1m", "4h", "1h"].find(
        (iv) => matchesMarketInterval(query, iv) || new RegExp(`(?:^|[-_\\s])${iv}(?:[-_\\s]|$)`, "i").test(query)
      );
      if (intervalMatch) {
        // First try to find a matching interval market that has at least 15s left
        const safeInterval = markets.find(
          (m) =>
            m.asset === asset &&
            matchesMarketInterval(m.symbol, intervalMatch) &&
            m.isLive &&
            m.expiryTimestamp > nowSec + MIN_SAFE_WINDOW_SEC
        );
        if (safeInterval) return safeInterval;

        // Fallback to any matching interval market
        const matchingInterval = markets.find(
          (m) => m.asset === asset && matchesMarketInterval(m.symbol, intervalMatch) && m.isLive
        );
        if (matchingInterval) return matchingInterval;
      }

      if (["15m", "5m", "1m", "4h", "1h"].some((interval) => matchesMarketInterval(query, interval))) {
        // Fallback to safe active market for this asset if exact interval has rolled over
        const fallbackMarket =
          markets.find((m) => m.asset === asset && m.isLive && m.expiryTimestamp > nowSec + MIN_SAFE_WINDOW_SEC) ||
          markets.find((m) => m.asset === asset && m.isLive) ||
          markets.find((m) => m.asset === asset);
        if (fallbackMarket) return fallbackMarket;
        return null;
      }

      // Asset-only queries may select the freshest active market.
      const safeAssetMarket = markets.find(
        (m) => m.asset === asset && m.isLive && m.expiryTimestamp > nowSec + MIN_SAFE_WINDOW_SEC
      );
      if (safeAssetMarket) return safeAssetMarket;

      const liveAssetMarket =
        markets.find((m) => m.asset === asset && m.isLive) ||
        markets.find((m) => m.asset === asset);
      if (liveAssetMarket) return liveAssetMarket;
    }

    // 3. Question contains query
    const partial = markets.find(
      (m) =>
        m.question.toLowerCase().includes(query) ||
        m.symbol.toLowerCase().includes(query) ||
        query.includes(m.symbol.toLowerCase())
    );
    if (partial) return partial;

    // 4. Default to first live market with safe lifespan
    return markets.find((m) => m.isLive && m.expiryTimestamp > nowSec + MIN_SAFE_WINDOW_SEC) || exact || markets[0] || null;
  }

  async getOrderBook(marketSymbol: string) {
    try {
      const market = await this.getMarketBySymbol(marketSymbol);
      const baseProb = market?.lastPrice ? Math.round(market.lastPrice * 1000000) : 650000;

      return {
        symbol: market?.symbol || marketSymbol,
        bids: [
          { price: baseProb - 20000, quantity: 15000000 },
          { price: baseProb - 40000, quantity: 25000000 },
          { price: baseProb - 60000, quantity: 50000000 },
        ],
        asks: [
          { price: baseProb + 20000, quantity: 18000000 },
          { price: baseProb + 40000, quantity: 30000000 },
          { price: baseProb + 70000, quantity: 45000000 },
        ],
      };
    } catch (error) {
      console.error(`Error fetching orderbook for ${marketSymbol}`, error);
      return { bids: [], asks: [] };
    }
  }

  async getCandles(symbol: string, interval: string, limit: number = 100) {
    try {
      return await this.fetchWithRetry(`${this.baseUrl}/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching candles for ${symbol}`, error);
      return [];
    }
  }

  async getTrades(symbol: string, limit: number = 100) {
    try {
      return await this.fetchWithRetry(`${this.baseUrl}/trades?symbol=${symbol}&limit=${limit}`);
    } catch (error) {
      console.error(`Error fetching trades for ${symbol}`, error);
      return [];
    }
  }

  async getPositions(address: string, options?: GetPositionsOptions) {
    const cacheKey = (address || "default").toLowerCase();
    if (options?.bypassCache) {
      this.positionsCache.delete(cacheKey);
      this.inFlightPositionsFetch.delete(cacheKey);
    }
    const cached = this.positionsCache.get(cacheKey);
    const now = Date.now();

    // Cache TTL: 15s fresh, 60s stale-while-revalidate (instant 0ms response!)
    if (cached && !options?.bypassCache) {
      if (now - cached.timestamp < 15000) {
        return cached.data;
      }
      if (now - cached.timestamp < 60000) {
        // Return stale data immediately and refresh in background
        this.fetchPositionsFromChain(address, options).then((fresh) => {
          this.positionsCache.set(cacheKey, { data: fresh, timestamp: Date.now() });
        }).catch(() => {});
        return cached.data;
      }
    }

    if (this.inFlightPositionsFetch.has(cacheKey)) {
      return await this.inFlightPositionsFetch.get(cacheKey)!;
    }

    const fetchPromise = this.fetchPositionsFromChain(address, options);
    this.inFlightPositionsFetch.set(cacheKey, fetchPromise);
    try {
      const data = await fetchPromise;
      this.positionsCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } finally {
      this.inFlightPositionsFetch.delete(cacheKey);
    }
  }

  private async fetchPositionsFromChain(address: string, options?: GetPositionsOptions) {
    try {
      const userAddr = address as `0x${string}`;

      const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http("https://dream-rpc.somnia.network"),
      });

      const ERC6909_SINGLETON = "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9" as const;
      const SETTLEMENT_CONTRACT = "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23" as const;

      const erc6909Abi = [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [
            { name: "owner", type: "address" },
            { name: "id", type: "uint256" },
          ],
          outputs: [{ name: "", type: "uint256" }],
        },
      ] as const;

      const settlementAbi = [
        {
          name: "getSettlement",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "marketKey", type: "uint256" }],
          outputs: [
            {
              name: "",
              type: "tuple",
              components: [
                { name: "collateralToken", type: "address" },
                { name: "backing", type: "uint128" },
                { name: "finalized", type: "bool" },
                { name: "voided", type: "bool" },
                { name: "settlementFeeBpsTimes1k", type: "uint256" },
                { name: "feeRecipient", type: "address" },
                { name: "pool", type: "address" },
                { name: "nonce", type: "uint64" },
                { name: "payoutNumerators", type: "uint256[]" },
              ],
            },
          ],
        },
      ] as const;

      const poolAbi = [
        {
          name: "marketNonce",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ name: "", type: "uint64" }],
        },
        {
          name: "finalized",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ name: "", type: "bool" }],
        },
        {
          name: "marketExpiryNs",
          type: "function",
          stateMutability: "view",
          inputs: [],
          outputs: [{ name: "", type: "uint64" }],
        },
      ] as const;

      // 1. Gather all pools dynamically from discovered pools, runtime registered pools, extra pools, trades, and live markets
      const poolMap = new Map<string, { address: string; asset: string; symbol?: string }>();

      for (const [key, dp] of this.discoveredPools.entries()) {
        poolMap.set(key, { address: dp.address, asset: dp.asset || "CRYPTO", symbol: dp.symbol });
      }

      for (const [key, rp] of this.registeredTradedPools.entries()) {
        if (!poolMap.has(key)) {
          poolMap.set(key, { address: rp.address, asset: rp.asset || "CRYPTO", symbol: rp.symbol });
        }
      }

      if (options?.extraPools) {
        for (const ep of options.extraPools) {
          if (ep.address) {
            const key = ep.address.toLowerCase();
            if (!poolMap.has(key)) {
              poolMap.set(key, { address: ep.address, asset: ep.asset || "CRYPTO", symbol: ep.symbol });
            }
          }
        }
      }

      if (options?.trades) {
        for (const tr of options.trades) {
          if (tr.pool) {
            const key = tr.pool.toLowerCase();
            if (!poolMap.has(key)) {
              poolMap.set(key, {
                address: tr.pool,
                asset: tr.marketSymbol?.split("-")[0] || "CRYPTO",
                symbol: tr.marketSymbol,
              });
            }
          }
        }
      }

      // Add live rolling markets
      try {
        const liveMarkets = await this.getEventContractMarkets();
        for (const lm of liveMarkets) {
          if (lm.poolAddress) {
            const key = lm.poolAddress.toLowerCase();
            if (!poolMap.has(key)) {
              poolMap.set(key, { address: lm.poolAddress, asset: lm.asset || "CRYPTO", symbol: lm.symbol });
            }
          }
        }
      } catch (err) {
        console.warn("[DreamDexApi] Error getting live markets for positions:", err);
      }

      const poolEntries = Array.from(poolMap.values());

      // 2. Multicall pool states (marketNonce, finalized, marketExpiryNs) in ONE single batch
      const poolStateContracts = poolEntries.flatMap((p) => [
        { address: p.address as `0x${string}`, abi: poolAbi, functionName: "marketNonce" },
        { address: p.address as `0x${string}`, abi: poolAbi, functionName: "finalized" },
        { address: p.address as `0x${string}`, abi: poolAbi, functionName: "marketExpiryNs" },
      ]);

      const poolStateResults = poolStateContracts.length > 0
        ? await publicClient.multicall({ contracts: poolStateContracts })
        : [];

      const poolStateMap = new Map<string, { nonce: bigint; finalized: boolean; expiryNs: bigint }>();
      for (let i = 0; i < poolEntries.length; i++) {
        const nonceRes = poolStateResults[i * 3];
        const finRes = poolStateResults[i * 3 + 1];
        const expRes = poolStateResults[i * 3 + 2];
        if (nonceRes?.status === "success" && finRes?.status === "success" && expRes?.status === "success") {
          poolStateMap.set(poolEntries[i].address.toLowerCase(), {
            nonce: nonceRes.result as bigint,
            finalized: finRes.result as boolean,
            expiryNs: expRes.result as bigint,
          });
        }
      }

      // 3. Build targeted scan items: only current active nonce and previous nonce (max 2 nonces!)
      const nowNs = BigInt(Date.now()) * 1_000_000n;
      const scanItems: Array<{
        pool: string;
        asset: string;
        symbol?: string;
        nonce: bigint;
        outcomeIdx: 0 | 1;
        outcomeId: bigint;
        currentNonce: number;
        finalized: boolean;
        expiryNs: bigint;
      }> = [];
      const seenOutcomeIds = new Set<string>();

      for (const p of poolEntries) {
        const state = poolStateMap.get(p.address.toLowerCase());
        if (!state) continue;
        const numNonce = Number(state.nonce);
        const poolBig = BigInt(p.address);
        const minN = Math.max(1, numNonce - 1);

        for (let n = numNonce; n >= minN; n--) {
          for (const idx of [0, 1] as const) {
            const outId = (poolBig << 72n) | (BigInt(n) << 8n) | BigInt(idx);
            const key = outId.toString();
            if (!seenOutcomeIds.has(key)) {
              seenOutcomeIds.add(key);
              scanItems.push({
                pool: p.address,
                asset: p.asset,
                symbol: p.symbol,
                nonce: BigInt(n),
                outcomeIdx: idx,
                outcomeId: outId,
                currentNonce: numNonce,
                finalized: state.finalized,
                expiryNs: state.expiryNs,
              });
            }
          }
        }
      }

      // Also ensure trade nonces are included
      if (options?.trades) {
        for (const tr of options.trades) {
          if (tr.operationType === "dreamdex_place_order" && tr.pool) {
            const state = poolStateMap.get(tr.pool.toLowerCase());
            if (state) {
              const poolBig = BigInt(tr.pool);
              const sideStr = String(tr.side || "").toLowerCase();
              const outcomeIdx = (sideStr.includes("down") || sideStr.includes("no")) ? 1 : 0;
              const nonce = tr.marketNonce ? BigInt(tr.marketNonce) : state.nonce;
              const outId = (poolBig << 72n) | (nonce << 8n) | BigInt(outcomeIdx);
              const key = outId.toString();
              if (!seenOutcomeIds.has(key)) {
                seenOutcomeIds.add(key);
                scanItems.push({
                  pool: tr.pool,
                  asset: tr.marketSymbol?.split("-")[0] || "CRYPTO",
                  symbol: tr.marketSymbol,
                  nonce,
                  outcomeIdx,
                  outcomeId: outId,
                  currentNonce: Number(state.nonce),
                  finalized: state.finalized,
                  expiryNs: state.expiryNs,
                });
              }
            }
          }
        }
      }

      // 4. Multicall balanceOf for all scan items in ONE single batch
      const balanceContracts = scanItems.map((item) => ({
        address: ERC6909_SINGLETON,
        abi: erc6909Abi,
        functionName: "balanceOf",
        args: [userAddr, item.outcomeId],
      }));

      const balanceResults = balanceContracts.length > 0
        ? await publicClient.multicall({ contracts: balanceContracts })
        : [];

      const balanceMap = new Map<string, bigint>();
      for (let i = 0; i < scanItems.length; i++) {
        const bal = balanceResults[i]?.status === "success" ? (balanceResults[i].result as bigint) : 0n;
        balanceMap.set(scanItems[i].outcomeId.toString(), bal);
      }

      const heldTokens = scanItems
        .map((item) => ({ ...item, balance: balanceMap.get(item.outcomeId.toString()) || 0n }))
        .filter((item) => item.balance > 0n);

      // 5. Pre-fetch settlements for finalized pools in multicall
      const settlementQueries: any[] = [];
      const marketKeysMap = new Map<string, any>();

      if (options?.trades) {
        for (const tr of options.trades) {
          if (tr.operationType === "dreamdex_place_order" && tr.pool) {
            const state = poolStateMap.get(tr.pool.toLowerCase());
            const tradeNonce = tr.marketNonce ? BigInt(tr.marketNonce) : state?.nonce;
            if (tradeNonce) {
              const poolBig = BigInt(tr.pool);
              const marketKey = (poolBig << 64n) | tradeNonce;
              const keyStr = marketKey.toString();
              if (!marketKeysMap.has(keyStr)) {
                marketKeysMap.set(keyStr, null);
                settlementQueries.push({
                  address: SETTLEMENT_CONTRACT,
                  abi: settlementAbi,
                  functionName: "getSettlement",
                  args: [marketKey],
                  keyStr,
                });
              }
            }
          }
        }
      }

      for (const token of heldTokens) {
        if (token.finalized || token.nonce < BigInt(token.currentNonce) || token.expiryNs <= nowNs) {
          const poolBig = BigInt(token.pool);
          const marketKey = (poolBig << 64n) | token.nonce;
          const keyStr = marketKey.toString();
          if (!marketKeysMap.has(keyStr)) {
            marketKeysMap.set(keyStr, null);
            settlementQueries.push({
              address: SETTLEMENT_CONTRACT,
              abi: settlementAbi,
              functionName: "getSettlement",
              args: [marketKey],
              keyStr,
            });
          }
        }
      }

      if (settlementQueries.length > 0) {
        const sResults = await publicClient.multicall({
          contracts: settlementQueries.map((q) => ({
            address: q.address,
            abi: q.abi,
            functionName: q.functionName,
            args: q.args,
          })),
        });
        for (let i = 0; i < settlementQueries.length; i++) {
          if (sResults[i]?.status === "success") {
            marketKeysMap.set(settlementQueries[i].keyStr, sResults[i].result);
          }
        }
      }

      // Fetch live spot prices for mark-to-market valuation
      const [spotBtc, spotEth] = await Promise.all([
        getLiveSpotPrice("BTC"),
        getLiveSpotPrice("ETH"),
      ]);
      const spotMap: Record<string, number> = {
        BTC: spotBtc,
        ETH: spotEth,
        SOMI: 0.45,
      };

      const activeList: any[] = [];
      const orderList: any[] = [];
      const resolvedList: any[] = [];
      const handledSignatures = new Set<string>();
      const handledPoolSides = new Set<string>();
      const closesTrade = (close: TradedHistoryItem, buy: TradedHistoryItem, pool: string, symbol: string) => {
        if (close.operationType !== "dreamdex_close_position" || !close.createdAt || !buy.createdAt) return false;
        if (new Date(close.createdAt).getTime() <= new Date(buy.createdAt).getTime()) return false;
        if (close.pool?.toLowerCase() === pool.toLowerCase()) return true;
        return close.marketSymbol?.toLowerCase() === symbol.toLowerCase();
      };

      // 6. Process held tokens (0 RPC calls in loop)
      for (const token of heldTokens) {
        const qty = Number(token.balance) / 1e6;
        const sideStr = token.outcomeIdx === 0 ? "Up" : "Down";
        const matchingTrade = options?.trades?.find((t) =>
          t.operationType === "dreamdex_place_order" &&
          t.pool?.toLowerCase() === token.pool.toLowerCase() &&
          (!t.marketNonce || BigInt(t.marketNonce) === token.nonce) &&
          (String(t.side || "").toLowerCase().includes("down") ? 1 : 0) === token.outcomeIdx
        );
        const sym = matchingTrade?.marketSymbol || token.symbol || `${token.asset}-${sideStr.toUpperCase()}-${token.nonce}`;
        const wasClosed = matchingTrade
          ? options?.trades?.some((close) => closesTrade(close, matchingTrade, token.pool, sym))
          : false;
        const isMarketActive = !token.finalized && token.expiryNs > nowNs && Number(token.nonce) === token.currentNonce && !wasClosed;

        if (matchingTrade?.signature) {
          handledSignatures.add(matchingTrade.signature);
        }
        handledPoolSides.add(`${token.pool.toLowerCase()}-${token.nonce}-${sideStr.toLowerCase()}`);

        if (isMarketActive) {
          const asset = token.asset || sym.split("-")[0] || "BTC";
          const timeframe = extractTimeframe(sym);
          const spotPrice = spotMap[asset.toUpperCase()] || 1.0;
          const strikePrice = extractStrike(sym, spotPrice);
          const expirySec = Number(token.expiryNs / 1000000000n);
          const nowSec = Math.floor(Date.now() / 1000);

          const probUp = calcBinaryProbability(spotPrice, strikePrice, expirySec, nowSec);
          const currentPrice = token.outcomeIdx === 0 ? probUp : (1 - probUp);
          const entryPrice = 0.50;
          const currentValue = qty * currentPrice;
          const cost = qty * entryPrice;
          const pnl = currentValue - cost;
          const pnlPercentage = cost > 0 ? (pnl / cost) * 100 : 0;
          const pnlFormatted = `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)} tUSDC`;
          const pnlPercentageFormatted = `${pnlPercentage >= 0 ? "+" : "-"}${Math.abs(pnlPercentage).toFixed(1)}%`;

          activeList.push({
            market: sym,
            marketId: `0x${token.outcomeId.toString(16)}`,
            marketSymbol: sym,
            poolAddress: token.pool,
            side: sideStr,
            quantity: qty,
            entryPrice,
            currentPrice: Number(currentPrice.toFixed(4)),
            currentValue: Number(currentValue.toFixed(2)),
            pnl: Number(pnl.toFixed(2)),
            unrealizedPnL: pnlFormatted,
            pnlFormatted,
            pnlPercentage: pnlPercentageFormatted,
            status: "Active",
            timeframe,
            expiryTimestamp: expirySec,
            expiryTime: new Date(expirySec * 1000).toISOString(),
            spotPrice,
            strikePrice,
            createdAt: matchingTrade?.createdAt || undefined,
            txHash: matchingTrade?.signature,
            explorerUrl: matchingTrade?.signature
              ? `https://shannon-explorer.somnia.network/tx/${matchingTrade.signature}`
              : `https://shannon-explorer.somnia.network/address/${token.pool}`,
          });
        } else {
          let isWin = false;
          let outcome = wasClosed ? "CLOSED" : "LOST";
          let pnl = wasClosed ? 0 : -(qty * 0.5);
          let payout = wasClosed ? `${(qty * 0.5).toFixed(2)} tUSDC` : "0.00 tUSDC";
          let status = wasClosed ? "Closed Early" : "Settled";

          const poolBig = BigInt(token.pool);
          const marketKey = (poolBig << 64n) | token.nonce;
          const s = marketKeysMap.get(marketKey.toString());
          if (s) {
            const winIdx = s.payoutNumerators[0] > 0n ? 0 : s.payoutNumerators[1] > 0n ? 1 : -1;
            isWin = winIdx === token.outcomeIdx;
            outcome = isWin ? "WON" : "LOST";
            pnl = isWin ? (qty * 0.5) : -(qty * 0.5);
            payout = isWin ? `${qty.toFixed(2)} tUSDC` : "0.00 tUSDC";
            status = isWin ? "Claimable" : "Settled";
          }

          const timeframe = extractTimeframe(sym);
          const settledAt = token.expiryNs ? new Date(Number(token.expiryNs / 1000000n)).toISOString() : undefined;
          const createdAt = matchingTrade?.createdAt || (settledAt ? new Date(new Date(settledAt).getTime() - 300_000).toISOString() : undefined);

          resolvedList.push({
            market: sym,
            marketId: `0x${token.outcomeId.toString(16)}`,
            outcomeId: token.outcomeId.toString(),
            marketSymbol: sym,
            poolAddress: token.pool,
            side: sideStr,
            quantity: qty,
            outcome,
            isWinner: isWin,
            pnl,
            pnlFormatted: `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)} tUSDC`,
            payout,
            status,
            isRedeemed: status === "Redeemed",
            claimed: status === "Redeemed",
            claimable: status === "Claimable",
            timeframe,
            createdAt,
            settledAt,
            closedAt: settledAt,
            txHash: matchingTrade?.signature,
            explorerUrl: matchingTrade?.signature
              ? `https://shannon-explorer.somnia.network/tx/${matchingTrade.signature}`
              : `https://shannon-explorer.somnia.network/address/${token.pool}`,
          });
        }
      }

      // 7. Process trades (0 RPC calls in loop)
      if (options?.trades) {
        for (const trade of options.trades) {
          if (trade.operationType && trade.operationType.includes("redeem")) {
            const pool = (trade.pool || "").toLowerCase();
            const sym = (trade.marketSymbol || "").toLowerCase();

            // First: update ANY existing winning position in resolvedList that matches this pool, symbol, or signature
            let didUpdateExisting = false;
            for (const r of resolvedList) {
              const rPool = (r.poolAddress || "").toLowerCase();
              const rSym = (r.market || r.marketSymbol || r.marketName || "").toLowerCase();
              const matchesPool = pool && rPool && rPool === pool;
              const matchesSym = sym && rSym && (rSym === sym || rSym.includes(sym) || sym.includes(rSym));
              const matchesTx = trade.signature && r.txHash === trade.signature;

              if (r.isWinner && (matchesPool || matchesSym || matchesTx)) {
                r.isRedeemed = true;
                r.claimed = true;
                r.claimable = false;
                r.status = "Redeemed";
                if (trade.signature) {
                  r.txHash = trade.signature;
                  r.explorerUrl = `https://shannon-explorer.somnia.network/tx/${trade.signature}`;
                }
                didUpdateExisting = true;
              }
            }

            if (!didUpdateExisting) {
              const qty = Number(trade.amount) || 10;
              const pnl = qty * 0.425;
              const timeframe = extractTimeframe(trade.marketSymbol || sym || "");
              const matchingBuyTrade = options?.trades?.find(
                (tr) =>
                  tr.operationType === "dreamdex_place_order" &&
                  tr.pool?.toLowerCase() === pool &&
                  tr.createdAt &&
                  trade.createdAt &&
                  new Date(tr.createdAt).getTime() <= new Date(trade.createdAt).getTime()
              );
              const createdAt = matchingBuyTrade?.createdAt || trade.createdAt;
              const settledAt = trade.createdAt || undefined;

              resolvedList.unshift({
                market: trade.marketSymbol || "Event Contract",
                marketId: `${pool || "0x"}-redeemed`,
                marketSymbol: trade.marketSymbol || "Event Contract",
                poolAddress: trade.pool,
                side: "Up",
                quantity: qty,
                outcome: "WON",
                isWinner: true,
                pnl,
                pnlFormatted: `+$${pnl.toFixed(2)} tUSDC`,
                payout: `${qty.toFixed(2)} tUSDC`,
                status: "Redeemed",
                isRedeemed: true,
                claimed: true,
                claimable: false,
                timeframe,
                createdAt,
                settledAt,
                closedAt: trade.createdAt || undefined,
                txHash: trade.signature,
                explorerUrl: trade.signature
                  ? `https://shannon-explorer.somnia.network/tx/${trade.signature}`
                  : trade.pool
                  ? `https://shannon-explorer.somnia.network/address/${trade.pool}`
                  : undefined,
              });
            }
          } else if (trade.operationType === "dreamdex_place_order") {
            if (trade.signature && handledSignatures.has(trade.signature)) continue;

            const poolAddr = trade.pool?.toLowerCase();
            if (!poolAddr) continue;
            const state = poolStateMap.get(poolAddr);
            const sideStr = String(trade.side || "buy_up").toLowerCase().includes("down") ? "Down" : "Up";
            const outcomeIdx = sideStr === "Down" ? 1 : 0;
            const sym = trade.marketSymbol || "Event Contract";
            const price = Number(trade.price) || 0.50;
            const qty = Number(trade.quantity) || (Number(trade.amount) ? Math.round(Number(trade.amount) / price) : 20);

            // 1. Check on-chain balance for this trade's outcome
            const poolBig = BigInt(poolAddr);
            const tradeNonce = trade.marketNonce ? BigInt(trade.marketNonce) : state?.nonce;
            const outId = (poolBig << 72n) | ((tradeNonce || 0n) << 8n) | BigInt(outcomeIdx);
            const onChainBal = balanceMap.get(outId.toString()) || 0n;

            // 2. Check trade age against market window duration
            const tf = extractTimeframe(sym);
            const tfSec = tf.endsWith("m") ? parseInt(tf) * 60 : tf.endsWith("h") ? parseInt(tf) * 3600 : tf.endsWith("d") ? parseInt(tf) * 86400 : 3600;
            const tradeAgeMs = trade.createdAt ? (Date.now() - new Date(trade.createdAt).getTime()) : Infinity;
            const isTradeWithinLifespan = tradeAgeMs < (tfSec + 60) * 1000;

            // 3. Check if trade was already closed via early exit
            const wasClosed = options?.trades?.some((close) => closesTrade(close, trade, poolAddr, sym));

            // A trade can ONLY be Active if the pool window is unfinalized AND within lifespan AND not closed AND user actually holds tokens!
            const isMarketActive = state ? (!state.finalized && state.expiryNs > nowNs && isTradeWithinLifespan && !wasClosed && onChainBal > 0n) : false;

            const isOrderOpen = state && !state.finalized && state.expiryNs > nowNs && isTradeWithinLifespan && !wasClosed && onChainBal === 0n;

            if (isOrderOpen) {
              if (trade.signature) handledSignatures.add(trade.signature);
              orderList.push({
                market: sym,
                marketSymbol: sym,
                poolAddress: trade.pool,
                marketNonce: tradeNonce?.toString(),
                side: sideStr,
                price,
                quantity: qty,
                status: "Open",
                timeframe: tf,
                expiryTimestamp: Number(state.expiryNs / 1_000_000_000n),
                createdAt: trade.createdAt,
                txHash: trade.signature,
              });
            } else if (isMarketActive) {
              const positionKey = `${poolAddr}-${tradeNonce || "unknown"}-${sideStr.toLowerCase()}`;
              if (handledPoolSides.has(positionKey)) {
                const existing = activeList.find(
                  (a) => a.poolAddress?.toLowerCase() === poolAddr && a.marketNonce === tradeNonce?.toString() && a.side?.toLowerCase() === sideStr.toLowerCase()
                );
                if (existing && !existing.txHash && trade.signature) {
                  existing.txHash = trade.signature;
                  existing.explorerUrl = `https://shannon-explorer.somnia.network/tx/${trade.signature}`;
                }
                continue;
              }

              if (trade.signature) handledSignatures.add(trade.signature);
              handledPoolSides.add(positionKey);

              const asset = sym.split("-")[0] || "BTC";
              const timeframe = extractTimeframe(sym);
              const spotPrice = spotMap[asset.toUpperCase()] || 1.0;
              const strikePrice = extractStrike(sym, spotPrice);
              const expirySec = state?.expiryNs ? Number(state.expiryNs / 1000000000n) : Math.floor(Date.now() / 1000) + 3600;
              const nowSec = Math.floor(Date.now() / 1000);

              const probUp = calcBinaryProbability(spotPrice, strikePrice, expirySec, nowSec);
              const currentPrice = outcomeIdx === 0 ? probUp : (1 - probUp);
              const entryPrice = price;
              const currentValue = qty * currentPrice;
              const cost = qty * entryPrice;
              const pnl = currentValue - cost;
              const pnlPercentage = cost > 0 ? (pnl / cost) * 100 : 0;
              const pnlFormatted = `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)} tUSDC`;
              const pnlPercentageFormatted = `${pnlPercentage >= 0 ? "+" : "-"}${Math.abs(pnlPercentage).toFixed(1)}%`;

              activeList.push({
                market: sym,
                marketId: `${trade.pool}-open-order`,
                marketSymbol: sym,
                poolAddress: trade.pool,
                marketNonce: tradeNonce?.toString(),
                side: sideStr,
                quantity: qty,
                entryPrice,
                currentPrice: Number(currentPrice.toFixed(4)),
                currentValue: Number(currentValue.toFixed(2)),
                pnl: Number(pnl.toFixed(2)),
                unrealizedPnL: pnlFormatted,
                pnlFormatted,
                pnlPercentage: pnlPercentageFormatted,
                status: "Active",
                timeframe,
                expiryTimestamp: expirySec,
                expiryTime: new Date(expirySec * 1000).toISOString(),
                spotPrice,
                strikePrice,
                createdAt: trade.createdAt || undefined,
                txHash: trade.signature,
                explorerUrl: trade.signature
                  ? `https://shannon-explorer.somnia.network/tx/${trade.signature}`
                  : `https://shannon-explorer.somnia.network/address/${trade.pool}`,
              });
            } else {
              const isAlreadyInResolved = resolvedList.some(
                (r) => trade.signature && r.txHash === trade.signature
              );
              if (!isAlreadyInResolved) {
                if (trade.signature) handledSignatures.add(trade.signature);
                let isWin = false;
                let outcome = "REFUNDED";
                let pnl = 0;
                let payout = `${(qty * price).toFixed(2)} tUSDC`;
                let status = "Refunded";
                let outId: bigint | undefined = undefined;

                const nonceToUse = tradeNonce || (state ? state.nonce : undefined);
                if (nonceToUse !== undefined) {
                  const poolBig = BigInt(poolAddr);
                  const marketKey = (poolBig << 64n) | nonceToUse;
                  const s = marketKeysMap.get(marketKey.toString());
                  if (s && s.finalized) {
                    const winIdx = s.payoutNumerators[0] > 0n ? 0 : s.payoutNumerators[1] > 0n ? 1 : -1;
                    const wouldWin = winIdx === outcomeIdx;

                    outId = (poolBig << 72n) | (nonceToUse << 8n) | BigInt(outcomeIdx);
                    const onChainBal = balanceMap.get(outId.toString()) || 0n;

                    if (onChainBal > 0n) {
                      if (wouldWin) {
                        outcome = "WON";
                        isWin = true;
                        pnl = qty * (1 - price);
                        payout = `${qty.toFixed(2)} tUSDC`;
                        status = "Claimable";
                      } else {
                        outcome = "LOST";
                        isWin = false;
                        pnl = -(qty * price);
                        payout = "0.00 tUSDC";
                        status = "Settled";
                      }
                    } else {
                      const redeemTrade = options?.trades?.find(
                        (tr) =>
                          tr.operationType === "dreamdex_redeem" &&
                          (tr.pool?.toLowerCase() === poolAddr ||
                           (tr.marketSymbol && sym && (
                             tr.marketSymbol.toLowerCase() === sym.toLowerCase() ||
                             sym.toLowerCase().includes(tr.marketSymbol.toLowerCase()) ||
                             tr.marketSymbol.toLowerCase().includes(sym.toLowerCase())
                           )))
                      );
                      if (wouldWin || redeemTrade) {
                        outcome = "WON";
                        isWin = true;
                        pnl = qty * (1 - price);
                        payout = `${qty.toFixed(2)} tUSDC`;
                        status = "Redeemed";
                      } else {
                        outcome = "REFUNDED";
                        isWin = false;
                        pnl = 0;
                        payout = `${(qty * price).toFixed(2)} tUSDC`;
                        status = "Refunded";
                      }
                    }
                  }
                }

                const isClaimable = status === "Claimable";
                const isRedeemed = status === "Redeemed";

                const timeframe = extractTimeframe(sym);
                const tfSec = timeframe.endsWith("m") ? parseInt(timeframe) * 60 : timeframe.endsWith("h") ? parseInt(timeframe) * 3600 : timeframe.endsWith("d") ? parseInt(timeframe) * 86400 : 3600;

                // Check if position was closed early via close_position
                const closeTrade = options?.trades?.find((close) => closesTrade(close, trade, poolAddr, sym));

                if (closeTrade) {
                  status = "Closed Early";
                  outcome = "CLOSED";
                }

                // Compute accurate settledAt / closedAt
                let settledAt: string | undefined = undefined;
                if (closeTrade?.createdAt) {
                  settledAt = closeTrade.createdAt;
                } else if (trade.createdAt) {
                  const tradeTime = new Date(trade.createdAt).getTime();
                  if (tradeTime + tfSec * 1000 <= Date.now()) {
                    settledAt = new Date(tradeTime + tfSec * 1000).toISOString();
                  } else if (state?.expiryNs) {
                    settledAt = new Date(Number(state.expiryNs / 1000000n)).toISOString();
                  }
                } else if (state?.expiryNs) {
                  settledAt = new Date(Number(state.expiryNs / 1000000n)).toISOString();
                }

                const redeemTrade = options?.trades?.find(
                  (tr) =>
                    tr.operationType === "dreamdex_redeem" &&
                    (tr.pool?.toLowerCase() === poolAddr ||
                     (tr.marketSymbol && sym && tr.marketSymbol.toLowerCase() === sym.toLowerCase()))
                );
                const displayTxHash = (isRedeemed && redeemTrade?.signature)
                  ? redeemTrade.signature
                  : (closeTrade?.signature || trade.signature);

                resolvedList.push({
                  market: sym,
                  marketId: `${trade.pool}-settled-order`,
                  marketSymbol: sym,
                  poolAddress: trade.pool,
                  outcomeId: outId ? outId.toString() : undefined,
                  side: sideStr,
                  quantity: qty,
                  outcome,
                  isWinner: isWin,
                  pnl,
                  pnlFormatted: status === "Refunded" ? "$0.00 tUSDC" : `${pnl >= 0 ? "+" : "-"}$${Math.abs(pnl).toFixed(2)} tUSDC`,
                  payout,
                  status,
                  isRedeemed,
                  claimed: isRedeemed,
                  claimable: isClaimable,
                  timeframe,
                  createdAt: trade.createdAt || undefined,
                  settledAt,
                  closedAt: settledAt,
                  txHash: displayTxHash,
                  explorerUrl: displayTxHash
                    ? `https://shannon-explorer.somnia.network/tx/${displayTxHash}`
                    : `https://shannon-explorer.somnia.network/address/${trade.pool}`,
                });
              }
            }
          }
        }
      }

      // 8. Sort resolved positions by newest first (descending by settledAt, closedAt, or createdAt)
      resolvedList.sort((a, b) => {
        const timeA = new Date(a.closedAt || a.settledAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.closedAt || b.settledAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return {
        active: activeList,
        orders: orderList,
        resolved: resolvedList,
      };
    } catch (error) {
      console.error(`Error fetching positions for ${address}`, error);
      return { active: [], orders: [], resolved: [] };
    }
  }

  async getEventContractDetails(marketId: string) {
    return await this.getMarketBySymbol(marketId);
  }

  async get(endpoint: string) {
    try {
      const url = endpoint.startsWith("http")
        ? endpoint
        : `${this.baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
      return await this.fetchWithRetry(url);
    } catch (error) {
      console.error(`Error in get ${endpoint}:`, error);
      return null;
    }
  }
}

export const dreamDexApi = new DreamDexApiClient("https://stg.api.dreamdex.io/v0");
export const dreamDexApiMainnet = new DreamDexApiClient("https://api.dreamdex.io/v0");
