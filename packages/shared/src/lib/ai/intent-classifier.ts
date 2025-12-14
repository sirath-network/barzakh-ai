/**
 * Intent-Based Tool Routing Classifier
 *
 * Provides intelligent classification of user prompts to automatically
 * route to appropriate tool categories without manual selection.
 */

import type { SearchGroupId } from "../utils/utils";
import { generateObject } from "ai";
import { myProvider } from "./models";
import { z } from "zod";

// ============================================================================
// Forced Model Configuration
// Maps intent/group to specific models for optimal performance
// Note: Chain-specific tools (sei, aptos, zeta, etc.) use the user's selected model
// ============================================================================

export const FORCED_MODEL_BY_GROUP: Partial<Record<SearchGroupId | "imagine" | "multimodal", string>> = {
    coding: "chat-model-claude",
    imagine: "chat-model-large",
    // Chain-specific tools removed - they can use any model the user selects
};

// ============================================================================
// Types
// ============================================================================

export type IntentType = SearchGroupId | "imagine" | "multimodal";

export interface IntentClassification {
    primaryIntent: IntentType;
    confidence: number; // 0-1
    secondaryIntents?: Array<{ intent: IntentType; confidence: number }>;
    indicators: string[]; // Matched patterns/keywords that led to classification
    requiresMultiTool: boolean;
    classificationMethod: "pattern" | "llm" | "fallback";
}

export interface ClassificationOptions {
    fallbackToLLM?: boolean;
    confidenceThreshold?: number;
    enableMultiIntent?: boolean;
}

interface IntentPattern {
    intent: IntentType;
    patterns: RegExp[];
    keywords: string[];
    priority: number; // Higher = checked first
}

// ============================================================================
// Pattern Definitions
// Chain-specific patterns have HIGHER priority than generic on_chain
// to ensure "portfolio on Aptos" routes to aptos, not on_chain
// ============================================================================

const INTENT_PATTERNS: IntentPattern[] = [
    // Image Generation - highest priority for clear image requests
    {
        intent: "imagine",
        patterns: [
            /\b(generate|create|make|draw|design|render)\b.*\b(image|picture|art|photo|illustration|artwork|logo|icon|banner)\b/i,
            /\b(image|picture|art|photo|illustration)\b.*\b(of|for|about|showing)\b/i,
            /\b(visualize|depict|illustrate)\b/i,
        ],
        keywords: [
            "generate image",
            "create image",
            "draw",
            "make a picture",
            "generate art",
            "create artwork",
            "design logo",
            "render",
            "midjourney",
            "dall-e",
            "stable diffusion",
        ],
        priority: 100,
    },

    // =========================================================================
    // CHAIN-SPECIFIC PATTERNS (Priority 95 - higher than generic on_chain)
    // These must be checked BEFORE generic on_chain to prevent misrouting
    // =========================================================================

    // Aptos-specific
    {
        intent: "aptos",
        patterns: [
            /\baptos\b/i,
            /\bapt\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\b0x[a-fA-F0-9]{64}\b/, // Aptos addresses (64 hex chars)
            /\baptoslabs\b/i,
            /\bmove\s+language\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\baptos\b/i,
            /\baptos\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
        ],
        keywords: [
            "aptos",
            "apt token",
            "aptoslabs",
            "move language",
            "aptos explorer",
            "aptos network",
            "aptos chain",
            "aptos wallet",
            "aptos portfolio",
            "on aptos",
        ],
        priority: 95,
    },

    // Sei-specific
    {
        intent: "sei",
        patterns: [
            /\bsei\b(?!\s*$)/i, // "sei" but not at end of word (avoid matching "seize" etc)
            /\bsei\s*(network|chain|blockchain|wallet|portfolio|token)\b/i,
            /\bsei1[a-z0-9]{38,}\b/, // Sei addresses
            /\bseitrace\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bsei\b/i,
            /\bsei\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
        ],
        keywords: [
            "sei",
            "sei network",
            "sei chain",
            "seitrace",
            "sei token",
            "sei wallet",
            "sei portfolio",
            "on sei",
        ],
        priority: 95,
    },

    // Solana-specific
    {
        intent: "solana",
        patterns: [
            /\bsolana\b/i,
            /\bsol\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/, // Base58 Solana addresses
            /\bphantom\s+wallet\b/i,
            /\b(raydium|serum|marinade|jupiter)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bsolana\b/i,
            /\bsolana\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
        ],
        keywords: [
            "solana",
            "sol token",
            "phantom wallet",
            "raydium",
            "serum",
            "jupiter swap",
            "solana wallet",
            "solana portfolio",
            "on solana",
        ],
        priority: 95,
    },

    // Zeta-specific
    {
        intent: "zeta",
        patterns: [
            /\bzetachain\b/i,
            /\bzeta\s+(network|chain|token|wallet|portfolio)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bzeta\b/i,
            /\bzeta\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
        ],
        keywords: [
            "zetachain",
            "zeta network",
            "zeta chain",
            "zeta token",
            "omnichain",
            "zeta wallet",
            "zeta portfolio",
            "on zeta",
            "on zetachain",
        ],
        priority: 95,
    },

    // Creditcoin-specific
    {
        intent: "creditcoin",
        patterns: [
            /\bcreditcoin\b/i,
            /\bctc\s+(token|balance|wallet|portfolio)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bcreditcoin\b/i,
        ],
        keywords: [
            "creditcoin",
            "ctc token",
            "creditcoin network",
            "creditcoin wallet",
            "on creditcoin",
        ],
        priority: 95,
    },

    // Vana-specific
    {
        intent: "vana",
        patterns: [
            /\bvana\b/i,
            /\bvana\s+(network|chain|data|wallet|portfolio)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bvana\b/i,
        ],
        keywords: [
            "vana",
            "vana network",
            "data dao",
            "vana wallet",
            "vana portfolio",
            "on vana",
        ],
        priority: 95,
    },

    // Flow-specific
    {
        intent: "flow",
        patterns: [
            /\bflow\s+(blockchain|network|chain|wallet|portfolio)\b/i,
            /\bcadence\s+language\b/i,
            /\bnba\s+top\s+shot\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bflow\b/i,
        ],
        keywords: [
            "flow blockchain",
            "cadence",
            "flow network",
            "nba top shot",
            "flow wallet",
            "flow portfolio",
            "on flow",
        ],
        priority: 95,
    },

    // Wormhole-specific
    {
        intent: "wormhole",
        patterns: [
            /\bwormhole\b/i,
            /\bwormhole\s+(bridge|protocol|guardian|portal)\b/i,
        ],
        keywords: [
            "wormhole",
            "wormhole bridge",
            "wormhole protocol",
            "wormhole guardian",
            "wormhole portal",
        ],
        priority: 95,
    },

    // Monad-specific
    {
        intent: "monad",
        patterns: [
            /\bmonad\b/i,
            /\bmonad\s+(network|chain|testnet|wallet|portfolio)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bmonad\b/i,
        ],
        keywords: [
            "monad",
            "monad network",
            "monad testnet",
            "monad wallet",
            "monad portfolio",
            "on monad",
        ],
        priority: 95,
    },

    // =========================================================================
    // GENERIC ON-CHAIN (Priority 90 - lower than chain-specific)
    // Only used when no specific chain is mentioned
    // =========================================================================

    // On-Chain / Blockchain - generic blockchain queries (EVM/Ethereum by default)
    {
        intent: "on_chain",
        patterns: [
            /\b0x[a-fA-F0-9]{40}\b/, // EVM addresses
            /\b[a-zA-Z0-9_-]+\.eth\b/i, // ENS names
            /\b(portfolio|wallet|balance|holdings|assets)\b.*\b(of|for|check|show|track|get)\b/i,
            /\b(track|show|get|check)\b.*\b(portfolio|wallet|balance|holdings|assets)\b/i,
            /\b(defi|nft|token|erc-?20|erc-?721)\b.*\b(balance|holdings|position)\b/i,
            /\btransaction\s+(history|details|hash)\b/i,
            /\b(ethereum|eth|evm)\b.*\b(portfolio|wallet|balance)\b/i,
        ],
        keywords: [
            "portfolio",
            "wallet balance",
            "token balance",
            "track wallet",
            "holdings",
            "defi positions",
            "nft collection",
            "gas fees",
            "transaction history",
            "swap",
            "bridge",
            "ethereum",
            "eth balance",
        ],
        priority: 90,
    },

    // =========================================================================
    // OTHER INTENT PATTERNS
    // =========================================================================

    // Coding - code-related queries
    {
        intent: "coding",
        patterns: [
            /```[\s\S]*```/, // Code blocks
            /\b(write|create|generate|debug|fix|implement|refactor)\b.*\b(code|function|script|program|class|api)\b/i,
            /\b(python|javascript|typescript|rust|go|java|c\+\+|solidity)\b.*\b(code|function|example|snippet)\b/i,
            /\bhow\s+to\s+(code|program|implement|write)\b/i,
            /\bexplain\s+(this\s+)?code\b/i,
            /\b(create|build|make)\s+(a\s+)?(website|app|application|page)\b/i,
        ],
        keywords: [
            "write code",
            "debug",
            "refactor",
            "implement function",
            "code example",
            "programming",
            "syntax error",
            "compile",
            "runtime error",
            "create website",
            "build app",
        ],
        priority: 80,
    },

    // Multimodal - image analysis
    {
        intent: "multimodal",
        patterns: [
            /\b(analyze|describe|explain|what('s| is) in)\b.*\b(this\s+)?(image|picture|photo|screenshot)\b/i,
            /\b(read|extract|ocr)\b.*\b(text|content)\b.*\b(from|in)\b.*\b(image|file)\b/i,
        ],
        keywords: ["analyze image", "describe picture", "what is in this image", "extract text from"],
        priority: 70,
    },

    // Default search - lowest priority (catches everything else)
    {
        intent: "search",
        patterns: [
            /\b(search|find|look up|google|what is|who is|when|where|why|how)\b/i,
            /\b(latest|recent|news|update)\b/i,
        ],
        keywords: ["search", "find", "look up", "what is", "latest news"],
        priority: 10,
    },
];

// ============================================================================
// Pattern-Based Classification
// ============================================================================

function classifyByPatterns(message: string): IntentClassification | null {
    const normalizedMessage = message.toLowerCase().trim();
    const matchedIntents: Array<{ intent: IntentType; score: number; indicators: string[] }> = [];

    // Sort patterns by priority (descending)
    const sortedPatterns = [...INTENT_PATTERNS].sort((a, b) => b.priority - a.priority);

    for (const patternDef of sortedPatterns) {
        let score = 0;
        const indicators: string[] = [];

        // Check regex patterns
        for (const pattern of patternDef.patterns) {
            if (pattern.test(message)) {
                score += 0.4;
                indicators.push(`pattern:${pattern.source.slice(0, 30)}...`);
            }
        }

        // Check keywords
        for (const keyword of patternDef.keywords) {
            if (normalizedMessage.includes(keyword.toLowerCase())) {
                score += 0.3;
                indicators.push(`keyword:${keyword}`);
            }
        }

        // Add priority bonus (normalized to 0-0.2)
        score += (patternDef.priority / 100) * 0.2;

        if (score > 0.3) {
            matchedIntents.push({
                intent: patternDef.intent,
                score: Math.min(score, 1),
                indicators,
            });
        }
    }

    if (matchedIntents.length === 0) {
        return null;
    }

    // Sort by score and get best match
    matchedIntents.sort((a, b) => b.score - a.score);
    const primary = matchedIntents[0];

    // Check for multi-intent (second intent with score close to primary)
    const requiresMultiTool =
        matchedIntents.length > 1 && matchedIntents[1].score > primary.score * 0.7;

    const secondaryIntents =
        matchedIntents.length > 1
            ? matchedIntents.slice(1, 3).map((m) => ({ intent: m.intent, confidence: m.score }))
            : undefined;

    return {
        primaryIntent: primary.intent,
        confidence: primary.score,
        indicators: primary.indicators,
        secondaryIntents,
        requiresMultiTool,
        classificationMethod: "pattern",
    };
}

// ============================================================================
// LLM-Based Classification (Fallback)
// ============================================================================

async function classifyByLLM(message: string): Promise<IntentClassification> {
    const intentCategories = `
- "imagine": Image generation requests (create, draw, generate images)
- "on_chain": Blockchain/crypto queries (wallets, portfolios, tokens, transactions, DeFi)
- "aptos": Aptos blockchain specific queries
- "sei": Sei network specific queries
- "solana": Solana blockchain specific queries
- "coding": Code writing, debugging, programming help
- "zeta": ZetaChain specific queries
- "creditcoin": Creditcoin specific queries
- "vana": Vana network specific queries
- "flow": Flow blockchain specific queries
- "wormhole": Wormhole bridge specific queries
- "monad": Monad network specific queries
- "multimodal": Image analysis or file reading requests
- "search": General web search, questions, information lookup
`;

    try {
        const { object } = await generateObject({
            model: myProvider.languageModel("chat-model-small"),
            schema: z.object({
                primaryIntent: z.enum([
                    "imagine",
                    "on_chain",
                    "aptos",
                    "sei",
                    "solana",
                    "coding",
                    "zeta",
                    "creditcoin",
                    "vana",
                    "flow",
                    "wormhole",
                    "monad",
                    "multimodal",
                    "search",
                ]),
                confidence: z.number().min(0).max(1),
                reasoning: z.string(),
            }),
            prompt: `Classify this user message into one of these intent categories:
${intentCategories}

User message: "${message}"

Respond with the most appropriate intent category and your confidence level (0-1).`,
            maxTokens: 150,
        });

        return {
            primaryIntent: object.primaryIntent as IntentType,
            confidence: object.confidence,
            indicators: [`llm:${object.reasoning.slice(0, 50)}`],
            requiresMultiTool: false,
            classificationMethod: "llm",
        };
    } catch (error) {
        console.error("[INTENT] LLM classification failed:", error);
        // Return default search intent on LLM failure
        return {
            primaryIntent: "search",
            confidence: 0.3,
            indicators: ["fallback:llm_error"],
            requiresMultiTool: false,
            classificationMethod: "fallback",
        };
    }
}

// ============================================================================
// Main Classification Function
// ============================================================================

/**
 * Classifies user intent from a message to determine appropriate tool routing.
 *
 * Uses a hybrid approach:
 * 1. Fast pattern matching for high-confidence cases
 * 2. LLM fallback for ambiguous prompts (if enabled)
 *
 * @param message - The user's message to classify
 * @param options - Classification options
 * @returns Promise<IntentClassification> - Classification result with confidence
 */
export async function classifyIntent(
    message: string,
    options: ClassificationOptions = {}
): Promise<IntentClassification> {
    const { fallbackToLLM = true, confidenceThreshold = 0.6 } = options;

    // Skip classification for empty messages
    if (!message || message.trim().length === 0) {
        return {
            primaryIntent: "search",
            confidence: 0,
            indicators: ["empty_message"],
            requiresMultiTool: false,
            classificationMethod: "fallback",
        };
    }

    const startTime = Date.now();

    // Step 1: Try pattern matching first (fast)
    const patternResult = classifyByPatterns(message);

    if (patternResult && patternResult.confidence >= confidenceThreshold) {
        console.log(
            `[INTENT] Pattern match: ${patternResult.primaryIntent} (${patternResult.confidence.toFixed(2)}) in ${Date.now() - startTime}ms`
        );
        return patternResult;
    }

    // Step 2: Use LLM for low-confidence or no pattern match
    if (fallbackToLLM) {
        console.log("[INTENT] Pattern confidence low, using LLM fallback...");
        const llmResult = await classifyByLLM(message);
        console.log(
            `[INTENT] LLM result: ${llmResult.primaryIntent} (${llmResult.confidence.toFixed(2)}) in ${Date.now() - startTime}ms`
        );
        return llmResult;
    }

    // Step 3: Return pattern result even if low confidence, or default to search
    if (patternResult) {
        return patternResult;
    }

    return {
        primaryIntent: "search",
        confidence: 0.5,
        indicators: ["default_fallback"],
        requiresMultiTool: false,
        classificationMethod: "fallback",
    };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Quick check if a message likely contains blockchain-related content.
 * Useful for fast filtering before full classification.
 */
export function hasBlockchainIndicators(message: string): boolean {
    const blockchainPatterns = [
        /\b0x[a-fA-F0-9]{40}\b/, // EVM address
        /\b[a-zA-Z0-9_-]+\.eth\b/i, // ENS
        /\b(wallet|portfolio|balance|token|nft|defi|blockchain|crypto)\b/i,
    ];

    return blockchainPatterns.some((p) => p.test(message));
}

/**
 * Extract wallet addresses from a message.
 */
export function extractWalletAddresses(message: string): {
    evm: string[];
    ens: string[];
    solana: string[];
} {
    const evmPattern = /\b(0x[a-fA-F0-9]{40})\b/g;
    const ensPattern = /\b([a-zA-Z0-9_-]+\.eth)\b/gi;
    const solanaPattern = /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;

    return {
        evm: [...message.matchAll(evmPattern)].map((m) => m[1]),
        ens: [...message.matchAll(ensPattern)].map((m) => m[1]),
        solana: [...message.matchAll(solanaPattern)]
            .map((m) => m[1])
            .filter((addr) => !addr.match(/^0x/)), // Exclude EVM-like strings
    };
}
