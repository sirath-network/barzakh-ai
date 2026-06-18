/**
 * Arkham Intelligence API Tools
 * Complete integration covering ALL Arkham REST API endpoints.
 * API Docs: https://intel.arkm.com/api/docs
 *
 * Auth: API-Key header using ARKHAM_API_KEY environment variable.
 * Base URL: https://api.arkm.com
 */

import { tool } from "ai";
import { z } from "zod";

// ─── Arkham API Client ────────────────────────────────────────────────────────

const ARKHAM_BASE_URL = "https://api.arkm.com";

function getArkhamApiKey(): string {
  const key = process.env.ARKHAM_API_KEY;
  if (!key) throw new Error("ARKHAM_API_KEY not found in environment variables.");
  return key;
}

async function arkhamGet(
  path: string,
  params?: Record<string, string | undefined>
): Promise<any> {
  const url = new URL(path, ARKHAM_BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    headers: { "API-Key": getArkhamApiKey() },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Arkham API ${res.status}: ${res.statusText} — ${body}`);
  }
  return res.json();
}

async function arkhamPost(
  path: string,
  body: any,
  params?: Record<string, string | undefined>
): Promise<any> {
  const url = new URL(path, ARKHAM_BASE_URL);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    }
  }
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "API-Key": getArkhamApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Arkham API ${res.status}: ${res.statusText} — ${text}`);
  }
  return res.json();
}

async function arkhamPut(
  path: string,
  body: any
): Promise<any> {
  const url = new URL(path, ARKHAM_BASE_URL);
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      "API-Key": getArkhamApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Arkham API ${res.status}: ${res.statusText} — ${text}`);
  }
  return res.json();
}

const VALID_CHAINS = new Set([
  'ethereum', 'polygon', 'bsc', 'optimism', 'avalanche',
  'arbitrum_one', 'base', 'bitcoin', 'tron', 'flare',
  'solana', 'sui', 'ton', 'dogecoin', 'zcash', 'blast', 'linea',
  'manta', 'mantle', 'sonic', 'fantom'
]);

const CHAIN_ALIASES: Record<string, string> = {
  'eth': 'ethereum',
  'sol': 'solana',
  'btc': 'bitcoin',
  'trx': 'tron',
  'doge': 'dogecoin',
  'arb': 'arbitrum_one',
  'arbitrum': 'arbitrum_one',
  'op': 'optimism',
  'avax': 'avalanche',
  'matic': 'polygon',
  'bnb': 'bsc',
  'sui-network': 'sui',
  'sui network': 'sui',
  'sui': 'sui',
  'ftm': 'fantom'
};

function normalizeChain(chain: string): string {
  const c = chain.toLowerCase().trim();
  if (CHAIN_ALIASES[c]) return CHAIN_ALIASES[c];
  if (!VALID_CHAINS.has(c)) {
    throw new Error(`Invalid chain: '${chain}'. Supported chains are: ${Array.from(VALID_CHAINS).join(', ')}`);
  }
  return c;
}

// ─── Zod helpers ──────────────────────────────────────────────────────────────
// LLMs frequently send numbers for params like limit, offset, usdGte etc.
// even though the Arkham API expects query-string values (strings).
// This helper accepts both and coerces to string so Zod validation never fails.

/**
 * Zod schema that accepts both string and number, coercing to string.
 * Use for all Arkham tool params that represent numeric query-string values
 * (limit, offset, usdGte, usdLte, balanceMin, balanceMax, time, etc.).
 */
const numericStringParam = () =>
  z.union([z.string(), z.number()]).transform(String);

// ─── Response Truncation ──────────────────────────────────────────────────────
// Prevents large Arkham API responses from exhausting the LLM context window.
// Follows the same pattern as the Zerion tool (get_evm_onchain_data_using_zerion.ts).

/** Max items to return for array-type Arkham responses */
const ARKHAM_RESPONSE_LIMITS: Record<string, number> = {
  transfers: 10,
  swaps: 10,
  balances: 30,
  default: 20,
};

/**
 * Truncate large Arkham API responses to prevent context window exhaustion.
 * Handles both direct arrays and objects with nested array fields.
 */
function truncateArkhamResponse(data: any): any {
  if (!data || typeof data !== 'object') return data;

  // Handle direct array responses
  if (Array.isArray(data)) {
    const limit = ARKHAM_RESPONSE_LIMITS.default;
    if (data.length > limit) {
      return {
        data: data.slice(0, limit),
        _truncated: true,
        _originalCount: data.length,
        _summary: `Showing ${limit} of ${data.length} total results. Use 'limit' and 'offset' parameters for pagination.`,
      };
    }
    return data;
  }

  // Handle objects with nested arrays (e.g. { transfers: [...], swaps: [...] })
  const result = { ...data };
  for (const key of Object.keys(result)) {
    if (Array.isArray(result[key]) && result[key].length > 0) {
      const limit = ARKHAM_RESPONSE_LIMITS[key] ?? ARKHAM_RESPONSE_LIMITS.default;
      if (result[key].length > limit) {
        const originalCount = result[key].length;
        result[key] = result[key].slice(0, limit);
        result[`_${key}_truncated`] = true;
        result[`_${key}_originalCount`] = originalCount;
        result[`_${key}_summary`] = `Showing ${limit} of ${originalCount} results.`;
      }
    }
  }

  return result;
}

/** Helper to wrap tool execution with consistent error handling and response truncation */
function wrapExecute<T>(fn: (args: T) => Promise<any>) {
  return async (args: T) => {
    try {
      if (args && typeof args === 'object') {
        const anyArgs = args as any;
        if (typeof anyArgs.chain === 'string' && anyArgs.chain.trim() !== '') {
          anyArgs.chain = normalizeChain(anyArgs.chain);
        }
        if (typeof anyArgs.chains === 'string' && anyArgs.chains.trim() !== '') {
          anyArgs.chains = anyArgs.chains.split(',').map((c: string) => normalizeChain(c)).join(',');
        }
      }
      const result = await fn(args);
      return truncateArkhamResponse(result);
    } catch (error: any) {
      console.error("[Arkham]", error.message);
      return { success: false, error: error.message || "Unknown error" };
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: INTELLIGENCE — Search, Address, Entity, Contract, Token
// ═══════════════════════════════════════════════════════════════════════════════

/** 1. Search entities, addresses, tokens */
export const arkhamSearch = tool({
  description:
    "Search Arkham Intelligence for entities (Binance, Jump Trading), addresses, tokens, ENS names. Returns ranked results across all categories. Use this when the user asks 'who is this address', 'find entity', or 'search wallet'.",
  parameters: z.object({
    query: z.string().describe("Search query — entity name, address, token name, or ENS."),
    filterLimits: z.string().optional().describe("JSON-encoded max results per category, e.g. '{\"arkhamEntities\":5,\"tokens\":10}'. Default 5 per category."),
    filterOffsets: z.string().optional().describe("JSON-encoded pagination offsets per category."),
  }),
  execute: wrapExecute(async ({ query, filterLimits, filterOffsets }) => {
    return arkhamGet("/intelligence/search", { query, filterLimits, filterOffsets });
  }),
});

/** 2. Address intelligence (enriched, all chains) */
export const arkhamAddressIntelligence = tool({
  description:
    "Get deep intelligence about a blockchain address from Arkham — entity attribution, labels, tags, contract status, across ALL chains. Use this to investigate any wallet or smart contract address. Works with EVM, Bitcoin, Solana, Tron, and 20+ chains.",
  parameters: z.object({
    address: z.string().describe("The blockchain address to investigate (e.g., '0x1234…' for EVM, 'bc1…' for Bitcoin)."),
    chain: z.string().optional().describe("Specific chain to query. If omitted, auto-detects and returns data across all chains."),
  }),
  execute: wrapExecute(async ({ address, chain }) => {
    return arkhamGet(`/intelligence/address_enriched/${encodeURIComponent(address)}/all`, {
      chain,
    });
  }),
});

/** 3. Batch address intelligence */
export const arkhamBatchAddressIntelligence = tool({
  description:
    "Batch lookup intelligence for multiple addresses at once (up to 100). Returns enriched data for each address across all chains. Efficient for investigating multiple wallets simultaneously.",
  parameters: z.object({
    addresses: z.array(z.string()).describe("Array of blockchain addresses to look up (max 100)."),
  }),
  execute: wrapExecute(async ({ addresses }) => {
    return arkhamPost("/intelligence/address_enriched/batch/all", addresses);
  }),
});

/** 4. Entity intelligence (info + summary) */
export const arkhamEntityIntelligence = tool({
  description:
    "Get intelligence about a known entity like 'binance', 'coinbase', 'jump-trading', etc. Returns entity metadata, associated tags, social links, and optionally summary statistics (address count, total balance, volume). Use when user asks about an exchange, fund, protocol, or organization.",
  parameters: z.object({
    entity: z.string().describe("The entity ID (e.g., 'binance', 'coinbase', 'jump-trading', 'wintermute')."),
    includeSummary: z.boolean().optional().describe("If true, also fetches summary statistics (address count, balance, volume, first/last activity)."),
  }),
  execute: wrapExecute(async ({ entity, includeSummary }) => {
    const entityData = await arkhamGet(`/intelligence/entity/${encodeURIComponent(entity)}`);
    if (includeSummary) {
      const summary = await arkhamGet(`/intelligence/entity/${encodeURIComponent(entity)}/summary`);
      return { entity: entityData, summary };
    }
    return entityData;
  }),
});

/** 5. Entity predictions */
export const arkhamEntityPredictions = tool({
  description:
    "Get Arkham's predictions for an entity — predicted entity type, confidence, and associated data. Useful for understanding how Arkham classifies unknown entities.",
  parameters: z.object({
    entity: z.string().describe("The entity ID to get predictions for."),
  }),
  execute: wrapExecute(async ({ entity }) => {
    return arkhamGet(`/intelligence/entity_predictions/${encodeURIComponent(entity)}`);
  }),
});

/** 6. Entity types */
export const arkhamEntityTypes = tool({
  description:
    "Get all entity type categories from Arkham Intelligence (e.g., 'cex', 'defi', 'fund', 'individual'). Use when user wants to understand entity classification or filter by type.",
  parameters: z.object({}),
  execute: wrapExecute(async () => {
    return arkhamGet("/intelligence/entity_types");
  }),
});

/** 7. Entity balance changes */
export const arkhamEntityBalanceChanges = tool({
  description:
    "Track how entity balances have changed over time — who's accumulating, who's distributing. Filter by chains, entity types, specific entities, tokens, and time interval. Use to discover which entities are buying/selling a token.",
  parameters: z.object({
    chains: z.string().optional().describe("Comma-separated chains (e.g., 'ethereum,bsc')."),
    entityTypes: z.string().optional().describe("Comma-separated entity types (e.g., 'exchange,fund')."),
    entityIds: z.string().optional().describe("Comma-separated entity IDs (e.g., 'binance,coinbase')."),
    pricingIds: z.string().optional().describe("Comma-separated CoinGecko pricing IDs (e.g., 'bitcoin,ethereum')."),
    orderBy: z.string().optional().describe("Sort by: 'balanceUsd', 'balanceUsdChange', 'balanceUsdPctChange', 'balanceUnit', 'balanceUnitChange', 'balanceUnitPctChange'."),
    orderDir: z.string().optional().describe("'asc' or 'desc'."),
    balanceMin: numericStringParam().optional().describe("Minimum balance threshold in USD."),
    balanceMax: numericStringParam().optional().describe("Maximum balance threshold in USD."),
    interval: z.string().optional().describe("Time interval: '24h', '7d', '30d'."),
    limit: numericStringParam().optional().describe("Results per page."),
    offset: numericStringParam().optional().describe("Pagination offset."),
  }),
  execute: wrapExecute(async (args) => {
    return arkhamGet("/intelligence/entity_balance_changes", args as any);
  }),
});

/** 8. Contract intelligence */
export const arkhamContractIntelligence = tool({
  description:
    "Get intelligence about a smart contract — entity attribution, labels, protocol info. Requires specifying the chain. Use for investigating DeFi protocols, exploited contracts, or unknown contracts.",
  parameters: z.object({
    chain: z.string().describe("The blockchain (e.g., 'ethereum', 'bsc', 'polygon', 'arbitrum')."),
    address: z.string().describe("The contract address."),
  }),
  execute: wrapExecute(async ({ chain, address }) => {
    return arkhamGet(`/intelligence/contract/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
  }),
});

/** 9. Token intelligence */
export const arkhamTokenIntelligence = tool({
  description:
    "Get Arkham intelligence on a token — by CoinGecko pricing ID or by chain/address. Returns token metadata, entity associations, and analytics.",
  parameters: z.object({
    id: z.string().optional().describe("CoinGecko pricing ID (e.g., 'bitcoin', 'ethereum', 'usd-coin'). Use this OR chain+address."),
    chain: z.string().optional().describe("Chain for the token (e.g., 'ethereum'). Use with address."),
    address: z.string().optional().describe("Token contract address. Use with chain."),
  }),
  execute: wrapExecute(async ({ id, chain, address }) => {
    if (id) return arkhamGet(`/intelligence/token/${encodeURIComponent(id)}`);
    if (chain && address) return arkhamGet(`/intelligence/token/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
    throw new Error("Provide either 'id' (CoinGecko) or 'chain'+'address'.");
  }),
});

/** 10. Intelligence updates feed */
export const arkhamIntelUpdates = tool({
  description:
    "Get recent intelligence updates from Arkham — new address labels, entity updates, tag changes. Choose the update type. Useful for monitoring new attributions and label changes.",
  parameters: z.object({
    type: z.enum(["addresses", "entities", "tags", "address_tags"]).describe("Type of updates: 'addresses' (new address intel), 'entities' (entity changes), 'tags' (tag definition changes), 'address_tags' (address-tag association changes)."),
    limit: numericStringParam().optional().describe("Number of results."),
    offset: numericStringParam().optional().describe("Pagination offset."),
  }),
  execute: wrapExecute(async ({ type, limit, offset }) => {
    const pathMap: Record<string, string> = {
      addresses: "/intelligence/addresses/updates",
      entities: "/intelligence/entities/updates",
      tags: "/intelligence/tags/updates",
      address_tags: "/intelligence/address_tags/updates",
    };
    return arkhamGet(pathMap[type]!, { limit, offset });
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: TRANSFERS & TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** 11. Get transfers — THE whale tracking tool */
export const arkhamGetTransfers = tool({
  description:
    "Track transfers across 20+ blockchains using Arkham Intelligence. THE core tool for whale tracking, monitoring fund flows, investigating hacks, and tracing stolen funds. Filter by address/entity, direction, USD value, tokens, time range, and more. Rate limited to 1 req/sec. IMPORTANT: If you do not provide a 'base' entity/address, you MUST set 'flow' to 'all'.",
  parameters: z.object({
    base: z.string().optional().describe("Filter by entity or address (e.g., 'binance', '0x1234…'). Comma-separated for multiple. If omitted, 'flow' MUST be 'all'."),
    chains: z.string().optional().describe("Comma-separated chains (e.g., 'ethereum,bsc')."),
    flow: z.string().optional().describe("Transfer direction: 'in', 'out', 'self', 'all'. CRITICAL RULE: If 'base' is NOT provided, 'flow' MUST be set to 'all'."),
    from: z.string().optional().describe("Filter sender — addresses, entities, or 'type:cex', 'deposit:binance'. Comma-separated."),
    to: z.string().optional().describe("Filter recipient — same syntax as 'from'."),
    counterparties: z.string().optional().describe("Strict counterparty filter — only base <-> counterparty transfers."),
    tokens: z.string().optional().describe("Comma-separated token IDs or addresses (e.g., 'ethereum,usd-coin')."),
    timeLast: z.string().optional().describe("Recent duration filter: '1h', '24h', '7d', '30d'."),
    timeGte: z.string().optional().describe("Filter after timestamp (e.g., '2024-01-01T00:00:00Z')."),
    timeLte: z.string().optional().describe("Filter before timestamp."),
    usdGte: numericStringParam().optional().describe("Minimum USD value — set high (e.g., '1000000') for whale tracking."),
    usdLte: numericStringParam().optional().describe("Maximum USD value."),
    sortKey: z.string().optional().describe("Sort by: 'time', 'value', 'usd'."),
    sortDir: z.string().optional().describe("'asc' or 'desc'."),
    limit: numericStringParam().optional().describe("Max results (default 50)."),
    offset: numericStringParam().optional().describe("Pagination offset."),
  }),
  execute: wrapExecute(async (args) => {
    // Coerce flow to 'all' if no base is provided to prevent Arkham API 400 Bad Filter errors
    if (!args.base && args.flow && args.flow !== 'all') {
      args.flow = 'all';
    }
    return arkhamGet("/transfers", args as any);
  }),
});

/** 12. Transfer histogram */
export const arkhamTransferHistogram = tool({
  description:
    "Get a histogram of transfers over time — shows transfer activity patterns. Use 'detailed' for full histogram (API key required) or 'simple' for basic counts (public). Useful for visualizing fund flow patterns.",
  parameters: z.object({
    mode: z.enum(["detailed", "simple"]).optional().describe("'detailed' (authenticated, full data) or 'simple' (public). Defaults to 'detailed'."),
    base: z.string().optional().describe("Filter by entity or address."),
    chains: z.string().optional().describe("Comma-separated chains."),
    flow: z.string().optional().describe("Direction: 'in', 'out', 'all'."),
    from: z.string().optional().describe("Filter sender."),
    to: z.string().optional().describe("Filter recipient."),
    tokens: z.string().optional().describe("Token filter."),
    timeLast: z.string().optional().describe("Duration: '24h', '7d', '30d'."),
    timeGte: z.string().optional().describe("Start time."),
    timeLte: z.string().optional().describe("End time."),
    usdGte: numericStringParam().optional().describe("Min USD value."),
    usdLte: numericStringParam().optional().describe("Max USD value."),
  }),
  execute: wrapExecute(async ({ mode = "detailed", ...args }) => {
    const path = mode === "simple" ? "/transfers/histogram/simple" : "/transfers/histogram";
    return arkhamGet(path, args as any);
  }),
});

/** 13. Transaction lookup */
export const arkhamTransactionLookup = tool({
  description:
    "Look up a specific transaction by its hash. Returns full transaction details (block, timestamp, gas, value, USD) and optionally all transfers within the transaction. Searches across all supported chains including mempool.",
  parameters: z.object({
    hash: z.string().describe("The transaction hash to look up (e.g., '0xabc123…')."),
    includeTransfers: z.boolean().optional().describe("If true, also fetches all token transfers within the transaction."),
  }),
  execute: wrapExecute(async ({ hash, includeTransfers }) => {
    const txData = await arkhamGet(`/tx/${encodeURIComponent(hash)}`);
    if (includeTransfers) {
      const transfers = await arkhamGet(`/transfers/tx/${encodeURIComponent(hash)}`);
      return { transaction: txData, transfers };
    }
    return txData;
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: BALANCES & PORTFOLIO
// ═══════════════════════════════════════════════════════════════════════════════

/** 14. Get balances for address or entity */
export const arkhamGetBalances = tool({
  description:
    "Get token balances for a blockchain address or a known entity (Binance, Coinbase, etc.) from Arkham Intelligence. Returns multi-chain balances with USD values. Use 'address' for wallet addresses or 'entity' for known entities.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address (e.g., '0x1234…'). Use this OR entity."),
    entity: z.string().optional().describe("Entity ID (e.g., 'binance'). Use this OR address."),
    chains: z.string().optional().describe("Comma-separated chains to filter (e.g., 'ethereum,bsc')."),
  }),
  execute: wrapExecute(async ({ address, entity, chains }) => {
    if (address) return arkhamGet(`/balances/address/${encodeURIComponent(address)}`, { chains });
    if (entity) return arkhamGet(`/balances/entity/${encodeURIComponent(entity)}`, { chains });
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

/** 15. Solana subaccount balances */
export const arkhamSolanaSubaccounts = tool({
  description:
    "Get Solana subaccount (associated token account) balances for addresses or entities. Solana uses subaccounts for each token — this returns all of them.",
  parameters: z.object({
    addresses: z.string().optional().describe("Comma-separated Solana addresses."),
    entities: z.string().optional().describe("Comma-separated entity IDs."),
  }),
  execute: wrapExecute(async ({ addresses, entities }) => {
    if (addresses) return arkhamGet(`/balances/solana/subaccounts/address/${encodeURIComponent(addresses)}`);
    if (entities) return arkhamGet(`/balances/solana/subaccounts/entity/${encodeURIComponent(entities)}`);
    throw new Error("Provide either 'addresses' or 'entities'.");
  }),
});

/** 16. Portfolio history */
export const arkhamGetPortfolio = tool({
  description:
    "Get historical portfolio snapshots for an address or entity. Returns token holdings at a specific point in time. Useful for tracking how holdings changed over time.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address. Use this OR entity."),
    entity: z.string().optional().describe("Entity ID. Use this OR address."),
    time: numericStringParam().optional().describe("Unix timestamp in ms for historical snapshot. Truncated to UTC day start."),
    chains: z.string().optional().describe("Comma-separated chains."),
  }),
  execute: wrapExecute(async ({ address, entity, time, chains }) => {
    if (address) return arkhamGet(`/portfolio/address/${encodeURIComponent(address)}`, { time, chains });
    if (entity) return arkhamGet(`/portfolio/entity/${encodeURIComponent(entity)}`, { time, chains });
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

/** 17. Portfolio time series */
export const arkhamPortfolioTimeSeries = tool({
  description:
    "Get daily time series of an address's or entity's holdings for a specific token. Returns daily UTC snapshots showing balance, price, and USD value over time.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address. Use this OR entity."),
    entity: z.string().optional().describe("Entity ID. Use this OR address."),
    pricingId: z.string().optional().describe("CoinGecko pricing ID of the token to track (e.g., 'bitcoin', 'ethereum')."),
    chains: z.string().optional().describe("Comma-separated chains."),
  }),
  execute: wrapExecute(async ({ address, entity, pricingId, chains }) => {
    if (address) return arkhamGet(`/portfolio/timeSeries/address/${encodeURIComponent(address)}`, { pricingId, chains });
    if (entity) return arkhamGet(`/portfolio/timeSeries/entity/${encodeURIComponent(entity)}`, { pricingId, chains });
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: FLOW, COUNTERPARTIES, VOLUME, HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

/** 18. USD flow history */
export const arkhamGetFlow = tool({
  description:
    "Get historical USD inflows and outflows for an address or entity. Shows cumulative flow patterns — essential for identifying whether a wallet is accumulating or distributing.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address. Use this OR entity."),
    entity: z.string().optional().describe("Entity ID. Use this OR address."),
    chains: z.string().optional().describe("Comma-separated chains."),
  }),
  execute: wrapExecute(async ({ address, entity, chains }) => {
    if (address) return arkhamGet(`/flow/address/${encodeURIComponent(address)}`, { chains });
    if (entity) return arkhamGet(`/flow/entity/${encodeURIComponent(entity)}`, { chains });
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

/** 19. Top counterparties */
export const arkhamGetCounterparties = tool({
  description:
    "Get the top counterparties for an address or entity — who they interact with most. Shows transfer count, volume, and direction for each counterparty. Essential for mapping relationships and fund flow networks.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address. Use this OR entity."),
    entity: z.string().optional().describe("Entity ID. Use this OR address."),
    chains: z.string().optional().describe("Comma-separated chains."),
    timeLast: z.string().optional().describe("Duration: '24h', '7d', '30d'."),
    timeGte: z.string().optional().describe("Start time."),
    timeLte: z.string().optional().describe("End time."),
    usdGte: numericStringParam().optional().describe("Min USD volume for counterparty."),
    flow: z.string().optional().describe("Direction: 'in', 'out', 'all'."),
    limit: numericStringParam().optional().describe("Max results."),
  }),
  execute: wrapExecute(async ({ address, entity, ...params }) => {
    if (address) return arkhamGet(`/counterparties/address/${encodeURIComponent(address)}`, params as any);
    if (entity) return arkhamGet(`/counterparties/entity/${encodeURIComponent(entity)}`, params as any);
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

/** 20. Volume */
export const arkhamGetVolume = tool({
  description:
    "Get transfer volume for an address or entity over time. Shows how active a wallet/entity is in terms of total value transferred.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address. Use this OR entity."),
    entity: z.string().optional().describe("Entity ID. Use this OR address."),
    chains: z.string().optional().describe("Comma-separated chains."),
  }),
  execute: wrapExecute(async ({ address, entity, chains }) => {
    if (address) return arkhamGet(`/volume/address/${encodeURIComponent(address)}`, { chains });
    if (entity) return arkhamGet(`/volume/entity/${encodeURIComponent(entity)}`, { chains });
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

/** 21. History */
export const arkhamGetHistory = tool({
  description:
    "Get activity history for an address or entity — shows timeline of first/last activity, active days, and transaction patterns.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address. Use this OR entity."),
    entity: z.string().optional().describe("Entity ID. Use this OR address."),
    chains: z.string().optional().describe("Comma-separated chains."),
  }),
  execute: wrapExecute(async ({ address, entity, chains }) => {
    if (address) return arkhamGet(`/history/address/${encodeURIComponent(address)}`, { chains });
    if (entity) return arkhamGet(`/history/entity/${encodeURIComponent(entity)}`, { chains });
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

/** 22. DeFi loans */
export const arkhamGetLoans = tool({
  description:
    "Get active DeFi lending/borrowing positions for an address or entity from Arkham. Shows protocol, collateral, debt, health factor, and liquidation risk. Supports Aave, Compound, Maker, etc.",
  parameters: z.object({
    address: z.string().optional().describe("Blockchain address. Use this OR entity."),
    entity: z.string().optional().describe("Entity ID. Use this OR address."),
    chains: z.string().optional().describe("Comma-separated chains."),
  }),
  execute: wrapExecute(async ({ address, entity, chains }) => {
    if (address) return arkhamGet(`/loans/address/${encodeURIComponent(address)}`, { chains });
    if (entity) return arkhamGet(`/loans/entity/${encodeURIComponent(entity)}`, { chains });
    throw new Error("Provide either 'address' or 'entity'.");
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: TOKEN DATA — Market, Holders, Balances, Pricing, Flow
// ═══════════════════════════════════════════════════════════════════════════════

/** 23. Top tokens */
export const arkhamTopTokens = tool({
  description:
    "Get the top tokens by market cap, volume, or other metrics from Arkham Intelligence. Useful for market overview.",
  parameters: z.object({
    sortBy: z.string().optional().describe("Sort by: 'marketCap', 'volume', 'price', 'priceChange'."),
    sortDir: z.string().optional().describe("'asc' or 'desc'."),
    limit: numericStringParam().optional().describe("Number of tokens to return."),
    offset: numericStringParam().optional().describe("Pagination offset."),
  }),
  execute: wrapExecute(async (args) => {
    return arkhamGet("/token/top", args as any);
  }),
});

/** 24. Trending tokens */
export const arkhamTrendingTokens = tool({
  description:
    "Get currently trending tokens on Arkham Intelligence — tokens with the most search interest or activity.",
  parameters: z.object({
    id: z.string().optional().describe("CoinGecko pricing ID for a specific token. If omitted, returns all trending tokens."),
  }),
  execute: wrapExecute(async ({ id }) => {
    if (id) return arkhamGet(`/token/trending/${encodeURIComponent(id)}`);
    return arkhamGet("/token/trending");
  }),
});

/** 25. Token market data */
export const arkhamTokenMarket = tool({
  description:
    "Get market data for a specific token from Arkham — price, market cap, volume, supply, and price changes.",
  parameters: z.object({
    id: z.string().describe("CoinGecko pricing ID (e.g., 'bitcoin', 'ethereum')."),
  }),
  execute: wrapExecute(async ({ id }) => {
    return arkhamGet(`/token/market/${encodeURIComponent(id)}`);
  }),
});

/** 26. Token holders */
export const arkhamTokenHolders = tool({
  description:
    "Get top holders of a token from Arkham Intelligence. Shows entity names, addresses, balance, and percentage of supply. Use to see who holds the most of a given token.",
  parameters: z.object({
    id: z.string().optional().describe("CoinGecko pricing ID. Use this OR chain+address."),
    chain: z.string().optional().describe("Chain of the token."),
    address: z.string().optional().describe("Token contract address."),
    entity: z.string().optional().describe("Filter holders by entity ID."),
    addressFilter: z.string().optional().describe("Filter holders by address."),
  }),
  execute: wrapExecute(async ({ id, chain, address, entity, addressFilter }) => {
    const params: any = {};
    if (entity) params.entity = entity;
    if (addressFilter) params.address = addressFilter;
    if (id) return arkhamGet(`/token/holders/${encodeURIComponent(id)}`, params);
    if (chain && address) return arkhamGet(`/token/holders/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`, params);
    throw new Error("Provide 'id' or 'chain'+'address'.");
  }),
});

/** 27. Token balance for address */
export const arkhamTokenBalance = tool({
  description:
    "Get the balance of a specific token held by an address from Arkham Intelligence.",
  parameters: z.object({
    id: z.string().describe("CoinGecko pricing ID of the token."),
  }),
  execute: wrapExecute(async ({ id }) => {
    return arkhamGet(`/token/balance/${encodeURIComponent(id)}`);
  }),
});

/** 28. Token addresses */
export const arkhamTokenAddresses = tool({
  description:
    "Get all contract addresses for a token across different chains — useful for finding the correct address for a token on a specific network.",
  parameters: z.object({
    id: z.string().optional().describe("CoinGecko pricing ID. Use this OR chain+address."),
    chain: z.string().optional().describe("Chain."),
    address: z.string().optional().describe("Token address."),
  }),
  execute: wrapExecute(async ({ id, chain, address }) => {
    if (id) return arkhamGet(`/token/addresses/${encodeURIComponent(id)}`);
    if (chain && address) return arkhamGet(`/token/addresses/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
    throw new Error("Provide 'id' or 'chain'+'address'.");
  }),
});

/** 29. Token price history */
export const arkhamTokenPriceHistory = tool({
  description:
    "Get historical price data for a token from Arkham Intelligence. Returns time-series price data.",
  parameters: z.object({
    id: z.string().describe("CoinGecko pricing ID."),
  }),
  execute: wrapExecute(async ({ id }) => {
    return arkhamGet(`/token/price/history/${encodeURIComponent(id)}`);
  }),
});

/** 30. Token price change */
export const arkhamTokenPriceChange = tool({
  description:
    "Get price change statistics for a token — percentage changes over various time periods (1h, 24h, 7d, 30d).",
  parameters: z.object({
    id: z.string().optional().describe("CoinGecko pricing ID. Use this OR chain+address."),
    chain: z.string().optional().describe("Chain."),
    address: z.string().optional().describe("Token address."),
  }),
  execute: wrapExecute(async ({ id, chain, address }) => {
    if (id) return arkhamGet(`/token/price/change/${encodeURIComponent(id)}`);
    if (chain && address) return arkhamGet(`/token/price/change/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
    throw new Error("Provide 'id' or 'chain'+'address'.");
  }),
});

/** 31. Token top flow */
export const arkhamTokenTopFlow = tool({
  description:
    "Get top inflows and outflows for a token — shows which entities/addresses are moving the most of a given token. Essential for tracking large token movements.",
  parameters: z.object({
    id: z.string().optional().describe("CoinGecko pricing ID. Use this OR chain+address."),
    chain: z.string().optional().describe("Chain."),
    address: z.string().optional().describe("Token contract address."),
  }),
  execute: wrapExecute(async ({ id, chain, address }) => {
    if (id) return arkhamGet(`/token/topflow/${encodeURIComponent(id)}`);
    if (chain && address) return arkhamGet(`/token/topflow/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
    throw new Error("Provide 'id' or 'chain'+'address'.");
  }),
});

/** 32. Token volume */
export const arkhamTokenVolume = tool({
  description:
    "Get trading volume data for a token from Arkham Intelligence.",
  parameters: z.object({
    id: z.string().optional().describe("CoinGecko pricing ID. Use this OR chain+address."),
    chain: z.string().optional().describe("Chain."),
    address: z.string().optional().describe("Token contract address. Use with chain."),
  }),
  execute: wrapExecute(async ({ id, chain, address }) => {
    if (id) return arkhamGet(`/token/volume/${encodeURIComponent(id)}`);
    if (chain && address) return arkhamGet(`/token/volume/${encodeURIComponent(chain)}/${encodeURIComponent(address)}`);
    throw new Error("Provide 'id' or 'chain'+'address'.");
  }),
});

/** 33. Arkham Exchange tokens */
export const arkhamExchangeTokens = tool({
  description:
    "Get list of tokens available on Arkham Exchange.",
  parameters: z.object({}),
  execute: wrapExecute(async () => {
    return arkhamGet("/token/arkham_exchange_tokens");
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: SWAPS (DEX TRADES)
// ═══════════════════════════════════════════════════════════════════════════════

/** 34. Swaps (DEX trades) */
export const arkhamSwaps = tool({
  description:
    "Get DEX swap/trade history from Arkham Intelligence. Filter by address, entity, protocol (Uniswap, etc.), tokens, time, and USD value. Rate limited to 1 req/sec.",
  parameters: z.object({
    base: z.string().optional().describe("Filter by address or entity involved in the swap."),
    chains: z.string().optional().describe("Comma-separated chains."),
    flow: z.string().optional().describe("'in' (receiving token1), 'out' (sending token0), 'all'."),
    from: z.string().optional().describe("Sender filter."),
    to: z.string().optional().describe("Receiver filter."),
    tokens: z.string().optional().describe("Token filter (appears in either side of swap)."),
    protocols: z.string().optional().describe("DEX/protocol filter (e.g., 'uniswap', 'sushiswap')."),
    counterparties: z.string().optional().describe("Counterparty filter."),
    timeLast: z.string().optional().describe("Duration: '24h', '7d'."),
    timeGte: z.string().optional().describe("Start time."),
    timeLte: z.string().optional().describe("End time."),
    usdGte: numericStringParam().optional().describe("Min USD value."),
    usdLte: numericStringParam().optional().describe("Max USD value."),
    sortKey: z.string().optional().describe("Sort by: 'time', 'usd'."),
    sortDir: z.string().optional().describe("'asc' or 'desc'."),
    limit: numericStringParam().optional().describe("Max results (default 20)."),
    offset: numericStringParam().optional().describe("Pagination offset."),
  }),
  execute: wrapExecute(async (args) => {
    return arkhamGet("/swaps", args as any);
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: NETWORKS & INFRASTRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/** 35. Supported chains */
export const arkhamChains = tool({
  description:
    "Get list of all blockchain networks supported by Arkham Intelligence. Returns chain IDs, names, and status.",
  parameters: z.object({}),
  execute: wrapExecute(async () => {
    return arkhamGet("/chains");
  }),
});

/** 36. Network status */
export const arkhamNetworkStatus = tool({
  description:
    "Get current status for all blockchain networks monitored by Arkham — shows indexing status, block heights, and health.",
  parameters: z.object({}),
  execute: wrapExecute(async () => {
    return arkhamGet("/networks/status");
  }),
});

/** 37. Network history */
export const arkhamNetworkHistory = tool({
  description:
    "Get historical data for a specific blockchain network — shows network metrics over time.",
  parameters: z.object({
    chain: z.string().describe("The blockchain to query (e.g., 'ethereum', 'bitcoin', 'solana')."),
  }),
  execute: wrapExecute(async ({ chain }) => {
    return arkhamGet(`/networks/history/${encodeURIComponent(chain)}`);
  }),
});

/** 38. Cluster summary */
export const arkhamClusterSummary = tool({
  description:
    "Get summary statistics for an address cluster — groups of addresses linked through on-chain heuristics (e.g., Bitcoin input clustering). Shows address count, total balance, volume, first/last activity.",
  parameters: z.object({
    id: z.string().describe("The cluster ID."),
  }),
  execute: wrapExecute(async ({ id }) => {
    return arkhamGet(`/cluster/${encodeURIComponent(id)}/summary`);
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: MARKET DATA
// ═══════════════════════════════════════════════════════════════════════════════

/** 39. Altcoin index */
export const arkhamAltcoinIndex = tool({
  description:
    "Get the Arkham Altcoin Index — a composite metric showing altcoin market performance relative to Bitcoin.",
  parameters: z.object({}),
  execute: wrapExecute(async () => {
    return arkhamGet("/marketdata/altcoin_index");
  }),
});

/** 40. ARKM circulating supply */
export const arkhamCirculatingSupply = tool({
  description:
    "Get the current circulating supply of the ARKM token.",
  parameters: z.object({}),
  execute: wrapExecute(async () => {
    return arkhamGet("/arkm/circulating");
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: TAGS
// ═══════════════════════════════════════════════════════════════════════════════

/** 41. Tag info — params & summary */
export const arkhamTagInfo = tool({
  description:
    "Get details about an Arkham tag — tag parameters and summary statistics (address count, balance, volume). Tags categorize addresses/entities (e.g., 'whale', 'kol', 'gnosis-safe-signer').",
  parameters: z.object({
    id: z.string().describe("The tag ID (e.g., 'whale', 'gnosis-safe-signer')."),
    includeParams: z.boolean().optional().describe("If true, also fetches tag parameters. Defaults to true."),
  }),
  execute: wrapExecute(async ({ id, includeParams = true }) => {
    const summary = await arkhamGet(`/tag/${encodeURIComponent(id)}/summary`);
    if (includeParams) {
      const params = await arkhamGet(`/tag/${encodeURIComponent(id)}/params`);
      return { summary, params };
    }
    return summary;
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10: USER / PRIVATE ENTITIES & LABELS
// ═══════════════════════════════════════════════════════════════════════════════

/** 42. User entities management */
export const arkhamUserEntities = tool({
  description:
    "Manage private entities on Arkham Intelligence. List all private entities, get a specific entity by ID, or update a private entity by adding addresses.",
  parameters: z.object({
    action: z.enum(["list", "get", "update"]).describe("'list' all entities, 'get' specific by ID, or 'update' (add addresses) by ID."),
    id: z.string().optional().describe("Entity ID — required for 'get' and 'update' actions."),
    addresses: z.array(z.string()).optional().describe("Addresses to add — required for 'update' action."),
  }),
  execute: wrapExecute(async ({ action, id, addresses }) => {
    switch (action) {
      case "list":
        return arkhamGet("/user/entities");
      case "get":
        if (!id) throw new Error("Entity ID required for 'get' action.");
        return arkhamGet(`/user/entities/${encodeURIComponent(id)}`);
      case "update":
        if (!id) throw new Error("Entity ID required for 'update' action.");
        if (!addresses || addresses.length === 0) throw new Error("Addresses required for 'update' action.");
        return arkhamPut(`/user/entities/only_add/${encodeURIComponent(id)}`, { addresses });
      default:
        throw new Error("Invalid action.");
    }
  }),
});

/** 43. User labels */
export const arkhamUserLabels = tool({
  description:
    "Get or create custom address labels on Arkham Intelligence. Labels let you tag addresses with custom names for easier tracking.",
  parameters: z.object({
    action: z.enum(["get", "create"]).describe("'get' existing labels or 'create' new ones."),
    labels: z.array(z.object({
      address: z.string().describe("Blockchain address to label."),
      name: z.string().describe("Label name."),
      chainType: z.string().optional().describe("Chain type (e.g., 'evm', 'bitcoin', 'solana')."),
    })).optional().describe("Array of labels to create — required for 'create' action."),
  }),
  execute: wrapExecute(async ({ action, labels }) => {
    if (action === "get") return arkhamGet("/user/labels");
    if (action === "create") {
      if (!labels || labels.length === 0) throw new Error("Labels required for 'create' action.");
      return arkhamPost("/user/labels", labels);
    }
    throw new Error("Invalid action.");
  }),
});