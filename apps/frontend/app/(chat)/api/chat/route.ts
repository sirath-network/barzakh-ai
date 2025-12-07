import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@barzakh/shared/lib/ai/models";
import { allTools, getGroupConfig } from "@barzakh/shared/lib/ai/prompts";
import {
  decrementRemainingMessageCount,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getUser,
  getUserById,
  saveChat,
  saveMessages,
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
        console.log('Filtering out message with incomplete tool calls:', message.id);
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
    history_for_context_id,
  }: {
    id: string;
    messages: Array<Message>;
    selectedChatModel: string;
    group: any;
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
      // SECURITY: Verify ownership of the context chat before accessing its messages
      const contextChat = await getChatById({ id: history_for_context_id });
      if (!contextChat || contextChat.userId !== session.user.id) {
        return new Response("Unauthorized access to chat context", { status: 403 });
      }

      const dbMessages = await getMessagesByChatId({ id: history_for_context_id });

      const contextMessages = dbMessages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content as any,
        createdAt: msg.createdAt,
      })) as any[];

      // Prepend historical messages to the current message list
      messages.unshift(...contextMessages);

    } catch (dbError) {
      console.error("Database error while fetching context:", dbError);
      // Continue without context if DB fetch fails
    }
  }
  // --- End History Context Section ---

  console.log("search groupe", group);
  
  // Get group config with error handling
  let tools: any[] = [];
  let systemPrompt = "";
  
  try {
    const groupConfig = await getGroupConfig(group);
    tools = [...(groupConfig?.tools || [])] as any[];
    systemPrompt = groupConfig?.systemPrompt || "";
    console.log("Group config loaded:", { tools: tools?.length, hasSystemPrompt: !!systemPrompt });
  } catch (error) {
    console.error("Failed to get group config:", error);
    // Continue with empty tools and system prompt
  }
  
  console.log("user session ", session.user);
  const users = await getUserById(session.user.id!);
  const user_info = users[0];

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

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
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
  
  // SOLUTION 2: Alternative - filter out incomplete tool calls entirely
  // const cleanedMessages = filterIncompleteToolCalls(messages);

  // Get safe active tools
  const safeActiveTools = getSafeActiveTools(tools, selectedChatModel);

  return createDataStreamResponse({
    execute: (dataStream) => {
      try {
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt,
          messages: cleanedMessages, // Use cleaned messages
          maxSteps: 5,
          maxRetries: 3, // Retry up to 3 times on failure
          experimental_activeTools: safeActiveTools,
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
          tools: allTools,
          onFinish: async ({ response, reasoning }) => {
            if (session.user?.id) {
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
                  await decrementRemainingMessageCount(session.user.id);
                }
              } catch (error) {
                console.error("Failed to save chat", error);
              }
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
          console.log("Retrying with fresh conversation context...");
          
          // Only keep the latest user message for fresh start
          const freshMessages = [userMessage];
          
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt,
            messages: freshMessages,
            maxSteps: 5,
            maxRetries: 3, // Retry up to 3 times on failure
            experimental_activeTools: safeActiveTools,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
            tools: allTools,
            onFinish: async ({ response, reasoning }) => {
              if (session.user?.id) {
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
                    await decrementRemainingMessageCount(session.user.id);
                  }
                } catch (error) {
                  console.error("Failed to save chat", error);
                }
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