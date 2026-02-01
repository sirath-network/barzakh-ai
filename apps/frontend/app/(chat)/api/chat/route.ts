import {
  type Message,
  createDataStreamResponse,
  streamText,
} from "ai";
import { after } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@barzakh/shared/lib/ai/models";
import { allTools, getGroupConfig } from "@barzakh/shared/lib/ai/prompts";
import { classifyIntent, type IntentClassification, FORCED_MODEL_BY_GROUP } from "@barzakh/shared/lib/ai/intent-classifier";
import {
  decrementRemainingMessageCount,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getUser,
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
  type SecurityCheckResult,
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

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
    group,
    autoRoute = false, // Enable intelligent intent-based routing
    history_for_context_id,
  }: {
    id: string;
    messages: Array<Message>;
    selectedChatModel: string;
    group: any;
    autoRoute?: boolean;
    history_for_context_id?: string;
  } = await request.json();

  // Authenticate first - BEFORE accessing any user data
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return new Response("Please login to start chatting!", { status: 401 });
  }

  // --- Prepend History Context if ID is provided ---
  if (history_for_context_id) {
    try {
      // SECURITY: Verify ownership OR public visibility of the context chat before accessing its messages
      const contextChat = await getChatById({ id: history_for_context_id });
      // Allow access if: user owns the chat OR the chat is public (shared chat forking)
      const canAccessContext = contextChat && (
        contextChat.userId === session.user.id ||
        contextChat.visibility === 'public'
      );
      if (!canAccessContext) {
        return new Response("Unauthorized access to chat context", { status: 403 });
      }

      const dbMessages = await getMessagesByChatId({ id: history_for_context_id });

      // Filter out 'tool' role messages and clean assistant messages
      // AI SDK doesn't support tool role or toolInvocations in context
      // But we need to preserve image URLs for image generation context
      const contextMessages = dbMessages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant')
        .map(msg => {
          let cleanContent = msg.content;

          // For assistant messages, extract text content and image URLs
          if (msg.role === 'assistant' && Array.isArray(msg.content)) {
            const cleanedParts: any[] = [];

            for (const part of msg.content as any[]) {
              // Keep text parts
              if (part.type === 'text' || typeof part === 'string') {
                cleanedParts.push(part);
              }
              // Extract image URLs from tool-result parts and convert to image parts
              else if (part.type === 'tool-result' && part.result) {
                // Check if result contains image URLs (from createImage tool)
                if (Array.isArray(part.result)) {
                  for (const item of part.result) {
                    if (item.url && typeof item.url === 'string' &&
                      (item.url.includes('r2.barzakh') || item.url.includes('.png') || item.url.includes('.jpg') || item.url.includes('.webp'))) {
                      // Add as image reference in text for context
                      cleanedParts.push({
                        type: 'text',
                        text: `[Generated image: ${item.url}]`
                      });
                    }
                  }
                } else if (typeof part.result === 'object' && part.result.url) {
                  cleanedParts.push({
                    type: 'text',
                    text: `[Generated image: ${part.result.url}]`
                  });
                }
              }
            }

            if (cleanedParts.length > 0) {
              cleanContent = cleanedParts;
            } else {
              // If no text content, use a summary
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

      // Prepend historical messages to the current message list
      messages.unshift(...contextMessages);

    } catch (dbError) {
      console.error("Database error while fetching context:", dbError);
      // Continue without context if DB fetch fails
    }
  }
  // --- End History Context Section ---

  const users = await getUserById(session.user.id!);
  let user_info = users[0];

  // ==================================================
  // REAL-TIME x402 SUBSCRIPTION EXPIRY CHECK
  // Immediately downgrade expired x402 subscribers
  // ==================================================
  if (user_info.tier !== "free" && user_info.x402PeriodEnd) {
    const periodEnd = new Date(user_info.x402PeriodEnd);
    const now = new Date();

    if (periodEnd < now) {
      const freeLimit = Number(process.env.FREE_USER_MESSAGE_LIMIT) || 10;

      // Import db and user schema for the update
      const { db } = await import("@/lib/db/db");
      const { user } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");

      await db.update(user).set({
        tier: "free",
        billingCycle: "monthly",
        dailyMessageRemaining: freeLimit,
        x402CancelAtPeriodEnd: false,
        x402PeriodEnd: null,
      }).where(eq(user.id, session.user.id!));

      // Refresh user_info with downgraded values
      user_info = {
        ...user_info,
        tier: "free",
        billingCycle: "monthly",
        dailyMessageRemaining: freeLimit,
      };
    }
  }

  // Get message limit based on tier and billing cycle
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
    const limit = userMessageLimit;
    const upgradePrompt =
      user_info.tier === "free"
        ? "Upgrade to PRO or ULTIMATE for more usage and other perks!"
        : user_info.tier === "pro"
          ? "Upgrade to ULTIMATE for higher limits and priority access!"
          : "Contact support to extend your Ultimate tier limits.";

    return new Response(
      `${tierLabel} (${cycleLabel}) tier limit of ${limit} messages per day reached! ${upgradePrompt}`,
      {
        status: 403,
      }
    );
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
    console.warn(`[SECURITY] Blocked message from user ${session.user.id}:`, {
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
      console.warn(`[AI-SECURITY] Blocked AI attack from user ${session.user.id}:`, {
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
          console.warn(`[SECURITY] Blocked malicious image URL from user ${session.user.id}:`, {
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
      aptos: [/\baptos\b/i, /\bapt\s+(token|coin|balance)/i, /\b0x[a-fA-F0-9]{64}\b/], // 64-char hex = Aptos
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

  // Inject user subscription context into system prompt
  // Fetch fresh subscription data from DB (not cached session) for real-time accuracy
  let currentTier = session.user.tier || 'free';
  let currentBillingCycle = session.user.billingCycle || 'monthly';
  let username = session.user.username || session.user.email;

  try {
    const freshUserData = await getUserById(session.user.id);
    if (freshUserData && freshUserData.length > 0) {
      const userData = freshUserData[0];
      currentTier = userData.tier || 'free';
      currentBillingCycle = userData.billingCycle || 'monthly';
      username = userData.username || userData.email || username;
    }
  } catch (error) {
    console.warn("Failed to fetch fresh user data, using session:", error);
  }

  const userSubscriptionContext = `

## Current User Subscription Context:
- **Current Tier**: ${currentTier}
- **Billing Cycle**: ${currentBillingCycle}
- **Username**: ${username}

When using initiateX402Payment, pass currentTier="${currentTier}" and currentBillingCycle="${currentBillingCycle}".
`;
  systemPrompt = systemPrompt + userSubscriptionContext;

  // Select appropriate model based on routed group
  // ALWAYS use forced model if the effectiveGroup has one defined, regardless of how we got here
  // This ensures image tools always use appropriate models even when user manually selects a group
  const groupForcedModel = FORCED_MODEL_BY_GROUP[effectiveGroup as keyof typeof FORCED_MODEL_BY_GROUP];
  const effectiveModel = groupForcedModel || selectedChatModel;

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    // Pass forkedFromChatId if this is a forked chat from a shared conversation
    await saveChat({
      id,
      userId: session.user.id,
      title,
      forkedFromChatId: history_for_context_id,
    });
  }

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

  // SOLUTION 1: Clean messages before passing to streamText
  const cleanedMessages = validateAndCleanMessages(messages);

  // Resolve legacy R2 URLs (r2.barzakh.tech) to signed URLs before sending to AI
  // This is needed because the old custom domain no longer exists
  const resolvedMessages = await resolveR2UrlsInMessages(cleanedMessages);

  // SOLUTION 2: Alternative - filter out incomplete tool calls entirely
  // const cleanedMessages = filterIncompleteToolCalls(messages);

  // Get safe active tools
  const safeActiveTools = getSafeActiveTools(tools, selectedChatModel);

  // Wrap webSearch to enforce single execution per request
  let hasWebSearchExecuted = false;
  const wrappedTools = {
    ...allTools,
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
      try {
        const result = streamText({
          model: myProvider.languageModel(effectiveModel),
          system: systemPrompt,
          messages: resolvedMessages, // Use resolved messages with signed R2 URLs
          maxSteps: 4,
          maxRetries: 3, // Retry up to 3 times on failure
          experimental_activeTools: safeActiveTools,
          experimental_generateMessageId: generateUUID,
          tools: wrappedTools,
          onFinish: async ({ response, reasoning }) => {
            if (session.user?.id) {
              after(async () => {
                try {
                  const sanitizedResponseMessages = sanitizeResponseMessages({
                    messages: response.messages,
                    reasoning,
                  });

                  // Guard against saving empty messages if AI response fails
                  if (sanitizedResponseMessages && sanitizedResponseMessages.length > 0) {
                    const messagesToSave = sanitizedResponseMessages.map((message) => {
                      // Clean message content to restore original storage URLs (R2/Blob)
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
                    await decrementRemainingMessageCount(session.user.id!);
                  }
                } catch (error) {
                  console.error("Failed to save chat", error);
                }
              });
            }
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
        console.error("Error in streamText:", error);
        // If still getting tool invocation error, try with fresh conversation
        if ((error as any).message?.includes("ToolInvocation must have a result")) {
          // Only keep the latest user message for fresh start
          const freshMessages = [userMessage];

          const result = streamText({
            model: myProvider.languageModel(effectiveModel),
            system: systemPrompt,
            messages: freshMessages,
            maxSteps: 4,
            maxRetries: 3, // Retry up to 3 times on failure
            experimental_activeTools: safeActiveTools,
            experimental_generateMessageId: generateUUID,
            tools: wrappedTools,
            onFinish: async ({ response, reasoning }) => {
              if (session.user?.id) {
                after(async () => {
                  try {
                    const sanitizedResponseMessages = sanitizeResponseMessages({
                      messages: response.messages,
                      reasoning,
                    });

                    // Guard against saving empty messages if AI response fails
                    if (sanitizedResponseMessages && sanitizedResponseMessages.length > 0) {
                      await saveMessages({
                        messages: sanitizedResponseMessages.map((message) => {
                          // Clean message content to restore original storage URLs (R2/Blob)
                          const cleanedContent = cleanMessageContentForStorage(message.content);

                          return {
                            id: message.id,
                            chatId: id,
                            role: message.role,
                            content: cleanedContent,
                            createdAt: new Date(),
                          };
                        }),
                      });
                      await updateChatUpdatedAt({ id });
                      await decrementRemainingMessageCount(session.user.id!);
                    }
                  } catch (error) {
                    console.error("Failed to save chat", error);
                  }
                });
              }
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