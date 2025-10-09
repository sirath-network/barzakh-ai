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
import { cn, SearchGroupId } from "@javin/shared/lib/utils/utils";
import { Button } from "./ui/button";
import { MessageEditor } from "./message-editor";
import { MessageReasoning } from "./message-reasoning";
import MultiSearch from "./multi-search";
import PortfolioTable from "./birdeye/PortfolioTable";
import TokenInfoTable from "./birdeye/TokenInfoTable";
import { Check, Copy, Globe, BarChart3, Wallet, FileText, FileImage } from "lucide-react";
import Image from "next/image";

// HELPER: Peta dari nama tool ke ikon yang sesuai
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

// HELPER: Komponen kecil untuk merender setiap ikon tool
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
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [actionsVisible, setActionsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

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

  // Logika thinking yang lebih agresif dan responsif
  const isThinking = 
    message.role === 'assistant' && 
    isLoading && ( // only when the chat is actively loading
      (!message.content && (!message.toolInvocations || message.toolInvocations.length === 0)) ||
      (pendingTools && pendingTools.length > 0)
    );

  // Effect untuk menampilkan thinking tanpa delay sama sekali
  useEffect(() => {
    if (isThinking) {
      // Tampilkan thinking SEGERA tanpa delay
      setShowThinking(true);
    } else {
      // Berikan sedikit delay sebelum menghilangkan thinking
      const timer = setTimeout(() => {
        setShowThinking(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isThinking]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="w-full mx-auto max-w-3xl px-3 group/message"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -5, opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex flex-col md:flex-row md:items-start pl-0.5 gap-0 md:gap-4 w-full",
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
            "flex flex-col gap-1",
            message.role === 'user' ? "w-full" : "w-full"
          )}>
            <AnimatePresence mode="wait">
              {showThinking ? (
                <motion.div key="thinking">
                  <ThinkingAnimation />
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

                  {/* === BAGIAN ATAS: HANYA HASIL WEBSEARCH === */}
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

                  {/* === BAGIAN TENGAH: KONTEN PESAN UTAMA (MARKDOWN) === */}
                  {(message.content) && mode === "view" && (
                    <motion.div
                      className={cn("flex flex-col w-full", {
                        "items-end": message.role === "user",
                      })}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      {/* USER MESSAGE: Separate attachments and text like Gemini AI */}
                      {message.role === "user" ? (
                        <div className="flex flex-col gap-2 items-end">
                          {/* Attachments displayed first as separate cards */}
                          {(message.experimental_attachments || (Array.isArray(message.content) && message.content.some(part => part.type === 'image'))) && (
                            <div className="flex flex-wrap gap-2 justify-end">
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
                                   className="dark:bg-muted dark:text-foreground bg-primary text-primary-foreground px-3 cursor-pointer max-w-max relative shadow-sm"
                                   style={{
                                     borderRadius: '15px 15px 0px 15px'
                                   }}
                                   onClick={() => {
                                     if (!isReadonly) {
                                       setActionsVisible(!actionsVisible);
                                     }
                                   }}
                                 >
                                   <Markdown>{textContent}</Markdown>
                                 </div>
                               );
                             }
                            return null;
                          })()}
                        </div>
                      ) : (
                        /* ASSISTANT MESSAGE: Keep original structure */
                        <div
                          className="bg-muted/50 text-foreground px-4 py-3 shadow-sm"
                          style={{
                            borderRadius: '0px 15px 15px 15px'
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              {typeof message.content === "string" ? (
                                <Markdown>{message.content}</Markdown>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {(message.content as any[]).map((part, index) => {
                                    if (part.type === "text") {
                                      return <Markdown key={index}>{part.text}</Markdown>;
                                    }
                                    if (part.type === "image" && typeof part.image === 'string') {
                                      // Include image URLs in text content so they can be rendered inline by Markdown
                                      // This allows the Markdown component to detect and render AI-generated images properly
                                      return <Markdown key={index}>{part.image}</Markdown>;
                                    }
                                    return null;
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tombol aksi muncul di bawah saat pesan diklik dengan animasi */}
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
                              title="Edit pesan"
                              variant="ghost"
                              className="p-2 h-fit rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                              onClick={handleEdit}
                            >
                              <PencilEditIcon className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              title={isCopied ? "Disalin!" : "Salin pesan"}
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

                  {/* === BAGIAN TENGAH: HASIL TOOL LAINNYA (SETELAH TEXT) === */}
                  {otherCompletedTools && otherCompletedTools.length > 0 && (
                    <motion.div 
                      className="flex flex-col items-start gap-2 mt-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 }}
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
                  
                  {/* === BAGIAN BAWAH: MESSAGE ACTIONS & SUMBER === */}
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

                  {/* === BAGIAN BAWAH: SEMUA IKON & LABEL SUMBER === */}
                  {completedTools && completedTools.length > 0 && message.role === "assistant" && (
                    <motion.div 
                      className="flex flex-col gap-3 pt-4 mt-4 border-t border-border/50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.4 }}
                    >
                      <div className="flex items-center justify-between">
                        {/* Container kiri: Icons dengan background dan shadow yang lebih baik */}
                        <div className="flex items-center gap-3">
                          <div className="relative flex items-center h-6">
                            {completedTools.map((tool, index) => (
                              <motion.div
                                key={tool.toolCallId}
                                className="absolute"
                                style={{
                                  left: `${index * 16}px`,
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
                                <div className="flex items-center justify-center w-6 h-6 bg-background/80 backdrop-blur-sm rounded-full border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all duration-200">
                                  <ToolIcon toolName={tool.toolName} />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                          
                          {/* Label dengan styling yang lebih baik */}
                          <div className="flex items-center gap-3">
                            <motion.div
                              className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full border border-border/40"
                              style={{
                                marginLeft: `${Math.max(0, (completedTools.length - 1) * 16 + 16)}px`,
                              }}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: 0.6 }}
                            >
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                              <span className="text-xs font-medium text-muted-foreground">
                                {completedTools.length} source
                                {completedTools.length > 1 ? "s" : ""}
                              </span>
                            </motion.div>

                            {/* separator */}
                            <div className="text-border/60">|</div>

                            <motion.div
                              className="flex flex-wrap gap-1.5"
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
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-accent/50 text-accent-foreground rounded-md border border-accent/20 hover:bg-accent/70 transition-colors cursor-default"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: 0.9 + index * 0.05 }}
                                    whileHover={{ scale: 1.02 }}
                                  >
                                    <ToolIcon toolName={tool.toolName} />
                                    {toolNames[tool.toolName] || tool.toolName}
                                  </motion.span>
                                );
                              })}
                              {completedTools.length > 3 && (
                                <motion.span
                                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-md border border-border/40"
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
    return true;
  }
);