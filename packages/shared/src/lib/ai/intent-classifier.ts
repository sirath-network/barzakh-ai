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
    // coding now allows user to select from a subset of models
    imagine: "xai-grok-4.1-fast",
    // multimodal requires a vision-capable model for image analysis
    multimodal: "xai-grok-4.1-fast",
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
    chatContext?: string | null; // Chain context from chat history for follow-up messages
    hasImageContext?: boolean; // True if conversation has image generation history
}

interface IntentPattern {
    intent: IntentType;
    patterns: RegExp[];
    keywords: string[];
    priority: number; // Higher = checked first
}

// ============================================================================
// Follow-Up Query Intelligence
// Detects when user is continuing a conversation (should inherit context)
// ============================================================================

const FOLLOW_UP_PATTERNS: RegExp[] = [
    // Direct continuations
    /^(now|then|next|also|and)\s+/i,
    /^(show|get|give|provide|fetch)\s*(me|us)?\s*(at\s+least|more|the|some|another|\d+|recent|latest|all)/i,
    /^(what|how)\s+about\s+/i,
    /^can\s+you\s+(also|show|get|provide)/i,

    // Transaction/activity references  
    /\b(their|this|that|the|its)\s*(wallet|address|portfolio|transactions?|history|balance)/i,
    /\b(recent|last|latest)\s*(transactions?|activity|history|tx)/i,
    /\blast\s*\d+\s*(transactions?|tx|transfers?)/i,

    // Implicit references
    /^(check|view|analyze)\s+(the\s+)?(same|this)/i,
    /\bsame\s+(wallet|address|portfolio)/i,
    /\bfor\s+(this|that|the)\s+(wallet|address)/i,
];

/**
 * Check if a message is a follow-up query that should inherit context
 */
function isFollowUpQuery(message: string): boolean {
    return FOLLOW_UP_PATTERNS.some(pattern => pattern.test(message));
}

// ============================================================================
// Semantic Action Classification
// Maps action verbs to expected tool categories
// ============================================================================

interface SemanticAction {
    patterns: RegExp[];
    defaultRoute: IntentType | 'context'; // 'context' means use current context
    priority: number;
}

const SEMANTIC_ACTIONS: Record<string, SemanticAction> = {
    portfolio: {
        patterns: [
            /\b(track|show|view|check|analyze|get|fetch)\s*(the\s+)?(portfolio|holdings|assets|wallet)/i,
            /\bportfolio\b/i,
            /\bholdings\b/i,
        ],
        defaultRoute: 'context',
        priority: 10,
    },
    transactions: {
        patterns: [
            /\b(show|get|view|fetch|provide|list)\s*(((at\s+)?least|limit|last|recent|latest)\s*)?(\d+)?\s*(transactions?|txs?|history|activity)/i,
            /\btransaction\s*history\b/i,
            /\brecent\s*(transactions?|activity)\b/i,
        ],
        defaultRoute: 'context',
        priority: 10,
    },
    balance: {
        patterns: [
            /\b(check|show|get|view)\s*(the\s+)?(balance|balances)/i,
            /\btoken\s*balance/i,
        ],
        defaultRoute: 'context',
        priority: 10,
    },
    swap: {
        patterns: [
            /\b(swap|exchange|convert|trade)\s+/i,
            /\bbridge\s+(from|to)\b/i,
            /\bcross[-\s]?chain\s+(swap|transfer|bridge)/i,
        ],
        defaultRoute: 'on_chain', // Swaps always route to Relay
        priority: 15,
    },
    nft: {
        patterns: [
            /\b(show|get|view|check)\s*(the\s+)?(nfts?|collectibles?|collections?)/i,
            /\bnft\s*(portfolio|collection|holdings)/i,
        ],
        defaultRoute: 'context',
        priority: 10,
    },
    defi: {
        patterns: [
            /\b(stake|unstake|deposit|withdraw|lend|borrow|farm|yield)/i,
            /\bdefi\s*(positions?|protocols?)/i,
            /\bliquidity\s*(pool|position)/i,
        ],
        defaultRoute: 'context',
        priority: 10,
    },
    price: {
        patterns: [
            /\b(price|chart|market|volume|mcap|market\s*cap)\s*(of|for)?\b/i,
            /\btoken\s*price\b/i,
        ],
        defaultRoute: 'search',
        priority: 5,
    },
    // Subscription/billing actions - routes to search (which has subscription tools)
    subscription: {
        patterns: [
            /\b(subscribe|subscription|upgrade|downgrade|renew|cancel)\b.*\b(plan|tier|subscription)?\b/i,
            /\b(change|switch|modify)\s*(my\s+)?(plan|subscription|tier|billing)\b/i,
            /\b(pro|ultimate)\s*(plan|tier)?\s*(monthly|quarterly|yearly)?\b/i,
            /\bhow\s+much\s+(is|does|cost)\b.*\b(subscription|plan|pro|ultimate)\b/i,
            /\bwhat\s+(is|are)\s+(my\s+)?(subscription|plan|tier)\b/i,
        ],
        defaultRoute: 'search',  // Routes to search group which has subscription tools
        priority: 20,  // Higher than most actions to override chain context
    },
};

/**
 * Detect semantic action in message
 */
function detectSemanticAction(message: string): { action: string; route: IntentType | 'context' } | null {
    for (const [action, config] of Object.entries(SEMANTIC_ACTIONS)) {
        if (config.patterns.some(p => p.test(message))) {
            return { action, route: config.defaultRoute };
        }
    }
    return null;
}

// ============================================================================
// EVM-Compatible Chains Registry
// Centralized chain information for accurate detection
// ============================================================================

interface ChainInfo {
    id: string;
    intent: IntentType;
    patterns: RegExp[];
    keywords: string[];
    tokens: string[]; // Native or major tokens
    addressFormat: 'evm' | 'base58' | 'sei' | 'aptos';
    isEvm: boolean;
}

const CHAIN_REGISTRY: ChainInfo[] = [
    // Monad (newly supported)
    {
        id: 'monad',
        intent: 'monad',
        patterns: [
            /\bmonad\b/i,
            /\bmon\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\bmonad\s*(mainnet|testnet|network|chain|evm|l1)\b/i,
            /\bmonadscan\b/i,
            /\bparallelized\s*(evm|execution)?\b/i,
            /\bhigh\s*throughput\s*evm\b/i,
        ],
        keywords: ['monad', 'mon token', 'monad network', 'monad mainnet', 'monad portfolio',
            'monadscan', 'parallelized evm', 'shmonad', 'monad l1', 'keone hon',
            'nad.fun', 'nadfun', 'nadapp'],
        tokens: ['MON'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Mantle (L2)
    {
        id: 'mantle',
        intent: 'mantle',
        patterns: [
            /\bmantle\b/i,
            /\bmnt\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\bmantle\s+(network|chain|l2|layer\s*2|wallet|portfolio)\b/i,
            /\bmantlescan\b/i,
            /\bmerchant\s*moe\b/i,
            /\bbutter\.xyz\b/i,
        ],
        keywords: ['mantle', 'mnt token', 'mantle network', 'mantle l2', 'mantlescan',
            'merchant moe', 'butter exchange', 'meth', 'cmeth', 'init capital'],
        tokens: ['MNT', 'METH', 'CMETH'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Cronos (includes zkEVM)
    {
        id: 'cronos',
        intent: 'cronos',
        patterns: [
            /\bcronos\b/i,
            /\bzk\s*evm\b/i,
            /\bzkevm\b/i,
            /\bzkCRO\b/i,
            /\bcronos\s*(zkevm|pos|mainnet)\b/i,
            /\bcro\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\bcrypto\.?com\s*(chain|defi|exchange)?\b/i,
        ],
        keywords: ['cronos', 'cro token', 'cronos zkevm', 'zkcro', 'cronos pos',
            'crypto.com', 'vvs finance', 'tectonic', 'ferro protocol'],
        tokens: ['CRO', 'ZKCRO'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Solana (non-EVM)
    {
        id: 'solana',
        intent: 'solana',
        patterns: [
            /\bsolana\b/i,
            /\bsol\s+(token|coin|balance|wallet|portfolio|price)\b/i,
            /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/, // Base58 address
            /\b(raydium|orca|jupiter|magic\s*eden|tensor|pump\.fun)\b/i,
        ],
        keywords: ['solana', 'sol', 'solana wallet', 'phantom', 'solflare',
            'jupiter swap', 'raydium', 'orca', 'magic eden', 'pump.fun'],
        tokens: ['SOL', 'BONK', 'JTO', 'JUP'],
        addressFormat: 'base58',
        isEvm: false,
    },
    // Aptos (non-EVM, 64-char hex)
    {
        id: 'aptos',
        intent: 'aptos',
        patterns: [
            /\baptos\b/i,
            /\bapt\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\b0x[a-fA-F0-9]{64}\b/, // Aptos 64-char address
            /\b(petra|pontem|martian)\s*wallet\b/i,
            /\bmove\s*language\b/i,
        ],
        keywords: ['aptos', 'apt', 'aptos wallet', 'petra wallet', 'pontem',
            'liquidswap', 'aries markets', 'thala labs'],
        tokens: ['APT'],
        addressFormat: 'aptos',
        isEvm: false,
    },
    // Sei (supports both sei1... and 0x EVM addresses)
    {
        id: 'sei',
        intent: 'sei',
        patterns: [
            /\bsei\b(?!\s*$)/i,
            /\bsei\s*(network|chain|v2|evm|wallet|portfolio)\b/i,
            /\bsei1[a-z0-9]{38,}\b/, // Native Sei address
            /\bsei\s*evm\b/i, // Sei EVM
            /\bparallelized\s*evm\b/i,
        ],
        keywords: ['sei', 'sei network', 'sei v2', 'sei evm', 'compass wallet', 'fin wallet',
            'yaka finance', 'dragon swap', 'parallelized evm'],
        tokens: ['SEI'],
        addressFormat: 'evm', // Sei accepts both sei1... and 0x addresses
        isEvm: true, // Sei has full EVM compatibility
    },
    // Zeta
    {
        id: 'zeta',
        intent: 'zeta',
        patterns: [
            /\bzetachain\b/i,
            /\bzeta\s+(network|chain|hub|wallet|portfolio)\b/i,
            /\bomnichain\b/i,
        ],
        keywords: ['zetachain', 'zeta', 'omnichain', 'zeta hub'],
        tokens: ['ZETA'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Creditcoin
    {
        id: 'creditcoin',
        intent: 'creditcoin',
        patterns: [
            /\bcreditcoin\b/i,
            /\bctc\s+(token|coin|balance|wallet)\b/i,
            /\bgluwa\b/i,
        ],
        keywords: ['creditcoin', 'ctc', 'gluwa', 'real world assets', 'rwa'],
        tokens: ['CTC'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Vana
    {
        id: 'vana',
        intent: 'vana',
        patterns: [
            /\bvana\b/i,
            /\bvana\s+(network|data|wallet|portfolio)\b/i,
            /\bdata\s*dao\b/i,
        ],
        keywords: ['vana', 'data dao', 'vana network'],
        tokens: ['VANA'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Flow
    {
        id: 'flow',
        intent: 'flow',
        patterns: [
            /\bflow\s*(blockchain|network|chain|evm|wallet|portfolio)\b/i,
            /\bcadence\b/i,
            /\bdapper\s*labs\b/i,
            /\bnba\s*top\s*shot\b/i,
        ],
        keywords: ['flow blockchain', 'flow network', 'cadence', 'nba top shot', 'dapper'],
        tokens: ['FLOW'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Wormhole
    {
        id: 'wormhole',
        intent: 'wormhole',
        patterns: [
            /\bwormhole\b/i,
            /\bwormhole\s*(bridge|portal|guardian|scan)\b/i,
            /\bportal\s*bridge\b/i,
        ],
        keywords: ['wormhole', 'wormhole bridge', 'portal bridge', 'wormhole guardians'],
        tokens: ['W'],
        addressFormat: 'evm',
        isEvm: true,
    },
    // Generic EVM/Ethereum (routes to on_chain for Zerion/generic tools)
    // This allows users to explicitly switch from a chain-specific context to generic EVM
    {
        id: 'evm',
        intent: 'on_chain',
        patterns: [
            /\b(on|for|with)\s+(ethereum|evm|eth\s*mainnet|mainnet)\b/i,
            /\b(ethereum|evm)\s+(compatible|network|chain|mainnet|wallet|portfolio)\b/i,
            /\betherscan\b/i,
            /\bzerion\b/i,
            /\b(all|any|generic|multi[-\s]?chain)\s+(evm|chains?|networks?)\b/i,
        ],
        keywords: ['ethereum mainnet', 'ethereum network', 'evm compatible', 'evm network',
            'on ethereum', 'on evm', 'etherscan', 'zerion', 'multi-chain', 'generic evm'],
        tokens: ['ETH'],
        addressFormat: 'evm',
        isEvm: true,
    },
];

/**
 * Get all EVM-compatible chain intents
 */
function getEvmChainIntents(): IntentType[] {
    return CHAIN_REGISTRY.filter(c => c.isEvm).map(c => c.intent);
}

/**
 * Detect chain from message using registry
 */
function detectChainFromRegistry(message: string): ChainInfo | null {
    const lowerMessage = message.toLowerCase();

    for (const chain of CHAIN_REGISTRY) {
        // Check patterns
        if (chain.patterns.some(p => p.test(message))) {
            return chain;
        }
        // Check keywords
        if (chain.keywords.some(k => lowerMessage.includes(k.toLowerCase()))) {
            return chain;
        }
        // Check token mentions (e.g., "MON balance", "MNT price")
        if (chain.tokens.some(t => new RegExp(`\\b${t}\\b`, 'i').test(message))) {
            return chain;
        }
    }
    return null;
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
            // =========================================================================
            // CREATION PATTERNS - Clear image generation intent
            // =========================================================================
            /\b(generate|create|make|draw|design|render|paint|sketch)\b.*\b(image|picture|art|photo|illustration|artwork|logo|icon|banner|character|avatar|portrait|landscape|drawing|painting|poster|flyer|thumbnail|cover|wallpaper|background|overlay|mockup|template)\b/i,
            /\b(image|picture|art|photo|illustration|character|avatar|portrait|banner|poster|thumbnail)\b.*\b(of|for|about|showing|depicting|representing|with|containing)\b/i,
            /\b(visualize|depict|illustrate)\b/i,

            // Promotional/Marketing content creation (universal)
            /\b(promo|promotional|marketing|advertising|ad)\s*(banner|poster|flyer|image|design|material|content)\b/i,
            /\b(banner|poster|flyer)\s*(promo|promotional|design|for|image|ad|marketing)\b/i,

            // Streaming/Social media content (universal)
            /\b(stream|streaming|youtube|twitch|tiktok|instagram|facebook)\s*(banner|thumbnail|overlay|background|cover|art)\b/i,
            /\b(profile|channel)\s*(picture|image|art|banner|cover)\b/i,
            /\b(background|overlay)\s*(for|of|image|design)?\s*(stream|streaming|live|video|channel)\b/i,

            // Design with text/typography
            /\b(design|create|make|generate)\b.*\b(with|containing|include|including)\s*(text|words?|title|heading|caption)\b/i,

            // =========================================================================
            // MODIFICATION / EDITING PATTERNS
            // =========================================================================
            /\b(regenerate|remake|redo|version|style|modify|change|edit|transform|convert|alter)\b.*\b(image|picture|art|photo|it|this|that)\b/i,
            /\b(make|turn|change|transform|convert)\b.*\b(it|this|image)\b.*\b(into|holding|wearing|background|look like|with|containing|showing)\b/i,
            /\b(add|remove|delete|erase)\b.*\b(from|to|in)\b.*\b(image|picture|photo|it|this)\b/i,
            /\b(change|switch|swap|replace)\b.*\b(background|color|style|lighting|perspective)\b/i,

            // =========================================================================
            // STYLE-SPECIFIC PATTERNS
            // =========================================================================
            /\b(in|with)\b.*\b(style|aesthetic|look|vibe)\b/i,
            /\b(anime|manga|comic|realistic|3d|pixel|watercolor|oil|cyberpunk|vaporwave|gothic|steampunk|vintage|retro|neon|minimalist|futuristic)\b.*\b(style|art|render)\b/i,

            // Brand/Logo style references
            /\b(like|similar\s+to)\s*(the\s+)?(logo|brand|style)\s*(of)?\b/i,
        ],
        keywords: [
            // Core image generation keywords
            "generate image", "create image", "draw", "make a picture", "generate art", "create artwork",
            "design logo", "render", "midjourney", "dall-e", "stable diffusion", "flux", "ideogram",
            "regenerate", "remake", "repaint", "outpaint", "inpaint",
            // Art styles
            "anime style", "pixel art", "watercolor", "oil painting", "3d render", "photorealistic",
            "concept art", "digital art", "illustration", "sketch", "drawing",
            // Promotional/Marketing
            "promo banner", "promotional poster", "marketing image", "ad design", "flyer design",
            // Streaming/Social content
            "youtube thumbnail", "twitch overlay", "stream banner", "channel art", "cover image",
            "profile picture", "avatar", "wallpaper", "background image",
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
            /\bapt\s+(token|coin|balance|wallet|portfolio|price|chart)\b/i,
            /\b0x[a-fA-F0-9]{64}\b/, // Aptos addresses (64 hex chars)
            /\baptoslabs\b/i,
            /\bmove\s+language\b/i,
            /\b(petra|pontem|martian|rise|fewcha)\b.*\b(wallet)\b/i,
            /\b(thala|aries|econia|merkle|pancake)\b.*\b(aptos)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\baptos\b/i,
            /\baptos\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
        ],
        keywords: [
            "aptos", "apt token", "aptoslabs", "move language", "aptos explorer",
            "aptos network", "aptos chain", "aptos wallet", "aptos portfolio", "on aptos",
            "petra wallet", "pontem wallet", "martian wallet", "aptos names", "ans",
            "thala labs", "aries markets", "econia", "liquidswap",
        ],
        priority: 95,
    },

    // Sei-specific
    {
        intent: "sei",
        patterns: [
            /\bsei\b(?!\s*$)/i, // "sei" but not at end of word
            /\bsei\s*(network|chain|blockchain|wallet|portfolio|token|v2|evm)\b/i,
            /\bsei1[a-z0-9]{38,}\b/, // Sei addresses
            /\bseitrace\b/i,
            /\b(compass|fin|yaka|dragonswap)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bsei\b/i,
            /\bsei\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
        ],
        keywords: [
            "sei", "sei network", "sei chain", "seitrace", "sei token", "sei wallet",
            "sei portfolio", "on sei", "compass wallet", "fin wallet", "yaka finance",
            "dragon swap", "sei v2", "parallelized evm", "sei db",
        ],
        priority: 95,
    },

    // Solana-specific
    {
        intent: "solana",
        patterns: [
            /\bsolana\b/i,
            /\bsol\s+(token|coin|balance|wallet|portfolio|price|chart)\b/i,
            /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/, // Base58 Solana addresses
            /\b(phantom|backpack|solflare)\b.*\b(wallet)\b/i,
            /\b(raydium|serum|marinade|jupiter|jup|orca|meteora|kamino)\b/i,
            /\b(magic eden|tensor|hyperspace)\b/i,
            /\b(pump\.fun|moonshot)\b/i,
            /\b(bonk|wif|popcat|jto|pyth)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bsolana\b/i,
            /\bsolana\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
        ],
        keywords: [
            "solana", "sol token", "phantom wallet", "backpack wallet", "solflare",
            "raydium", "serum", "jupiter swap", "jupiter aggregator", "orca",
            "marinade finance", "jito", "magic eden", "tensor", "pump.fun",
            "solana wallet", "solana portfolio", "on solana", "sol scan", "solanafm",
        ],
        priority: 95,
    },

    // Zeta-specific
    {
        intent: "zeta",
        patterns: [
            /\bzetachain\b/i,
            /\bzeta\s+(network|chain|token|wallet|portfolio|hub)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bzeta\b/i,
            /\bzeta\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
            /\bomnichain\b.*\b(zeta)\b/i,
        ],
        keywords: [
            "zetachain", "zeta network", "zeta chain", "zeta token", "omnichain",
            "zeta wallet", "zeta portfolio", "on zeta", "on zetachain", "zeta hub",
            "zeta xp", "zeta earn", "zeta swap",
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
            /\bgluwa\b/i,
        ],
        keywords: [
            "creditcoin", "ctc token", "creditcoin network", "creditcoin wallet",
            "on creditcoin", "gluwa", "real world assets", "rwa",
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
            /\bdata\s+dao\b/i,
        ],
        keywords: [
            "vana", "vana network", "data dao", "vana wallet", "vana portfolio",
            "on vana", "user data", "data ownership",
        ],
        priority: 95,
    },

    // Flow-specific
    {
        intent: "flow",
        patterns: [
            /\bflow\s+(blockchain|network|chain|wallet|portfolio)\b/i,
            /\bcadence\s+language\b/i,
            /\b(nba\s+top\s+shot|nfl\s+all\s+day|laliga\s+golazos)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bflow\b/i,
            /\bcrescendo\b/i, // Flow upgrade
        ],
        keywords: [
            "flow blockchain", "cadence", "flow network", "nba top shot",
            "flow wallet", "flow portfolio", "on flow", "dapper labs",
            "flow crescendo", "flow evm",
        ],
        priority: 95,
    },

    // Wormhole-specific
    {
        intent: "wormhole",
        patterns: [
            /\bwormhole\b/i,
            /\bwormhole\s+(bridge|protocol|guardian|portal|scan)\b/i,
            /\bportal\s+bridge\b/i,
        ],
        keywords: [
            "wormhole", "wormhole bridge", "wormhole protocol", "wormhole guardian",
            "wormhole portal", "wormholescan", "cross-chain messaging", "x-chain",
        ],
        priority: 95,
    },

    // Monad-specific (high throughput L1)
    {
        intent: "monad",
        patterns: [
            /\bmonad\b/i,
            /\bmon\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\b(swap|trade|buy|sell|exchange|convert)\b.*\bmon\b/i,
            /\bmon\b.*\b(to|for|into)\b/i,
            /\bmonad\s*(mainnet|testnet|network|chain|evm|l1|wallet|portfolio)\b/i,
            /\bmonadscan\b/i,
            /\bgmonad\b/i,
            /\bparallelized\s*(evm|execution)?\b/i,
            /\bhigh\s*throughput\s*evm\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bmonad\b/i,
            /\bmonad\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
            /\b(on|at|for)\s+monad\b/i,
        ],
        keywords: [
            "monad", "mon token", "monad network", "monad mainnet", "monad wallet",
            "monad portfolio", "on monad", "monadscan", "gmonad", "shmonad",
            "parallelized evm", "parallel execution", "monad db", "monad evm",
            "high throughput evm", "monad l1", "keone hon",
            "nad.fun", "nadfun", "nadapp", "buy on nad", "sell on nad",
            "buy mon", "sell mon", "swap mon", "trade mon",
        ],
        priority: 95,
    },

    // Cronos-specific (includes zkEVM)
    {
        intent: "cronos",
        patterns: [
            /\bcronos\b/i,
            /\bzk\s*evm\b/i, // zkEVM
            /\bzkevm\b/i, // zkEVM without space
            /\bzkCRO\b/i, // zkCRO token
            /\bcronos\s*zkevm\b/i, // Explicit Cronos zkEVM
            /\bzk\s*cronos\b/i, // zk Cronos
            /\bcro\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\bcrypto\.com\s+(chain|defi|app|exchange)\b/i,
            /\b(vvs|tectonic|ferro|mmf|mad\s*meerkat|ebisus|fulcrum)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bcronos\b/i,
            /\bcronos\b.*\b(portfolio|wallet|balance|holdings|track|show)\b/i,
            /\b(on|at|for)\s+cronos\b/i,
            /\b(on|at|for)\s+zkevm\b/i,
        ],
        keywords: [
            "cronos", "cro token", "crypto.com chain", "crypto.com defi",
            "vvs finance", "vvs swap", "tectonic finance", "ferro protocol",
            "cronos wallet", "cronos portfolio", "on cronos", "cronos network",
            "cronos zkevm", "zkevm", "zkcro", "zk evm", "cronos pos", "zk cronos",
        ],
        priority: 95,
    },

    // Mantle-specific (L2 on Ethereum)
    {
        intent: "mantle",
        patterns: [
            /\bmantle\b/i,
            /\bmnt\s+(token|coin|balance|wallet|portfolio)\b/i,
            /\bmantle\s+(network|chain|l2|layer\s*2|wallet|portfolio)\b/i,
            /\b(merchant\s*moe|butter\.xyz|init\s*capital)\b/i,
            /\b(portfolio|wallet|balance|holdings|track|show)\b.*\bmantle\b/i,
            /\bmantlescan\b/i,
        ],
        keywords: [
            "mantle", "mnt token", "mantle network", "mantle chain",
            "mantle l2", "mantle wallet", "mantle portfolio", "on mantle",
            "mantlescan", "merchant moe", "butter exchange", "meth", "cmeth",
        ],
        priority: 95,
    },

    // =========================================================================
    // UNIVERSAL SWAP/BRIDGE (Priority 99 - HIGHEST for swap actions)
    // Catches ANY "swap X to Y" pattern regardless of token names
    // =========================================================================
    {
        intent: "on_chain",
        patterns: [
            // Universal swap pattern: "swap [amount] [token] to [token]"
            /^\s*(swap|exchange|convert|trade)\s+/i,
            // Bridge pattern
            /^\s*bridge\s+/i,
        ],
        keywords: [
            "swap", "exchange", "convert", "trade", "bridge",
        ],
        priority: 99,  // HIGHEST - any message starting with swap/bridge goes to on_chain
    },

    // =========================================================================
    // CROSS-CHAIN SWAP/BRIDGE (Priority 97 - Higher than chain-specific)
    // =========================================================================
    {
        intent: "on_chain",
        patterns: [
            // Explicit Swap/Bridge Intent
            /\b(swap|bridge|transfer|send|move|convert)\b.*\b(from|on)\s*([a-z0-9\s]+)\b.*\b(to|on)\s*([a-z0-9\s]+)\b/i,
            /\b(swap|bridge|transfer|send|move|convert)\b.*\b([a-z0-9]+)\b.*\b(to|into|for)\b.*\b([a-z0-9]+)\b/i,

            // Token specific swaps
            /\b(swap|bridge)\b.*\b(eth|usdc|usdt|weth|wbtc|cbbtc|dai|sol|btc|trx|cro|mnt|zeta|mon)\b/i,

            // Cross-chain terminology
            /\b(cross[-\s]?chain|cross[-\s]?network|inter[-\s]?chain)\b/i,
            /\b(l1\s*to\s*l2|l2\s*to\s*l1|l2\s*to\s*l2)\b/i,
            /\b(bridge|wormhole|layerzero|axelar|across|orbiter|relay)\b/i,
        ],
        keywords: [
            "cross-chain swap", "cross-chain bridge", "bridge eth", "swap eth",
            "bridge usdc", "swap usdc", "bridge sol", "swap sol", "swap mon",
            "from optimism", "from arbitrum", "from base", "from ethereum", "from solana", "from monad",
            "to optimism", "to arbitrum", "to base", "to ethereum", "to solana", "to monad",
            "relay swap", "relay bridge", "gasless swap",
        ],
        priority: 97,
    },

    // =========================================================================
    // GENERIC ON-CHAIN (Priority 90 - lower than chain-specific)
    // =========================================================================
    {
        intent: "on_chain",
        patterns: [
            // Addresses and Names
            /\b0x[a-fA-F0-9]{40}\b/, // EVM addresses
            /\b[a-zA-Z0-9_-]+\.eth\b/i, // ENS names
            /\b[a-zA-Z0-9_-]+\.(lens|farcaster|crypto|nft|x)\b/i, // Other Web3 names

            // Portfolio/Wallet Queries
            /\b(portfolio|wallet|balance|holdings|assets|net\s*worth)\b/i,
            /\b(track|show|check|view|analyze)\b.*\b(wallet|address|account)\b/i,

            // Tokens and DeFi
            /\b(defi|nft|token|erc-?20|erc-?721|erc-?1155)\b/i,
            /\b(market\s*cap|price|chart|volume|liquidity|tvl|fdv)\b/i,
            /\b(yield|farm|stake|staking|lend|borrow|pool|lp)\b/i,
            /\b(gas|fees|gwei|transaction|tx|hash|block)\b/i,

            // Chain references (Generic List)
            /\b(ethereum|eth|evm|mainnet)\b/i,
            /\b(optimism|arbitrum|base|polygon|linea|scroll|zksync|blast|manta|mode|avalanche|bsc|bnb|fantom|gnosis|celo|aurora|metis)\b/i,
            /\b(berachain|sonic|abstract|hyperevm|unichain|megeth)\b/i, // Newer chains
        ],
        keywords: [
            "portfolio", "wallet balance", "token balance", "check wallet",
            "holdings", "defi positions", "nft collection", "gas fees",
            "transaction history", "etherscan", "metamask", "rabby",
            "uniswap", "sushiswap", "curve", "aave", "compound", "lido",
            "pepe", "shib", "link", "uni", "usdc", "usdt", "dai",
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
            /\b(write|create|generate|debug|fix|implement|refactor|optimize|test)\b.*\b(code|function|script|program|class|api|component|hook)\b/i,
            /\b(python|javascript|typescript|rust|go|java|c\+\+|solidity|vyper|move|cairo)\b/i,
            /\b(react|nextjs|next\.js|node|nodejs|express|graphql|prisma|tailwind)\b/i,
            /\b(how|help|explain)\b.*\b(to|with|about)\b.*\b(code|program|dev|error|bug|issue)\b/i,
            /\b(api|sdk|library|framework|database|backend|frontend|fullstack)\b/i,
            /\b(git|github|gitlab|docker|kubernetes|aws|vercel)\b/i,
        ],
        keywords: [
            "write code", "debug", "refactor", "implement function", "code example",
            "programming", "syntax error", "compile", "runtime error", "stack trace",
            "create website", "build app", "smart contract", "web3 development",
            "npm", "yarn", "pnpm", "cargo", "pip", "maven",
        ],
        priority: 80,
    },

    // =========================================================================
    // SUBSCRIPTION MANAGEMENT (Priority 98 - overrides chain context)
    // Routes to search group which has subscription tools
    // =========================================================================
    {
        intent: "search",  // Routes to search group which has subscription tools
        patterns: [
            /\b(subscribe|subscription|upgrade|downgrade|renew|cancel)\s*(to|my|the)?\s*(plan|subscription|tier|pro|ultimate)?\b/i,
            /\b(change|switch|modify)\s*(my\s+)?(plan|subscription|tier|billing)\b/i,
            /\bsubscription\s+(status|info|details|options|pricing)\b/i,
            /\b(pro|ultimate)\s+(plan|tier|subscription)\b/i,
            /\bwhat\s+(is|are)\s+(my\s+)?(subscription|plan|tier)\b/i,
            /\bi\s+(want|wanna|need)\s+(to\s+)?(subscribe|upgrade|downgrade|change)\b/i,
        ],
        keywords: [
            "subscribe", "subscription", "upgrade plan", "downgrade plan",
            "renew subscription", "cancel subscription", "billing cycle",
            "pro plan", "ultimate plan", "change plan", "switch tier",
            "my subscription", "subscription status",
        ],
        priority: 98,  // Very high - overrides chain-specific contexts
    },

    // Multimodal - image analysis
    {
        intent: "multimodal",
        patterns: [
            /\b(analyze|describe|explain|what('s| is) in|look at)\b.*\b(this\s+)?(image|picture|photo|screenshot|file)\b/i,
            /\b(read|extract|ocr|scan|parse)\b.*\b(text|content|data)\b.*\b(from|in)\b.*\b(image|file|pdf|doc)\b/i,
            /\b(what)\b.*\b(does|do)\b.*\b(this|the)\b.*\b(image|picture|screenshot)\b.*\b(say|show|mean)\b/i,
        ],
        keywords: [
            "analyze image", "describe picture", "what is in this image",
            "extract text", "read file", "ocr", "image analysis",
            "vision capability", "can you see",
        ],
        priority: 70,
    },

    // Default search - lowest priority (catches everything else)
    // Default search - lowest priority (catches everything else)
    {
        intent: "search",
        patterns: [
            /\b(search|find|look up|google|what is|who is|when|where|why|how)\b/i,
            /\b(latest|recent|news|update|current|today)\b/i,
            /\b(price|weather|stock|score|result|movie|recipe|review)\b/i,
            /\b(compare|versus|vs|difference)\b/i,
            /\b(web|browse|internet)\b/i, // Explicit web mapping
        ],
        keywords: [
            "search", "find", "look up", "what is", "latest news",
            "google it", "web search", "current events", "web",
        ],
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

// Update signature to accept options object or just the flag
// Update signature to accept options object or just the flag
async function classifyByLLM(message: string, chatContext?: string | null, hasImageContext?: boolean): Promise<IntentClassification> {
    const intentCategories = `
    - "imagine": Image generation requests (create, draw, generate images, regenerate, refine)
    - "on_chain": Blockchain / crypto queries (wallets, portfolios, tokens, transactions, DeFi, cross-chain swaps, bridges between L2s like Optimism/Arbitrum/Base/Polygon)
    - "aptos": Aptos blockchain specific queries
    - "sei": Sei network specific queries
    - "solana": Solana blockchain specific queries
    - "cronos": Cronos blockchain specific queries (CRO, VVS Finance, crypto.com chain)
    - "coding": Code writing, debugging, programming help
    - "zeta": ZetaChain specific queries
    - "creditcoin": Creditcoin specific queries
    - "vana": Vana network specific queries
    - "flow": Flow blockchain specific queries
    - "wormhole": Wormhole bridge specific queries
    - "monad": Monad network specific queries
    - "mantle": Mantle Network L2 specific queries (MNT token, mantlescan)
    - "multimodal": Image analysis or file reading requests
    - "search": General web search, questions, information lookup
    `;

    // Add context hint if we have a chain-specific context
    // Also include address format hints so LLM knows when to override context
    let contextHint = '';
    if (chatContext) {
        // Define EVM-compatible chains (these accept 0x addresses)
        const evmChains = ['on_chain', 'cronos', 'mantle', 'monad', 'zeta', 'creditcoin', 'vana', 'flow', 'wormhole', 'sei'];
        const isEvmContext = evmChains.includes(chatContext);

        contextHint = `\n
CONVERSATION CONTEXT: This is a FOLLOW-UP message in an ongoing "${chatContext}" blockchain conversation.

CRITICAL RULES:
1. FOLLOW-UP QUERIES: If the user asks for generic actions like "track portfolio", "check balance", "view wallet", "show transactions" WITHOUT explicitly naming another chain, YOU MUST classify as "${chatContext}".
   - Example: "track portfolio" -> "${chatContext}" (NOT "on_chain")
   - Example: "show recent transactions" -> "${chatContext}" (NOT "on_chain")
   - Example: "now show NFTs" -> "${chatContext}" (NOT "on_chain")

2. SWAP/BRIDGE ACTIONS: Route swap/bridge requests to "on_chain" UNLESS the swap involves chain-specific native tokens.
   - Example: "swap ETH to USDC" -> "on_chain"
   - Example: "swap MON to DAK" -> "monad" (MON is Monad's native token, DAK is a Monad ecosystem token)
   - Example: "trade MON for MOLANDAK" -> "monad" (both are Monad ecosystem tokens)
   - Example: "bridge to Base" -> "on_chain"

3. ADDRESS FORMAT RULES (may OVERRIDE context):
- EVM-compatible chains (cronos, mantle, monad, zeta, creditcoin, vana, flow, wormhole, sei): Accept "0x..." addresses (40 hex chars)
- If context is "${chatContext}" ${isEvmContext ? '(EVM-compatible)' : '(NOT EVM)'} and user provides:
    - A "0x..." address (40 hex chars): ${isEvmContext ? `Keep as "${chatContext}"` : 'Classify as "on_chain"'}
    - A Base58 address (32-44 alphanumeric chars): Classify as "solana"
    - A "sei1..." address: Classify as "sei"
    - A "0x..." address with 64 hex chars: Classify as "aptos"

Only use the "${chatContext}" context if the address format is compatible or no address is present.`;
    }

    // Helper function to attempt LLM classification
    const attemptLLMClassification = async (attempt: number = 1): Promise<any> => {
        const { object } = await generateObject({
            model: myProvider.languageModel("xai-grok-4.1-fast"),
            schema: z.object({
                primaryIntent: z.enum([
                    "imagine",
                    "on_chain",
                    "aptos",
                    "sei",
                    "solana",
                    "cronos",
                    "coding",
                    "zeta",
                    "creditcoin",
                    "vana",
                    "flow",
                    "wormhole",
                    "monad",
                    "mantle",
                    "multimodal",
                    "search",
                ]),
                confidence: z.number().min(0).max(1),
                reasoning: z.string(),
            }),
            prompt: `You are a classification API. Output ONLY valid JSON.
NO introductory text. NO markdown. NO explanations.

Classify the user message into one of: [${intentCategories.split('\n').map(l => l.trim().split(':')[0]).join(', ')}]

Categories:
${intentCategories}${contextHint}

User message: "${message}"

JSON Response:`,
            maxTokens: 150,
            mode: 'json',
            temperature: 0,
        });
        return object;
    };

    try {
        // First attempt
        const object = await attemptLLMClassification(1);

        return {
            primaryIntent: object.primaryIntent as IntentType,
            confidence: object.confidence,
            indicators: [`llm:${object.reasoning.slice(0, 50)}`],
            requiresMultiTool: false,
            classificationMethod: "llm",
        };
    } catch (firstError: any) {
        // Retry once after a short delay (LLM may have returned empty response)
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            const object = await attemptLLMClassification(2);

            return {
                primaryIntent: object.primaryIntent as IntentType,
                confidence: object.confidence,
                indicators: [`llm_retry:${object.reasoning.slice(0, 50)}`],
                requiresMultiTool: false,
                classificationMethod: "llm",
            };
        } catch (retryError: any) {
            // Log concisely - only warn, not full error stack
            console.warn("[INTENT] LLM classification failed after retry, using fallback:",
                retryError?.cause?.message || retryError?.message || "Unknown error");

            // Fallback: If we have image context (user was generating images), likely a follow-up ("make it blue")
            if (hasImageContext) {
                const lowerMsg = message.toLowerCase();
                // Check if it looks like a refinement or just generic text
                const refinementKeywords = ["make", "change", "add", "remove", "turn", "regenerate", "version", "style", "holding", "wearing", "background"];
                const isRefinement = refinementKeywords.some(w => lowerMsg.includes(w));

                if (isRefinement) {
                    console.log("[INTENT] LLM fallback: Image context refinement detected, using imagine");
                    return {
                        primaryIntent: "imagine",
                        confidence: 0.65,
                        indicators: ["fallback:image_context_refinement"],
                        requiresMultiTool: false,
                        classificationMethod: "fallback",
                    };
                }
            }

            // If we have chat context and LLM failed, use the context as fallback
            // BUT first check if message contains addresses that conflict with the context
            if (chatContext) {
                // Check for address format mismatches before using context as fallback
                const hasEvmAddress = /\b0x[a-fA-F0-9]{40}\b/.test(message);
                const hasSolanaAddress = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/.test(message);
                const hasAptosAddress = /\b0x[a-fA-F0-9]{64}\b/.test(message);
                const hasSeiAddress = /\bsei1[a-z0-9]{38,}\b/.test(message);

                // If address format conflicts with context, override it
                // EVM-compatible chains: these accept 0x addresses
                const evmChains = ['on_chain', 'cronos', 'mantle', 'monad', 'zeta', 'creditcoin', 'vana', 'flow', 'wormhole', 'sei'];

                if (chatContext === 'solana' && hasEvmAddress && !hasSolanaAddress) {
                    console.log("[INTENT] LLM fallback: EVM address detected in solana context, using on_chain");
                    return {
                        primaryIntent: 'on_chain',
                        confidence: 0.7,
                        indicators: ['fallback:address_mismatch_evm_in_solana'],
                        requiresMultiTool: false,
                        classificationMethod: "fallback",
                    };
                }
                if (chatContext === 'aptos' && hasEvmAddress && !hasAptosAddress) {
                    console.log("[INTENT] LLM fallback: EVM address detected in aptos context, using on_chain");
                    return {
                        primaryIntent: 'on_chain',
                        confidence: 0.7,
                        indicators: ['fallback:address_mismatch_evm_in_aptos'],
                        requiresMultiTool: false,
                        classificationMethod: "fallback",
                    };
                }
                if (evmChains.includes(chatContext) && hasSolanaAddress && !hasEvmAddress) {
                    console.log("[INTENT] LLM fallback: Solana address detected in EVM context, using solana");
                    return {
                        primaryIntent: 'solana',
                        confidence: 0.7,
                        indicators: ['fallback:address_mismatch_solana_in_evm'],
                        requiresMultiTool: false,
                        classificationMethod: "fallback",
                    };
                }
                if (chatContext !== 'aptos' && hasAptosAddress) {
                    console.log("[INTENT] LLM fallback: Aptos address detected, using aptos");
                    return {
                        primaryIntent: 'aptos',
                        confidence: 0.7,
                        indicators: ['fallback:aptos_address_detected'],
                        requiresMultiTool: false,
                        classificationMethod: "fallback",
                    };
                }
                if (chatContext !== 'sei' && hasSeiAddress) {
                    console.log("[INTENT] LLM fallback: Sei address detected, using sei");
                    return {
                        primaryIntent: 'sei',
                        confidence: 0.7,
                        indicators: ['fallback:sei_address_detected'],
                        requiresMultiTool: false,
                        classificationMethod: "fallback",
                    };
                }

                // No address mismatch, safe to use context
                return {
                    primaryIntent: chatContext as IntentType,
                    confidence: 0.65,
                    indicators: [`context_fallback:continuing_${chatContext}_conversation`],
                    requiresMultiTool: false,
                    classificationMethod: "fallback",
                };
            }

            // Return default search intent on LLM failure
            return {
                primaryIntent: "search",
                confidence: 0.3,
                indicators: ["fallback:llm_error"],
                requiresMultiTool: false,
                classificationMethod: "fallback",
            };
        }
    } // close inner catch (retryError)
} // close outer catch (firstError)

// ============================================================================
// Main Classification Function
// ============================================================================

// Helper function to check if pattern matched a different topic than the expected context
function patternMatchedDifferentTopic(patternResult: IntentClassification | null, expectedIntent: IntentType): boolean {
    if (!patternResult) return false;
    // Only consider it a different topic if it matched with reasonable confidence and is NOT the expected intent
    return patternResult.primaryIntent !== expectedIntent && patternResult.confidence > 0.5;
}

// Groups that support context persistence (chain-specific + imagine + on_chain for EVM)
const CONTEXT_AWARE_GROUPS: IntentType[] = ['on_chain', 'cronos', 'aptos', 'sei', 'solana', 'zeta', 'creditcoin', 'vana', 'flow', 'wormhole', 'monad', 'mantle', 'imagine'];

/**
 * Classifies user intent from a message to determine appropriate tool routing.
 *
 * Uses a hybrid approach:
 * 1. Fast pattern matching for high-confidence cases
 * 2. Context-based routing for follow-up messages in chain-specific chats
 * 3. LLM fallback for ambiguous prompts (if enabled)
 *
 * @param message - The user's message to classify
 * @param options - Classification options including chatContext for follow-ups
 * @returns Promise<IntentClassification> - Classification result with confidence
 */
export async function classifyIntent(
    message: string,
    options: ClassificationOptions = {}
): Promise<IntentClassification> {
    const { fallbackToLLM = true, confidenceThreshold = 0.6, chatContext, hasImageContext } = options;

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
        // Special Case: IF pattern detected generic "on_chain" (e.g. "track portfolio")
        // BUT we have a specific chain context (e.g. "cronos"), prevent early return
        // and allow context logic to handle it, OR override immediately.

        const EVM_COMPATIBLE_CHAINS = ['on_chain', 'cronos', 'mantle', 'monad', 'zeta', 'creditcoin', 'vana', 'flow', 'wormhole', 'sei'];

        if (patternResult.primaryIntent === 'on_chain' &&
            chatContext &&
            EVM_COMPATIBLE_CHAINS.includes(chatContext as IntentType) &&
            chatContext !== 'on_chain') {

            console.log(
                `[INTENT] Generic 'on_chain' pattern detected in '${chatContext}' context. Overriding early return to preserve context.`
            );
            // Don't return here - let it fall through to context logic (Step 2)
        } else {
            // Before returning generic on_chain, check if message mentions chain-specific tokens
            // e.g. "Trade 100 MON for Penguin" should route to 'monad' not 'on_chain'
            if (patternResult.primaryIntent === 'on_chain') {
                const detectedChain = detectChainFromRegistry(message);
                if (detectedChain && detectedChain.intent !== 'on_chain') {
                    console.log(
                        `[INTENT] Swap/trade with chain-specific token detected: ${detectedChain.id} (overriding on_chain) in ${Date.now() - startTime} ms`
                    );
                    return {
                        ...patternResult,
                        primaryIntent: detectedChain.intent,
                        indicators: [...patternResult.indicators, `chain_token_override:${detectedChain.id}`],
                    };
                }
            }
            console.log(
                `[INTENT] Pattern match: ${patternResult.primaryIntent} (${patternResult.confidence.toFixed(2)}) in ${Date.now() - startTime} ms`
            );
            return patternResult;
        }
    }

    // Step 1.5: Follow-up query detection with semantic action routing
    // If this looks like a follow-up query, use context + semantic action
    if (chatContext && CONTEXT_AWARE_GROUPS.includes(chatContext as IntentType)) {
        const followUp = isFollowUpQuery(message);
        const semanticAction = detectSemanticAction(message);

        if (followUp || semanticAction) {
            // Check if semantic action specifies a different route
            if (semanticAction && semanticAction.route !== 'context') {
                // Actions like "swap" always route to on_chain for Relay
                console.log(
                    `[INTENT] Semantic action '${semanticAction.action}' routes to ${semanticAction.route} in ${Date.now() - startTime} ms`
                );
                return {
                    primaryIntent: semanticAction.route as IntentType,
                    confidence: 0.85,
                    indicators: [`semantic:${semanticAction.action}`, 'action_override'],
                    requiresMultiTool: false,
                    classificationMethod: 'pattern',
                };
            }

            // Check chain registry for explicit chain mention that might override
            const detectedChain = detectChainFromRegistry(message);
            if (detectedChain && detectedChain.intent !== chatContext) {
                // User explicitly mentioned a different chain - switch to it
                console.log(
                    `[INTENT] Chain override: ${detectedChain.id} (from registry) in ${Date.now() - startTime} ms`
                );
                return {
                    primaryIntent: detectedChain.intent,
                    confidence: 0.9,
                    indicators: [`registry:${detectedChain.id}`, `switched_from:${chatContext}`],
                    requiresMultiTool: false,
                    classificationMethod: 'pattern',
                };
            }

            // Follow-up or semantic action with context - inherit context
            const indicator = followUp ? 'follow_up_detected' : `semantic:${semanticAction?.action}`;
            console.log(
                `[INTENT] ${followUp ? 'Follow-up' : 'Semantic action'} -> inheriting context: ${chatContext} in ${Date.now() - startTime} ms`
            );
            return {
                primaryIntent: chatContext as IntentType,
                confidence: 0.85,
                indicators: [indicator, `context:${chatContext}`],
                requiresMultiTool: false,
                classificationMethod: 'pattern',
            };
        }
    }

    // Step 2: Context-based routing for follow-up messages
    // If we have a valid context and pattern matching didn't find a clear different intent,
    // use the context to route the message

    // Handle image context - if conversation has image generation history
    if (hasImageContext && !patternMatchedDifferentTopic(patternResult, 'imagine')) {
        console.log(
            `[INTENT] Using image context: imagine(continuing image conversation) in ${Date.now() - startTime} ms`
        );
        return {
            primaryIntent: 'imagine',
            confidence: 0.75,
            indicators: ['context:continuing_image_conversation'],
            requiresMultiTool: false,
            classificationMethod: 'pattern',
        };
    }

    // Handle chain-specific context
    if (chatContext && CONTEXT_AWARE_GROUPS.includes(chatContext as IntentType)) {
        // CRITICAL: Check if addresses in the message indicate a DIFFERENT chain than context
        const hasEvmAddress = /\b0x[a-fA-F0-9]{40}\b/.test(message);
        const hasSolanaAddress = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/.test(message);
        const hasAptosAddress = /\b0x[a-fA-F0-9]{64}\b/.test(message);
        const hasSeiAddress = /\bsei1[a-z0-9]{38,}\b/.test(message);

        // Define which chains support EVM addresses (0x format)
        // Note: Sei has EVM compatibility, so it accepts BOTH sei1... AND 0x addresses
        const EVM_COMPATIBLE_CHAINS = ['on_chain', 'cronos', 'mantle', 'monad', 'zeta', 'creditcoin', 'vana', 'flow', 'wormhole', 'sei'];

        // Check if the pattern matched a DIFFERENT chain with reasonable confidence
        const patternMatchedDifferentChain = patternResult &&
            CONTEXT_AWARE_GROUPS.includes(patternResult.primaryIntent as IntentType) &&
            patternResult.primaryIntent !== chatContext &&
            // CRITICAL: Don't let generic 'on_chain' override specific EVM chains (e.g. 'cronos')
            // If context is 'cronos' and pattern says 'on_chain' (e.g. "portfolio"), stick to 'cronos'
            !(patternResult.primaryIntent === 'on_chain' && EVM_COMPATIBLE_CHAINS.includes(chatContext)) &&
            patternResult.confidence > 0.5;

        // Determine if address type mismatches the context
        const addressMismatchesContext = (
            // User has Solana context but provided EVM address (not a Solana address)
            (chatContext === 'solana' && hasEvmAddress && !hasSolanaAddress) ||
            // User has Aptos context but provided 40-char EVM address (Aptos uses 64-char)
            (chatContext === 'aptos' && hasEvmAddress && !hasAptosAddress) ||
            // User has EVM-compatible context but provided Solana address (and no EVM address)
            (EVM_COMPATIBLE_CHAINS.includes(chatContext) && hasSolanaAddress && !hasEvmAddress) ||
            // User has non-Aptos context but provided Aptos address (64 hex chars)
            // Note: Aptos 64-char addresses are distinct from 40-char EVM addresses
            (chatContext !== 'aptos' && hasAptosAddress) ||
            // User has non-Sei context but provided native Sei address (sei1...)
            // Note: If user provides 0x address, they might still want Sei EVM, so only switch for sei1...
            (!EVM_COMPATIBLE_CHAINS.includes(chatContext) && chatContext !== 'sei' && hasSeiAddress)
        );

        // If address type mismatches context, override with pattern result or appropriate chain
        if (addressMismatchesContext) {
            // If pattern found a better match, use it
            if (patternResult && patternResult.confidence > 0.3) {
                console.log(
                    `[INTENT] Address mismatch detected - overriding ${chatContext} context with ${patternResult.primaryIntent} in ${Date.now() - startTime} ms`
                );
                return patternResult;
            }
            // Native Sei address always goes to Sei
            else if (hasSeiAddress) {
                console.log(
                    `[INTENT] Sei address detected in ${chatContext} context - switching to sei in ${Date.now() - startTime} ms`
                );
                return {
                    primaryIntent: 'sei',
                    confidence: 0.8,
                    indicators: ['address_mismatch:sei_address_detected'],
                    requiresMultiTool: false,
                    classificationMethod: 'pattern',
                };
            }
            // Aptos address (64 hex chars)
            else if (hasAptosAddress) {
                console.log(
                    `[INTENT] Aptos address detected in ${chatContext} context - switching to aptos in ${Date.now() - startTime} ms`
                );
                return {
                    primaryIntent: 'aptos',
                    confidence: 0.8,
                    indicators: ['address_mismatch:aptos_address_detected'],
                    requiresMultiTool: false,
                    classificationMethod: 'pattern',
                };
            }
            // Solana address
            else if (hasSolanaAddress) {
                console.log(
                    `[INTENT] Solana address detected in ${chatContext} context - switching to solana in ${Date.now() - startTime} ms`
                );
                return {
                    primaryIntent: 'solana',
                    confidence: 0.8,
                    indicators: ['address_mismatch:solana_address_detected'],
                    requiresMultiTool: false,
                    classificationMethod: 'pattern',
                };
            }
            // EVM address (0x 40-char) - default to on_chain for generic EVM
            else if (hasEvmAddress) {
                console.log(
                    `[INTENT] EVM address detected in ${chatContext} context - switching to on_chain in ${Date.now() - startTime} ms`
                );
                return {
                    primaryIntent: 'on_chain',
                    confidence: 0.8,
                    indicators: ['address_mismatch:evm_address_in_non_evm_context'],
                    requiresMultiTool: false,
                    classificationMethod: 'pattern',
                };
            }
        }

        // If pattern didn't match a different chain and no address mismatch, use context
        if (!patternMatchedDifferentChain) {
            console.log(
                `[INTENT] Using chat context: ${chatContext} (continuing conversation) in ${Date.now() - startTime} ms`
            );
            return {
                primaryIntent: chatContext as IntentType,
                confidence: 0.75, // High confidence for context-based routing
                indicators: [`context:continuing_${chatContext} _conversation`],
                requiresMultiTool: false,
                classificationMethod: "pattern", // Treat as pattern since it's deterministic
            };
        }
    }

    // Step 3: Use LLM for low-confidence or no pattern match
    if (fallbackToLLM) {
        console.log("[INTENT] Pattern confidence low, using LLM fallback...");
        const llmResult = await classifyByLLM(message, chatContext, hasImageContext);
        console.log(
            `[INTENT] LLM result: ${llmResult.primaryIntent} (${llmResult.confidence.toFixed(2)}) in ${Date.now() - startTime} ms`
        );
        return llmResult;
    }

    // Step 4: Return pattern result even if low confidence, or default to search
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
