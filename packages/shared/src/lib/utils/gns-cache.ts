/**
 * In-memory GNS (.goat) resolution cache with TTL.
 * GNS→address mappings are stable and rarely change,
 * so caching them avoids redundant RPC calls during a single session.
 * 
 * Mirrors the ENS cache pattern (ens-cache.ts).
 */

interface CacheEntry {
  address: string;
  expiresAt: number;
}

// 10-minute TTL — GNS records rarely change mid-session
const DEFAULT_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

/**
 * Get a cached GNS resolution result.
 * Returns the address if cached and not expired, or null.
 */
export function getCachedGns(name: string): string | null {
  const key = name.toLowerCase();
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.address;
}

/**
 * Cache a GNS resolution result.
 */
export function setCachedGns(name: string, address: string, ttlMs: number = DEFAULT_TTL_MS): void {
  const key = name.toLowerCase();
  cache.set(key, {
    address,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Clear all cached GNS entries.
 */
export function clearGnsCache(): void {
  cache.clear();
}
