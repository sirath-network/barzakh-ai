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
import TransactionHistory from "./solana/TransactionHistory";
import EvmTransactionHistory from "./onchain/EvmTransactionHistory";
import { Check, Copy, Globe, BarChart3, Wallet, FileText, FileImage, CreditCard, ArrowRightLeft, History } from "lucide-react";
import Image from "next/image";
import { useSmoothStreaming } from "@/hooks/use-smooth-streaming";

const MultiSearchAny = MultiSearch as any;
const PortfolioTableAny = PortfolioTable as any;
const TokenInfoTableAny = TokenInfoTable as any;
const TransactionHistoryAny = TransactionHistory as any;
const EvmTransactionHistoryAny = EvmTransactionHistory as any;
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
const CreditCardAny = CreditCard as any;
const ArrowRightLeftAny = ArrowRightLeft as any;
const HistoryAny = History as any;
const TooltipAny = Tooltip as any;
const TooltipTriggerAny = TooltipTrigger as any;
const TooltipContentAny = TooltipContent as any;

// HELPER: Map from tool name to corresponding icon
const toolIcons: Record<string, React.ElementType> = {
  webSearch: GlobeAny,
  searchEvmTokenMarketData: BarChart3Any,
  searchSolanaTokenMarketData: BarChart3Any,
  getSolanaChainWalletPortfolio: WalletAny,
  getEvmMultiChainWalletPortfolio: WalletAny,
  getTokenBalances: WalletAny,
  getSolanaWalletTransactions: HistoryAny,
  getCreditcoinApiData: FileTextAny,
  getVanaApiData: FileTextAny,
  getEvmOnchainDataUsingZerion: FileTextAny,
  getEvmOnchainDataUsingEtherscan: FileTextAny,
  ensToAddress: FileTextAny,
  aptosNames: FileTextAny,
  translateTransactions: FileTextAny,
  createImage: FileImageAny,
  // Cronos Tools
  getCronosBalance: WalletAny,
  getCronosTokenBalance: WalletAny,
  getCronosTransaction: FileTextAny,
  getCronosTransactionHistory: FileTextAny,
  getCronosGasPrice: BarChart3Any,
  getCronosMarketData: BarChart3Any,
  getMarketOverview: BarChart3Any,
  getCryptoPrice: BarChart3Any,
  // x402 Payment Tools
  initiateX402Payment: CreditCardAny,
  getSubscriptionInfo: FileTextAny,
  // Relay Protocol Tools
  getRelaySupportedChains: GlobeAny,
  getRelayQuote: BarChart3Any,
  getRelayBridgeQuote: BarChart3Any,
  prepareRelayTransaction: ArrowRightLeftAny,
  // nad.fun Tools
  searchNadFunTokens: BarChart3Any,
  // Four.meme Tools (BNB Chain)
  searchFourMemeTokens: BarChart3Any,
  getFourMemeRankings: BarChart3Any,
  getFourMemeTokenDetail: BarChart3Any,
  getFourMemeMarketData: BarChart3Any,
  quoteFourMemeBuy: BarChart3Any,
  quoteFourMemeSell: BarChart3Any,
  executeFourMemeBuy: ArrowRightLeftAny,
  executeFourMemeSell: ArrowRightLeftAny,
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
import { X402PaymentApproval } from "./x402-payment-approval";
import { RelaySwapApproval } from "./relay-swap-approval";
import NadFunTokenSearch from "./nadfun-token-search";
import FourMemeTokenSearch from "./fourmeme-token-search";

const X402PaymentApprovalAny = X402PaymentApproval as any;
const RelaySwapApprovalAny = RelaySwapApproval as any;
const NadFunTokenSearchAny = NadFunTokenSearch as any;
const FourMemeTokenSearchAny = FourMemeTokenSearch as any;

// Helper to remove AI preamble narration when tools are used
// This filters out phrases like "I'll search for..." that create bad UX
const filterPreambleContent = (content: string, hasTools: boolean): string => {
  if (!hasTools || !content) return content;

  // Preamble patterns that should be removed when tools are used
  // These patterns match common AI narration before tool calls
  const preamblePatterns = [
    // "I'll search/look/find/check" patterns
    /^I'll\s+(search|look|find|check|get|fetch|retrieve|analyze|query|pull|grab|locate).+?\.\s*/gi,
    // "Let me search/look" patterns  
    /^Let\s+me\s+(search|look|find|check|get|fetch|retrieve|analyze|query|pull|grab|locate).+?\.\s*/gi,
    // "Searching for..." patterns (progressive tense)
    /^(Searching|Looking|Finding|Checking|Getting|Fetching|Retrieving|Analyzing|Querying|Pulling).+?\.\s*/gi,
    // "I will search..." patterns
    /^I\s+will\s+(search|look|find|check|get|fetch|retrieve|analyze|query|pull|grab|locate).+?\.\s*/gi,
    // "I'm going to search..." patterns
    /^I'm\s+(going\s+to\s+)?(search|look|find|check|get|fetch|retrieve|analyze|query|pull|grab|locate).+?\.\s*/gi,
    // "I am searching..." patterns
    /^I\s+am\s+(searching|looking|finding|checking|getting|fetching|retrieving|analyzing|querying).+?\.\s*/gi,
    // "I need to search..." patterns
    /^I\s+(need|want|have)\s+to\s+(search|look|find|check|get|fetch|retrieve|analyze).+?\.\s*/gi,
    // "To answer this..." patterns
    /^To\s+(answer|find|get|check|determine).+?\.\s*/gi,
    // "First, let me..." patterns
    /^(First|Now),?\s+(let\s+me|I'll|I\s+will).+?\.\s*/gi,
    // Generic "I'll" + action that ends with period
    /^I('ll|\s+will)\s+[^.]{5,150}\.\s*\n?/gi,
    // "Based on..." intro that leads to tool call  
    /^Based\s+on\s+(your|the)\s+(question|query|request).+?(I'll|let me|I will).+?\.\s*/gi,
  ];

  let filtered = content;
  for (const pattern of preamblePatterns) {
    filtered = filtered.replace(pattern, '');
  }

  // Also remove any leading newlines after filtering
  filtered = filtered.replace(/^\s*\n+/, '');

  return filtered.trim();
};

// Helper to remove markdown tables from content
const removeMarkdownTables = (content: string): string => {
  // Regex matches markdown tables:
  // Starts with |...|
  // Followed by divider row |---|---|
  // Followed by any rows |...|
  const tableRegex = /\|.*\|.*\n\|[-: |]+\|.*(\n\|.*\|.*)*/g;
  return content.replace(tableRegex, "").trim();
};

// Helper to filter out internal system/API explanatory content from tool responses
// This removes paragraphs that explain API errors, chain queries, or internal processing
const filterSystemExplanatoryContent = (content: string, hasOnchainTools: boolean): string => {
  if (!hasOnchainTools || !content) return content;

  // Split content into paragraphs and filter out system explanatory ones
  const paragraphs = content.split(/\n\n+/);

  const filteredParagraphs = paragraphs.filter(paragraph => {
    const text = paragraph.toLowerCase().trim();

    // Skip empty paragraphs
    if (!text) return false;

    // Filter out paragraphs that look like API/system explanations
    const systemPatterns = [
      // API error explanations
      /etherscan api/i,
      /api\s*(pro|subscription|call|returned|endpoint|path|v2)/i,
      /\*\*pro endpoint\*\*/i,
      /requires\s*(a\s+)?(paid\s+)?subscription/i,
      /upgrade\s+(to|your)\s+(api\s+)?pro/i,
      /\$\d+\/month/i,
      /api pro tier/i,
      /pro endpoint/i,
      // Internal query explanations - expanded patterns
      /the user is asking/i,
      /i see you are (looking|trying)/i,
      /the query was executed/i,
      /as no specific chain was mentioned/i,
      /chainid[:\s]+\d+/i,
      /chain\s*id[:\s]+\d+/i,
      /\(chainid[:\s]?\d+\)/i,
      // API path explanations
      /the api path required/i,
      /the most relevant api path/i,
      /module=account/i,
      /action=addresstokenbalance/i,
      // Cannot fulfill messages
      /i cannot fulfill/i,
      /i am unable to/i,
      /unable to retrieve/i,
      /cannot fetch/i,
      /cannot be fulfilled/i,
      /unfortunately,?\s*i cannot/i,
      // Token balance internal messages  
      /api subscription limitations/i,
      /erc-20 token (balances|holdings)/i,
      /native eth balance/i,
      /\*\*result:\*\*/i,
      /\*\*suggestion:\*\*/i,
      /\*\*on\s+\w+\s+mainnet/i,
      // Chain-specific mentions in error context
      /on\s+\*?\*?(ethereum|polygon|arbitrum|optimism|base|bsc|bnb)\s+mainnet\*?\*?/i,
      /on\s+\*?\*?chain\s*id/i,
      // Internal processing messages and recommendations
      /using a dedicated (portfolio|service|api)/i,
      /consider using\s+(the\s+)?(zerion|a dedicated)/i,
      /i recommend using/i,
      /zerion api/i,
      /alternative apis/i,
      /explore alternative/i,
      /dedicated portfolio/i,
      /for comprehensive (token|portfolio)/i,
      /token holdings data/i,
      /which (is often free|often provides)/i,
      /provides (this information|more detailed)/i,
      /free and (provides|more detailed)/i,
      // Technical API details that shouldn't be shown
      /\.?\/\?module=/i,
      /addresstokenbalance/i,
      /api response indicates/i,
      /current access level/i,
      /current etherscan api access/i,
      /to access this data/i,
      /to get this data/i,
      /part of the.*api pro/i,
    ];

    // Check if paragraph matches any system pattern
    for (const pattern of systemPatterns) {
      if (pattern.test(text)) {
        return false; // Filter out this paragraph
      }
    }

    return true; // Keep this paragraph
  });

  return filteredParagraphs.join('\n\n').trim();
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
    isPreloadedRef.current = hasContent && !isLoading ? true : false;
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
    // Strip internal image URL metadata from copied text
    textToCopy = textToCopy.replace(/\n*\[ORIGINAL_IMAGE_URLS_FOR_EDITING:[^\]]+\]/g, '').trim();
    // Strip file attachment metadata (e.g. "filename.pdf (URL: https://...)")
    textToCopy = textToCopy.replace(/\n*.+?\.\w+\s*\(URL:\s*https?:\/\/[^\s)]+\)/g, '').trim();

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
    (tool) => {
      if (tool.state !== "result") return false;

      // Filter out blocked web searches
      if (tool.toolName === 'webSearch') {
        const toolResult = (tool as any).result;
        const isWebEmpty = !toolResult?.web || toolResult.web.length === 0;
        const isXEmpty = !toolResult?.x || toolResult.x.length === 0;
        const isBlocked = toolResult?.summary === "Search already completed. Refrained from searching again.";

        if ((isWebEmpty && isXEmpty) || isBlocked) {
          return false;
        }
      }

      return true;
    }
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
                    webSearchResults.map(tool => {
                      // Skip rendering if results are empty (blocked redundant search)
                      const toolResult = (tool as any).result;
                      const isWebEmpty = !toolResult?.web || toolResult.web.length === 0;
                      const isXEmpty = !toolResult?.x || toolResult.x.length === 0;

                      // Also check if it's the specific "blocked" response summary
                      const isBlocked = toolResult?.summary === "Search already completed. Refrained from searching again.";

                      if ((isWebEmpty && isXEmpty) || isBlocked) {
                        return null;
                      }

                      return (
                        <motion.div
                          key={tool.toolCallId}
                          initial={isPreloaded ? false : { opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: isPreloaded ? 0 : 0.3 }}
                        >
                          <MultiSearchAny result={toolResult} args={tool.args} />
                        </motion.div>
                      );
                    })
                  )}

                  {/* === TOP SECTION: OTHER TOOL RESULTS (PORTFOLIO, TOKEN INFO, etc.) === */}
                  {(() => {
                    // List of tools that have UI components
                    const renderableToolNames = [
                      'searchEvmTokenMarketData',
                      'searchSolanaTokenMarketData',
                      'getSolanaChainWalletPortfolio',
                      'getEvmMultiChainWalletPortfolio',
                      'getMantlePortfolio',
                      'getMonadPortfolio', // Monad portfolio (primary)
                      'getTokenBalances',
                      'getSolanaWalletTransactions',
                      // EVM chain transaction history tools
                      'getMantleTransactionHistory',
                      'getCronosTransactionHistory',
                      'getMonadTransactionHistory', // Monad transactions
                      'getZkEVMTransactionHistory',
                      'getEvmOnchainDataUsingZerion',
                      'getEvmOnchainDataUsingEtherscan',
                      // Other chains supported by EvmTransactionHistory
                      'getCreditcoinApiData',
                      'getVanaApiData',
                      'getZetaApiData',
                      'getFlowApiData',
                      'getWormholeApiData',
                      'getSeiApiData',
                      'translateTransactions',
                      // Note: getMonadDefiPositions, getMonadNFTs, getMonadTokenPositions excluded
                      // They are handled internally by getMonadPortfolio
                      'createImage',
                      'initiateX402Payment',
                      // Relay Protocol - all quote tools show UI
                      'getRelayQuote',
                      'getRelayBridgeQuote',
                      'prepareRelayTransaction',
                      'executeAgenticRelaySwap',
                      // nad.fun Tools
                      'searchNadFunTokens',
                      // Four.meme Tools (BNB Chain)
                      'searchFourMemeTokens',
                      'getFourMemeRankings',
                    ];

                    // Filter to only tools that have renderable components
                    let renderableTools = otherCompletedTools?.filter(
                      tool => tool.state === 'result' && renderableToolNames.includes(tool.toolName)
                    ) || [];

                    // Deduplicate getEvmOnchainDataUsingZerion calls - prefer portfolio data
                    // This prevents duplicate renders when AI makes multiple API calls
                    const zerionTools = renderableTools.filter(
                      (tool: any) => tool.toolName === 'getEvmOnchainDataUsingZerion'
                    );
                    if (zerionTools.length > 1) {
                      // Find the best one: prefer portfolio type, otherwise first one
                      const portfolioTool = zerionTools.find(
                        (tool: any) => tool.result?.type === 'portfolio'
                      );
                      const bestZerionTool = portfolioTool || zerionTools[0];

                      // Filter out all Zerion tools except the best one
                      renderableTools = renderableTools.filter(
                        (tool: any) => tool.toolName !== 'getEvmOnchainDataUsingZerion' || tool === bestZerionTool
                      );
                    }

                    if (renderableTools.length === 0) return null;

                    return (
                      <motion.div
                        className="flex flex-col items-start gap-2 mb-4"
                        initial={isPreloaded ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.1 }}
                      >
                        {renderableTools.map((toolInvocation) => {
                          const { toolName, toolCallId, result } = toolInvocation as any;

                          const toolComponents: Record<string, React.ReactNode> = {
                            searchEvmTokenMarketData: <TokenInfoTableAny result={result} />,
                            searchSolanaTokenMarketData: <TokenInfoTableAny result={result} />,
                            getSolanaChainWalletPortfolio: <PortfolioTableAny result={result} />,
                            getEvmMultiChainWalletPortfolio: <PortfolioTableAny result={result} />,
                            getMantlePortfolio: <PortfolioTableAny result={result} />,
                            getMonadPortfolio: <PortfolioTableAny result={result} />,
                            getTokenBalances: <PortfolioTableAny result={result} />,
                            getSolanaWalletTransactions: <TransactionHistoryAny result={result} />,
                            // EVM chain transaction history & General API Data
                            getMantleTransactionHistory: <EvmTransactionHistoryAny result={result} />,
                            getCronosTransactionHistory: <EvmTransactionHistoryAny result={result} />,
                            getMonadTransactionHistory: <EvmTransactionHistoryAny result={result} />,
                            getZkEVMTransactionHistory: <EvmTransactionHistoryAny result={result} />,
                            // Zerion tool can return either portfolio or transaction data
                            getEvmOnchainDataUsingZerion: result?.type === 'portfolio'
                              ? <PortfolioTableAny result={result} />
                              : <EvmTransactionHistoryAny result={result} />,
                            getEvmOnchainDataUsingEtherscan: <EvmTransactionHistoryAny result={result} />,
                            getCreditcoinApiData: <EvmTransactionHistoryAny result={result} />,
                            getVanaApiData: <EvmTransactionHistoryAny result={result} />,
                            getZetaApiData: <EvmTransactionHistoryAny result={result} />,
                            getFlowApiData: <EvmTransactionHistoryAny result={result} />,
                            getWormholeApiData: <EvmTransactionHistoryAny result={result} />,
                            getSeiApiData: <EvmTransactionHistoryAny result={result} />,
                            translateTransactions: <EvmTransactionHistoryAny result={result} />,
                            // Note: getMonadDefiPositions, getMonadNFTs, getMonadTokenPositions excluded
                            // They are handled internally by getMonadPortfolio
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
                            initiateX402Payment: <X402PaymentApprovalAny result={result} />,
                            // Relay Protocol - all quote tools show UI with swap/bridge details
                            getRelayQuote: typeof result === 'string' ? null : <RelaySwapApprovalAny result={result} />,
                            getRelayBridgeQuote: typeof result === 'string' ? null : <RelaySwapApprovalAny result={result} />,
                            prepareRelayTransaction: typeof result === 'string' ? null : <RelaySwapApprovalAny result={result} />,
                            executeAgenticRelaySwap: typeof result === 'string' ? null : <RelaySwapApprovalAny result={result} />,
                            // nad.fun Tools
                            searchNadFunTokens: <NadFunTokenSearchAny result={result} />,
                            // Four.meme Tools (BNB Chain)
                            searchFourMemeTokens: <FourMemeTokenSearchAny result={result} />,
                            getFourMemeRankings: <FourMemeTokenSearchAny result={result} />,
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
                                <PreviewAttachmentAny
                                  key={attachment.url}
                                  attachment={attachment}
                                  size={getAttachmentSize(attachment)}
                                />
                              ))}

                              {/* Also render images from content array if no experimental_attachments */}
                              {!message.experimental_attachments && Array.isArray(message.content) &&
                                message.content
                                  .filter(part => part.type === 'image' && typeof part.image === 'string')
                                  .map((part, index) => {
                                    // Try to extract filename from URL (R2 uploads have format: timestamp-id-filename.ext)
                                    let imageName = `Image ${index + 1}`;
                                    if (part.image && typeof part.image === 'string' && !part.image.startsWith('data:')) {
                                      try {
                                        const url = new URL(part.image);
                                        const pathname = url.pathname;
                                        // R2 URL format: /uploads/1234567890-abcdef-originalfilename.jpg
                                        const filename = pathname.split('/').pop();
                                        if (filename) {
                                          // Remove the timestamp-id prefix (format: timestamp-id-filename)
                                          const parts = filename.split('-');
                                          if (parts.length >= 3) {
                                            // Join everything after the first two parts (timestamp and id)
                                            imageName = parts.slice(2).join('-');
                                          } else {
                                            imageName = filename;
                                          }
                                        }
                                      } catch (e) {
                                        // If URL parsing fails, use default name
                                      }
                                    }
                                    const attachment = {
                                      name: imageName,
                                      url: part.image,
                                      contentType: 'image/*'
                                    };
                                    return (
                                      <PreviewAttachmentAny
                                        key={`content-image-${index}`}
                                        attachment={attachment}
                                        size={getAttachmentSize(attachment)}
                                      />
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
                            // Strip internal image URL metadata
                            textContent = textContent.replace(/\n*\[ORIGINAL_IMAGE_URLS_FOR_EDITING:[^\]]+\]/g, '').trim();

                            // Extract file attachment references like "filename.pdf (URL: https://...)"
                            const fileAttachmentRegex = /\n*(.+?\.\w+)\s*\(URL:\s*(https?:\/\/[^\s)]+)\)/g;
                            const fileAttachments: Array<{ name: string; url: string }> = [];
                            let match;
                            while ((match = fileAttachmentRegex.exec(textContent)) !== null) {
                              fileAttachments.push({ name: match[1].trim(), url: match[2].trim() });
                            }

                            // Strip file attachment metadata from visible text
                            const cleanedText = textContent.replace(/\n*.+?\.\w+\s*\(URL:\s*https?:\/\/[^\s)]+\)/g, '').trim();

                            return (
                              <>
                                {/* Render file attachments as visual cards */}
                                {fileAttachments.length > 0 && (
                                  <div className="flex flex-wrap gap-2 justify-end w-full">
                                    {fileAttachments.map((file, idx) => {
                                      const ext = file.name.split('.').pop()?.toLowerCase() || '';
                                      const contentType = ext === 'pdf' ? 'application/pdf'
                                        : ext === 'doc' || ext === 'docx' ? 'application/msword'
                                          : ext === 'xls' || ext === 'xlsx' ? 'application/vnd.ms-excel'
                                            : ext === 'mp4' || ext === 'mov' || ext === 'webm' ? `video/${ext}`
                                              : ext === 'mp3' || ext === 'wav' || ext === 'ogg' ? `audio/${ext}`
                                                : 'application/octet-stream';
                                      return (
                                        <PreviewAttachmentAny
                                          key={`file-att-${idx}`}
                                          attachment={{
                                            name: file.name,
                                            url: file.url,
                                            contentType,
                                          }}
                                          size="custom100"
                                        />
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Text bubble */}
                                {cleanedText && (
                                  <div
                                    className="dark:bg-muted dark:text-foreground bg-muted text-foreground px-3 py-3 cursor-pointer max-w-full md:max-w-max relative shadow-sm"
                                    style={{
                                      borderRadius: '15px 15px 0px 15px'
                                    }}
                                    onClick={() => {
                                      if (!isReadonly) {
                                        setActionsVisible(!actionsVisible);
                                      }
                                    }}
                                  >
                                    <MarkdownAny allMessages={allMessages}>{cleanedText}</MarkdownAny>
                                  </div>
                                )}
                              </>
                            );
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
                            // Filter out preamble narration when tools are used
                            let filteredContent = typeof message.content === 'string'
                              ? filterPreambleContent(smoothContent, true)
                              : smoothContent;

                            // Special handling: Remove markdown tables if Transaction History tool was used
                            // logic: if simplified content has table, and we have transaction tool, user wants just the UI
                            const hasOnchainTools = completedTools?.some(t =>
                              t.toolName === 'getSolanaWalletTransactions' ||
                              t.toolName === 'translateTransactions' ||
                              t.toolName === 'getEvmOnchainDataUsingZerion' ||
                              t.toolName === 'getEvmOnchainDataUsingEtherscan' ||
                              t.toolName === 'getMantleTransactionHistory' ||
                              t.toolName === 'getCronosTransactionHistory' ||
                              t.toolName === 'getMonadTransactionHistory' ||
                              t.toolName === 'getZkEVMTransactionHistory' ||
                              t.toolName === 'getCreditcoinApiData' ||
                              t.toolName === 'getVanaApiData' ||
                              t.toolName === 'getZetaApiData' ||
                              t.toolName === 'getFlowApiData' ||
                              t.toolName === 'getWormholeApiData' ||
                              t.toolName === 'getSeiApiData' ||
                              t.toolName === 'getMonadPortfolio' ||
                              t.toolName === 'getMonadDefiPositions' ||
                              t.toolName === 'getMonadNFTs' ||
                              t.toolName === 'getMonadTokenPositions'
                            );
                            if (hasOnchainTools && filteredContent) {
                              filteredContent = removeMarkdownTables(filteredContent);
                              // Also filter out system/API explanatory content
                              filteredContent = filterSystemExplanatoryContent(filteredContent, true);
                            }

                            // Don't render empty content (or just whitespace) after filtering
                            // Return null BEFORE rendering the styled container to prevent empty rounded boxes
                            if (!filteredContent || filteredContent.trim().length === 0) {
                              return null;
                            }

                            return (
                              <div
                                className="text-foreground max-w-full"
                              >
                                <div className="flex items-start justify-between gap-2 min-w-0 max-w-full">
                                  <div className="flex-1 min-w-0 max-w-full">
                                    {typeof message.content === "string" ? (
                                      <MarkdownAny allMessages={allMessages}>{filteredContent}</MarkdownAny>
                                    ) : (
                                      <div className="flex flex-col gap-2">
                                        {(message.content as any[]).map((part, index) => {
                                          if (part.type === "text") {
                                            let filteredText = filterPreambleContent(part.text, true);
                                            if (hasOnchainTools) {
                                              filteredText = filterSystemExplanatoryContent(filteredText, true);
                                            }
                                            if (!filteredText || filteredText.trim().length === 0) return null;
                                            return <MarkdownAny key={index} allMessages={allMessages}>{filteredText}</MarkdownAny>;
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
                              className="text-foreground max-w-full"
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

                              {/* separator - hidden for now */}
                              {/* <div className="text-border/60 hidden sm:block">|</div> */}

                              {/* Tool name badges - HIDDEN to prevent UI overflow issues */}
                              <motion.div
                                className="hidden"
                                initial={isPreloaded ? false : { opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: isPreloaded ? 0 : 0.3, delay: isPreloaded ? 0 : 0.9 }}
                              >
                                {completedTools.slice(0, 2).map((tool, index) => {
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
                                    // Cronos Tools
                                    getCronosBalance: "Cronos Balance",
                                    getCronosTokenBalance: "Token Balance",
                                    getCronosTransaction: "Transaction",
                                    getCronosTransactionHistory: "History",
                                    getCronosGasPrice: "Gas Price",
                                    getCronosMarketData: "Market Data",
                                    getMarketOverview: "Market Overview",
                                    getCryptoPrice: "Crypto Price",
                                    // x402 Payment Tools
                                    initiateX402Payment: "x402 Payment",
                                    getSubscriptionInfo: "Subscription Info",
                                  };

                                  return (
                                    <TooltipAny key={tool.toolCallId}>
                                      <TooltipTriggerAny asChild>
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
                                      </TooltipTriggerAny>
                                      <TooltipContentAny side="top" className="sm:hidden">
                                        <p>{toolNames[tool.toolName] || tool.toolName}</p>
                                      </TooltipContentAny>
                                    </TooltipAny>
                                  );
                                })}
                                {completedTools.length > 2 && (
                                  <motion.span
                                    className="inline-flex items-center px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-muted text-foreground/70 rounded-md border border-border whitespace-nowrap"
                                    initial={isPreloaded ? false : { opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: isPreloaded ? 0 : 0.2, delay: isPreloaded ? 0 : 1.1 }}
                                  >
                                    +{completedTools.length - 2} more
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