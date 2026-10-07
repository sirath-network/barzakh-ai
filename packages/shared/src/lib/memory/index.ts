/**
 * Walrus Memory integration for Barzakh AI
 * @module @barzakh/shared/lib/memory
 */
export {
  recallMemories,
  saveMemories,
  rememberFact,
  recordActionMemory,
  formatMemoriesForPrompt,
  shouldUseMemory,
  getUserNamespace,
  checkMemWalHealth,
  getMemWalClient,
  extractFastCandidateFacts,
  extractStructuredPreferences,
  categorizeMemory,
  areMemoriesSimilar,
  type RecalledMemoryItem,
  type RecallOptionsExtended,
  type CachedMemoryParam,
  type UserMemoryPreferences,
} from "./memwal-client";
