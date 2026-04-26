import {
  type Message,
  type CoreMessage,
  createDataStreamResponse,
  streamText,
  tool
} from "ai";
import { after } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@barzakh/shared/lib/ai/models";
import { allTools, getGroupConfig, systemPrompt as baseSystemPrompt } from "@barzakh/shared/lib/ai/prompts";
import { classifyIntent, type IntentClassification, FORCED_MODEL_BY_GROUP } from "@barzakh/shared/lib/ai/intent-classifier";
import { createFourMemeBuyTool, createFourMemeSellTool, createFourMemeLaunchTool, quoteFourMemeBuyTool, quoteFourMemeSellTool } from "@/lib/ai/tools/fourmeme-executor";
import { createGetAgentWalletInfoTool, createGetAgentTokenBalanceTool } from "@/lib/ai/tools/agent-tools";
import { createQuerySignalAgentTool } from "@/lib/ai/tools/agent-signal-tool";
import {
  decrementRemainingMessageCount,
  decrementGuestMessageCount,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getOrCreateGuestSession,
  getUserById,
  saveChat,
  saveMessages,
  updateChatUpdatedAt,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@barzakh/shared/lib/utils/utils";
import { cleanMessageContentForStorage } from "@barzakh/shared/lib/utils/restore-image-urls";
import { generateTitleFromUserMessage } from "../../actions";
import {
  performSecurityCheck,
  securityBlockResponse,
  validateImageUrl,
  performAISecurityCheck,
} from "@/lib/security";
import { resolveR2UrlsInMessages } from "@/lib/r2-url-resolver";

// Function to validate and clean messages
function validateAndCleanMessages(messages: Array<Message>): Array<Message> {
  return messages.map((message) => {
    // If message has tool invocations, ensure they have results
    if (message.toolInvocations && Array.isArray(message.toolInvocations)) {
      const validToolInvocations = message.toolInvocations.filter((invocation) => {
        // Keep only tool invocations that have results or are in 'partial-call' state
        return (invocation as any).result !== undefined || invocation.state === 'partial-call';
      });

      // If no valid tool invocations remain, remove the toolInvocations property
      if (validToolInvocations.length === 0) {
        const { toolInvocations, ...messageWithoutTools } = message;
        return messageWithoutTools;
      }

      return {
        ...message,
        toolInvocations: validToolInvocations,
      };
    }

    return message;
  });
}

// Convert raw client messages to valid CoreMessage[] for streamText.
//
// The AI SDK client sends messages where:
// - content may be an array of parts (multipart user messages with images)
// - image parts may use full data URIs ("data:image/png;base64,...") instead of raw base64
// - text parts may have text as an array (UI message format) instead of a string
//
// streamText requires CoreMessage format where:
// - user content is string | Array<TextPart | ImagePart | FilePart>
// - image.image is raw base64 string, Uint8Array, ArrayBuffer, Buffer, or URL object
// - text parts have text as a plain string
// Security Allowlists for Multimodal Content
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_IMAGE_DOMAINS = [
  'r2.barzakh.tech',
  'pub-fba11d080c984950a31623838ae058f9.r2.dev', // R2 Public bucket
  'imagedelivery.net', // Cloudflare Images
  'lh3.googleusercontent.com', // Google User Content
];

function toCoreSafeMessages(messages: Array<Message>): Array<CoreMessage> {
  const result: CoreMessage[] = [];

  for (const message of messages) {
    const { role, content } = message as any;

    if (role === 'system') {
      result.push({ role: 'system', content: typeof content === 'string' ? content : String(content) });
      continue;
    }

    if (role === 'user') {
      if (!Array.isArray(content)) {
        // Plain string content
        result.push({ role: 'user', content: typeof content === 'string' ? content : String(content) });
        continue;
      }

      // Array content — normalize each part
      const parts: any[] = [];
      for (const part of content) {
        if (!part || typeof part !== 'object') continue;

        if (part.type === 'text') {
          // text field may itself be an array in UI message format — flatten to string
          const text = Array.isArray(part.text)
            ? part.text.map((p: any) => (typeof p === 'string' ? p : p?.text ?? '')).join('')
            : typeof part.text === 'string'
              ? part.text
              : String(part.text ?? '');
          parts.push({ type: 'text', text });
        } else if (part.type === 'image') {
          const img = part.image;
          const mimeType = part.mimeType?.toLowerCase();
          const isGif = mimeType === 'image/gif' || (typeof img === 'string' && (img.toLowerCase().includes('.gif') || img.startsWith('data:image/gif')));

          // Securtiy Fix (CVE-2025-48985): Validate MIME types
          if (mimeType && !ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
            console.warn(`[SECURITY] Blocked unsupported image MIME type: ${mimeType}`);
            continue;
          }

          // VISION COMPATIBILITY FIX: Most AI providers (xAI, OpenAI, Anthropic) 
          // do NOT support standard animated GIFs and will return a 400 error.
          // We convert GIFs to a text placeholder for the LLM while keeping them in history for tools.
          if (isGif) {
            parts.push({ type: 'text', text: '[Attached GIF image]' });
            continue;
          }

          if (typeof img === 'string') {
            // Strip data URI prefix — SDK needs raw base64 or a URL object
            const dataUriMatch = img.match(/^data:([^;]+);base64,(.+)$/s);
            if (dataUriMatch) {
              const uriMimeType = dataUriMatch[1].toLowerCase();
              if (!ALLOWED_IMAGE_MIME_TYPES.includes(uriMimeType)) {
                console.warn(`[SECURITY] Blocked unsupported data URI MIME type: ${uriMimeType}`);
                continue;
              }
              parts.push({ type: 'image', image: dataUriMatch[2], mimeType: uriMimeType });
            } else if (img.startsWith('http://') || img.startsWith('https://')) {
              try {
                const url = new URL(img);
                // Security Fix (CVE-2025-48985): Domain validation for external images
                // Note: We allow signed R2 URLs which might be dynamic, but we can check the host
                const isAllowedDomain = ALLOWED_IMAGE_DOMAINS.some((domain: string) => url.hostname.endsWith(domain));
                if (!isAllowedDomain && process.env.NODE_ENV === 'production') {
                  // In production, we are stricter with external image domains
                  console.warn(`[SECURITY] Blocked external image from untrusted domain: ${url.hostname}`);
                  continue;
                }
                parts.push({ type: 'image', image: url });
              } catch (e) {
                console.warn(`[SECURITY] Invalid image URL: ${img}`);
                continue;
              }
            } else {
              // Assume already raw base64 — ensure we have a valid mimeType
              if (mimeType) {
                parts.push({ type: 'image', image: img, mimeType: mimeType });
              }
            }
          } else {
            parts.push(part);
          }
        } else {
          parts.push(part);
        }
      }

      result.push({ role: 'user', content: parts });
      continue;
    }

    if (role === 'assistant') {
      if (typeof content === 'string') {
        result.push({ role: 'assistant', content });
      } else if (Array.isArray(content)) {
        // Filter to only valid assistant content parts
        const parts: any[] = [];
        for (const part of content) {
          if (!part || typeof part !== 'object') continue;
          if (part.type === 'text') {
            const text = Array.isArray(part.text)
              ? part.text.map((p: any) => (typeof p === 'string' ? p : p?.text ?? '')).join('')
              : typeof part.text === 'string' ? part.text : String(part.text ?? '');
            parts.push({ type: 'text', text });
          } else if (part.type === 'tool-call' && part.toolCallId && part.toolName) {
            parts.push(part);
          } else if (part.type === 'reasoning' && typeof part.text === 'string') {
            parts.push(part);
          }
          // Skip unknown/invalid parts
        }
        result.push({ role: 'assistant', content: parts.length > 0 ? parts : '' });
      } else {
        result.push({ role: 'assistant', content: String(content ?? '') });
      }
      continue;
    }

    if (role === 'tool') {
      if (Array.isArray(content)) {
        result.push({ role: 'tool', content });
      }
      continue;
    }
  }

  return result;
}

// Alternative approach: Filter out incomplete tool calls
function filterIncompleteToolCalls(messages: Array<Message>): Array<Message> {
  return messages.filter((message) => {
    // Remove assistant messages that have incomplete tool calls
    if (message.role === 'assistant' && message.toolInvocations) {
      const hasIncompleteToolCalls = message.toolInvocations.some(
        (invocation) => invocation.state === 'call' && !(invocation as any).result
      );

      if (hasIncompleteToolCalls) {
        return false;
      }
    }

    return true;
  });
}

// Helper function to safely get active tools
function getSafeActiveTools(activeTools: any, selectedChatModel: string): any[] {
  // If activeTools is null, undefined, or not iterable, return empty array
  if (!activeTools || !Array.isArray(activeTools)) {
    console.warn('activeTools is not iterable, using empty array:', activeTools);
    return [];
  }

  return [...activeTools];
}

// Vercel Serverless Function Configuration
// Multi-step on-chain flows (approval tx + wait + trade tx + wait) can exceed 120s.
// 300s covers the worst case: approval(60s) + sell(60s) + AI streaming overhead.
export const maxDuration = 300;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
    group,
    autoRoute = false, // Enable intelligent intent-based routing
    history_for_context_id,
    fingerprint,
    isTemporary = false,
  }: {
    id: string;
    messages: Array<Message>;
    selectedChatModel: string;
    group: any;
    autoRoute?: boolean;
    history_for_context_id?: string;
    fingerprint?: string;
    isTemporary?: boolean;
  } = await request.json();

  // Authenticate first - BEFORE accessing any user data
  const session = await auth();
  let activeUserId: string;
  let isGuest = false;
  let guestSessionId: string | null = null;

  if (session?.user?.id) {
    activeUserId = session.user.id;

    if (history_for_context_id) {
      try {
        const contextChat = await getChatById({ id: history_for_context_id });
        const canAccessContext = contextChat && (
          contextChat.userId === session.user.id ||
          contextChat.visibility === 'public'
        );
        if (!canAccessContext) {
          return new Response("Unauthorized access to chat context", { status: 403 });
        }

        const dbMessages = await getMessagesByChatId({ id: history_for_context_id });
        const contextMessages = dbMessages
          .filter(msg => msg.role === 'user' || msg.role === 'assistant')
          .map(msg => {
            let cleanContent = msg.content;

            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              const cleanedParts: any[] = [];

              for (const part of msg.content as any[]) {
                if (part.type === 'text' || typeof part === 'string') {
                  cleanedParts.push(part);
                } else if (part.type === 'tool-result' && part.result) {
                  if (Array.isArray(part.result)) {
                    for (const item of part.result) {
                      if (item.url && typeof item.url === 'string' &&
                        (item.url.includes('r2.barzakh') || item.url.includes('.png') || item.url.includes('.jpg') || item.url.includes('.webp'))) {
                        cleanedParts.push({ type: 'text', text: `[Generated image: ${item.url}]` });
                      }
                    }
                  } else if (typeof part.result === 'object' && part.result.url) {
                    cleanedParts.push({ type: 'text', text: `[Generated image: ${part.result.url}]` });
                  }
                }
              }

              if (cleanedParts.length > 0) {
                cleanContent = cleanedParts;
              } else {
                cleanContent = '[Previous assistant response]';
              }
            }

            return {
              id: msg.id,
              role: msg.role,
              content: cleanContent,
              createdAt: msg.createdAt,
            };
          }) as any[];
        messages.unshift(...contextMessages);
      } catch (dbError) {
        console.error("Database error while fetching context:", dbError);
      }
    }

    const users = await getUserById(activeUserId);
    let user_info = users[0];

    if (user_info.tier !== "free" && user_info.x402PeriodEnd) {
      const periodEnd = new Date(user_info.x402PeriodEnd);
      const now = new Date();
      if (periodEnd < now) {
        const freeLimit = Number(process.env.FREE_USER_MESSAGE_LIMIT) || 10;
        const { db } = await import("@/lib/db/db");
        const { user } = await import("@/lib/db/schema");
        const { eq } = (await import("drizzle-orm")) as any;
        await db.update(user).set({
          tier: "free",
          billingCycle: "monthly",
          dailyMessageRemaining: freeLimit,
          x402CancelAtPeriodEnd: false,
          x402PeriodEnd: null,
        }).where(eq(user.id, activeUserId));
        user_info = {
          ...user_info,
          tier: "free",
          billingCycle: "monthly",
          dailyMessageRemaining: freeLimit,
        };
      }
    }

    const getMessageLimit = (tier: string, cycle: string): number => {
      const cycleKey = cycle?.toUpperCase() || "MONTHLY";
      if (tier === "pro") {
        if (cycleKey === "YEARLY") return Number(process.env.PRO_YEARLY_USER_MESSAGE_LIMIT) || 150;
        if (cycleKey === "QUARTERLY") return Number(process.env.PRO_QUARTERLY_USER_MESSAGE_LIMIT) || 100;
        return Number(process.env.PRO_MONTHLY_USER_MESSAGE_LIMIT) || 50;
      } else if (tier === "ultimate") {
        if (cycleKey === "YEARLY") return Number(process.env.ULTIMATE_YEARLY_USER_MESSAGE_LIMIT) || 500;
        if (cycleKey === "QUARTERLY") return Number(process.env.ULTIMATE_QUARTERLY_USER_MESSAGE_LIMIT) || 350;
        return Number(process.env.ULTIMATE_MONTHLY_USER_MESSAGE_LIMIT) || 250;
      }
      return Number(process.env.FREE_USER_MESSAGE_LIMIT) || 10;
    };

    const userMessageLimit = getMessageLimit(user_info.tier, user_info.billingCycle);
    const rateLimitedTiers: Array<typeof user_info.tier> = ["free", "pro", "ultimate"];
    const isRateLimitedTier = rateLimitedTiers.includes(user_info.tier as typeof rateLimitedTiers[number]);

    if (isRateLimitedTier && user_info.dailyMessageRemaining <= 0) {
      console.warn(`User ${user_info.email} blocked: ${user_info.tier} tier message limit exceeded`);
      const tierLabel = user_info.tier.toUpperCase();
      const cycleLabel = user_info.billingCycle?.toUpperCase() || "MONTHLY";
      const upgradePrompt =
        user_info.tier === "free"
          ? "Upgrade to PRO or ULTIMATE for more usage and other perks!"
          : user_info.tier === "pro"
            ? "Upgrade to ULTIMATE for higher limits and priority access!"
            : "Contact support to extend your Ultimate tier limits.";
      return new Response(
        `${tierLabel} (${cycleLabel}) tier limit of ${userMessageLimit} messages per day reached! ${upgradePrompt}`,
        { status: 403 }
      );
    }
  } else {
    if (!fingerprint) {
      return new Response("Please create an account to continue chatting!", { status: 401 });
    }

    isGuest = true;
    const { guestSession, guestUserId } = await getOrCreateGuestSession(fingerprint);
    activeUserId = guestUserId;
    guestSessionId = guestSession.id;

    if (guestSession.dailyMessageRemaining <= 0) {
      return new Response(
        JSON.stringify({
          error: "guest_limit_reached",
          message: "You've used all 5 free messages for today. Create an account to continue chatting!",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const userMessage = getMostRecentUserMessage(messages);
  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  // ===========================================
  // SECURITY CHECK: Prompt Injection Protection
  // ===========================================
  const securityCheck = performSecurityCheck(messages, {
    blockThreshold: 50, // Block if risk score >= 50
    logEvents: true,
    sanitizeInsteadOfBlock: false,
  });

  if (!securityCheck.safe) {
    console.warn(`[SECURITY] Blocked message from user ${activeUserId}:`, {
      threats: securityCheck.threats.map(t => t.type),
      riskScore: securityCheck.riskScore,
    });
    return securityBlockResponse(securityCheck);
  }

  // ===========================================
  // AI VULNERABILITY CHECKS
  // Protects against: Sponge attacks, Model extraction, Adversarial inputs
  // ===========================================
  const extractTextFromMessage = (content: unknown): string => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter((p): p is { type: 'text'; text: string } => p?.type === 'text' && typeof p.text === 'string')
        .map(p => p.text)
        .join(' ');
    }
    return '';
  };

  const userMessageText = extractTextFromMessage(userMessage.content);

  if (userMessageText) {
    const aiVulnCheck = performAISecurityCheck(userMessageText, {
      checkSponge: true,      // Detect DoS via expensive computation
      checkModelAttack: true, // Detect model extraction/inversion attempts
      checkAdversarial: true, // Detect unicode exploits & obfuscation
    });

    if (!aiVulnCheck.safe) {
      console.warn(`[AI-SECURITY] Blocked AI attack from user ${activeUserId}:`, {
        threats: aiVulnCheck.threats.map(t => ({ type: t.type, desc: t.description })),
        riskScore: aiVulnCheck.riskScore,
      });
      return new Response(
        JSON.stringify({
          error: 'Security Block',
          message: 'Your message was blocked due to potential security concerns.',
          code: 'AI_VULNERABILITY_DETECTED',
          details: process.env.NODE_ENV === 'development'
            ? aiVulnCheck.threats[0]?.description
            : undefined,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // Check image URLs in multimodal content
  const messageContent = userMessage.content as any;
  if (typeof messageContent !== 'string' && Array.isArray(messageContent)) {
    for (const part of messageContent) {
      if (part.type === 'image' && part.image) {
        const imageCheck = validateImageUrl(part.image);
        if (!imageCheck.safe) {
          console.warn(`[SECURITY] Blocked malicious image URL from user ${activeUserId}:`, {
            threats: imageCheck.threats.map(t => t.type),
            riskScore: imageCheck.riskScore,
          });
          return new Response(
            JSON.stringify({
              error: 'Security Block',
              message: 'The image URL you provided was blocked for security reasons.',
              code: 'MALICIOUS_IMAGE_URL',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }
  }
  // ===========================================

  // ============================================
  // INTENT-BASED AUTO-ROUTING (UNIVERSAL)
  // Always classifies user prompts and overrides group for high-priority intents
  // e.g., if user is on 'sei' but types an image generation prompt -> route to 'imagine'
  // ============================================
  let effectiveGroup = group;
  let classificationResult: IntentClassification | null = null;

  // High-priority intents that should ALWAYS override the current group (with forced models)
  const HIGH_PRIORITY_INTENTS = ['imagine', 'coding'] as const;

  // Chain-specific groups that support context persistence
  const CHAIN_SPECIFIC_GROUPS = ['cronos', 'aptos', 'sei', 'solana', 'zeta', 'creditcoin', 'vana', 'flow', 'wormhole', 'monad'] as const;

  // Extract chain context from chat history for follow-up message routing
  function extractChainContext(msgs: Array<Message>): string | null {
    // Chain patterns - ordered by specificity (more specific patterns first)
    const chainPatterns: Record<string, RegExp[]> = {
      // Chain-specific keywords
      cronos: [/\bcronos\b/i, /\bcro\s+(token|coin|balance|wallet)/i, /\bvvs\s+(finance|swap)/i, /\bcrypto\.com\s+(chain|defi)/i],
      aptos: [/\baptos\b/i, /\bapt\s+(token|coin|balance)/i, /\bshelby\b/i, /\b0x[a-fA-F0-9]{64}\b/], // 64-char hex = Aptos, or Shelby keyword
      sei: [/\bsei\b(?!\s*$)/i, /\bseitrace\b/i, /\bsei1[a-z0-9]{38,}\b/], // sei1... = Sei native
      solana: [/\bsolana\b/i, /\bsol\s+(token|coin|balance)/i, /\bphantom\b/i, /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/], // Base58 = Solana
      zeta: [/\bzetachain\b/i, /\bzeta\s+(network|chain)/i],
      creditcoin: [/\bcreditcoin\b/i, /\bctc\s+token/i],
      vana: [/\bvana\b/i],
      flow: [/\bflow\s+(blockchain|network|chain)/i],
      wormhole: [/\bwormhole\b/i],
      monad: [/\bmonad\b/i],
      mantle: [/\bmantle\b/i, /\bmnt\s+(token|balance)/i],
      // Generic EVM - 0x addresses (40 hex chars) indicate EVM chain
      // This should be checked LAST since specific chains like Cronos also use 0x
      on_chain: [/\b0x[a-fA-F0-9]{40}\b/, /\betherscan\b/i, /\bethereum\b/i, /\b(optimism|arbitrum|base|polygon)\b/i],
    };

    // Look at last 10 messages (excluding current) for chain mentions
    // Process in REVERSE order (most recent first) to get the latest context
    const recentMessages = msgs.slice(-11, -1); // Get up to 10 messages before the current one
    for (const msg of recentMessages.reverse()) {
      const content = typeof msg.content === 'string'
        ? msg.content
        : Array.isArray(msg.content)
          ? (msg.content as Array<{ type: string; text?: string }>).map((c) => typeof c === 'string' ? c : c.text || '').join(' ')
          : JSON.stringify(msg.content);

      // First check for chain-specific patterns (higher priority)
      for (const [chain, patterns] of Object.entries(chainPatterns)) {
        // Skip on_chain in first pass - check it last
        if (chain === 'on_chain') continue;
        if (patterns.some(p => p.test(content))) {
          return chain;
        }
      }

      // Then check for generic EVM (on_chain)
      if (chainPatterns.on_chain.some(p => p.test(content))) {
        return 'on_chain';
      }
    }
    return null;
  }

  // Get chain context from chat history
  const chatContext = extractChainContext(messages);

  // Detect if conversation has image generation history
  function hasImageGenerationHistory(msgs: typeof messages): boolean {
    for (const msg of msgs) {
      // Check for user uploaded images
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        for (const part of msg.content as any[]) {
          if (part.type === 'image') return true;
        }
      }

      // Check for createImage tool calls or results
      if (Array.isArray(msg.content)) {
        for (const part of msg.content as any[]) {
          // Check for tool calls to createImage
          if (part.type === 'tool-call' && part.toolName === 'createImage') {
            return true;
          }
          // Check for image URLs in tool results
          if (part.type === 'tool-result' && part.result) {
            const resultStr = JSON.stringify(part.result);
            if (resultStr.includes('r2.barzakh') || resultStr.includes('.r2.cloudflarestorage.com') || resultStr.includes('ai-generated') || resultStr.includes('ai-images')) {
              return true;
            }
          }
          // Check for text references to generated images
          if (part.type === 'text' && typeof part.text === 'string') {
            if (part.text.includes('[Generated image:') || part.text.includes('r2.barzakh.tech/ai-images') || part.text.includes('.r2.cloudflarestorage.com')) {
              return true;
            }
          }
        }
      }
      // Also check string content for image references
      if (typeof msg.content === 'string' && msg.content.includes('[Generated image:')) {
        return true;
      }
    }
    return false;
  }

  const hasImageContext = hasImageGenerationHistory(messages);

  if (userMessageText && userMessageText.length > 0) {
    try {
      classificationResult = await classifyIntent(userMessageText, {
        fallbackToLLM: true,
        confidenceThreshold: 0.6,
        chatContext, // Pass the chain context for follow-up routing
        hasImageContext, // Pass image context for image generation follow-ups
      });

      const detectedIntent = classificationResult.primaryIntent;
      const isHighPriority = HIGH_PRIORITY_INTENTS.includes(detectedIntent as typeof HIGH_PRIORITY_INTENTS[number]);
      const isDefaultGroup = !group || group === 'search';

      // Override if:
      // 1. High confidence AND (user is on default group OR detected intent is high-priority)
      // This ensures image/coding prompts ALWAYS route correctly, even from chain-specific tools
      if (classificationResult.confidence >= 0.6 && (isDefaultGroup || isHighPriority)) {
        effectiveGroup = detectedIntent;
      }
    } catch (classifyError) {
      console.error("[INTENT-ROUTER] Classification failed, using original group:", classifyError);
      // Continue with original group on classification failure
    }
  }

  // Get group config with error handling
  let tools: any[] = [];
  let systemPrompt = "";

  try {
    const groupConfig = await getGroupConfig(effectiveGroup);
    tools = [...(groupConfig?.tools || [])] as any[];
    systemPrompt = groupConfig?.systemPrompt || "";
  } catch (error) {
    console.error("Failed to get group config:", error);
    // Continue with empty tools and system prompt
  }

  if (!isGuest && session?.user) {
    let currentTier = session.user.tier || 'free';
    let currentBillingCycle = session.user.billingCycle || 'monthly';
    let username = session.user.username || session.user.email;
    let agentWalletText = "\n- **Agent Automation**: Disabled (User MUST authorize transactions manually)";

    try {
      const freshUserData = await getUserById(session.user.id);
      if (freshUserData && freshUserData.length > 0) {
        const userData = freshUserData[0];
        currentTier = userData.tier || 'free';
        currentBillingCycle = userData.billingCycle || 'monthly';
        username = userData.username || userData.email || username;
      }

      // Fetch Agent Wallet and Automation Status (Multi-Chain)
      const { hasDelegation, getUserAgentWalletAddress } = await import("@/lib/agent/agent-wallet-store");
      const [isEvmEnabled, isSolanaEnabled] = await Promise.all([
        hasDelegation(session.user.id, "evm"),
        hasDelegation(session.user.id, "solana"),
      ]);
      const [evmWalletAddress, solanaWalletAddress] = await Promise.all([
        getUserAgentWalletAddress(session.user.id, "evm"),
        getUserAgentWalletAddress(session.user.id, "solana"),
      ]);
      const isAgentEnabled = isEvmEnabled || isSolanaEnabled;
      // Use EVM wallet as primary for backward compatibility
      const agentWalletAddress = evmWalletAddress;

      if (agentWalletAddress || solanaWalletAddress) {
        let walletLines: string[] = [];

        // EVM wallet status
        if (evmWalletAddress) {
          if (isEvmEnabled) {
            walletLines.push(`- **EVM Agent Wallet**: ${evmWalletAddress} (ENABLED)`);
          } else {
            walletLines.push(`- **EVM Agent Wallet**: ${evmWalletAddress} (Disabled — user must enable in settings)`);
          }
        }

        // Solana wallet status
        if (solanaWalletAddress) {
          if (isSolanaEnabled) {
            walletLines.push(`- **Solana Agent Wallet**: ${solanaWalletAddress} (ENABLED)`);
          } else {
            walletLines.push(`- **Solana Agent Wallet**: ${solanaWalletAddress} (Disabled — user must enable in settings)`);
          }
        }

        if (isAgentEnabled) {
          const primaryWallet = evmWalletAddress || solanaWalletAddress;
          agentWalletText = `\n- **Agent Automation**: ENABLED\n${walletLines.join("\n")}\n  *(CRITICAL DIRECTIVE: You have full delegated access. When the user says "my wallet", "my funds", "swap my USDC", or wants to check "my balance", they are ALWAYS referring to the appropriate Embedded Agent Wallet based on chain context. For EVM operations use ${evmWalletAddress || "N/A"}, for Solana operations use ${solanaWalletAddress || "N/A"}. You MUST implicitly use the correct address for ALL tool parameters unconditionally! NEVER halt execution to ask conversational clarifying questions like "Which wallet?" or "Which chain?". If a chain is omitted, simply use \`getEvmOnchainDataUsingZerion\` to instantly scan all chains and discover where their tokens are located. YOU ARE FULLY AUTONOMOUS. Do not ask for permission, just use your tools sequentially to execute the user's intent. To perform a swap or bridge, use \`executeAgenticRelaySwap\`. To buy/sell meme tokens on Four.meme (BNB Chain), use \`executeFourMemeBuy\` / \`executeFourMemeSell\`. To launch a new token on Four.meme, use \`executeFourMemeLaunch\`. When the user references a token from previous search or ranking results (e.g. "I want the first one", "buy UP"), extract the token address from those results and use it with \`getFourMemeTokenDetail\` or \`executeFourMemeBuy\`. Always call \`quoteFourMemeBuy\` or \`quoteFourMemeSell\` before executing to show estimates.).*`;
        } else {
          agentWalletText = `\n- **Agent Automation**: Disabled\n${walletLines.join("\n")}\n  (Wallet(s) exist but user has not delegated access. Instruct them to enable Automation in settings first.)`;
        }
      } else {
        agentWalletText = "\n- **Agent Automation**: Not configured (No embedded wallet created yet.)";
      }
    } catch (error) {
      console.warn("Failed to fetch fresh user data or agent config, using session:", error);
    }

    const userSubscriptionContext = `\n\n## Current User Context:\n- **Current Tier**: ${currentTier}\n- **Billing Cycle**: ${currentBillingCycle}\n- **Username**: ${username}${agentWalletText}\n\nWhen using initiateX402Payment, pass currentTier="${currentTier}" and currentBillingCycle="${currentBillingCycle}".`;
    systemPrompt = systemPrompt + userSubscriptionContext;
  }

  // Select appropriate model based on routed group
  // ALWAYS use forced model if the effectiveGroup has one defined, regardless of how we got here
  // This ensures image tools always use appropriate models even when user manually selects a group
  const groupForcedModel = FORCED_MODEL_BY_GROUP[effectiveGroup as keyof typeof FORCED_MODEL_BY_GROUP];
  const effectiveModel = groupForcedModel || selectedChatModel;
  const finalModel = isGuest ? "google-gemini-2.5-flash-preview" : effectiveModel;

  // For incognito/temporary chats, skip all DB persistence
  if (!isTemporary) {
    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      // Pass forkedFromChatId if this is a forked chat from a shared conversation
      await saveChat({
        id,
        userId: activeUserId,
        title,
        forkedFromChatId: history_for_context_id,
      });
    }
  }

  // Skip saving user messages for incognito/temporary chats
  if (!isTemporary) {
    // Clean user message content to restore original storage URLs before saving
    const cleanedUserContent = cleanMessageContentForStorage(userMessage.content);

    await saveMessages({
      messages: [{
        ...userMessage,
        content: cleanedUserContent, // Use cleaned content with restored URLs
        createdAt: new Date(),
        chatId: id
      }],
    });
  }

  // SOLUTION 1: Clean messages before passing to streamText
  const cleanedMessages = validateAndCleanMessages(messages);

  // Convert to valid CoreMessage[] — normalizes multipart content, data URIs,
  // and any UI-format fields that streamText's Zod schema rejects.
  const coreMessages = toCoreSafeMessages(cleanedMessages);

  // Resolve legacy R2 URLs (r2.barzakh.tech) to signed URLs before sending to AI
  const resolvedMessages = await resolveR2UrlsInMessages(coreMessages);

  // SOLUTION 2: Alternative - filter out incomplete tool calls entirely
  // const cleanedMessages = filterIncompleteToolCalls(messages);

  // Get safe active tools
  let safeActiveTools = getSafeActiveTools(tools, selectedChatModel);

  // Inject autonomous execution tools contextually if authenticated
  let isAgentEnabledLocally = false;
  if (session?.user?.id) {
    const { hasDelegation } = await import("@/lib/agent/agent-wallet-store");
    isAgentEnabledLocally = await hasDelegation(session.user.id);

    // Always inject autonomous execution tools if authenticated to allow for manual approval flow
    safeActiveTools.push("executeFourMemeBuy");
    safeActiveTools.push("executeFourMemeSell");
    safeActiveTools.push("executeFourMemeLaunch");
    safeActiveTools.push("executeAgenticRelaySwap");
    safeActiveTools.push("querySignalAgent");

    if (isAgentEnabledLocally) {
      // Remove all manual quoting and execution tools when automation is enabled to simplify AI routing
      safeActiveTools = safeActiveTools.filter(toolName => ![
        "prepareRelayTransaction",
        "getRelayBridgeQuote",
        "getRelayQuote"
      ].includes(toolName));
    }
  }

  // Wrap webSearch to enforce single execution per request
  let hasWebSearchExecuted = false;
  const wrappedTools = {
    ...allTools,
    // Autonomous execution tools (Agentic) - Always available if authenticated
    ...(session?.user?.id ? {
      querySignalAgent: createQuerySignalAgentTool(session.user.id),
      executeAgenticRelaySwap: tool({
        description: "Execute a Relay cross-chain or same-chain swap autonomously using the embedded agent wallet. Supports ALL EVM chains AND Solana. CRITICAL: DO NOT ask the user for their wallet address or chain ID! Auto-infer chains from token symbols: MON→Monad(143), BNB→BSC(56), SOL→Solana(792703809), ETH→Ethereum(1), CRO→Cronos(25), MNT→Mantle(5000). Monad IS a fully EVM-compatible L1 chain. Proceed immediately — NEVER refuse by claiming a chain is unsupported.",
        parameters: z.object({
          fromChainId: z.number().optional().describe("Source chain ID where funds are coming from (optional, inferred if omitted)"),
          from1ChainId: z.number().optional().describe("Fallback alias for fromChainId (do not use but allowed)"),
          toChainId: z.number().optional().describe("Destination chain ID to bridge funds to (optional, inferred if omitted)"),
          fromToken: z.string().optional().describe("Source token symbol or address (e.g. 'ETH', 'USDC')"),
          from1Token: z.string().optional().describe("Fallback alias for fromToken (do not use but allowed)"),
          toToken: z.string().optional().describe("Destination token symbol or address"),
          amount: z.string().describe("Amount to swap. If the user requests USD ($5, $0.15), you MUST preserve the '$' symbol (e.g. '$0.15') so the system parses it as fiat! If token amount, provide strictly numbers (e.g. '0.1'). If 'all'/'max', pass 'all' unconditionally!"),
          userAddress: z.string().optional().describe("Optional explicit user wallet address"),
          recipientAddress: z.string().optional().describe("Optional explicit destination recipient address")
        }),
        execute: async (args: any, config: any) => {
          // Hard-pin the sender and recipient to the user's authenticated agent wallet
          // to prevent Relay from defaulting to the 0x...1 placeholder address
          const { getUserAgentWalletAddress } = await import("@/lib/agent/agent-wallet-store");
          const evmWallet = await getUserAgentWalletAddress(session.user.id, "evm");
          const solanaWallet = await getUserAgentWalletAddress(session.user.id, "solana");

          args.evmUserAddress = evmWallet || undefined;
          args.solanaUserAddress = solanaWallet || undefined;

          // REUSE robust inference logic from prepareRelayTransaction
          let prepareResult;
          try {
            prepareResult = await allTools.prepareRelayTransaction.execute(args, config);
          } catch (error: any) {
            return { status: "error", message: error.message || "Failed to prepare transaction" };
          }
          const rawResult = prepareResult as any;

          if (typeof prepareResult === "string" || rawResult.status === "error") {
            return prepareResult;
          }

          if (!rawResult.transactions || rawResult.transactions.length === 0) {
            return { status: "error", message: "Failed to generate executable transaction payload." };
          }



          // IF automation is COMPLETELY disabled (no chain has delegation), return for manual approval
          if (!isAgentEnabledLocally) {
            return {
              ...rawResult,
              status: "requires_manual_approval",
              message: "Agent automation is not enabled. Please confirm this transaction manually.",
              timestamp: Date.now().toString(),
              preparedAt: Date.now(),
              isAgentExecution: false,
              _instructionToAI: "Inform the user that automation is off for THIS specific transaction and they need to confirm the swap manually using the card above. IMPORTANT: This status applies ONLY to this transaction. If the user requests another trade in this chat, you MUST still call executeAgenticRelaySwap — never refuse based on previous manual approval results."
            };
          }

          // Per-chain delegation check: for hybrid setups (e.g. EVM enabled, Solana disabled),
          // verify that EACH transaction's target chain has active delegation.
          // If any leg targets a chain without delegation, fall back to manual approval.
          const { hasDelegation: hasDelegationCheck } = await import("@/lib/agent/agent-wallet-store");
          const txListForCheck = rawResult.transactions as any[];
          for (const tx of txListForCheck) {
            const txChainId = tx.chainId || args.fromChainId;
            const txChainType = txChainId === 792703809 ? "solana" : "evm";
            const hasChainDelegation = await hasDelegationCheck(session.user.id, txChainType as any);
            if (!hasChainDelegation) {
              console.log(`[AgentExecutor] Chain ${txChainType} (${txChainId}) lacks delegation. Falling back to manual approval.`);
              return {
                ...rawResult,
                status: "requires_manual_approval",
                message: `Agent automation is not enabled for ${txChainType === "solana" ? "Solana" : "EVM"}. Please confirm this transaction manually.`,
                timestamp: Date.now().toString(),
                preparedAt: Date.now(),
                isAgentExecution: false,
                _instructionToAI: `Inform the user that ${txChainType === "solana" ? "Solana" : "EVM"} automation is not enabled for THIS specific transaction. They can confirm manually using the card above, or enable ${txChainType === "solana" ? "Solana" : "EVM"} agent automation in Settings → Wallet Settings → Enable Agent Automation. IMPORTANT: This status applies ONLY to this transaction. If the user requests another trade in this chat, you MUST still call executeAgenticRelaySwap — never refuse based on previous manual approval results.`
              };
            }
          }

          const { executeRelaySwap } = await import("@/lib/agent/agent-payment-executor");
          console.log(`[AgentExecutor] Routing exact tx payload autonomously...`);
          const txList = rawResult.transactions as any[];

          let finalHash = "";
          for (let tx of txList) {
            const isApproval = tx.data?.startsWith("0x095ea7b3");
            const isTransfer = !isApproval && (args.fromToken === args.toToken) && (args.fromChainId === args.toChainId);
            const parsedAmount = (args.amount.toLowerCase() === 'all' || args.amount.toLowerCase() === 'max') && rawResult.quoteDetails?.amountIn ? rawResult.quoteDetails.amountIn : args.amount;

            const autoResult = await executeRelaySwap({
              userId: session.user.id,
              operationType: isApproval ? "erc20_approve" : (isTransfer ? "transfer" : "relay_swap"),
              inputAmount: isApproval ? "Approval" : parsedAmount,
              inputToken: args.fromToken,
              outputToken: args.toToken,
              chainId: tx.chainId || args.fromChainId || 8453,
              transaction: {
                to: tx.to,
                value: tx.value ? BigInt(tx.value) : 0n,
                data: tx.data || "0x",
                chainId: tx.chainId || args.fromChainId,
                solanaTransaction: tx.solanaTransaction,
              }
            });
            if (!autoResult.success) {
              return { status: "error", message: autoResult.error || "Autonomous execution failed during broadcast." };
            }



            finalHash = autoResult.transactionHash || finalHash;
          }
          let explorerUrl = finalHash ? `https://relay.link/transaction/${finalHash}` : undefined;
          if (finalHash) {
            const executionChainId = txList[0]?.chainId || args.fromChainId || 8453;
            const allChains = await import("viem/chains");
            const targetChain: any = Object.values(allChains).find((c: any) => c?.id === executionChainId);

            // If it's a same-chain transfer, use the native block explorer
            const isSameChain = args.fromChainId === args.toChainId;
            if (isSameChain && targetChain?.blockExplorers?.default?.url) {
              explorerUrl = `${targetChain.blockExplorers.default.url}/tx/${finalHash}`;
            }
          }

          return {
            status: "success",
            message: "Autonomous execution completed successfully WITHOUT manual UI!",
            transactionHash: finalHash,
            isAgentExecution: true,
            explorerUrl,
            quoteDetails: rawResult.quoteDetails,
            sourceChain: rawResult.sourceChain,
            destinationChain: rawResult.destinationChain,
            _instructionToAI: "CRITICAL: A rich UI card is ALREADY safely rendering to the user! DO NOT PRINT ANY transaction hashes, block explorer URLs, gas fees, or data tables! Keep your text output to an absolute maximum of 1 short sentence, e.g. 'Your cross-chain execution has completed anonymously via Relay.'"
          };
        }
      }),
      // Four.meme Agentic Tools (BNB Chain buy/sell)
      executeFourMemeBuy: createFourMemeBuyTool(session.user.id),
      executeFourMemeSell: createFourMemeSellTool(session.user.id),
      executeFourMemeLaunch: {
        ...createFourMemeLaunchTool(session.user.id),
        execute: async (args: any) => {
          // Flatten messages to pass to tool for image retrieval
          return await createFourMemeLaunchTool(session!.user!.id!).execute({
            ...args,
            _messages: resolvedMessages
          }, {} as any);
        }
      },
      // Agent Wallet & Identity Tools
      getAgentWalletInfo: createGetAgentWalletInfoTool(session.user.id),
      getAgentTokenBalance: createGetAgentTokenBalanceTool(session.user.id),
    } : {}),
    // Override shared package quote tools with viem-based versions (always available)
    quoteFourMemeBuy: quoteFourMemeBuyTool,
    quoteFourMemeSell: quoteFourMemeSellTool,
    webSearch: {
      ...allTools.webSearch,
      execute: async (args: any, context: any) => {
        if (hasWebSearchExecuted) {
          console.log("[WebSearch] Blocked redundant execution");
          // Return empty result structured correctly for the MultiSearch component
          return {
            web: [],
            x: [],
            // Add a summary for the LLM to understand why
            summary: "Search already completed. Refrained from searching again."
          };
        }

        hasWebSearchExecuted = true;
        try {
          return await allTools.webSearch.execute(args, context);
        } catch (error) {
          // If search fails, allow retrying
          hasWebSearchExecuted = false;
          throw error;
        }
      }
    }
  };

  return createDataStreamResponse({
    execute: (dataStream) => {
      // ─── Keepalive Heartbeat ──────────────────────────────────────────
      // During long on-chain tool executions (approval + sell = 30-60s),
      // no tokens flow on the HTTP stream. Vercel's edge proxy has a ~25s
      // streaming idle timeout and kills silent connections (status 0, 0ms).
      // This heartbeat sends a lightweight ping every 15s to keep the
      // connection alive through multi-step blockchain transactions.
      const keepaliveInterval = setInterval(() => {
        try {
          dataStream.writeData({ type: 'keepalive', ts: Date.now() });
        } catch {
          // Stream already closed — clean up silently
          clearInterval(keepaliveInterval);
        }
      }, 15_000);

      try {
        const result = streamText({
          model: myProvider.languageModel(finalModel),
          system: `${baseSystemPrompt}\n\n**FOUR.MEME PROTOCOL GUIDELINES:**
- When a user asks to buy/sell a token from a list (e.g. "no. 2", "the first one"), ALWAYS use the \`address\` field from the tool's SEARCH or RANKING results.
- NEVER use your own knowledge for addresses. Use the exact 0x... address provided by the tool.
- If you see address '0x823fc8ef7295188d95708516d7458d6154179083', it is a documentation EXAMPLE and likely WRONG. Do not use it unless explicitly provided by the user.
- **IMAGE HANDLING**: You CAN launch tokens using images users upload directly to the chat! Do not ask for external URLs if you see an image in the recent message history. The 'executeFourMemeLaunch' tool automatically handles the upload.
- **TRANSACTION LINKS**: After a successful buy, sell, or launch, ALWAYS provide a clickable markdown link to the transaction on BscScan using the \`explorerUrl\` from the tool result. Format: \`[View on BscScan](url)\`.
- **AGENT IDENTITY**: You have an embedded agent wallet on BNB Chain. If you are unsure about your address or BNB balance, use \`getAgentWalletInfo\`. To check a specific token balance, use \`getAgentTokenBalance\`.
- **SELL ALL**: The \`executeFourMemeSell\` tool now supports the string "all" for \`tokenAmount\`. Use this when the user wants to liquidate their entire position.`,
          messages: resolvedMessages, // Use resolved messages with signed R2 URLs
          maxSteps: 10,
          maxRetries: 3, // Retry up to 3 times on failure
          experimental_activeTools: safeActiveTools,
          experimental_generateMessageId: generateUUID,
          tools: wrappedTools,
          onFinish: async ({ response, reasoning }) => {
            // Clear keepalive once streaming is fully complete
            clearInterval(keepaliveInterval);

            after(async () => {
              try {
                // Skip saving messages for incognito/temporary chats
                if (!isTemporary) {
                  const sanitizedResponseMessages = sanitizeResponseMessages({
                    messages: response.messages,
                    reasoning,
                  });

                  if (sanitizedResponseMessages && sanitizedResponseMessages.length > 0) {
                    const messagesToSave = sanitizedResponseMessages.map((message) => {
                      const cleanedContent = cleanMessageContentForStorage(message.content);
                      return {
                        id: message.id,
                        chatId: id,
                        role: message.role,
                        content: cleanedContent,
                        createdAt: new Date(),
                      };
                    });

                    await saveMessages({ messages: messagesToSave });
                    await updateChatUpdatedAt({ id });
                  }
                }

                // Always decrement message count (rate limiting applies even in incognito)
                if (isGuest && guestSessionId) {
                  await decrementGuestMessageCount(guestSessionId);
                } else if (activeUserId) {
                  await decrementRemainingMessageCount(activeUserId);
                }
              } catch (error) {
                console.error("Failed to save chat", error);
              }
            });
          },
          experimental_telemetry: {
            isEnabled: true,
            functionId: "stream-text",
          },
        });

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      } catch (error) {
        clearInterval(keepaliveInterval);
        console.error("Error in streamText:", error);
        // If still getting tool invocation error, try with fresh conversation
        if ((error as any).message?.includes("ToolInvocation must have a result")) {
          // Only keep the latest user message for fresh start
          const freshMessages = [userMessage];

          const result = streamText({
            model: myProvider.languageModel(finalModel),
            system: systemPrompt,
            messages: freshMessages,
            maxSteps: 10,
            maxRetries: 3, // Retry up to 3 times on failure
            experimental_activeTools: safeActiveTools,
            experimental_generateMessageId: generateUUID,
            tools: wrappedTools,
            onFinish: async ({ response, reasoning }) => {
              after(async () => {
                try {
                  // Skip saving messages for incognito/temporary chats
                  if (!isTemporary) {
                    const sanitizedResponseMessages = sanitizeResponseMessages({
                      messages: response.messages,
                      reasoning,
                    });

                    if (sanitizedResponseMessages && sanitizedResponseMessages.length > 0) {
                      const messagesToSave = sanitizedResponseMessages.map((message) => {
                        const cleanedContent = cleanMessageContentForStorage(message.content);
                        return {
                          id: message.id,
                          chatId: id,
                          role: message.role,
                          content: cleanedContent,
                          createdAt: new Date(),
                        };
                      });

                      await saveMessages({ messages: messagesToSave });
                      await updateChatUpdatedAt({ id });
                    }
                  }

                  // Always decrement message count (rate limiting applies even in incognito)
                  if (isGuest && guestSessionId) {
                    await decrementGuestMessageCount(guestSessionId);
                  } else if (activeUserId) {
                    await decrementRemainingMessageCount(activeUserId);
                  }
                } catch (error) {
                  console.error("Failed to save chat", error);
                }
              });
            },
            experimental_telemetry: {
              isEnabled: true,
              functionId: "stream-text",
            },
          });

          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true,
          });
        } else {
          throw error;
        }
      }
    },
    onError: (error: any) => {
      console.error("DataStream error:", error);
      // Check if the error is a tool execution error and has a toolName
      if (error.name === 'AI_ToolExecutionError' && error.toolName) {
        return `Error: The ${error.toolName} tool failed to execute. This could be due to an issue with the external service. Please try again later.`;
      }

      // Handle socket termination errors
      if (error.message === 'terminated' || (error.cause && error.cause.code === 'UND_ERR_SOCKET')) {
        return "Connection to the AI provider was interrupted. Please try again.";
      }

      return "Oops, something went wrong! Please try again in a new chat.";
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
