/**
 * Real-time Spot Price Fetcher and Binary Option Pricing Model for DreamDEX
 */

// Cache for live spot prices (15s TTL)
interface PriceCacheEntry {
  price: number;
  timestamp: number;
}

const priceCache: Record<string, PriceCacheEntry> = {};
const CACHE_TTL_MS = 60_000;
const STALE_TTL_MS = 300_000;

// Fallback baseline prices if external APIs are completely unreachable
const FALLBACK_PRICES: Record<string, number> = {
  BTC: 79_350.0,
  ETH: 2_490.0,
  SOMI: 0.45,
};

/**
 * Fetch live spot price for an asset (BTC, ETH, SOMI) with caching and fallbacks
 */
export async function getLiveSpotPrice(asset: string): Promise<number> {
  const normAsset = asset.toUpperCase();
  const cached = priceCache[normAsset];
  const now = Date.now();

  if (cached) {
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.price;
    }
    // Stale-While-Revalidate: Return cached price immediately and refresh in background
    if (now - cached.timestamp < STALE_TTL_MS) {
      revalidateSpotPrice(normAsset).catch(() => {});
      return cached.price;
    }
  }

  let price: number | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    if (normAsset === "BTC") {
      // DexScreener WBTC pool
      const res = await fetch(
        "https://api.dexscreener.com/latest/dex/tokens/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        const p = parseFloat(data.pairs?.[0]?.priceUsd);
        if (!isNaN(p) && p > 1000) price = p;
      }
    } else if (normAsset === "ETH") {
      // DexScreener Uniswap v3 USDC/ETH pool
      const res = await fetch(
        "https://api.dexscreener.com/latest/dex/pairs/ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        const p = parseFloat(data.pair?.priceUsd);
        if (!isNaN(p) && p > 100) price = p;
      }
    }
    clearTimeout(timeout);
  } catch (err) {
    // Silently fall back
  }

  if (!price) {
    price = cached?.price || FALLBACK_PRICES[normAsset] || 1.0;
  }

  priceCache[normAsset] = { price, timestamp: now };
  return price;
}

/**
 * Standard normal CDF approximation (Abramowitz & Stegun 7.1.26)
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * absX);
  const y =
    1.0 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) *
      t *
      Math.exp(-absX * absX);

  return 0.5 * (1.0 + sign * y);
}

/**
 * Binary Call option pricing: Probability S >= K at expiry
 * Uses Black-Scholes Cash-or-Nothing Call probability N(d2)
 */
export function calcBinaryProbability(
  spot: number,
  strike: number,
  expirySec: number,
  nowSec: number = Math.floor(Date.now() / 1000),
  annualVol: number = 0.65 // 65% crypto annual vol
): number {
  if (strike <= 0) return 0.5;

  const timeLeftYears = (expirySec - nowSec) / (365 * 24 * 3600);

  // If market already expired or imminent (< 10 seconds)
  if (timeLeftYears <= 0.0000003) {
    return spot >= strike ? 0.99 : 0.01;
  }

  const sigmaRootT = annualVol * Math.sqrt(timeLeftYears);
  const d2 =
    (Math.log(spot / strike) - 0.5 * annualVol * annualVol * timeLeftYears) /
    sigmaRootT;
  const prob = normalCDF(d2);

  // Bound between 0.02 and 0.98 during trading
  return Math.max(0.02, Math.min(0.98, prob));
}

/**
 * Helper to parse timeframe string from market symbol
 * (e.g. "BTC-UP-4h" -> "4h", "ETH-UP-2490-5m" -> "5m", "ETH-UP-1m" -> "1m")
 */
export function extractTimeframe(symbol: string): string {
  const match = symbol.match(/-([0-9]+[mhd])\b/i);
  if (match) return match[1].toLowerCase();
  if (symbol.includes("-4h")) return "4h";
  if (symbol.includes("-1h")) return "1h";
  if (symbol.includes("-5m")) return "5m";
  if (symbol.includes("-1m")) return "1m";
  return "1h";
}

/**
 * Helper to parse strike price from market symbol
 * (e.g. "ETH-UP-2490-5m" -> 2490, "BTC-UP-79465-5m" -> 79465)
 */
export function extractStrike(symbol: string, defaultStrike: number = 0): number {
  const match = symbol.match(/-UP-([0-9]{3,6})-[0-9]+[mhd]/i);
  if (match) {
    const s = parseFloat(match[1]);
    if (!isNaN(s) && s > 0) return s;
  }
  return defaultStrike;
}


async function revalidateSpotPrice(asset: string): Promise<void> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const normAsset = asset.toUpperCase();
    let price: number | null = null;
    if (normAsset === "BTC") {
      const res = await fetch("https://api.dexscreener.com/latest/dex/tokens/0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        const p = parseFloat(data.pairs?.[0]?.priceUsd);
        if (!isNaN(p) && p > 1000) price = p;
      }
    } else if (normAsset === "ETH") {
      const res = await fetch("https://api.dexscreener.com/latest/dex/pairs/ethereum/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640", { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        const p = parseFloat(data.pair?.priceUsd);
        if (!isNaN(p) && p > 100) price = p;
      }
    } else if (normAsset === "SOMI") {
      price = 0.45;
    }
    clearTimeout(timeout);
    if (price !== null) {
      priceCache[normAsset] = { price, timestamp: Date.now() };
    }
  } catch {}
}
