/**
 * In-memory ENS resolution cache with TTL.
 * ENS→address mappings are stable and rarely change,
 * so caching them avoids redundant RPC calls during a single session.
 */

interface CacheEntry {
  address: string;
  expiresAt: number;
}

// 10-minute TTL — ENS records rarely change mid-session
const DEFAULT_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

/**
 * Get a cached ENS resolution result.
 * Returns the address if cached and not expired, or null.
 */
export function getCachedEns(name: string): string | null {
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
 * Cache an ENS resolution result.
 */
export function setCachedEns(name: string, address: string, ttlMs: number = DEFAULT_TTL_MS): void {
  const key = name.toLowerCase();
  cache.set(key, {
    address,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Clear all cached ENS entries.
 */
export function clearEnsCache(): void {
  cache.clear();
}
