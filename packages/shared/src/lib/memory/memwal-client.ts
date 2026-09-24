/**
 * Walrus Memory (MemWal) Client Integration
 *
 * Provides persistent, decentralized, verifiable memory for Barzakh AI
 * using the official MemWal SDK (@mysten-incubation/memwal).
 *
 * Architecture:
 * - Memories are stored on Walrus decentralized storage
 * - Authenticated via Ed25519 delegate key
 * - Scoped by isolated namespaces per user: barzakh-user-${userId}[-v${version}]
 * - Hybrid recall: cosine similarity ranking with score threshold
 * - Tombstoning & versioning: supports instant full wipes and selective deletion
 *
 * @module @barzakh/shared/lib/memory/memwal-client
 */

import { MemWal } from "@mysten-incubation/memwal";
import type { RecallResult, RecallMemory } from "@mysten-incubation/memwal";

// ─── Configuration ───────────────────────────────────────────────────────────

const MEMWAL_SERVER_URL =
  process.env.MEMWAL_SERVER_URL || "https://relayer.memory.walrus.xyz";

/** Namespace prefix to avoid collisions across environments */
const NAMESPACE_PREFIX = process.env.MEMWAL_NAMESPACE_PREFIX || "barzakh-user";

/** Default similarity cutoff (cosine distance: lower = closer, 0 = identical) */
const DEFAULT_MAX_DISTANCE = 0.88;

/** Default number of memories to recall per turn */
const DEFAULT_MAX_MEMORIES = 5;

/** Minimum user message length worth saving (skip "hi", "ok", "yes") */
const MIN_SAVE_LENGTH = 15;

// ─── Singleton Client ────────────────────────────────────────────────────────

let _memwalClient: MemWal | null = null;

/**
 * Get or create the singleton MemWal client instance.
 * Returns null if credentials are not configured (graceful degradation).
 */
export function getMemWalClient(): MemWal | null {
  const key = process.env.MEMWAL_PRIVATE_KEY;
  const accountId = process.env.MEMWAL_ACCOUNT_ID;
  const serverUrl = MEMWAL_SERVER_URL;

  if (!key || !accountId) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[MemWal] Missing MEMWAL_PRIVATE_KEY or MEMWAL_ACCOUNT_ID — memory disabled"
      );
    }
    return null;
  }

  // Recreate client if key or accountId changed
  if (!_memwalClient) {
    try {
      _memwalClient = MemWal.create({
        key,
        accountId,
        serverUrl,
        namespace: "default",
      });
      console.log("[MemWal] Client initialized successfully");
    } catch (error) {
      console.error("[MemWal] Failed to initialize client:", error);
      return null;
    }
  }

  return _memwalClient;
}

// ─── Namespace Helpers ───────────────────────────────────────────────────────

/**
 * Derive a deterministic, isolated namespace for a user.
 * Uses the app's internal userId (UUID from auth) for isolation.
 * When namespaceVersion > 1, appends -v${version} for an instant clean slate.
 */
export function getUserNamespace(userId: string, version: number = 1): string {
  if (version > 1) {
    return `${NAMESPACE_PREFIX}-${userId}-v${version}`;
  }
  return `${NAMESPACE_PREFIX}-${userId}`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecalledMemoryItem {
  blobId?: string;
  text: string;
  distance: number;
}

export interface CachedMemoryParam {
  id?: string;
  jobId?: string;
  blobId?: string | null;
  text: string;
  createdAt?: string;
}

export interface RecallOptionsExtended {
  namespaceVersion?: number;
  cachedMemories?: CachedMemoryParam[];
  tombstones?: {
    blobIds?: string[];
    texts?: string[];
  };
}

// ─── Fast Candidate Extraction & Semantic Deduplication ─────────────────────

/**
 * Fast synchronous heuristic extraction of candidate facts from user text.
 * Runs in <1ms without any external network calls.
 */
export function extractFastCandidateFacts(text: string): string[] {
  if (!text || text.trim().length < 15) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const facts: string[] = [];

  for (const line of lines) {
    // 1. Check bullet points: "- ...", "* ...", "• ..."
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch && bulletMatch[1].length >= 10) {
      facts.push(bulletMatch[1].trim());
      continue;
    }

    // 2. Check numbered lists: "1. ...", "1) ..."
    const numberedMatch = line.match(/^\d+[\.\)]\s+(.+)$/);
    if (numberedMatch && numberedMatch[1].length >= 10) {
      facts.push(numberedMatch[1].trim());
      continue;
    }

    // 3. Check key-value pairs: "Primary Chain: ...", "Address: ..."
    const kvMatch = line.match(/^([A-Za-z\s]{3,30}):\s+(.+)$/);
    if (kvMatch && kvMatch[2].length >= 5 && !line.toLowerCase().startsWith("http")) {
      facts.push(`${kvMatch[1].trim()}: ${kvMatch[2].trim()}`);
      continue;
    }
  }

  // If no structured lines were found, but message has strong memory intent
  if (facts.length === 0) {
    const memoryTriggers = /remember\s+(that\s+)?|my\s+(wallet|address|preference|strategy|allocation|rule)|save\s+to\s+walrus|permanent\s+defi\s+identity|i\s+only\s+trade|my\s+name\s+is/i;
    if (memoryTriggers.test(text)) {
      const sentences = text
        .split(/[.\n;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length >= 15 && s.length <= 300);
      for (const sentence of sentences) {
        if (memoryTriggers.test(sentence) || sentence.length > 20) {
          facts.push(sentence);
        }
      }
    }
  }

  return facts;
}

const STOP_WORDS = new Set(["the", "and", "for", "with", "user", "users", "are", "is", "this", "that", "from", "into"]);

function tokenizeMemory(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Determine if two memory texts represent the same semantic fact
 */
export function areMemoriesSimilar(textA: string, textB: string): boolean {
  const a = textA.trim().toLowerCase();
  const b = textB.trim().toLowerCase();
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // Check 0x crypto address match (exact address match means same memory topic)
  const addrMatchA = a.match(/0x[a-f0-9]{40,64}/);
  const addrMatchB = b.match(/0x[a-f0-9]{40,64}/);
  if (addrMatchA && addrMatchB && addrMatchA[0] === addrMatchB[0]) {
    return true;
  }

  // Token overlap (Jaccard similarity)
  const tokensA = new Set(tokenizeMemory(textA));
  const tokensB = new Set(tokenizeMemory(textB));
  if (tokensA.size === 0 || tokensB.size === 0) return false;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection++;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  return intersection / union >= 0.55;
}

// ─── Core Memory Operations ─────────────────────────────────────────────────

/**
 * Recall relevant memories for a user based on the current query.
 * Merges Walrus on-chain memories with local hot cache for sub-second availability.
 *
 * @param userId      - Authenticated user ID (from session)
 * @param query       - The user's current message text
 * @param limit       - Max memories to return (default 5)
 * @param maxDistance - Cosine distance cutoff (default 0.88; use 1.0 for dashboard)
 * @param options     - Optional namespaceVersion, cachedMemories, and tombstone filters
 * @returns Array of recalled memory items, or empty array
 */
export async function recallMemories(
  userId: string,
  query: string,
  limit: number = DEFAULT_MAX_MEMORIES,
  maxDistance: number = DEFAULT_MAX_DISTANCE,
  options?: RecallOptionsExtended
): Promise<Array<RecalledMemoryItem>> {
  const tombstoneBlobSet = new Set(options?.tombstones?.blobIds || []);
  const tombstoneTexts = (options?.tombstones?.texts || []).map((t) =>
    t.trim().toLowerCase()
  );

  const isTombstoned = (blobId?: string | null, text?: string): boolean => {
    if (blobId && tombstoneBlobSet.has(blobId)) return true;
    if (text) {
      const textLower = text.trim().toLowerCase();
      if (
        tombstoneTexts.some(
          (t) =>
            textLower === t ||
            textLower.includes(t) ||
            t.includes(textLower)
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const client = getMemWalClient();
  let walrusResults: RecalledMemoryItem[] = [];

  if (client) {
    try {
      const namespace = getUserNamespace(userId, options?.namespaceVersion || 1);
      const result: RecallResult = await client.recall({
        query,
        namespace,
        limit,
      });

      if (result.results && result.results.length > 0) {
        const filtered = result.results.filter((r: RecallMemory) => {
          if (r.distance > maxDistance) return false;
          if (isTombstoned(r.blob_id, r.text)) return false;
          return true;
        });

        walrusResults = filtered.map((r: RecallMemory) => ({
          blobId: r.blob_id,
          text: r.text,
          distance: r.distance,
        }));
      }
    } catch (error) {
      console.warn("[MemWal] Recall query against relayer failed, using hot cache fallback:", error);
    }
  }

  // Merge Walrus results with local hot cache
  const merged: RecalledMemoryItem[] = [...walrusResults];

  if (options?.cachedMemories && options.cachedMemories.length > 0) {
    for (const cached of options.cachedMemories) {
      if (!cached.text || !cached.text.trim()) continue;
      if (isTombstoned(cached.blobId, cached.text)) continue;

      // Check if this cached fact is already represented in walrusResults
      const alreadyInWalrus = merged.some((m) =>
        areMemoriesSimilar(m.text, cached.text)
      );

      if (!alreadyInWalrus) {
        merged.push({
          blobId: cached.blobId || undefined,
          text: cached.text.trim(),
          // High relevance for recent cached memories (0.10 distance = 90% relevance)
          distance: 0.10,
        });
      }
    }
  }

  // Enforce limit if specified
  const finalMemories = merged.slice(0, limit);

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[MemWal] Recalled ${finalMemories.length} total memories (${walrusResults.length} from Walrus, ${finalMemories.length - walrusResults.length} from cache) for user ${userId}`,
      {
        query: query.slice(0, 80),
        distances: finalMemories.map((r) => r.distance.toFixed(3)),
      }
    );
  }

  return finalMemories;
}

/**
 * Extract facts from the user's message and save to Walrus Memory.
 * Fire-and-forget: does not block the response stream.
 *
 * @param userId           - Authenticated user ID
 * @param text             - The user's message text to analyze for facts
 * @param version          - User's current namespace version
 * @param onFactsExtracted - Optional callback invoked when the relayer finishes extracting facts
 */
export async function saveMemories(
  userId: string,
  text: string,
  version: number = 1,
  onFactsExtracted?: (facts: Array<{ text: string; id?: string; jobId?: string }>) => Promise<void> | void
): Promise<void> {
  const client = getMemWalClient();
  if (!client) return;

  // Skip short/trivial messages that won't contain useful facts
  if (text.length < MIN_SAVE_LENGTH) return;

  try {
    const namespace = getUserNamespace(userId, version);

    // Use analyze() for intelligent fact extraction (fire-and-forget)
    // The relayer uses an LLM to break free-form text into atomic facts
    const result = await client.analyze(text, namespace);

    if (result.facts && result.facts.length > 0 && onFactsExtracted) {
      try {
        await onFactsExtracted(
          result.facts.map((f) => ({
            text: f.text,
            id: f.id,
            jobId: f.job_id || f.id,
          }))
        );
      } catch (cbErr) {
        console.error("[MemWal] onFactsExtracted callback error:", cbErr);
      }
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[MemWal] Analyzed & saved ${result.fact_count} facts for user ${userId}`,
        {
          namespace,
          facts: result.facts?.map((f) => f.text?.slice(0, 60)),
          jobIds: result.job_ids,
        }
      );
    }
  } catch (error) {
    // Fire-and-forget: never let memory save failures affect the chat
    console.error("[MemWal] Save failed (non-blocking):", error);
  }
}

/**
 * Store a single explicit fact to Walrus Memory.
 * Use for explicit "remember this" commands.
 *
 * @param userId  - Authenticated user ID
 * @param fact    - A specific fact to remember
 * @param version - User's current namespace version
 */
export async function rememberFact(
  userId: string,
  fact: string,
  version: number = 1
): Promise<boolean> {
  const client = getMemWalClient();
  if (!client) return false;

  try {
    const namespace = getUserNamespace(userId, version);
    await client.rememberAndWait(fact, namespace, { timeoutMs: 30_000 });

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[MemWal] Stored explicit fact for user ${userId}:`,
        fact.slice(0, 80)
      );
    }
    return true;
  } catch (error) {
    console.error("[MemWal] rememberFact failed:", error);
    return false;
  }
}

// ─── Prompt Formatting ──────────────────────────────────────────────────────

/**
 * Format recalled memories into a system prompt injection block.
 *
 * @param memories - Array of recalled memory objects
 * @returns Formatted string to append to the system prompt, or empty string
 */
export function formatMemoriesForPrompt(
  memories: Array<{ text: string; distance?: number; blobId?: string }>
): string {
  if (!memories || memories.length === 0) return "";

  const formattedFacts = memories.map((m) => `- ${m.text}`).join("\n");

  return `\n\n[RECALLED USER CONTEXT & PREFERENCES VIA WALRUS MEMORY]:
You have persistent memory of this user from previous conversations stored on decentralized Walrus storage:
${formattedFacts}

CRITICAL INSTRUCTIONS FOR RECALLED MEMORIES:
1. You MUST actively honor and apply these recalled preferences in your answers and tool executions.
   - For example, if the user previously stated they only trade 4-hour pools and do not want 5m/15m pools, you MUST explicitly mention this (e.g. "Recalling your preference for 4-hour pools..."), filter or prioritize 4h pools, and advise them accordingly.
   - If the user specified bet size, slippage, wallet addresses, or risk thresholds, apply them directly.
2. If a recalled preference contradicts a new instruction the user just gave in the current turn, prioritize the new instruction.
3. NEVER state "I do not store this information persistently across sessions" or "as an AI I do not retain personal data". You actively retain and apply these facts via decentralized Walrus storage!
`;
}

// ─── Guard: Should We Use Memory? ───────────────────────────────────────────

/**
 * Determine whether memory operations should run for this message.
 * Skip memory for fast lanes (greetings, realtime searches) to avoid latency.
 *
 * @param text          - User message text
 * @param isFastChat    - Is this a fast conversational message (greeting)?
 * @param isFastSearch  - Is this a fast realtime search message?
 * @returns true if memory operations should be performed
 */
export function shouldUseMemory(
  text: string,
  isFastChat: boolean,
  isFastSearch: boolean
): boolean {
  // Only skip fast small-talk (like "hi", "gm") that never needs context
  if (isFastChat) return false;

  // Skip very short messages that won't benefit from/contribute to memory
  if (!text || text.trim().length < 5) return false;

  // MemWal must be configured
  if (process.env.MEMWAL_ENABLED === "false") return false;
  if (!process.env.MEMWAL_PRIVATE_KEY || !process.env.MEMWAL_ACCOUNT_ID) return false;

  return true;
}

// ─── Health Check ───────────────────────────────────────────────────────────

/**
 * Check if MemWal is configured and the relayer is healthy.
 */
export async function checkMemWalHealth(): Promise<{
  configured: boolean;
  healthy: boolean;
  version?: string;
  error?: string;
}> {
  const client = getMemWalClient();
  if (!client) {
    return { configured: false, healthy: false, error: "MemWal not configured" };
  }

  try {
    const health = await client.health();
    return {
      configured: true,
      healthy: health.status === "ok",
      version: health.version,
    };
  } catch (error) {
    return {
      configured: true,
      healthy: false,
      error: String(error),
    };
  }
}
