/**
 * Walrus Memory integration for Barzakh AI
 * @module @barzakh/shared/lib/memory
 */
export {
  recallMemories,
  saveMemories,
  rememberFact,
  formatMemoriesForPrompt,
  shouldUseMemory,
  getUserNamespace,
  checkMemWalHealth,
  getMemWalClient,
  extractFastCandidateFacts,
  areMemoriesSimilar,
  type RecalledMemoryItem,
  type RecallOptionsExtended,
  type CachedMemoryParam,
} from "./memwal-client";
