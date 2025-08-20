"use client";

import type { ChatRequestOptions, Message, ToolInvocation } from "ai";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useState } from "react";

import type { Vote } from "@/lib/db/schema";
import { JavinMan, PencilEditIcon } from "./icons";
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
import { Check, Copy, Globe, BarChart3, Wallet, FileText } from "lucide-react";

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
};

// HELPER: Komponen kecil untuk merender setiap ikon tool
const ToolIcon = ({ toolName }: { toolName: string }) => {
  const IconComponent = toolIcons?.[toolName] || FileText;
  return (
    <div className="flex items-center justify-center size-5 bg-card rounded-full border border-border shadow-sm">
      <IconComponent className="size-3 text-muted-foreground" />
    </div>
  );
};

// Komponen animasi 'Thinking'
const ThinkingAnimation = () => {
    const loadingContainerVariants = {
        visible: {
            transition: {
                staggerChildren: 0.25,
            },
        },
    };

    const loadingCircleVariants = {
        hidden: {
            opacity: 0.3,
            scale: 1,
        },
        visible: {
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.1, 1],
            transition: {
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
            },
        },
    };

    return (
        <div className="flex items-center text-muted-foreground py-2">
            <motion.div
                className="flex gap-2"
                variants={loadingContainerVariants}
                initial="hidden"
                animate="visible"
            >
                <motion.span
                    className="block w-2.5 h-2.5 rounded-full bg-current"
                    variants={loadingCircleVariants}
                />
                <motion.span
                    className="block w-2.5 h-2.5 rounded-full bg-current"
                    variants={loadingCircleVariants}
                />
                <motion.span
                    className="block w-2.5 h-2.5 rounded-full bg-current"
                    variants={loadingCircleVariants}
                />
            </motion.div>
        </div>
    );
};


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
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [actionsVisible, setActionsVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (message.content) {
      navigator.clipboard
        .writeText(message.content as string)
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
  
  const webSearchResults = completedTools?.filter(
    (tool) => tool.toolName === 'webSearch'
  );
  const otherCompletedTools = completedTools?.filter(
    (tool) => tool.toolName !== 'webSearch'
  );

  const isThinking = message.role === 'assistant' && !message.content && (!completedTools || completedTools.length === 0);

  return (
    <AnimatePresence>
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex flex-col md:flex-row pl-0.5 gap-0 md:gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            }
          )}
        >
          {message.role === 'assistant' && (
            <div className="hidden md:flex size-8 items-center rounded-full justify-center bg-background">
              {showIcon && (
                <div className="">
                  <JavinMan size={24} />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            { isThinking ? (
                <ThinkingAnimation />
            ) : (
                <>
                    {message.experimental_attachments && (
                        <div className="flex flex-row justify-end gap-2">
                            {message.experimental_attachments.map((attachment) => (
                            <PreviewAttachment
                                key={attachment.url}
                                attachment={attachment}
                            />
                            ))}
                        </div>
                    )}

                    {message.reasoning && (
                        <MessageReasoning
                            isLoading={isLoading}
                            reasoning={message.reasoning}
                        />
                    )}

                    {/* === BAGIAN ATAS: HANYA HASIL WEBSEARCH === */}
                    {webSearchResults && webSearchResults.length > 0 && (
                        webSearchResults.map(tool => (
                            <MultiSearch key={tool.toolCallId} result={tool.result} args={tool.args} />
                        ))
                    )}

                    {/* === BAGIAN TENGAH: HASIL TOOL LAINNYA === */}
                    {otherCompletedTools && otherCompletedTools.length > 0 && (
                        <div className="flex flex-col items-start gap-2">
                            {otherCompletedTools.map((toolInvocation) => {
                                const { toolName, toolCallId, result } = toolInvocation;
                                if (toolInvocation.state !== "result") return null;
                                const toolComponents: Record<string, React.ReactNode> = {
                                    searchEvmTokenMarketData: <TokenInfoTable result={result} />,
                                    searchSolanaTokenMarketData: <TokenInfoTable result={result} />,
                                    getSolanaChainWalletPortfolio: <PortfolioTable result={result} />,
                                    getEvmMultiChainWalletPortfolio: <PortfolioTable result={result} />,
                                    getTokenBalances: <PortfolioTable result={result} />,
                                };
                                return (
                                <div key={toolCallId}>
                                    {toolComponents?.[toolName] || null}
                                </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {/* === BAGIAN TENGAH: KONTEN PESAN UTAMA (MARKDOWN) === */}
                    {(message.content) && mode === "view" && (
                        <div
                            className={cn("flex flex-col w-full", {
                            "items-end": message.role === "user",
                            })}
                        >
                            {/* Gelembung pesan itu sendiri */}
                            <div
                                className={cn("flex flex-col gap-4 max-w-max", {
                                    "bg-primary text-primary-foreground px-4 py-2 rounded-t-2xl rounded-bl-2xl":
                                    message.role === "user",
                                    "cursor-pointer": message.role === "user" && !isReadonly,
                                })}
                                onClick={() => {
                                    if (message.role === "user" && !isReadonly) {
                                    setActionsVisible(!actionsVisible);
                                    }
                                }}
                            >
                                <Markdown>{message.content as string}</Markdown>
                            </div>

                            {/* [UPDATE] Tombol aksi muncul di bawah saat pesan diklik dengan animasi */}
                            <AnimatePresence>
                                {message.role === "user" && !isReadonly && actionsVisible && (
                                    <motion.div
                                        className="flex flex-row gap-1 mt-2"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{
                                            opacity: 0,
                                            y: 10,
                                            transition: { duration: 0.15 },
                                        }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 500,
                                            damping: 30,
                                        }}
                                    >
                                        <Button
                                            type="button"
                                            title="Edit pesan"
                                            variant="ghost"
                                            className="p-2 h-fit rounded-full text-muted-foreground"
                                            onClick={handleEdit}
                                        >
                                            <PencilEditIcon className="size-4" />
                                        </Button>
                                        <Button
                                            type="button"
                                            title={isCopied ? "Disalin!" : "Salin pesan"}
                                            variant="ghost"
                                            className="p-2 h-fit rounded-full text-muted-foreground"
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
                        </div>
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
                        <MessageActions
                            key={`action-${message.id}`}
                            chatId={chatId}
                            message={message}
                            vote={vote}
                            isLoading={isLoading}
                        />
                    )}

                    {/* === BAGIAN BAWAH: SEMUA IKON & LABEL SUMBER === */}
                    {completedTools && completedTools.length > 0 && message.role === "assistant" && (
                        <div className="flex flex-col gap-3 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <div className="relative flex items-center h-5">
                                    {completedTools.map((tool, index) => (
                                    <div
                                        key={tool.toolCallId}
                                        className="absolute"
                                        style={{
                                        left: `${index * 12}px`,
                                        zIndex: completedTools.length - index,
                                        }}
                                    >
                                        <ToolIcon toolName={tool.toolName} />
                                    </div>
                                    ))}
                                </div>
                                <span
                                    className="text-xs font-medium text-muted-foreground"
                                    style={{ marginLeft: `${(completedTools.length - 1) * 12 + 18}px` }}
                                >
                                    Source
                                </span>
                            </div>
                        </div>
                    )}
                </>
            )}
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