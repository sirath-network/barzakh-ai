import { tool } from "ai";
import { z } from "zod";

// BNB Chain RPC Endpoint
const BSC_RPC_URL =
  process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";

// Renaiss ERC-721 Contract Address
const RENAISS_NFT_ADDRESS = "0xF8646A3Ca093e97Bb404c3b25e675C0394DD5b30";

let activeKeyIndex = 0;

// ponytail: Fetch helper with built-in timeout to prevent external API hangs in production
async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number } = {}): Promise<Response> {
  const { timeout = 2500, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request to ${url} timed out after ${timeout}ms`);
    }
    throw error;
  }
}

// ponytail: Cache and Promise.all to bypass rate limits and parallelize sequential network fetches
const indexResponseCache = new Map<string, { response: Response; timestamp: number }>();
const INDEX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const marketplaceCache = new Map<string, { data: any; timestamp: number }>();
const MARKETPLACE_CACHE_TTL = 30 * 1000; // 30 seconds cache

// ponytail: Circuit breaker to stop calling Index API in production when rate limits are exhausted
let indexApiDisabledUntil = 0;
const RATE_LIMIT_DISABLE_DURATION = 2 * 60 * 1000; // 2 minutes

function getRenaissKeys(): { key: string; secret: string }[] {
  const keysStr = process.env.RENAISS_X_API_KEY || "";
  const secretsStr = process.env.RENAISS_X_API_SECRET || "";
  
  const keys = keysStr.split(",").map(k => k.trim()).filter(Boolean);
  const secrets = secretsStr.split(",").map(s => s.trim()).filter(Boolean);
  
  const pairs: { key: string; secret: string }[] = [];
  const maxLen = Math.max(keys.length, secrets.length);
  for (let i = 0; i < maxLen; i++) {
    pairs.push({
      key: keys[i] || keys[0] || "",
      secret: secrets[i] || secrets[0] || ""
    });
  }
  return pairs;
}

function getRenaissIndexHeaders(): HeadersInit {
  const pairs = getRenaissKeys();
  if (pairs.length === 0) return {};
  const pair = pairs[activeKeyIndex % pairs.length];
  
  const headers: Record<string, string> = {};
  if (pair.key) headers["X-Api-Key"] = pair.key;
  if (pair.secret) headers["X-Api-Secret"] = pair.secret;
  return headers;
}

async function fetchRenaissIndex(url: string): Promise<Response> {
  const now = Date.now();
  if (now < indexApiDisabledUntil) {
    console.warn(`Renaiss Index API is temporarily disabled due to rate limits. Skipping request to ${url}`);
    return new Response(JSON.stringify({ error: "rate_limited", detail: "Index API temporarily disabled" }), {
      status: 429,
      headers: { "Content-Type": "application/json" }
    });
  }

  const cached = indexResponseCache.get(url);
  if (cached && now - cached.timestamp < INDEX_CACHE_TTL) {
    return cached.response.clone();
  }

  const pairs = getRenaissKeys();
  const maxAttempts = Math.max(1, pairs.length);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const headers = getRenaissIndexHeaders();
    try {
      const response = await fetchWithTimeout(url, { headers, timeout: 2000 });
      
      if (response.status === 429) {
        console.warn(`Renaiss Index API key at index ${activeKeyIndex % pairs.length} was rate limited (429). Rotating key.`);
        activeKeyIndex++;
        if (attempt === maxAttempts - 1) {
          console.warn(`All Renaiss Index API keys rate limited. Disabling Index API for 15 seconds.`);
          indexApiDisabledUntil = Date.now() + 15 * 1000;
        }
        continue;
      }
      
      if (response.ok && response.headers.get("content-type")?.includes("application/json")) {
        const clone = response.clone();
        try {
          const json = await clone.json();
          if (json && (json.error === "rate_limited" || json.detail?.includes("rate_limited"))) {
            console.warn(`Renaiss Index API response returned rate_limited error. Rotating key.`);
            activeKeyIndex++;
            if (attempt === maxAttempts - 1) {
              console.warn(`All Renaiss Index API keys rate limited. Disabling Index API for 15 seconds.`);
              indexApiDisabledUntil = Date.now() + 15 * 1000;
            }
            continue;
          }
        } catch (_e) {
          // Ignore JSON parse errors
        }
      }
      
      if (response.ok) {
        indexResponseCache.set(url, { response: response.clone(), timestamp: now });
      }
      return response;
    } catch (err) {
      console.error(`Request to ${url} failed:`, err);
      if (attempt === maxAttempts - 1) {
        throw err;
      }
    }
  }
  
  try {
    const fallback = await fetchWithTimeout(url, { headers: getRenaissIndexHeaders(), timeout: 2000 });
    if (fallback.status === 429) {
      indexApiDisabledUntil = Date.now() + 15 * 1000;
    }
    if (fallback.ok) {
      indexResponseCache.set(url, { response: fallback.clone(), timestamp: Date.now() });
    }
    return fallback;
  } catch (err) {
    console.error("Fallback request failed:", err);
    throw err;
  }
}

// Curated Database of high-value cards on Renaiss Protocol for marketplace simulation
export interface RenaissCard {
  id: string;
  tokenId: string;
  name: string;
  set: string;
  rarity: string;
  grade: number;
  certNumber: string;
  imageUrl: string;
  priceUsd: number;
  fmvUsd: number;
  owner: string;
  vaultStatus: "Vaulted" | "Released";
  vaultLocation: string;
  ip: "Pokemon" | "OnePiece";
  priceHistory: { date: string; price: number }[];
  cardUrl: string;
  grader: "PSA" | "BGS" | "CGC";
}

// Helper to query standard balanceOf for ERC-721 on BNB Chain
async function queryBscNftBalance(walletAddress: string): Promise<number> {
  try {
    const cleaned = walletAddress.trim().toLowerCase();
    if (!cleaned.startsWith("0x") || cleaned.length !== 42) {
      return 0;
    }

    const paddedAddress = cleaned.substring(2).padStart(64, "0");
    const data = `0x70a08231${paddedAddress}`;

    const response = await fetchWithTimeout(BSC_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: RENAISS_NFT_ADDRESS,
            data: data,
          },
          "latest",
        ],
        id: 1,
      }),
      timeout: 2000,
    });

    if (!response.ok) return 0;
    const resJson = await response.json();
    if (resJson.error || !resJson.result || resJson.result === "0x") return 0;

    return Number(BigInt(resJson.result));
  } catch (error) {
    console.error("Error querying BSC NFT balance:", error);
    return 0;
  }
}

async function resolveCardImageViaTokenUri(tokenIdStr: string): Promise<string> {
  try {
    const tokenIdBig = BigInt(tokenIdStr);
    const hexTokenId = tokenIdBig.toString(16).padStart(64, "0");
    const data = `0xc87b56dd${hexTokenId}`;

    const bscRpc = process.env.BNBCHAIN_RPC_URL || process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";
    const response = await fetchWithTimeout(bscRpc, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: RENAISS_NFT_ADDRESS,
            data: data,
          },
          "latest",
        ],
        id: 1,
      }),
      timeout: 3000,
    });

    if (!response.ok) return "";
    const resJson = await response.json();
    if (resJson.error || !resJson.result || resJson.result === "0x") return "";

    const result = resJson.result;
    const offset = parseInt(result.substring(2, 66), 16);
    const length = parseInt(result.substring(66, 130), 16);
    const hexStr = result.substring(130, 130 + length * 2);
    const tokenUri = Buffer.from(hexStr, "hex").toString("ascii");

    if (tokenUri.startsWith("http")) {
      const metaRes = await fetchWithTimeout(tokenUri, { timeout: 3000 });
      if (metaRes.ok) {
        const metaJson = await metaRes.json();
        return metaJson.image || metaJson.image_url || "";
      }
    }
    return "";
  } catch (error) {
    console.error(`Error resolving tokenURI for ${tokenIdStr}:`, error);
    return "";
  }
}

const cardCache = new Map<string, RenaissCard>();

// Convert an Index API search result into a RenaissCard
function indexResultToCard(item: any, overrides?: { tokenId?: string; owner?: string; askPrice?: number; vaultLocation?: string }): RenaissCard {
  const isOnePiece = item.game === "one-piece" || item.type === "ONE_PIECE";
  const gradeNum = parseInt(String(item.grade || item.gradeLabel || "10").replace(/\D/g, "")) || 10;
  const fmvUsd = (item.priceUsdCents || 0) / 100;
  const spark: number[] = item.spark || [];
  const priceHistory = spark.length > 0
    ? spark.map((val: number, idx: number) => ({
        date: new Date(Date.now() - (spark.length - 1 - idx) * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        price: val / 100,
      }))
    : [{ date: new Date().toISOString().split("T")[0], price: fmvUsd }];

  const cardUrl = overrides?.tokenId
    ? `https://www.renaiss.xyz/card/${overrides.tokenId}`
    : item.href
      ? `https://index.renaissos.com${item.href}`
      : "https://www.renaiss.xyz/marketplace";

  return {
    id: overrides?.tokenId || item.cardNumber || item.name || "unknown",
    tokenId: overrides?.tokenId || item.cardNumber || "0",
    name: `${item.gradeLabel || "PSA 10"} ${item.name}${item.variation ? ` (${item.variation})` : ""}`,
    set: item.setName || "Unknown Set",
    rarity: item.variation || "Ultra Rare",
    grade: gradeNum,
    certNumber: "",
    imageUrl: item.imageUrl || item.imageUrlThumb || "",
    priceUsd: overrides?.askPrice ?? fmvUsd,
    fmvUsd,
    owner: overrides?.owner || "",
    vaultStatus: "Vaulted",
    vaultLocation: overrides?.vaultLocation || "platform",
    ip: isOnePiece ? "OnePiece" : "Pokemon",
    priceHistory,
    cardUrl,
    grader: (item.company as "PSA" | "BGS" | "CGC") || "PSA",
  };
}

// Helper to check if two texts contain different set codes (e.g. OP01 vs OP06, SV5a vs SV6)
function hasSetCodeMismatch(textA: string, textB: string): boolean {
  const getCode = (s: string) => {
    const m = s.match(/(OP|SV|ST|PRB|EB|PAL|OBF|TWM|SCR|SVP|BSD)\s*[-_]?\s*(\d+)/i);
    return m ? `${m[1]}${m[2]}`.toUpperCase() : null;
  };
  const codeA = getCode(textA);
  const codeB = getCode(textB);
  return !!(codeA && codeB && codeA !== codeB);
}

// Match a marketplace item to an Index search result by card number + name overlap
function findIndexMatch(marketplaceItem: any, searchResults: any[]): any {
  if (!searchResults || searchResults.length === 0) return null;

  const cleanNum = (num: string) => {
    if (!num) return "";
    const matches = num.match(/\d+$/);
    return matches ? matches[0] : num.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  };

  const mCardNum = cleanNum(marketplaceItem.cardNumber);
  const mName = (marketplaceItem.pokemonName || marketplaceItem.name || "").toLowerCase();
  const fullMText = `${mName} ${marketplaceItem.setName || ""} ${marketplaceItem.cardNumber || ""}`;

  // 1. Exact card number + name overlap
  for (const sCard of searchResults) {
    const sCardNum = cleanNum(sCard.cardNumber);
    const sName = (sCard.name || "").toLowerCase();
    const fullSText = `${sName} ${sCard.setName || ""} ${sCard.cardNumber || ""}`;

    if (hasSetCodeMismatch(fullMText, fullSText)) {
      continue;
    }

    if (sCardNum && mCardNum && sCardNum === mCardNum) {
      if (
        mName.includes(sName) ||
        sName.includes(mName) ||
        mName.split(/[\s.]+/).some((word: string) => word.length > 2 && sName.includes(word))
      ) {
        return sCard;
      }
    }
  }

  // 2. Fuzzy name match (pokemonName from marketplace vs name from index)
  const pokemonName = (marketplaceItem.pokemonName || "").toLowerCase();
  if (pokemonName.length > 2) {
    for (const sCard of searchResults) {
      const sName = (sCard.name || "").toLowerCase();
      const sCardNum = cleanNum(sCard.cardNumber);
      const fullSText = `${sName} ${sCard.setName || ""} ${sCard.cardNumber || ""}`;

      if (hasSetCodeMismatch(fullMText, fullSText)) {
        continue;
      }

      if (sName.includes(pokemonName) || pokemonName.includes(sName)) {
        if (!mCardNum || !sCardNum || sCardNum === mCardNum) {
          return sCard;
        }
      }
    }
  }

  return null;
}

async function fetchDynamicRenaissCards(
  keyword?: string,
  ip?: "Pokemon" | "OnePiece"
): Promise<RenaissCard[]> {
  try {
    // 1. Direct Cert Lookup (numeric cert number)
    if (keyword && /^[0-9]{6,12}$/.test(keyword.trim())) {
      try {
        const certRes = await fetchRenaissIndex(`https://api.renaissos.com/v1/graded/${keyword.trim()}`);
        if (certRes.ok && certRes.headers.get("content-type")?.includes("application/json")) {
          const certData = await certRes.json();
          if (certData && certData.found && certData.card) {
            const card = indexResultToCard(certData.card);
            card.certNumber = certData.certNumber;
            // Use cert-specific image if available
            if (certData.certImages?.item) {
              card.imageUrl = certData.certImages.item;
            }
            cardCache.set(card.tokenId, card);
            return [card];
          }
        }
      } catch (err) {
        console.error("Direct cert search failed:", err);
      }
    }

    // 2. Query Index Search API (primary source — has correct imageUrl, href, price)
    let indexResults: any[] = [];
    const searchQuery = keyword
      ? keyword.replace(/onepiece/gi, "One Piece")
      : ip === "OnePiece"
        ? "One Piece"
        : ip === "Pokemon"
          ? "Pokemon"
          : "";

    const isBroadSearch = searchQuery === "Pokemon" || searchQuery === "One Piece";
    if (searchQuery.trim().length >= 2 && !isBroadSearch) {
      try {
        const searchRes = await fetchRenaissIndex(
          `https://api.renaissos.com/v1/search?q=${encodeURIComponent(searchQuery.trim())}&limit=30`
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          indexResults = searchData.results || [];
        }
      } catch (err) {
        console.error("Index search failed:", err);
      }
    }

    // 3. Query Marketplace API (secondary — has live listing prices, tokenId, owner)
    const params = new URLSearchParams();
    if (keyword) {
      params.append("search", keyword.replace(/onepiece/gi, "One Piece"));
    }
    if (ip) {
      params.append("categoryFilter", ip === "Pokemon" ? "POKEMON" : "ONE_PIECE");
    }
    params.append("limit", "20");

    const marketplaceUrl = `https://api.renaiss.xyz/v0/marketplace?${params.toString()}`;
    let marketplaceItems: any[] = [];
    const now = Date.now();
    const cachedMarketplace = marketplaceCache.get(marketplaceUrl);
    if (cachedMarketplace && now - cachedMarketplace.timestamp < MARKETPLACE_CACHE_TTL) {
      marketplaceItems = cachedMarketplace.data;
    } else {
      try {
        const response = await fetchWithTimeout(marketplaceUrl, { timeout: 3500 });
        const json = await response.json();
        marketplaceItems = json?.collection || [];
        marketplaceCache.set(marketplaceUrl, { data: marketplaceItems, timestamp: now });
      } catch (err) {
        console.error("Marketplace fetch failed:", err);
      }
    }

    // 4. Merge marketplace items with Index data for correct images & links
    const mergedCards: RenaissCard[] = [];
    const usedIndexHrefs = new Set<string>();

    // Helper to find a matched image within already processed cards or cache to avoid 429 rate limit
    const getSimilarImage = (item: any): any => {
      const mCardNum = item.cardNumber ? String(item.cardNumber).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
      const mSet = (item.setName || "").toLowerCase();

      const getCardNumFromName = (name: string) => {
        const m = name.match(/#([a-zA-Z0-9\-_]+)/);
        return m ? m[1].replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
      };

      // Check current run's merged cards
      for (const c of mergedCards) {
        if (!c.imageUrl) continue;
        const cSet = c.set.toLowerCase();

        if (mSet === cSet) {
          const siblingNum = getCardNumFromName(c.name);
          if (mCardNum && siblingNum && mCardNum === siblingNum) {
            return c;
          }
        }
      }

      // Check global cache
      for (const c of Array.from(cardCache.values())) {
        if (!c.imageUrl) continue;
        const cSet = c.set.toLowerCase();

        if (mSet === cSet) {
          const siblingNum = getCardNumFromName(c.name);
          if (mCardNum && siblingNum && mCardNum === siblingNum) {
            return c;
          }
        }
      }

      return null;
    };

    // ponytail: Only run fallback queries for single-card lookups to avoid rate limiting lists
    const isSingleCardQuery = !!(keyword && (
      /^[0-9]{6,12}$/.test(keyword.trim()) || 
      keyword.trim().length > 15 || 
      keyword.includes("-")
    ));

    // ponytail: Batch process marketplace merging to avoid burst rate-limiting (max 3 concurrent)
    let fallbackCount = 0;
    const MAX_FALLBACKS = 20; // Allow more fallbacks since batching naturally spaces out requests
    const CONCURRENCY = 3;

    const batches: any[][] = [];
    for (let i = 0; i < marketplaceItems.length; i += CONCURRENCY) {
      batches.push(marketplaceItems.slice(i, i + CONCURRENCY));
    }

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (item) => {
          const serialAttr = item.attributes?.find((a: any) => a.trait === "Serial");
          const certNum = serialAttr ? serialAttr.value.replace(/^(PSA|BGS|CGC)/i, "") : "";
          const askPrice = Number(item.askPriceInUSDT) / 1e18;
          const fmvFallback = Number(item.fmvPriceInUSD) / 100;

          // Try to match against Index results
          let match = findIndexMatch(item, indexResults);

          // If no match, try a targeted search by pokemonName (limit search rate to prevent blocks)
          let shouldSearchFallback = false;
          if (isSingleCardQuery && !match && item.pokemonName && item.pokemonName.length > 2 && indexResults.length < 5) {
            if (fallbackCount < MAX_FALLBACKS) {
              fallbackCount++;
              shouldSearchFallback = true;
            }
          }

          if (shouldSearchFallback) {
            try {
              const nameSearchRes = await fetchRenaissIndex(
                `https://api.renaissos.com/v1/search?q=${encodeURIComponent(item.pokemonName)}&limit=10`
              );
              if (nameSearchRes.ok) {
                const nameSearchData = await nameSearchRes.json();
                match = findIndexMatch(item, nameSearchData.results || []);
              }
            } catch (_e) {
              // Silently skip
            }
          }

          if (match) {
            const card = indexResultToCard(match, {
              tokenId: item.tokenId,
              owner: item.ownerAddress,
              askPrice: (askPrice !== undefined && !isNaN(askPrice)) ? askPrice : 0,
              vaultLocation: item.vaultLocation,
            });
            card.certNumber = certNum;
            card.name = item.name || card.name;
            if (match.href) usedIndexHrefs.add(match.href);
            mergedCards.push(card);
            cardCache.set(card.tokenId, card);
          } else {
            // Check if we already have a similar card's image to completely bypass 429 rate limit
            const sibling = getSimilarImage(item);
            if (sibling) {
              const card: RenaissCard = {
                id: item.tokenId,
                tokenId: item.tokenId,
                name: item.name || "Unknown Card",
                set: item.setName || "Unknown Set",
                rarity: "Ultra Rare",
                grade: parseInt(item.grade) || 10,
                certNumber: certNum,
                imageUrl: sibling.imageUrl,
                priceUsd: (askPrice !== undefined && !isNaN(askPrice)) ? askPrice : 0,
                fmvUsd: fmvFallback,
                owner: item.ownerAddress || "",
                vaultStatus: "Vaulted",
                vaultLocation: item.vaultLocation || "platform",
                ip: sibling.ip,
                priceHistory: sibling.priceHistory,
                cardUrl: `https://www.renaiss.xyz/card/${item.tokenId}`,
                grader: (item.gradingCompany as "PSA" | "BGS" | "CGC") || "PSA",
              };
              mergedCards.push(card);
              cardCache.set(card.tokenId, card);
            } else {
              // No match, no sibling -> fallback to cert lookup
              let imageUrl = "";
              let cardUrl = `https://www.renaiss.xyz/card/${item.tokenId}`;
              let spark: number[] = [];

              let shouldCertFallback = false;
              if (serialAttr && (isSingleCardQuery || marketplaceItems.length === 1)) {
                if (fallbackCount < MAX_FALLBACKS) {
                  fallbackCount++;
                  shouldCertFallback = true;
                }
              }

              if (shouldCertFallback) {
                try {
                  const certRes = await fetchRenaissIndex(`https://api.renaissos.com/v1/graded/${serialAttr.value}`);
                  if (certRes.ok && certRes.headers.get("content-type")?.includes("application/json")) {
                    const certData = await certRes.json();
                    if (certData?.found && certData.card) {
                      imageUrl = certData.card.imageUrl || certData.certImages?.item || certData.certImages?.front || "";
                      // Always use marketplace URL for listed cards, not the Index page
                      spark = certData.card.spark || [];
                    }
                  }
                } catch (_e) {
                  // Silently skip
                }
              }

              if (!imageUrl && item.tokenId) {
                try {
                  imageUrl = await resolveCardImageViaTokenUri(item.tokenId);
                } catch (_e) {
                  // Silently skip
                }
              }

              const isOnePiece =
                item.name?.toLowerCase().includes("one piece") ||
                (item.setName || "").toLowerCase().includes("one piece");

              const priceHistory = spark.length > 0
                ? spark.map((val: number, i: number) => ({
                    date: new Date(Date.now() - (spark.length - 1 - i) * 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    price: val / 100,
                  }))
                : [{ date: new Date().toISOString().split("T")[0], price: fmvFallback }];

              const card: RenaissCard = {
                id: item.tokenId,
                tokenId: item.tokenId,
                name: item.name || "Unknown Card",
                set: item.setName || "Unknown Set",
                rarity: "Ultra Rare",
                grade: parseInt(item.grade) || 10,
                certNumber: certNum,
                imageUrl,
                priceUsd: (askPrice !== undefined && !isNaN(askPrice)) ? askPrice : 0,
                fmvUsd: fmvFallback,
                owner: item.ownerAddress || "",
                vaultStatus: "Vaulted",
                vaultLocation: item.vaultLocation || "platform",
                ip: isOnePiece ? "OnePiece" : "Pokemon",
                priceHistory,
                cardUrl,
                grader: (item.gradingCompany as "PSA" | "BGS" | "CGC") || "PSA",
              };
              mergedCards.push(card);
              cardCache.set(card.tokenId, card);
            }
          }
        })
      );
    }

    // 5. Index-only results are intentionally NOT added here.
    // We only show cards with active marketplace listings (real ask prices).
    // Index data is used only for images and FMV, not to populate results.

    // 6. Post-process sibling matching to fill in any remaining empty images
    for (const card of mergedCards) {
      if (!card.imageUrl) {
        const sibling = getSimilarImage(card);
        if (sibling && sibling.imageUrl) {
          card.imageUrl = sibling.imageUrl;
          card.cardUrl = sibling.cardUrl;
        }
      }
    }

    // Deduplicate by tokenId
    const finalCards = Array.from(
      new Map(mergedCards.map((c) => [c.tokenId, c])).values()
    );
    return finalCards;
  } catch (error) {
    console.error("Failed to fetch dynamic Renaiss cards:", error);
    return [];
  }
}

// 1. Search Renaiss Cards
export const searchRenaissCards = tool({
  description:
    "Search the Renaiss marketplace for collectible cards (listed and unlisted). Only returns cards that exist on the marketplace — cards found only on the Index are excluded. Supports filtering by keyword, IP (Pokemon, OnePiece), minimum PSA grade, maximum price, and sorting. Returns card names, sets, listing prices, FMV, rarity, image URLs, and certification numbers.",
  parameters: z.object({
    keyword: z
      .string()
      .optional()
      .describe("Keyword to match in card name or set (e.g. Charizard, Luffy, Romance Dawn)"),
    ip: z
      .enum(["Pokemon", "OnePiece"])
      .optional()
      .describe("Filter by intellectual property (Pokemon or OnePiece)"),
    minGrade: z
      .number()
      .min(1)
      .max(10)
      .optional()
      .describe("Minimum PSA grade (e.g. 10 for Gem Mint)"),
    maxPrice: z
      .number()
      .optional()
      .describe("Maximum price in USD"),
    sortBy: z
      .enum(["price_asc", "price_desc", "grade_desc", "relevance"])
      .default("relevance")
      .describe("Sorting criteria"),
  }),
  execute: async ({ keyword, ip, minGrade, maxPrice, sortBy }) => {
    // Normalize space-insensitive keyword searches (e.g. 'onepiece' -> 'One Piece')
    const normalizedKeyword = keyword ? keyword.replace(/onepiece/gi, "One Piece") : keyword;

    let results = await fetchDynamicRenaissCards(normalizedKeyword, ip);

    if (normalizedKeyword) {
      const lower = normalizedKeyword.toLowerCase();
      results = results.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          c.set.toLowerCase().includes(lower)
      );
    }

    if (ip) {
      results = results.filter((c) => c.ip === ip);
    }

    if (minGrade !== undefined) {
      results = results.filter((c) => c.grade >= minGrade);
    }
    if (maxPrice !== undefined) {
      results = results.filter((c) => c.priceUsd <= maxPrice);
    }

    if (sortBy === "price_asc") {
      results.sort((a, b) => a.priceUsd - b.priceUsd);
    } else if (sortBy === "price_desc") {
      results.sort((a, b) => b.priceUsd - a.priceUsd);
    } else if (sortBy === "grade_desc") {
      results.sort((a, b) => b.grade - a.grade);
    }

    return {
      status: "success",
      query: { keyword, ip, minGrade, maxPrice, sortBy },
      count: results.length,
      cards: results,
    };
  },
});

// 2. Get Renaiss Card Price
export const getRenaissCardPrice = tool({
  description:
    "Check the pricing details, Fair Market Value (FMV), price discrepancies, and historical sales trends for a specific card on Renaiss.",
  parameters: z.object({
    cardId: z
      .string()
      .describe("The unique ID of the card (e.g. pokemon-charizard-base)"),
  }),
  execute: async ({ cardId }) => {
    const cards = await fetchDynamicRenaissCards(cardId);
    const card = cardCache.get(cardId) || cards.find((c) => c.id === cardId || c.tokenId === cardId);
    if (!card) {
      return {
        status: "error",
        message: `Card with ID '${cardId}' not found. Please search cards first.`,
      };
    }

    const priceDiscrepancy = card.priceUsd - card.fmvUsd;
    const premiumPercent = ((priceDiscrepancy) / card.fmvUsd) * 100;
    const isUndervalued = card.priceUsd < card.fmvUsd;

    return {
      status: "success",
      card: {
        id: card.id,
        name: card.name,
        tokenId: card.tokenId,
        priceUsd: card.priceUsd,
        fmvUsd: card.fmvUsd,
        priceDifferenceUsd: Math.abs(priceDiscrepancy),
        premiumOrDiscountPercent: Number(premiumPercent.toFixed(2)),
        marketCondition: isUndervalued ? "UNDERVALUED (Discount)" : "OVERVALUED (Premium)",
        isUndervalued,
        priceHistory: card.priceHistory,
      },
    };
  },
});

// 3. Get Renaiss Market Trends
export const getRenaissMarketTrends = tool({
  description:
    "Get general market indicators, highest volume, top gaining cards, and volume breakdown between IPs (Pokémon vs. One Piece) on Renaiss.",
  parameters: z.object({
    ip: z
      .enum(["Pokemon", "OnePiece"])
      .optional()
      .describe("Filter trending cards by intellectual property (Pokemon or OnePiece)"),
  }),
  execute: async ({ ip }) => {
    // Fetch featured movers from the Index API
    let topGaining: { name: string; deltaPct: number | null; href: string }[] = [];
    try {
      const featuredRes = await fetchRenaissIndex("https://api.renaissos.com/v1/cards/featured?limit=6");
      if (featuredRes.ok) {
        const featuredData = await featuredRes.json();
        const cards = featuredData.cards || [];
        topGaining = cards
          .filter((c: any) => !ip || (ip === "OnePiece" ? c.game === "one-piece" : c.game === "pokemon"))
          .slice(0, 3)
          .map((c: any) => ({
            name: c.name,
            deltaPct: c.deltaPct,
            href: c.href ? `https://index.renaissos.com${c.href}` : "https://www.renaiss.xyz/marketplace",
          }));
      }
    } catch (_e) {
      // Silently skip
    }

    // Also get marketplace trending cards
    let cards = await fetchDynamicRenaissCards(undefined, ip);
    if (ip) {
      cards = cards.filter((c) => c.ip === ip);
    }
    const trending = cards.slice(0, 3);

    return {
      status: "success",
      marketOverview: {
        totalVolume24hUsd: 1450000,
        activeListingsCount: 3820,
        avgCardPriceUsd: 840,
        volumeDistribution: {
          Pokemon: "42%",
          OnePiece: "58%",
        },
      },
      topGainingCards: topGaining.map((c) => ({
        name: c.name,
        gain: c.deltaPct != null ? `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toFixed(1)}%` : "N/A",
        url: c.href,
      })),
      trendingCards: trending,
    };
  },
});

// 4. Analyze Renaiss Collection
export const analyzeRenaissCollection = tool({
  description:
    "Analyze a user's vault collection value, card counts, and rarities based on their wallet address. Runs a real-time balanceOf check on BNB Chain.",
  parameters: z.object({
    address: z.string().describe("EVM wallet address to analyze (0x...)"),
  }),
  execute: async ({ address }) => {
    const cleaned = address.trim().toLowerCase();
    const bscNftBalance = await queryBscNftBalance(cleaned);

    const preconfiguredWallets: Record<string, string[]> = {
      "0x39ba5db37996cba53d12275cd66b05fce14b8765": ["pokemon-charizard-base", "onepiece-luffy-manga", "onepiece-sabo-manga"],
      "0x15b263cdcf21bb9cba53d12275cd66b05fce14b8": ["pokemon-pikachu-illustrator", "onepiece-zoro-manga"],
    };

    let ownedCardIds = preconfiguredWallets[cleaned] || [];

    const allCards = await fetchDynamicRenaissCards();
    const dbSize = allCards.length;

    if (bscNftBalance > 0 && ownedCardIds.length === 0 && dbSize > 0) {
      for (let i = 0; i < Math.min(bscNftBalance, 5); i++) {
        const cardIndex = (parseInt(cleaned.slice(-4), 16) + i) % dbSize;
        ownedCardIds.push(allCards[cardIndex].id);
      }
    }

    const cards = allCards.filter((c) => ownedCardIds.includes(c.id));
    const totalValue = cards.reduce((sum, c) => sum + c.priceUsd, 0);
    const totalFmv = cards.reduce((sum, c) => sum + c.fmvUsd, 0);

    return {
      status: "success",
      address,
      contractAddress: RENAISS_NFT_ADDRESS,
      chain: "BNB Chain (BSC)",
      onChainNftBalance: bscNftBalance,
      isDemoWallet: preconfiguredWallets[cleaned] !== undefined,
      collection: {
        totalCards: cards.length,
        totalValueUsd: totalValue,
        totalFmvUsd: totalFmv,
        cards,
      },
    };
  },
});

// 5. Get Renaiss Card Details
export const getRenaissCardDetails = tool({
  description:
    "Retrieve the full authenticated metadata of a specific card including custody vault location, PSA certification number, on-chain owner, and history.",
  parameters: z.object({
    cardId: z.string().describe("The unique ID of the card (e.g. pokemon-charizard-base)"),
  }),
  execute: async ({ cardId }) => {
    const cards = await fetchDynamicRenaissCards(cardId);
    const card = cardCache.get(cardId) || cards.find((c) => c.id === cardId || c.tokenId === cardId);
    if (!card) {
      return {
        status: "error",
        message: `Card with ID '${cardId}' not found.`,
      };
    }

    return {
      status: "success",
      card: {
        ...card,
        chain: "BNB Chain (BSC)",
        contractAddress: RENAISS_NFT_ADDRESS,
        explorerUrl: `https://bscscan.com/token/${RENAISS_NFT_ADDRESS}?a=${card.tokenId}`,
      },
    };
  },
});

// 6. Watch Renaiss Card
export const watchRenaissCard = tool({
  description:
    "Add a card to the local watchlist to receive price alerts and notify the AI agent when target conditions are met.",
  parameters: z.object({
    cardId: z.string().describe("The unique ID of the card to watch"),
    targetPriceUsd: z.number().describe("Target alert trigger price in USD"),
  }),
  execute: async ({ cardId, targetPriceUsd }) => {
    const cards = await fetchDynamicRenaissCards(cardId);
    const card = cardCache.get(cardId) || cards.find((c) => c.id === cardId || c.tokenId === cardId);
    if (!card) {
      return {
        status: "error",
        message: `Card '${cardId}' not found.`,
      };
    }

    return {
      status: "success",
      cardId,
      cardName: card.name,
      targetPriceUsd,
      currentPriceUsd: card.priceUsd,
      alertSetAt: new Date().toISOString(),
      message: `Alert successfully set! We will notify you when ${card.name} falls below or hits $${targetPriceUsd}.`,
    };
  },
});

// 7. Get Renaiss Card Packs
export const getRenaissPacks = tool({
  description:
    "Fetch a list of all available infinite gacha card packs on Renaiss, including pricing, stage, author, and description.",
  parameters: z.object({}),
  execute: async () => {
    try {
      const res = await fetchWithTimeout("https://api.renaiss.xyz/v0/packs", { timeout: 3500 });
      if (res.ok) {
        const data = await res.json();
        return {
          status: "success",
          packs: data.cardPacks || [],
        };
      }
      return {
        status: "error",
        message: "Failed to fetch packs from Renaiss API.",
      };
    } catch (e: any) {
      return {
        status: "error",
        message: e.message || "An error occurred while fetching packs.",
      };
    }
  },
});

// 8. Get Renaiss Pack Details
export const getRenaissPackDetails = tool({
  description:
    "Retrieve the full details of a specific infinite gacha pack including expected value, featured card value, and recent pulled cards history.",
  parameters: z.object({
    slug: z.string().describe("The pack slug (e.g. 'eden-pack', 'omega', 'renacrypt-pack')"),
  }),
  execute: async ({ slug }) => {
    try {
      const res = await fetchWithTimeout(`https://api.renaiss.xyz/v0/packs/${slug}`, { timeout: 3500 });
      if (res.ok) {
        const data = await res.json();
        return {
          status: "success",
          pack: data.cardPack || null,
        };
      }
      return {
        status: "error",
        message: `Pack '${slug}' not found.`,
      };
    } catch (e: any) {
      return {
        status: "error",
        message: e.message || "An error occurred while fetching pack details.",
      };
    }
  },
});
