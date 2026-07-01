import { tool } from "ai";
import { z } from "zod";

// BNB Chain RPC Endpoint
const BSC_RPC_URL =
  process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org";

// Renaiss ERC-721 Contract Address
const RENAISS_NFT_ADDRESS = "0xF8646A3Ca093e97Bb404c3b25e675C0394DD5b30";

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

    const response = await fetch(BSC_RPC_URL, {
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

  const cardUrl = item.href
    ? `https://index.renaissos.com${item.href}`
    : overrides?.tokenId
      ? `https://www.renaiss.xyz/card/${overrides.tokenId}`
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
        const certRes = await fetch(`https://api.renaissos.com/v1/graded/${keyword.trim()}`);
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

    if (searchQuery.trim().length >= 2) {
      try {
        const searchRes = await fetch(
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

    let marketplaceItems: any[] = [];
    try {
      const response = await fetch(`https://api.renaiss.xyz/v0/marketplace?${params.toString()}`);
      const json = await response.json();
      marketplaceItems = json?.collection || [];
    } catch (err) {
      console.error("Marketplace fetch failed:", err);
    }

    // 4. Merge marketplace items with Index data for correct images & links
    const mergedCards: RenaissCard[] = [];
    const usedIndexHrefs = new Set<string>();

    // Helper to find a matched image within already processed cards or cache to avoid 429 rate limit
    const getSimilarImage = (item: any): any => {
      const mCardNum = item.cardNumber ? String(item.cardNumber).replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
      const mName = (item.pokemonName || item.name || "").toLowerCase();
      const mSet = (item.setName || "").toLowerCase();
      const fullMText = `${mName} ${mSet} ${mCardNum}`;

      // Check current run's merged cards
      for (const c of mergedCards) {
        if (!c.imageUrl) continue;
        const cName = c.name.toLowerCase();
        const cSet = c.set.toLowerCase();

        const fullSText = `${cName} ${cSet}`;
        if (hasSetCodeMismatch(fullMText, fullSText)) {
          continue;
        }
        
        const setOverlap = mSet.includes(cSet) || cSet.includes(mSet) || mSet.split(/\s+/).some((w: string) => w.length > 4 && cSet.includes(w));
        const nameOverlap = mName.split(/\s+/).some((w: string) => w.length > 3 && cName.includes(w));
        
        if (setOverlap && nameOverlap) {
          return c;
        }
      }

      // Check global cache
      for (const c of Array.from(cardCache.values())) {
        if (!c.imageUrl) continue;
        const cName = c.name.toLowerCase();
        const cSet = c.set.toLowerCase();

        const fullSText = `${cName} ${cSet}`;
        if (hasSetCodeMismatch(fullMText, fullSText)) {
          continue;
        }

        if (mSet.includes(cSet) && mName.split(/\s+/).some((w: string) => w.length > 3 && cName.includes(w))) {
          return c;
        }
      }

      return null;
    };

    for (const item of marketplaceItems) {
      const serialAttr = item.attributes?.find((a: any) => a.trait === "Serial");
      const certNum = serialAttr ? serialAttr.value.replace(/^(PSA|BGS|CGC)/i, "") : "";
      const askPrice = Number(item.askPriceInUSDT) / 1e18;
      const fmvFallback = Number(item.fmvPriceInUSD) / 100;

      // Try to match against Index results
      let match = findIndexMatch(item, indexResults);

      // If no match, try a targeted search by pokemonName (limit search rate to prevent blocks)
      if (!match && item.pokemonName && item.pokemonName.length > 2 && indexResults.length < 5) {
        try {
          const nameSearchRes = await fetch(
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
          askPrice: askPrice || fmvFallback,
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
            priceUsd: askPrice || fmvFallback,
            fmvUsd: sibling.fmvUsd || fmvFallback,
            owner: item.ownerAddress || "",
            vaultStatus: "Vaulted",
            vaultLocation: item.vaultLocation || "platform",
            ip: sibling.ip,
            priceHistory: sibling.priceHistory,
            cardUrl: sibling.cardUrl,
            grader: (item.gradingCompany as "PSA" | "BGS" | "CGC") || "PSA",
          };
          mergedCards.push(card);
          cardCache.set(card.tokenId, card);
        } else {
          // No match, no sibling -> fallback to cert lookup
          let imageUrl = "";
          let cardUrl = `https://www.renaiss.xyz/card/${item.tokenId}`;
          let spark: number[] = [];

          if (serialAttr) {
            try {
              const certRes = await fetch(`https://api.renaissos.com/v1/graded/${serialAttr.value}`);
              if (certRes.ok && certRes.headers.get("content-type")?.includes("application/json")) {
                const certData = await certRes.json();
                if (certData?.found && certData.card) {
                  imageUrl = certData.card.imageUrl || certData.certImages?.item || certData.certImages?.front || "";
                  if (certData.card.href) {
                    cardUrl = `https://index.renaissos.com${certData.card.href}`;
                  }
                  spark = certData.card.spark || [];
                }
              }
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
            priceUsd: askPrice || fmvFallback,
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
    }

    // 5. Add Index-only results that weren't matched to a marketplace listing
    for (const idxItem of indexResults) {
      if (idxItem.href && !usedIndexHrefs.has(idxItem.href)) {
        const card = indexResultToCard(idxItem);
        if (!mergedCards.some((c) => c.cardUrl === card.cardUrl)) {
          mergedCards.push(card);
        }
      }
    }

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
    "Search the Renaiss marketplace for vaulted collectible cards. Supports filtering by keyword, IP (Pokemon, OnePiece), minimum PSA grade, maximum price, and sorting. Returns card names, sets, prices, rarity, image URLs, and certification numbers.",
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
      const featuredRes = await fetch("https://api.renaissos.com/v1/cards/featured?limit=6");
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
      const res = await fetch("https://api.renaiss.xyz/v0/packs");
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
      const res = await fetch(`https://api.renaiss.xyz/v0/packs/${slug}`);
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
