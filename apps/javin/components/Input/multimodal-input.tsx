"use client";
import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from "ai";
import type React from "react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { sanitizeUIMessages } from "@javin/shared/lib/utils/utils";
import { PaperclipIcon, StopIcon } from "../icons";
import { PreviewAttachment } from "../preview-attachment";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { User } from "next-auth";
import { cn, SearchGroup, SearchGroupId } from "@javin/shared/lib/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ModelSelector } from "./model-selector";
import { GroupSelector } from "./GroupSelector";
import { CornerLeftDown, TrendingUp, Clock, Sparkles, MessageCircle } from "lucide-react";
import type { Chat as ChatHistory } from "@/lib/db/schema";

interface EnhancedSuggestion {
  title: string;
  subtitle: string;
  category: 'frequent' | 'recent' | 'trending' | 'followup' | 'predefined';
  confidence: number;
  context?: string;
  relatedTopics?: string[];
  lastUsed?: Date;
  frequency?: number;
}

const BLOCKCHAIN_SUGGESTIONS: EnhancedSuggestion[] = [
  {
    title: 'Explain how blockchain works',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.85,
  },
  {
    title: 'What is the difference between Bitcoin and Ethereum?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.85,
  },
  {
    title: 'What are smart contracts?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.85,
  },
  {
    title: 'How do I create my own cryptocurrency?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.8,
  },
  {
    title: 'What is DeFi (Decentralized Finance)?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.8,
  },
  {
    title: 'Explain the concept of NFTs',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.8,
  },
];

const QuestionSuggestions = ({
  append,
  history,
  user,
}: {
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  history: ChatHistory[] | undefined;
  user: User | undefined;
}) => {
  const [aiSuggestions, setAiSuggestions] = useState<EnhancedSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);

  // Fetch AI/global suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        // Using BLOCKCHAIN_SUGGESTIONS as the primary source for AI suggestions
        const randomBlockchainSuggestions = BLOCKCHAIN_SUGGESTIONS.sort(() => 0.5 - Math.random());
        setAiSuggestions(randomBlockchainSuggestions);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setAiSuggestions([]); // Set to empty on error
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, []);

  // Combine history and AI suggestions into a single list of 4
  const suggestions = useMemo(() => {
    const sortedHistory = [...(history || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Take up to 4 of the most recent history items
    const historyItems = sortedHistory.slice(0, 4).map(chat => ({
      key: chat.id,
      title: chat.title,
      isHistory: true,
      icon: Clock,
      iconColor: 'text-gray-500 dark:text-gray-400',
    }));

    const neededAiItems = 4 - historyItems.length;

    if (neededAiItems <= 0) {
      return historyItems;
    }

    // Fill the rest with AI suggestions
    const aiItems = aiSuggestions.slice(0, neededAiItems).map((s, i) => ({
      key: `ai-${i}`,
      title: s.title,
      subtitle: s.subtitle,
      isHistory: false,
      icon: Sparkles,
      iconColor: 'text-purple-500 dark:text-purple-400',
    }));
    
    return [...historyItems, ...aiItems];
  }, [history, aiSuggestions]);

  const handleSuggestionClick = (suggestion: { key: string; title: string; isHistory: boolean; }) => {
    if (!user) {
      toast.error("Please log in to start a conversation.", {
        position: "top-center",
        duration: 3000,
      });
      return; 
    }

    const chatRequestOptions: ChatRequestOptions = {};

    if (suggestion.isHistory) {
      chatRequestOptions.body = {
        history_for_context_id: suggestion.key
      };
    }

    append(
      {
        content: suggestion.title,
        role: "user",
      },
      chatRequestOptions
    );
  };
  
  if (isLoadingSuggestions && (!history || history.length === 0)) {
    // Show skeleton loader only on initial load for a better UX
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 bg-muted/30 rounded-lg border border-border/20 animate-pulse h-[68px]">
              <div className="h-4 bg-muted rounded mb-2 w-3/4" />
              <div className="h-3 bg-muted/60 rounded w-1/2" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }
  
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="mb-4 w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {suggestions.map((suggestion, index) => {
           const IconComponent = suggestion.icon;
           return (
            <motion.button
              key={suggestion.key}
              type="button"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "group p-3 text-left rounded-lg border cursor-pointer transition-all duration-200 text-sm",
                "bg-muted/50 hover:bg-muted border-border/30",
                "hover:border-border/60 hover:shadow-md",
                "transform hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              <div className="flex items-start gap-2">
                <IconComponent className={cn("h-4 w-4 mt-0.5 shrink-0", suggestion.iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground/90 truncate pr-2">
                    {suggestion.title}
                  </p>
                  {suggestion.subtitle && (
                    <p className="text-xs text-muted-foreground/80 mt-1">
                      {suggestion.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

const SendIcon = ({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn(className)}
  >
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="m22 2-11 11" />
  </svg>
);

function PureAttachmentsButton({
  fileInputRef,
  isLoading,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  isLoading: boolean;
}) {
  return (
    <Button
      className={cn(
        "rounded-full p-2 h-fit w-fit transition-all duration-200",
        "bg-neutral-200/60 hover:bg-neutral-300/60 dark:bg-neutral-800/60 dark:hover:bg-neutral-700/60",
        "hover:scale-110 active:scale-95"
      )}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={isLoading}
      variant="ghost"
      aria-label="Attach files"
    >
      <PaperclipIcon size={16} />
    </Button>
  );
}
const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
}) {
  return (
    <Button
      className={cn(
        "rounded-full p-2 h-fit w-fit transition-all duration-200",
        "bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400",
        "hover:scale-110 active:scale-95"
      )}
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
      aria-label="Stop generating"
    >
      <StopIcon size={14} />
    </Button>
  );
}
const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  const isDisabled = input.length === 0 || uploadQueue.length > 0;
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Button
        className={cn(
          "group rounded-full p-2.5 h-fit w-fit",
          "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg",
          "hover:shadow-xl",
          "disabled:from-red-400 disabled:to-rose-500 dark:disabled:from-red-800 dark:disabled:to-rose-900",
          "disabled:shadow-none disabled:cursor-not-allowed",
          "transition-all duration-300 ease-in-out"
        )}
        onClick={(event) => {
          event.preventDefault();
          submitForm();
        }}
        disabled={isDisabled}
        aria-label="Send Messages"
      >
        <SendIcon size={16} />
      </Button>
    </motion.div>
  );
}
const SendButton = memo(PureSendButton);

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  isLoading,
  isReadonly,
  selectedModelId,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  user,
  selectedGroup,
  setSelectedGroup,
  isAtBottom,
  history,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isReadonly: boolean;
  selectedModelId: string;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  className?: string;
  user?: User;
  selectedGroup: SearchGroupId;
  setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
  isAtBottom: boolean;
  history: ChatHistory[] | undefined;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const MAX_HEIGHT = 300;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
  const [isFocused, setIsFocused] = useState(false);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );
  const [localStorageChatMode, setLocalStorageChatMode] =
    useLocalStorage<SearchGroupId>("chatMode", "search");

  const showSuggestions = messages.length === 0 && !input;

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        MAX_HEIGHT
      )}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  useEffect(() => {
    if (width > 768) {
      textareaRef.current?.focus();
    }
  }, [width]);

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
      adjustHeight();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
    adjustHeight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, setLocalStorageInput]);

  useEffect(() => {
    if (localStorageChatMode) {
      setSelectedGroup(localStorageChatMode);
    }
  }, [localStorageChatMode, setSelectedGroup]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const submitForm = useCallback(() => {
    if (!user || !user.email) {
      toast.error("Please login to continue", { position: "bottom-center" });
      return;
    }
    if (isLoading) {
      toast.error("Please wait for the previous response to complete.");
      return;
    }

    window.history.replaceState({}, "", `/chat/${chatId}`);

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/json",
      "application/javascript",
      "text/javascript",
      "text/x-typescript",
      "application/x-typescript",
      "text/html",
      "text/css",
      "application/xml",
      "text/xml",
    ];

    const supportedAttachments = attachments.filter((att) =>
      allowedTypes.includes(att.contentType ?? "")
    );

    handleSubmit(undefined, {
      body: { group: selectedGroup },
      experimental_attachments: supportedAttachments,
    });

    setInput("");
    setAttachments([]);
    setLocalStorageInput("");

    if (textareaRef.current) {
      textareaRef.current.value = "";
      resetHeight();
    }

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    user,
    isLoading,
    chatId,
    handleSubmit,
    selectedGroup,
    attachments,
    setAttachments,
    setLocalStorageInput,
    width,
    setInput,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        return {
          url: data.url,
          name: data.pathname,
          contentType: data.contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (error) {
      toast.error("Failed to upload file. Please try again.");
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      setUploadQueue(files.map((file) => file.name));
      try {
        const uploadedAttachments = await Promise.all(files.map(uploadFile));
        const successfulUploads = uploadedAttachments.filter(
          Boolean
        ) as Attachment[];
        setAttachments((prev) => [...prev, ...successfulUploads]);
      } catch (error) {
        console.error("Error uploading files:", error);
        toast.error("An error occurred during file upload.");
      } finally {
        setUploadQueue([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [setAttachments]
  );

  const handleGroupSelect = useCallback(
    async (group: SearchGroup) => {
      setSelectedGroup(group.id);
      setLocalStorageChatMode(group.id);
    },
    [setSelectedGroup, setLocalStorageChatMode]
  );

  const scrollMessagesToBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("chat-scroll");
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const removeAttachment = useCallback(
    (indexToRemove: number) => {
      setAttachments((prev) =>
        prev.filter((_, index) => index !== indexToRemove)
      );
    },
    [setAttachments]
  );

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative w-full flex flex-col gap-2 transition-all duration-300 !font-sans",
        className
      )}
    >
      <AnimatePresence>
        {showSuggestions && (
          // MODIFIKASI: Meneruskan prop 'user' ke komponen QuestionSuggestions
          <QuestionSuggestions append={append} history={history} user={user} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
              bounce: 0.25,
            }}
            className="absolute right-0 bottom-32 z-50" 
          >
            <button
              onClick={scrollMessagesToBottom}
              className={cn(
                "group relative",
                "px-4 py-2 rounded-lg",
                "bg-white dark:bg-neutral-800",
                "text-sm font-medium text-neutral-700 dark:text-neutral-200",
                "border border-neutral-200 dark:border-neutral-700",
                "shadow-lg hover:shadow-xl",
                "hover:bg-neutral-50 dark:hover:bg-neutral-700",
                "transform transition-all duration-300 ease-out",
                "hover:-translate-y-0.5 active:translate-y-0",
                "overflow-hidden"
              )}
              aria-label="Scroll to bottom"
            >
              <span className="relative z-10 flex items-center gap-2">
                <CornerLeftDown className="h-4 w-4 opacity-80 group-hover:opacity-100 transition-opacity" />
                <span>Latest Messages</span>
              </span>

              <span
                className={cn(
                  "absolute inset-0 rounded-lg z-0",
                  "bg-gradient-to-r from-rose-100/50 to-rose-200/50 dark:from-rose-900/30 dark:to-rose-800/30",
                  "opacity-0 group-hover:opacity-100",
                  "transition-opacity duration-300"
                )}
              />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "relative w-full flex flex-col gap-2 rounded-2xl transition-all duration-300",
          "bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-sm",
          "border border-neutral-300/50 dark:border-neutral-700/50",
          isFocused
            ? "shadow-[0_0_0_4px_rgba(239,68,68,0.2)] dark:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]"
            : "",
          "p-2"
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <AnimatePresence>
          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex flex-row gap-2 sm:gap-3 overflow-x-auto custom-scrollbar px-3 py-3 mx-1"
              style={{
                paddingTop: "12px",
                paddingBottom: "12px",
                marginTop: "-4px",
                marginBottom: "-4px",
              }}
            >
              {attachments.map((attachment, index) => (
                <motion.div
                  key={`${attachment.url}-${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <PreviewAttachment
                    attachment={attachment}
                    onRemove={() => removeAttachment(index)}
                    size={width && width < 640 ? "small" : "default"}
                  />
                </motion.div>
              ))}

              {uploadQueue.map((filename, index) => (
                <motion.div
                  key={`uploading-${filename}-${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -20 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <PreviewAttachment
                    attachment={{ url: "", name: filename, contentType: "" }}
                    isUploading={true}
                    size={width && width < 640 ? "small" : "default"}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative flex items-end w-full">
          <Textarea
            ref={textareaRef}
            placeholder={
              messages.length > 0 ? "Reply Barzakh..." : "Ask Barzakh"
            }
            value={input}
            onChange={handleInput}
            className="pl-3 pr-12 py-3"
            style={{ maxHeight: `${MAX_HEIGHT}px` }}
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitForm();
              }
            }}
          />
          <div className="absolute right-2.5 bottom-2.5 flex items-center">
            {isLoading ? (
              <StopButton stop={stop} setMessages={setMessages} />
            ) : (
              <AnimatePresence>
                {(input.length > 0 || attachments.length > 0) && (
                  <SendButton
                    input={input}
                    submitForm={submitForm}
                    uploadQueue={uploadQueue}
                  />
                )}
              </AnimatePresence>
            )}
          </div>
        </div>

        <input
          type="file"
          className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
          ref={fileInputRef}
          multiple
          onChange={handleFileChange}
          tabIndex={-1}
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,text/plain,text/markdown,text/csv,application/json,application/javascript,text/javascript,text/x-typescript,application/x-typescript,text/html,text/css,application/xml,text/xml"
        />

        

        <div className="flex items-center justify-between w-full">
          <div className="flex flex-row gap-1.5 items-center">
            <AttachmentsButton
              fileInputRef={fileInputRef}
              isLoading={isLoading}
            />
            <GroupSelector
              selectedGroupId={selectedGroup}
              onGroupSelect={handleGroupSelect}
            />
          </div>
          <div className="flex flex-row gap-2 items-center">
            {!isReadonly && <ModelSelector selectedModelId={selectedModelId} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);