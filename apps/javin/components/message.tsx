"use client";

import type { ChatRequestOptions, Message } from "ai";
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
// Mengimpor ikon Check dan Copy dari lucide-react
import { Check, Copy } from "lucide-react";

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
  // State untuk mengontrol visibilitas tombol aksi (edit, salin)
  const [actionsVisible, setActionsVisible] = useState(false);
  // State untuk memberikan umpan balik saat pesan disalin
  const [isCopied, setIsCopied] = useState(false);

  // Fungsi untuk menyalin konten pesan ke clipboard
  const handleCopy = (e: React.MouseEvent) => {
    // Mencegah event klik menyebar ke elemen induk
    e.stopPropagation();
    if (message.content) {
      navigator.clipboard
        .writeText(message.content as string)
        .then(() => {
          setIsCopied(true);
          // Reset status "disalin" dan sembunyikan tombol setelah 1.5 detik
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

  // Fungsi untuk masuk ke mode edit
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMode("edit");
    setActionsVisible(false); // Sembunyikan tombol saat masuk mode edit
  };

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
            "flex flex-col md:flex-row gap-0 md:gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            {
              "w-full": mode === "edit",
              "group-data-[role=user]/message:w-fit": mode !== "edit",
            }
          )}
        >
          {message.role === "assistant" && (
            <div className="hidden md:flex size-8 items-center rounded-full justify-center bg-background">
              {showIcon && (
                <div className="">
                  <JavinMan size={24} />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
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

            {message.toolInvocations && message.toolInvocations.length > 0 && (
              <div className="flex flex-col gap-4">
                {message.toolInvocations.map((toolInvocation) => {
                  const { toolName, toolCallId, state, args } = toolInvocation;

                  if (state === "result") {
                    const { result } = toolInvocation;

                    const SuccessIndicator = ({
                      children,
                    }: {
                      children: React.ReactNode;
                    }) => (
                      <div className="flex items-center gap-2 text-sm">
                        <Check
                          size={14}
                          className="text-green-500 flex-shrink-0"
                        />
                        <span>{children}</span>
                      </div>
                    );

                    const toolComponents: Record<string, React.ReactNode> = {
                      webSearch: <MultiSearch result={result} args={args} />,
                      searchEvmTokenMarketData: (
                        <TokenInfoTable result={result} />
                      ),
                      searchSolanaTokenMarketData: (
                        <TokenInfoTable result={result} />
                      ),
                      getSolanaChainWalletPortfolio: (
                        <PortfolioTable result={result} />
                      ),
                      getEvmMultiChainWalletPortfolio: (
                        <PortfolioTable result={result} />
                      ),
                      getTokenBalances: <PortfolioTable result={result} />,
                      getCreditcoinApiData: (
                        <SuccessIndicator>
                          Blockchain exploration complete
                        </SuccessIndicator>
                      ),
                      getVanaApiData: (
                        <SuccessIndicator>
                          Blockchain exploration complete
                        </SuccessIndicator>
                      ),
                      getEvmOnchainDataUsingZerion: (
                        <SuccessIndicator>
                          Blockchain exploration complete
                        </SuccessIndicator>
                      ),
                      getEvmOnchainDataUsingEtherscan: (
                        <SuccessIndicator>
                          Ethereum data retrieved
                        </SuccessIndicator>
                      ),
                      ensToAddress: (
                        <SuccessIndicator>
                          Address lookup completed
                        </SuccessIndicator>
                      ),
                      aptosNames: (
                        <SuccessIndicator>
                          Address lookup completed
                        </SuccessIndicator>
                      ),
                      translateTransactions: (
                        <SuccessIndicator>
                          Transactions summarized
                        </SuccessIndicator>
                      ),
                    };

                    return (
                      <div key={toolCallId} className="mb-4 last:mb-0">
                        {toolComponents[toolName] || (
                          <SuccessIndicator>
                            Operation completed successfully
                          </SuccessIndicator>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ["getWeather"].includes(toolName),
                      })}
                    >
                      {toolName === "webSearch" ? (
                        <div className="mt-4">
                          <MultiSearch result={null} args={args} />
                        </div>
                      ) : toolName === "getSolanaChainWalletPortfolio" ||
                        toolName === "getEvmMultiChainWalletPortfolio" ? (
                        <div className="text-sm">
                          <p className="py-1">Fetching portfolio...</p>
                        </div>
                      ) : toolName === "getCreditcoinApiData" ||
                        toolName === "getVanaApiData" ||
                        toolName === "getEvmOnchainDataUsingZerion" ? (
                        <div className="text-sm">
                          <p className="py-1">Exploring the blockchain...</p>
                        </div>
                      ) : toolName === "getEvmOnchainDataUsingEtherscan" ? (
                        <div className="text-sm">
                          <p className="py-1">Exploring ethereum...</p>
                        </div>
                      ) : toolName === "creditCoinApiFetch" ||
                        toolName === "vanaApiFetch" ||
                        toolName === "onChainQuery" ? (
                        <div className="text-sm">
                          <p className="py-1">Fetching data...</p>
                        </div>
                      ) : toolName === "ensToAddress" ||
                        toolName === "aptosNames" ? (
                        <div className="text-sm">
                          <p className="py-1">
                            Looking for you in the blockchain...
                          </p>
                        </div>
                      ) : toolName === "translateTransactions" ? (
                        <div className="text-sm">
                          <p className="flex flex-row gap-1 items-center">
                            Summarizing transactions...
                          </p>
                        </div>
                      ) : (
                        <div className="text-sm">Finding info...</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Blok yang dimodifikasi untuk menampilkan tombol di bawah dengan animasi */}
            {(message.content || message.reasoning) && mode === "view" && (
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

                {/* Tombol aksi muncul di bawah saat pesan diklik dengan animasi */}
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

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
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
    if (prevProps.message.reasoning !== nextProps.message.reasoning)
      return false;
    if (prevProps.message.content !== nextProps.message.content) return false;
    if (
      !equal(
        prevProps.message.toolInvocations,
        nextProps.message.toolInvocations
      )
    )
      return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (!equal(prevProps.selectedGroup, nextProps.selectedGroup)) return false;

    return true;
  }
);

export const ThinkingMessage = () => {
  const role = "assistant";

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          "flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl",
          {
            "group-data-[role=user]/message:bg-muted": true,
          }
        )}
      >
        <div className="hidden md:flex size-8 items-center rounded-full justify-center bg-background">
          <div className="">
            <JavinMan size={24} />
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
