"use client";

import type { ChatRequestOptions, Message } from "ai";
import cx from "classnames";
import { AnimatePresence, motion } from "framer-motion";
import { memo, useMemo, useState } from "react";

import type { Vote } from "@/lib/db/schema";

import { DocumentToolCall, DocumentToolResult } from "./document";
import {
  ChevronDownIcon,
  LoaderIcon,
  PencilEditIcon,
  SparklesIcon,
  JavinMan,
} from "./icons";
import { Markdown } from "./markdown";
import { MessageActions } from "./message-actions";
import { PreviewAttachment } from "./preview-attachment";
import { Weather } from "./weather";
import equal from "fast-deep-equal";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { MessageEditor } from "./message-editor";
import { DocumentPreview } from "./document-preview";
import { MessageReasoning } from "./message-reasoning";
import MultiSearch from "./multi-search";
import PortfolioTable from "./birdeye/PortfolioTable";
import TokenInfoTable from "./birdeye/TokenInfoTable";
import { Check } from "lucide-react";

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
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
  reload: (
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  isReadonly: boolean;
  showIcon?: boolean;
}) => {
  const [mode, setMode] = useState<"view" | "edit">("view");

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
            <div className="size-8 flex items-center rounded-full justify-center  bg-background">
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
                    console.log(
                      toolName,
                      " -- tool result ------------ ",
                      result
                    );
                    return (
                      <div key={toolCallId}>
                        {toolName === "webSearch" ? (
                          <MultiSearch result={result} args={args} />
                        ) : toolName === "searchEvmTokenMarketData" ||
                          toolName === "searchSolanaTokenMarketData" ? (
                          <TokenInfoTable result={result} />
                        ) : toolName === "getSolanaChainWalletPortfolio" ||
                          toolName === "getEvmMultiChainWalletPortfolio" ||
                          toolName === "getTokenBalances" ? (
                          <PortfolioTable result={result} />
                        ) : toolName === "getCreditcoinApiData" ||
                          toolName === "getVanaApiData" ||
                          toolName === "getEvmOnchainData" ? (
                          <div className="text-sm">
                            <p className="flex flex-row gap-1 items-center">
                              Exploring the blockchain
                              <Check size={14} className="text-green-500" />
                            </p>
                          </div>
                        ) : toolName === "ensToAddress" ? (
                          <div className="text-sm">
                            <p className="flex flex-row gap-1 items-center">
                              Looking for you in the blockchain
                              <Check size={14} className="text-green-500" />
                            </p>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <p className="flex flex-row gap-1 items-center">
                              Finding info
                              <Check size={14} className="text-green-500" />
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  }
                  // else when tool is loading
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
                        toolName === "getEvmOnchainData" ? (
                        <div className="text-sm">
                          <p className="py-1">Exploring the blockchain...</p>
                        </div>
                      ) : toolName === "creditCoinApiFetch" ||
                        toolName === "vanaApiFetch" ||
                        toolName === "onChainQuery" ? (
                        <div className="text-sm">
                          <p className="py-1">Fetching data...</p>
                        </div>
                      ) : toolName === "ensToAddress" ? (
                        <div className="text-sm">
                          <p className="py-1">
                            Looking for you in the blockchain...
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

            {(message.content || message.reasoning) && mode === "view" && (
              <div className="flex flex-row gap-2 items-start">
                {message.role === "user" && !isReadonly && (
                  <Button
                    type="button"
                    title="Edit message"
                    variant="ghost"
                    className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                    onClick={(e) => {
                      e.preventDefault();
                      setMode("edit");
                    }}
                  >
                    <PencilEditIcon />
                  </Button>
                )}

                <div
                  className={cn("flex flex-col gap-4", {
                    "bg-primary text-primary-foreground px-3 py-2 rounded-xl":
                      message.role === "user",
                  })}
                >
                  <Markdown>{message.content as string}</Markdown>
                </div>
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
        <div className="size-8 flex items-center rounded-full justify-center  bg-background">
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
