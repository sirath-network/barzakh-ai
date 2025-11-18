"use client";

import type { ChatRequestOptions, Message, ToolInvocation } from "ai";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState, useEffect, useRef } from "react";

import type { Vote } from "@/lib/db/schema";
import { PencilEditIcon } from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import equal from "fast-deep-equal";
import { cn, SearchGroupId } from "@barzakh/shared/lib/utils/utils";
import { Button } from "./ui/button";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import MultiSearch from "./multi-search";
import PortfolioTable from "./birdeye/PortfolioTable";
import TokenInfoTable from "./birdeye/TokenInfoTable";
import { Check, Copy, Globe, BarChart3, Wallet, FileText, FileImage } from "lucide-react";
import Image from "next/image";

// HELPER: Map from tool name to corresponding icon
const toolIcons: Record<string, React.ElementType> = {
  webSearch: Globe,
  searchEvmTokenMarketData: BarChart3,
  searchSolanaTokenMarketData: BarChart3,
  getSolanaChainWalletPortfolio: Wallet,
  getEvmMultiChainWalletPortfolio: Wallet,
  getTokenBalances: Wallet,
  getCreditcoinApiData: FileText,
  getVanaApiData: FileText,
  getEvmOnchainDataUsingZerion: FileText,
  getEvmOnchainDataUsingEtherscan: FileText,
  ensToAddress: FileText,
  aptosNames: FileText,
  translateTransactions: FileText,
  createImage: FileImage,
};

// HELPER: Small component to render each tool icon
const ToolIcon = ({ toolName, size = "small" }: { toolName: string; size?: "small" | "medium" }) => {
  const IconComponent = toolIcons?.[toolName] || FileText;
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
    <AnimatePresence mode="wait">
      <motion.div
        className={cn(
          "w-full max-w-full mx-auto md:max-w-3xl px-3 group/message min-w-0",
          message.role === "user" && "mb-4"
        )}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -5, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
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
            <AssistantAvatar
              showIcon={showIcon}
              staticImageSrc={staticAvatarSrc}
              size={avatarSize}
            />
          )}

          <div className={cn(
            "flex flex-col gap-1 min-w-0 max-w-full",
            message.role === 'user' ? "w-full" : "w-full"
          )}>
            <AnimatePresence mode="wait">
              {showThinking ? (
                <motion.div key="thinking">
                  <ThinkingAnimation statusText={statusText} />
                </motion.div>
              ) : (
                <motion.div 
                  key="content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {message.reasoning && (
                    <MessageReasoning
                      isLoading={isLoading}
                      reasoning={message.reasoning}
                    />
                  )}

                  {/* === TOP SECTION: ONLY WEB SEARCH RESULTS === */}
                  {webSearchResults && webSearchResults.length > 0 && (
                    webSearchResults.map(tool => (
                      <motion.div 
                        key={tool.toolCallId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <MultiSearch result={tool.result} args={tool.args} />
                      </motion.div>
                    ))
                  )}

                  {/* === TOP SECTION: OTHER TOOL RESULTS (PORTFOLIO, TOKEN INFO, etc.) === */}
                  {otherCompletedTools && otherCompletedTools.length > 0 && (
                    <motion.div 
                      className="flex flex-col items-start gap-2 mb-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 }}
                    >
                      {otherCompletedTools.map((toolInvocation) => {
                        const { toolName, toolCallId, result } = toolInvocation;
                        if (toolInvocation.state !== "result") return null;
                        
                        const toolComponents: Record<string, React.ReactNode> = {
                          searchEvmTokenMarketData: <TokenInfoTable result={result} />,
                          searchSolanaTokenMarketData: <TokenInfoTable result={result} />,
                          getSolanaChainWalletPortfolio: <PortfolioTable result={result} />,
                          getEvmMultiChainWalletPortfolio: <PortfolioTable result={result} />,
                          getTokenBalances: <PortfolioTable result={result} />,
                          createImage: result?.imageUrls ? (
                            <AIGeneratedImageGrid 
                              imageUrls={result.imageUrls}
                              alt="AI generated images"
                            />
                          ) : result?.imageUrl ? (
                            <AIGeneratedImage 
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
                            {toolComponents?.[toolName] || null}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}

                  {/* === MIDDLE SECTION: MAIN MESSAGE CONTENT (MARKDOWN) === */}
                  {(message.content) && mode === "view" && (
                    <motion.div
                      className={cn("flex flex-col w-full", {
                        "items-end": message.role === "user",
                      })}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
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
                                  <PreviewAttachment
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
                                        <PreviewAttachment
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
                                  <Markdown allMessages={allMessages}>{textContent}</Markdown>
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
                          
                          return (
                            <div
                              className="bg-muted/50 text-foreground px-4 py-3 shadow-sm max-w-full"
                              style={{
                                borderRadius: '0px 15px 15px 15px'
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 min-w-0 max-w-full">
                                <div className="flex-1 min-w-0 max-w-full">
                                  {typeof message.content === "string" ? (
                                    <Markdown allMessages={allMessages}>{message.content}</Markdown>
                                  ) : (
                                    <div className="flex flex-col gap-2">
                                      {(message.content as any[]).map((part, index) => {
                                        if (part.type === "text") {
                                          return <Markdown key={index} allMessages={allMessages}>{part.text}</Markdown>;
                                        }
                                        if (part.type === "image" && typeof part.image === 'string') {
                                          // Include image URLs in text content so they can be rendered inline by Markdown
                                          // This allows the Markdown component to detect and render AI-generated images properly
                                          return <Markdown key={index} allMessages={allMessages}>{part.image}</Markdown>;
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
                            <Button
                              type="button"
                              title="Edit message"
                              variant="ghost"
                              className="p-2 h-fit rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                              onClick={handleEdit}
                            >
                              <PencilEditIcon className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              title={isCopied ? "Copied!" : "Copy message"}
                              variant="ghost"
                              className="p-2 h-fit rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                              onClick={handleCopy}
                            >
                              {isCopied ? (
                                <Check className="size-4 text-green-500" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                  
                  {message.content && mode === "edit" && (
                    <div className="flex flex-row gap-2 items-start">
                      <div className="size-8" />
                      <MessageEditor
                        key={message.id}
                        message={message}
                        setMode={setMode}
                        setMessages={setMessages}
                        selectedGroup={selectedGroup}
                        reload={reload}
                      />
                    </div>
                  )}
                  
                  {/* === BOTTOM SECTION: MESSAGE ACTIONS & SOURCE === */}
                  {!isReadonly && message.role === "assistant" && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
                    >
                      <MessageActions
                        key={`action-${message.id}`}
                        chatId={chatId}
                        message={message}
                        vote={vote}
                        isLoading={isLoading}
                      />
                    </motion.div>
                  )}

                  {/* === BOTTOM SECTION: ALL ICONS & SOURCE LABELS === */}
                  {completedTools && completedTools.length > 0 && message.role === "assistant" && (
                    <motion.div 
                      className="flex flex-col gap-2 sm:gap-3 pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-border/50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-0 sm:justify-between">
                        {/* Container kiri: Icons dengan background dan shadow yang lebih baik */}
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 overflow-x-auto w-full sm:w-auto">
                          <div className="relative flex items-center h-5 sm:h-6 flex-shrink-0">
                            {completedTools.map((tool, index) => (
                              <motion.div
                                key={tool.toolCallId}
                                className="absolute"
                                style={{
                                  left: `${index * 14}px`,
                                  zIndex: completedTools.length - index,
                                }}
                                initial={{ scale: 0, opacity: 0, rotate: -10 }}
                                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                transition={{ 
                                  duration: 0.3, 
                                  delay: index * 0.08 + 0.4,
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 25
                                }}
                                whileHover={{ 
                                  scale: 1.1, 
                                  y: -2,
                                  transition: { duration: 0.2 }
                                }}
                              >
                                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-background/80 backdrop-blur-sm rounded-full border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
                                  <ToolIcon toolName={tool.toolName} />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          
                          {/* Label dengan styling yang lebih baik */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap min-w-0">
                            <motion.div
                              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-0.5 sm:py-1 bg-muted/50 rounded-full border border-border/40 flex-shrink-0"
                              style={{
                                marginLeft: `${Math.max(0, (completedTools.length - 1) * 14 + 14)}px`,
                              }}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.6 }}
                            >
                              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-[10px] sm:text-xs font-medium text-muted-foreground whitespace-nowrap">
                                {completedTools.length} source
                                {completedTools.length > 1 ? "s" : ""}
                              </span>
                            </motion.div>

                            {/* separator */}
                            <div className="text-border/60 hidden sm:block">|</div>

                            <motion.div
                              className="flex flex-wrap gap-1 sm:gap-1.5 min-w-0"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3, delay: 0.9 }}
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
                                  <motion.span
                                    key={tool.toolCallId}
                                    className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-accent/50 text-accent-foreground rounded-md border border-accent/20 hover:bg-accent/70 transition-colors cursor-default whitespace-nowrap"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.9 + index * 0.05 }}
                                    whileHover={{ scale: 1.02 }}
                                  >
                                    <ToolIcon toolName={tool.toolName} />
                                    <span className="hidden sm:inline">{toolNames[tool.toolName] || tool.toolName}</span>
                                    <span className="inline sm:hidden">{(toolNames[tool.toolName] || tool.toolName).split(' ')[0]}</span>
                                  </motion.span>
                                );
                              })}
                              {completedTools.length > 3 && (
                                <motion.span
                                  className="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-muted text-muted-foreground rounded-md border border-border/40 whitespace-nowrap"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.2, delay: 1.1 }}
                                >
                                  +{completedTools.length - 3} more
                                </motion.span>
                              )}
                            </motion.div>
                          </div>

                        </div>
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