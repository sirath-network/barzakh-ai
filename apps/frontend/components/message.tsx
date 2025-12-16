"use client";

import type { ChatRequestOptions, Message, ToolInvocation } from "ai";
import cx from "classnames";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import { memo, useState, useEffect, useRef } from "react";

import type { Vote } from "@/lib/db/schema";
import { PencilEditIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import equal from "fast-deep-equal";
import { cn, SearchGroupId } from "@barzakh/shared/lib/utils/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import MultiSearch from "./multi-search";
import PortfolioTable from "./birdeye/PortfolioTable";
import TokenInfoTable from "./birdeye/TokenInfoTable";
import { Check, Copy, Globe, BarChart3, Wallet, FileText, FileImage } from "lucide-react";
import Image from "next/image";
import { useSmoothStreaming } from "@/hooks/use-smooth-streaming";

const MultiSearchAny = MultiSearch as any;
const PortfolioTableAny = PortfolioTable as any;
const TokenInfoTableAny = TokenInfoTable as any;
const AIGeneratedImageAny = AIGeneratedImage as any;
const AIGeneratedImageGridAny = AIGeneratedImageGrid as any;
const PreviewAttachmentAny = PreviewAttachment as any;
const MessageActionsAny = MessageActions as any;
const MessageEditorAny = MessageEditor as any;
const MessageReasoningAny = MessageReasoning as any;
const MarkdownAny = Markdown as any;
const ThinkingAnimationAny = ThinkingAnimation as any;
const AssistantAvatarAny = AssistantAvatar as any;
const ButtonAny = Button as any;
const PencilEditIconAny = PencilEditIcon as any;
const CheckAny = Check as any;
const CopyAny = Copy as any;
const GlobeAny = Globe as any;
const BarChart3Any = BarChart3 as any;
const WalletAny = Wallet as any;
const FileTextAny = FileText as any;
const FileImageAny = FileImage as any;

// HELPER: Map from tool name to corresponding icon
const toolIcons: Record<string, React.ElementType> = {
  webSearch: GlobeAny,
  searchEvmTokenMarketData: BarChart3Any,
  searchSolanaTokenMarketData: BarChart3Any,
  getSolanaChainWalletPortfolio: WalletAny,
  getEvmMultiChainWalletPortfolio: WalletAny,
  getTokenBalances: WalletAny,
  getCreditcoinApiData: FileTextAny,
  getVanaApiData: FileTextAny,
  getEvmOnchainDataUsingZerion: FileTextAny,
  getEvmOnchainDataUsingEtherscan: FileTextAny,
  ensToAddress: FileTextAny,
  aptosNames: FileTextAny,
  translateTransactions: FileTextAny,
  createImage: FileImageAny,
};

// HELPER: Small component to render each tool icon
const ToolIcon = ({ toolName, size = "small" }: { toolName: string; size?: "small" | "medium" }) => {
  const IconComponent = toolIcons?.[toolName] || FileTextAny;
  const iconSize = size === "small" ? "size-3" : "size-4";

  return (
    <IconComponent className={`${iconSize} text-muted-foreground/80`} />
  );
};

// HELPER: Determine attachment size based on type
const getAttachmentSize = (attachment: any) => {
  const contentType = attachment.contentType || "";
  const isImage = contentType.startsWith("image/");
  return isImage ? "custom250" : "custom100";
};

import { AssistantAvatar } from "./assistant-avatar";
import { ThinkingAnimation } from "./thinking-animation";
import { AIGeneratedImage, AIGeneratedImageGrid } from "./ai-generated-image";
import { generateStatusFromMessage } from "@/lib/status-generator";


const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  selectedGroup,
  reload,
  isReadonly,
  showIcon = true,
  staticAvatarSrc,
  avatarSize = 32,
  allMessages = [],
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: (
    messages: Message[] | ((messages: Message[]) => Message[])
  ) => void;
  selectedGroup: SearchGroupId;
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
  showIcon?: boolean;
  staticAvatarSrc?: string;
  avatarSize?: number;
  allMessages?: Message[];
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [actionsVisible, setActionsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);
  const [hasContentStarted, setHasContentStarted] = useState(false);

  // Track if this message was pre-loaded (already had content on mount)
  // Pre-loaded messages should skip animations to prevent layout shifts
  const isPreloadedRef = useRef<boolean | null>(null);
  if (isPreloadedRef.current === null) {
    // On first render, check if message already has content (pre-loaded from DB)
    const hasContent = message.role === 'assistant' && (
      (typeof message.content === 'string' && message.content.length > 0) ||
      (Array.isArray(message.content) && message.content.length > 0) ||
      (message.toolInvocations && message.toolInvocations.length > 0)
    );
    isPreloadedRef.current = hasContent && !isLoading;
  }
  const isPreloaded = isPreloadedRef.current;

  // Smooth streaming logic
  const contentString = typeof message.content === 'string' ? message.content : '';
  const isStreaming = isLoading && message.role === 'assistant' && typeof message.content === 'string';
  const smoothContent = useSmoothStreaming(contentString, isStreaming);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!message.content) return;

    let textToCopy = "";
    if (typeof message.content === 'string') {
      textToCopy = message.content;
    } else if (Array.isArray(message.content)) {
      textToCopy = (message.content as any[])
        .filter(part => part.type === 'text')
        .map(part => part.text)
        .join('\n');
    }

    if (textToCopy) {
      navigator.clipboard
        .writeText(textToCopy)
        .then(() => {
          setIsCopied(true);
          setTimeout(() => {
            setIsCopied(false);
            setActionsVisible(false);
          }, 1500);
        })
        .catch((err) => {
          console.error("Gagal menyalin teks: ", err);
        });
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMode("edit");
    setActionsVisible(false);
  };

  const completedTools = message.toolInvocations?.filter(
    (tool) => tool.state === "result"
  );

  const pendingTools = message.toolInvocations?.filter(
    (tool) => tool.state === "call" || tool.state === "partial-call"
  );

  const webSearchResults = completedTools?.filter(
    (tool) => tool.toolName === 'webSearch'
  );
  const otherCompletedTools = completedTools?.filter(
    (tool) => tool.toolName !== 'webSearch'
  );
  const hasCreateImage = otherCompletedTools?.some(
    (tool) => tool.toolName === 'createImage'
  );

  // Generate dynamic status from pending tools
  const getStatusText = (): string | undefined => {
    if (!isLoading || !pendingTools || pendingTools.length === 0) {
      return undefined;
    }

    // Find the previous user message to get the prompt
    const messageIndex = allMessages.findIndex(m => m.id === message.id);
    let userPrompt: string | undefined;

    // Look for the most recent user message before this assistant message
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (allMessages[i].role === 'user') {
        const content = allMessages[i].content;
        if (typeof content === 'string') {
          userPrompt = content;
        } else if (Array.isArray(content)) {
          userPrompt = (content as any[])
            .filter(part => part.type === 'text')
            .map(part => part.text)
            .join(' ');
        }
        break;
      }
    }

    const status = generateStatusFromMessage(message, userPrompt);
    return status || undefined;
  };

  const statusText = getStatusText();

  // Track when content has started appearing to prevent glitchy toggling
  useEffect(() => {
    if (message.role === 'assistant' && message.content) {
      setHasContentStarted(true);
    }
  }, [message.content, message.role]);

  // Reset for new messages
  useEffect(() => {
    setHasContentStarted(false);
  }, [message.id]);

  // Show thinking ONLY before content starts streaming
  // Once content appears, NEVER show thinking again (prevents glitch)
  const isThinking =
    message.role === 'assistant' &&
    isLoading &&
    !hasContentStarted; // Hide thinking once content starts streaming

  // Effect to manage thinking state smoothly
  useEffect(() => {
    if (isThinking) {
      // Show thinking immediately when loading starts
      setShowThinking(true);
    } else {
      // Hide thinking when content starts streaming
      // Smooth transition delay
      const timer = setTimeout(() => {
        setShowThinking(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isThinking]);

  return (
    <AnimatePresence mode="sync">
      <motion.div
        className={cn(
          "w-full max-w-full mx-auto md:max-w-3xl px-3 group/message min-w-0",
          message.role === "user" && "mb-4"
        )}
        initial={isPreloaded ? false : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={isPreloaded ? { opacity: 0 } : { y: -5, opacity: 0 }}
        transition={{ duration: isPreloaded ? 0 : 0.3, ease: "easeOut" }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex flex-col md:flex-row md:items-start pl-0.5 gap-0 md:gap-4 w-full min-w-0 max-w-full",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit": mode !== "edit",
            }
          )}
        >
          {message.role === 'assistant' && (
            <AssistantAvatarAny
              showIcon={showIcon}
              staticImageSrc={staticAvatarSrc}
              size={avatarSize}
            />
          )}

          <div className={cn(
            "flex flex-col gap-1 min-w-0 max-w-full",
            message.role === 'user' ? "w-full" : "w-full"
          )}>
            <AnimatePresence mode="sync">
              {showThinking ? (
                <motion.div key="thinking">
                  <ThinkingAnimationAny statusText={statusText} />
                </motion.div>
              ) : (
                <motion.div
                  key="content"
                  initial={isPreloaded ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: isPreloaded ? 0 : 0.3 }}
                >
                  {message.reasoning && (
                    <MessageReasoningAny
                      isLoading={isLoading}
                      reasoning={message.reasoning}
                    />
                  )}

                  {/* === TOP SECTION: ONLY WEB SEARCH RESULTS === */}
                  {webSearchResults && webSearchResults.length > 0 && (
                    webSearchResults.map(tool => (
                      <motion.div
                        key={tool.toolCallId}
                        initial={isPreloaded ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: isPreloaded ? 0 : 0.3 }}
                      >
                        <MultiSearchAny result={tool.result} args={tool.args} />
                      </motion.div>
                    ))
                  )}

                  {/* === TOP SECTION: OTHER TOOL RESULTS (PORTFOLIO, TOKEN INFO, etc.) === */}
                  {(() => {
                    // List of tools that have UI components
                    const renderableToolNames = [
                      'searchEvmTokenMarketData',
                      'searchSolanaTokenMarketData',
                      'getSolanaChainWalletPortfolio',
                      'getEvmMultiChainWalletPortfolio',
                      'getTokenBalances',
                      'createImage'
                    ];

                    // Filter to only tools that have renderable components
                    const renderableTools = otherCompletedTools?.filter(
                      tool => tool.state === 'result' && renderableToolNames.includes(tool.toolName)
                    ) || [];

                    if (renderableTools.length === 0) return null;

                    return (
                      <motion.div
                        className="flex flex-col items-start gap-2 mb-4"
                        initial={isPreloaded ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.1 }}
                      >
                        {renderableTools.map((toolInvocation) => {
                          const { toolName, toolCallId, result } = toolInvocation;

                          const toolComponents: Record<string, React.ReactNode> = {
                            searchEvmTokenMarketData: <TokenInfoTableAny result={result} />,
                            searchSolanaTokenMarketData: <TokenInfoTableAny result={result} />,
                            getSolanaChainWalletPortfolio: <PortfolioTableAny result={result} />,
                            getEvmMultiChainWalletPortfolio: <PortfolioTableAny result={result} />,
                            getTokenBalances: <PortfolioTableAny result={result} />,
                            createImage: result?.imageUrls ? (
                              <AIGeneratedImageGridAny
                                imageUrls={result.imageUrls}
                                alt="AI generated images"
                              />
                            ) : result?.imageUrl ? (
                              <AIGeneratedImageAny
                                imageUrl={result.imageUrl}
                                alt="AI generated image"
                              />
                            ) : (
                              <div className="text-muted-foreground p-4 bg-muted/50 rounded-lg border border-border/20">
                                No image generated
                              </div>
                            ),
                          };

                          return (
                            <div key={toolCallId} className="w-full">
                              {toolComponents[toolName]}
                            </div>
                          );
                        })}
                      </motion.div>
                    );
                  })()}

                  {/* === MIDDLE SECTION: MAIN MESSAGE CONTENT (MARKDOWN) === */}
                  {(message.content) && mode === "view" && (
                    <motion.div
                      className={cn("flex flex-col pr-1.5 w-full", {
                        "items-end": message.role === "user",
                      })}
                      initial={isPreloaded ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.2 }}
                    >
                      {/* USER MESSAGE: Separate attachments and text */}
                      {message.role === "user" ? (
                        <div className="flex flex-col gap-2 items-end w-full">
                          {/* Attachments displayed first as separate cards */}
                          {(message.experimental_attachments || (Array.isArray(message.content) && message.content.some(part => part.type === 'image'))) && (
                            <div className="flex flex-wrap gap-2 justify-end w-full">
                              {/* Render experimental_attachments if available */}
                              {message.experimental_attachments?.map((attachment) => (
                                <div
                                  key={attachment.url}
                                  className="bg-muted/30 p-2 border border-border/20 shadow-sm"
                                  style={{ borderRadius: '15px 15px 10px 15px' }}
                                >
                                  <PreviewAttachmentAny
                                    attachment={attachment}
                                    size={getAttachmentSize(attachment)}
                                  />
                                </div>
                              ))}

                              {/* Also render images from content array if no experimental_attachments */}
                              {!message.experimental_attachments && Array.isArray(message.content) &&
                                message.content
                                  .filter(part => part.type === 'image' && typeof part.image === 'string')
                                  .map((part, index) => {
                                    const attachment = {
                                      name: `Image ${index + 1}`,
                                      url: part.image,
                                      contentType: 'image/*'
                                    };
                                    return (
                                      <div
                                        key={`content-image-${index}`}
                                        className="bg-muted/30 p-2 border border-border/20 shadow-sm"
                                        style={{ borderRadius: '15px 15px 10px 15px' }}
                                      >
                                        <PreviewAttachmentAny
                                          attachment={attachment}
                                          size={getAttachmentSize(attachment)}
                                        />
                                      </div>
                                    );
                                  })
                              }
                            </div>
                          )}

                          {/* Text content as separate message bubble */}
                          {(() => {
                            let textContent = "";
                            if (typeof message.content === "string") {
                              textContent = message.content;
                            } else if (Array.isArray(message.content)) {
                              textContent = (message.content as any[])
                                .filter(part => part.type === 'text') // Only get text parts, exclude images
                                .map(part => part.text)
                                .filter(text => text.trim())
                                .join('\n');
                            }

                            if (textContent.trim()) {
                              return (
                                <div
                                  className="dark:bg-muted dark:text-foreground bg-muted text-foreground px-3 cursor-pointer max-w-full md:max-w-max relative shadow-sm"
                                  style={{
                                    borderRadius: '15px 15px 0px 15px'
                                  }}
                                  onClick={() => {
                                    if (!isReadonly) {
                                      setActionsVisible(!actionsVisible);
                                    }
                                  }}
                                >
                                  <MarkdownAny allMessages={allMessages}>{textContent}</MarkdownAny>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      ) : (
                        /* ASSISTANT MESSAGE: Keep original structure */
                        (() => {
                          // Check if this message has image generation tool results
                          const hasImageGeneration = hasCreateImage;

                          // Determine if we should show the text content
                          let shouldShowTextContent = true;
                          if (hasImageGeneration && typeof message.content === "string") {
                            // Only show the text if it's not a generic "here's your image" message
                            const content = message.content.toLowerCase().trim();
                            const isGenericImageMessage =
                              (content.includes("here's") || content.includes("here are")) &&
                              (content.includes("image") || content.includes("images")) &&
                              (content.includes("generated") || content.includes("created") || content.includes("for you") || content.includes("based on"));

                            // Also check for text that seems to be describing images that are already shown
                            const isImageDescription =
                              (content.includes("image") || content.includes("images")) &&
                              (content.includes("shows") || content.includes("depicts") || content.includes("features") || content.includes("captures")) &&
                              content.length < 200; // Short descriptions are likely redundant

                            // Check for text that contains broken image references or URLs
                            const hasBrokenImageReferences =
                              content.includes("here") &&
                              (content.includes("image") || content.includes("images")) &&
                              content.includes("view");

                            if (isGenericImageMessage || isImageDescription || hasBrokenImageReferences) {
                              shouldShowTextContent = false;
                            }
                          }

                          // If we're suppressing text and there are tool results, don't render the message bubble at all
                          if (!shouldShowTextContent && hasImageGeneration) {
                            return null;
                          }

                          // Check if assistant used any tools
                          const hasTools = completedTools && completedTools.length > 0;

                          // Only show styled container when assistant uses tools
                          if (hasTools) {
                            return (
                              <div
                                className="bg-muted/50 text-foreground px-4 py-2 shadow-sm max-w-full"
                                style={{
                                  borderRadius: '15px 15px 15px 15px'
                                }}
                              >
                                <div className="flex items-start justify-between gap-2 min-w-0 max-w-full">
                                  <div className="flex-1 min-w-0 max-w-full">
                                    {typeof message.content === "string" ? (
                                      <MarkdownAny allMessages={allMessages}>{smoothContent}</MarkdownAny>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {(message.content as any[]).map((part, index) => {
                                          if (part.type === "text") {
                                            return <MarkdownAny key={index} allMessages={allMessages}>{part.text}</MarkdownAny>;
                                          }
                                          if (part.type === "image" && typeof part.image === 'string') {
                                            return <MarkdownAny key={index} allMessages={allMessages}>{part.image}</MarkdownAny>;
                                          }
                                          return null;
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // No tools - render content with same styled container
                          return (
                            <div
                              className="bg-muted/50 text-foreground px-4 py-1 shadow-sm max-w-full"
                              style={{
                                borderRadius: '0px 15px 15px 15px'
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 min-w-0 max-w-full">
                                <div className="flex-1 min-w-0 max-w-full">
                                  {typeof message.content === "string" ? (
                                    <MarkdownAny allMessages={allMessages}>{smoothContent}</MarkdownAny>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      {(message.content as any[]).map((part, index) => {
                                        if (part.type === "text") {
                                          return <MarkdownAny key={index} allMessages={allMessages}>{part.text}</MarkdownAny>;
                                        }
                                        if (part.type === "image" && typeof part.image === 'string') {
                                          return <MarkdownAny key={index} allMessages={allMessages}>{part.image}</MarkdownAny>;
                                        }
                                        return null;
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      )}

                      {/* Action buttons appear below when message is clicked with animation */}
                      <AnimatePresence>
                        {message.role === "user" && !isReadonly && actionsVisible && (
                          <motion.div
                            className="flex flex-row gap-1 mt-3"
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{
                              opacity: 0,
                              y: 10,
                              scale: 0.95,
                              transition: { duration: 0.15 },
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 25,
                            }}
                          >
                            <ButtonAny
                              type="button"
                              title="Edit message"
                              variant="ghost"
                              className="p-2 h-fit rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                              onClick={handleEdit}
                            >
                              <PencilEditIconAny className="size-4" />
                            </ButtonAny>
                            <ButtonAny
                              type="button"
                              title={isCopied ? "Copied!" : "Copy message"}
                              variant="ghost"
                              className="p-2 h-fit rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                              onClick={handleCopy}
                            >
                              {isCopied ? (
                                <CheckAny className="size-4 text-green-500" />
                              ) : (
                                <CopyAny className="size-4" />
                              )}
                            </ButtonAny>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {message.content && mode === "edit" && (
                    <div className="flex flex-row gap-2 items-start">
                      <div className="size-8" />
                      <MessageEditorAny
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        selectedGroup={selectedGroup}
                        reload={reload}
                      />
                    </div>
                  )}

                  {/* === BOTTOM SECTION: MESSAGE ACTIONS & SOURCE BADGES === */}
                  {message.role === "assistant" && (
                    <motion.div
                      className="flex flex-col mt-2"
                      initial={isPreloaded ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.4 }}
                    >
                      <div className="flex flex-row items-center justify-between pr-1.5 gap-2 sm:gap-4">
                        {/* Left side: Vote buttons (like/unlike) */}
                        {!isReadonly && (
                          <motion.div
                            initial={isPreloaded ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.3 }}
                            className="flex-shrink-0"
                          >
                            <MessageActionsAny
                              key={`action-${message.id}`}
                              chatId={chatId}
                              message={message}
                              vote={vote}
                              isLoading={isLoading}
                            />
                          </motion.div>
                        )}

                        {/* Right side: Tool icons and source badges */}
                        {completedTools && completedTools.length > 0 && (
                          <div className="flex items-center gap-1.5 sm:gap-3">

                            <div className="relative flex items-center h-5 sm:h-6 flex-shrink-0">
                              {completedTools.map((tool, index) => (
                                <motion.div
                                  key={tool.toolCallId}
                                  className="absolute"
                                  style={{
                                    left: `${index * 14}px`,
                                    zIndex: completedTools.length - index,
                                  }}
                                  initial={isPreloaded ? false : { scale: 0, opacity: 0, rotate: -10 }}
                                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                  transition={{
                                    duration: isPreloaded ? 0 : 0.3,
                                    delay: isPreloaded ? 0 : index * 0.08 + 0.4,
                                    type: isPreloaded ? "tween" : "spring",
                                    stiffness: 400,
                                    damping: 25
                                  }}
                                  whileHover={{
                                    scale: 1.1,
                                    y: -2,
                                    transition: { duration: 0.2 }
                                  }}
                                >
                                  <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-background backdrop-blur-sm rounded-full border border-border shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
                                    <ToolIcon toolName={tool.toolName} />
                                  </div>
                                </motion.div>
                              ))}
                            </div>

                            {/* Source count and tool name badges */}
                            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                              <motion.div
                                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-muted rounded-full border border-border flex-shrink-0"
                                style={{
                                  marginLeft: `${Math.max(0, (completedTools.length - 1) * 14 + 22)}px`,
                                }}
                                initial={isPreloaded ? false : { opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.6 }}
                              >
                                <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full animate-pulse" />
                                <span className="text-[10px] sm:text-xs font-medium text-foreground/70 whitespace-nowrap">
                                  {completedTools.length} source
                                  {completedTools.length > 1 ? "s" : ""}
                                </span>
                              </motion.div>

                              {/* separator - only show on desktop */}
                              <div className="text-border/60 hidden sm:block">|</div>

                              {/* Tool name badges - hidden on mobile, shown on desktop */}
                              <motion.div
                                className="hidden sm:flex gap-1 sm:gap-1.5 min-w-0"
                                initial={isPreloaded ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.9 }}
                              >
                                {completedTools.slice(0, 3).map((tool, index) => {
                                  const toolNames: Record<string, string> = {
                                    webSearch: "Web Search",
                                    searchEvmTokenMarketData: "EVM Token Data",
                                    searchSolanaTokenMarketData: "Solana Token Data",
                                    getSolanaChainWalletPortfolio: "Solana Portfolio",
                                    getEvmMultiChainWalletPortfolio: "EVM Portfolio",
                                    getTokenBalances: "Token Balances",
                                    getCreditcoinApiData: "Creditcoin API",
                                    getVanaApiData: "Vana API",
                                    getEvmOnchainDataUsingZerion: "Zerion Data",
                                    getEvmOnchainDataUsingEtherscan: "Etherscan Data",
                                    ensToAddress: "ENS Resolver",
                                    aptosNames: "Aptos Names",
                                    translateTransactions: "Transaction Parser",
                                    createImage: "Image Generation",
                                  };

                                  return (
                                    <Tooltip key={tool.toolCallId}>
                                      <TooltipTrigger asChild>
                                        <motion.span
                                          className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs font-medium bg-accent text-accent-foreground rounded-md sm:rounded-lg border border-border hover:bg-accent/80 transition-colors cursor-default whitespace-nowrap"
                                          initial={isPreloaded ? false : { opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: isPreloaded ? 0 : 0.2, delay: isPreloaded ? 0 : 0.9 + index * 0.05 }}
                                          whileHover={{ scale: 1.02 }}
                                        >
                                          <ToolIcon toolName={tool.toolName} />
                                          <span className="hidden sm:inline">{toolNames[tool.toolName] || tool.toolName}</span>
                                        </motion.span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="sm:hidden">
                                        <p>{toolNames[tool.toolName] || tool.toolName}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })}
                                {completedTools.length > 3 && (
                                  <motion.span
                                    className="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-muted text-foreground/70 rounded-md border border-border whitespace-nowrap"
                                    initial={isPreloaded ? false : { opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: isPreloaded ? 0 : 0.2, delay: isPreloaded ? 0 : 1.1 }}
                                  >
                                    +{completedTools.length - 3} more
                                  </motion.span>
                                )}
                              </motion.div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.reasoning !== nextProps.message.reasoning) return false;
    if (prevProps.message.content !== nextProps.message.content) return false;
    if (!equal(prevProps.message.toolInvocations, nextProps.message.toolInvocations)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (!equal(prevProps.selectedGroup, nextProps.selectedGroup)) return false;
    if (!equal(prevProps.allMessages, nextProps.allMessages)) return false;
    return true;
  }
);