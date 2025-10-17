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
import { sanitizeUIMessages } from "@barzakh/shared/lib/utils/utils";
import { PaperclipIcon, StopIcon } from "../icons";
import { PreviewAttachment } from "../preview-attachment";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { User } from "next-auth";
import { cn, SearchGroup, SearchGroupId } from "@barzakh/shared/lib/utils/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ModelSelector } from "./model-selector";
import { GroupSelector } from "./GroupSelector";
import { ArrowDown, TrendingUp, Clock, Sparkles, MessageCircleMore } from "lucide-react";
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

// =====================================================================
// AWAL DARI KODE YANG DIMODIFIKASI
// =====================================================================
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
  const { width } = useWindowSize();

  // SOLUSI: Gunakan state untuk totalSuggestions untuk menghindari hydration mismatch.
  // Nilai default (6) digunakan untuk render di server dan render awal di klien.
  const [totalSuggestions, setTotalSuggestions] = useState(6);

  // SOLUSI: Gunakan useEffect untuk menyesuaikan nilai di sisi klien setelah komponen di-mount.
  // Ini aman karena hanya berjalan di browser, bukan di server.
  useEffect(() => {
    if (width < 640) {
      setTotalSuggestions(2); // Set ke nilai mobile jika layar kecil
    } else {
      setTotalSuggestions(6); // Set ke nilai desktop jika layar besar
    }
  }, [width]); // Jalankan efek ini saat komponen mount dan saat lebar layar berubah

  // Fetch AI/global suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const randomBlockchainSuggestions = BLOCKCHAIN_SUGGESTIONS.sort(() => 0.5 - Math.random());
        setAiSuggestions(randomBlockchainSuggestions);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setAiSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, []);

  const suggestions = useMemo(() => {
    const sortedHistory = [...(history || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const historyItems = sortedHistory.slice(0, totalSuggestions).map(chat => ({
      key: chat.id,
      title: chat.title,
      isHistory: true,
      icon: MessageCircleMore,
      iconColor: 'text-gray-500 dark:text-gray-400',
    }));

    const neededAiItems = totalSuggestions - historyItems.length;

    if (neededAiItems <= 0) {
      return historyItems;
    }

    const aiItems = aiSuggestions.slice(0, neededAiItems).map((s, i) => ({
      key: `ai-${i}`,
      title: s.title,
      subtitle: s.subtitle,
      isHistory: false,
      icon: Sparkles,
      iconColor: 'text-purple-500 dark:text-purple-400',
    }));

    return [...historyItems, ...aiItems];
  }, [history, aiSuggestions, totalSuggestions]);

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
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {/* Skeleton loader sekarang akan selalu merender 6 item di server (sesuai state awal) */}
          {Array.from({ length: totalSuggestions }).map((_, i) => (
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
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
// =====================================================================
// AKHIR DARI KODE YANG DIMODIFIKASI
// =====================================================================

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
        "rounded-xl p-2.5 h-fit w-fit transition-all duration-300",
        "bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700",
        "border border-neutral-200/50 dark:border-neutral-700/50",
        "hover:shadow-md hover:-translate-y-0.5 active:translate-y-0",
        "disabled:opacity-50 disabled:hover:translate-y-0"
      )}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={isLoading}
      variant="ghost"
      aria-label="Attach files"
    >
      <PaperclipIcon size={18} />
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
        "rounded-xl p-2.5 h-fit w-fit transition-all duration-300",
        "bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-900/50",
        "text-red-600 dark:text-red-400",
        "border border-red-200/50 dark:border-red-800/50",
        "hover:shadow-md hover:shadow-red-500/20 hover:-translate-y-0.5 active:translate-y-0"
      )}
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => sanitizeUIMessages(messages));
      }}
      aria-label="Stop generating"
    >
      <StopIcon size={16} />
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
  const isUploading = uploadQueue.length > 0;
  
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 5 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: 5 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <Button
        className={cn(
          "group rounded-xl p-2.5 h-fit w-fit relative overflow-hidden",
          "bg-gradient-to-br from-red-500 to-rose-600 text-white",
          "shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40",
          "hover:-translate-y-0.5 active:translate-y-0",
          "disabled:from-red-400/50 disabled:to-rose-500/50",
          "disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0",
          "transition-all duration-300 ease-out",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent",
          "before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
        )}
        onClick={(event) => {
          event.preventDefault();
          console.log("Send button clicked, uploadQueue length:", uploadQueue.length);
          submitForm();
        }}
        disabled={isDisabled}
        title={isUploading ? "Please wait for file uploads to complete" : "Send Messages"}
        aria-label={isUploading ? "Please wait for file uploads to complete" : "Send Messages"}
      >
        <SendIcon size={18} className="relative z-10" />
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
  const [previousModel, setPreviousModel] = useLocalStorage<string | null>("previousModel", null);

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

  const submitForm = useCallback(async () => {
    if (!user || !user.email) {
      toast.error("Please login to continue", { position: "bottom-center" });
      return;
    }
    if (isLoading) {
      toast.error("Please wait for the previous response to complete.");
      return;
    }
    if (uploadQueue.length > 0) {
      console.log("SubmitForm blocked: uploadQueue length:", uploadQueue.length);
      toast.info("Please wait for file uploads to complete before sending.");
      return;
    }

    window.history.replaceState({}, "", `/chat/${chatId}`);

    const imageAttachments = attachments.filter((att) =>
      att.contentType?.startsWith("image/")
    );
    const otherAttachments = attachments.filter(
      (att) => !att.contentType?.startsWith("image/")
    );

    let messageContent: any = input;
    const chatRequestOptions: ChatRequestOptions = {
      body: { group: selectedGroup },
    };

    if (imageAttachments.length > 0) {
      const imageParts = imageAttachments.map((att) => ({
        type: "image",
        image: att.url, // Send the URL directly instead of base64
      }));

      const content = [{ type: "text", text: input }];
      content.push(...(imageParts as any[]));
      messageContent = content;
      
      // Log the image URLs for debugging
      console.log("Sending images to AI:", imageParts.map(part => part.image));
      console.log("Image attachment details:", imageAttachments.map(att => ({ url: att.url, contentType: att.contentType, name: att.name })));
      
      // Check if we're sending Vercel Blob URLs
      const vercelBlobUrls = imageParts.filter(part => part.image.includes('blob.vercel-storage.com'));
      if (vercelBlobUrls.length > 0) {
        console.log("✅ Sending Vercel Blob URLs to AI:", vercelBlobUrls.map(part => part.image));
        console.log("ℹ️ Note: Some AI models may convert these URLs to their own format, but the original URLs are preserved for editing");
        
        // Store original Vercel Blob URLs for editing
        const originalUrls = vercelBlobUrls.map(part => part.image);
        console.log("🔗 Original Vercel Blob URLs stored for editing:", originalUrls);
        
        // Add original URLs to the message content for the AI to use
        content.push({
          type: "text",
          text: `\n\n[ORIGINAL_IMAGE_URLS_FOR_EDITING: ${originalUrls.join(', ')}]`
        });
      } else {
        console.warn("⚠️ No Vercel Blob URLs found in attachments - this may cause editing issues");
        console.warn("⚠️ This suggests the AI SDK has already converted the URLs to Google AI format");
      }
    }

    if (otherAttachments.length > 0) {
      // For non-image attachments, we'll read the file content and include it in the text
      // instead of using experimental_attachments which only supports PDFs
      const fileContentPromises = otherAttachments.map(async (attachment) => {
        try {
          const response = await fetch(attachment.url);
          const content = await response.text();
          return `\n\n${attachment.name}\n\`\`\`${attachment.name.split('.').pop() || 'text'}\n${content}\n\`\`\``;
        } catch (error) {
          console.error(`Failed to read file ${attachment.name}:`, error);
          return `\n\n${attachment.name} - Unable to read content`;
        }
      });
      
      const fileContents = await Promise.all(fileContentPromises);
      
      if (Array.isArray(messageContent)) {
        // Add file contents to the text part
        const textPart = messageContent.find(part => part.type === 'text');
        if (textPart) {
          textPart.text += fileContents.join('');
        }
      } else {
        // Convert string message to array format and add file contents
        messageContent = [
          { type: "text", text: input + fileContents.join('') }
        ];
      }
    }

    if (Array.isArray(messageContent)) {
      append(
        {
          role: "user",
          content: messageContent,
        },
        chatRequestOptions
      );
    } else {
      handleSubmit(undefined, chatRequestOptions);
    }

    setInput("");
    setAttachments([]);
    setLocalStorageInput("");
    
    // Clear attachments from localStorage after successful send
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`attachments-${chatId}`);
      } catch (error) {
        console.error('Failed to clear attachments from localStorage:', error);
      }
    }

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
    append,
    input,
    uploadQueue,
  ]);

  const uploadFile = async (file: File) => {
    console.log("Uploading file:", file.name, "Type:", file.type, "Size:", file.size);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        console.log("✅ File uploaded successfully to Vercel Blob Storage:", data.url);
        const attachment = {
          url: data.url,
          name: data.pathname,
          contentType: data.contentType,
        };
        console.log("Created attachment:", attachment);
        return attachment;
      }
      const { error } = await response.json();
      console.error("Upload failed:", error);
      toast.error(error);
      return null;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file. Please try again.");
      return null;
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length === 0) return;

      console.log("Starting upload for files:", files.map(f => f.name));
      console.log("Files details:", files.map(f => ({ name: f.name, type: f.type, size: f.size })));
      setUploadQueue(files.map((file) => file.name));
      try {
        const uploadedAttachments = await Promise.all(files.map(uploadFile));
        console.log("Upload results:", uploadedAttachments);
        const successfulUploads = uploadedAttachments.filter(
          Boolean
        ) as Attachment[];
        console.log("Successful uploads:", successfulUploads);
        setAttachments((prev) => {
          const newAttachments = [...prev, ...successfulUploads];
          console.log("Updated attachments:", newAttachments);
          return newAttachments;
        });
        console.log("Upload completed successfully");
      } catch (error) {
        console.error("Error uploading files:", error);
        toast.error("An error occurred during file upload.");
      } finally {
        console.log("Clearing upload queue");
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
      const wasCoding = selectedGroup === "coding";
      const isNowCoding = group.id === "coding";
      const wasImagine = selectedGroup === "imagine";
      const isNowImagine = group.id === "imagine";
      
      // Auto-switch to Claude when entering Coding mode
      if (!wasCoding && isNowCoding && selectedModelId !== "chat-model-claude") {
        // IMPORTANT: Save the group selection FIRST before reload
        setSelectedGroup(group.id);
        setLocalStorageChatMode(group.id);
        
        // Save current model to restore later
        setPreviousModel(selectedModelId);
        
        // Switch to Claude
        const { saveChatModelAsCookie } = await import("@/app/(chat)/actions");
        await saveChatModelAsCookie("chat-model-claude");
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
          window.location.reload(); // Reload to apply model change
        }, 100);
        return;
      }
      
      // Auto-switch to gpt-4.1 when entering Imagine mode
      if (!wasImagine && isNowImagine && selectedModelId !== "chat-model-large") {
        // IMPORTANT: Save the group selection FIRST before reload
        setSelectedGroup(group.id);
        setLocalStorageChatMode(group.id);
        
        // Save current model to restore later
        setPreviousModel(selectedModelId);
        
        // Switch to gpt-4.1
        const { saveChatModelAsCookie } = await import("@/app/(chat)/actions");
        await saveChatModelAsCookie("chat-model-large");
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
          window.location.reload(); // Reload to apply model change
        }, 100);
        return;
      }
      
      // Restore previous model when leaving Coding mode
      if (wasCoding && !isNowCoding && previousModel && selectedModelId === "chat-model-claude") {
        // IMPORTANT: Save the group selection FIRST before reload
        setSelectedGroup(group.id);
        setLocalStorageChatMode(group.id);
        
        const { saveChatModelAsCookie } = await import("@/app/(chat)/actions");
        await saveChatModelAsCookie(previousModel);
        setPreviousModel(null);
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
          window.location.reload(); // Reload to apply model change
        }, 100);
        return;
      }
      
      // Restore previous model when leaving Imagine mode
      if (wasImagine && !isNowImagine && previousModel && selectedModelId === "chat-model-large") {
        // IMPORTANT: Save the group selection FIRST before reload
        setSelectedGroup(group.id);
        setLocalStorageChatMode(group.id);
        
        const { saveChatModelAsCookie } = await import("@/app/(chat)/actions");
        await saveChatModelAsCookie(previousModel);
        setPreviousModel(null);
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
          window.location.reload(); // Reload to apply model change
        }, 100);
        return;
      }
      
      // Normal group selection (no reload needed)
      setSelectedGroup(group.id);
      setLocalStorageChatMode(group.id);
    },
    [setSelectedGroup, setLocalStorageChatMode, selectedGroup, selectedModelId, previousModel, setPreviousModel]
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

  // Handle paste events for files and images
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
      const items = event.clipboardData.items;
      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        console.log("Pasted files:", files.map(f => f.name));
        
        setUploadQueue(files.map((file) => file.name));
        try {
          const uploadedAttachments = await Promise.all(files.map(uploadFile));
          const successfulUploads = uploadedAttachments.filter(
            Boolean
          ) as Attachment[];
          setAttachments((prev) => [...prev, ...successfulUploads]);
          console.log("Paste upload completed successfully");
        } catch (error) {
          console.error("Paste upload failed:", error);
          toast.error("Failed to upload pasted files. Please try again.");
        } finally {
          setUploadQueue([]);
        }
      }
    },
    [uploadFile, setUploadQueue, setAttachments]
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
          <QuestionSuggestions append={append} history={history} user={user} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isAtBottom && messages.length > 0 && (
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
            className="absolute left-1/2 transform -translate-x-1/2 -top-16 z-50"
          >
            <button
              onClick={scrollMessagesToBottom}
              className={cn(
                "group relative overflow-hidden",
                "w-10 h-10 rounded-full",
                "bg-gradient-to-br from-white to-neutral-50/80 dark:from-neutral-800 dark:to-neutral-900/80",
                "backdrop-blur-xl border-2 border-neutral-200/50 dark:border-neutral-700/50",
                "text-sm font-semibold text-neutral-700 dark:text-neutral-200",
                "shadow-lg shadow-neutral-500/20 hover:shadow-xl hover:shadow-neutral-500/30",
                "hover:border-neutral-300/60 dark:hover:border-neutral-600/60",
                "transform transition-all duration-300 ease-out",
                "hover:-translate-y-1 active:translate-y-0",
                "before:absolute before:inset-0 before:bg-gradient-to-br",
                "before:from-neutral-100/30 before:to-transparent dark:before:from-neutral-700/30",
                "before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-300"
              )}
              aria-label="Scroll to bottom"
            >
              <span className="relative z-10 flex items-center justify-center">
                  <ArrowDown className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110" />
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "relative w-full flex flex-col rounded-3xl transition-all duration-300",
          "bg-gradient-to-b from-white to-neutral-50/80 dark:from-neutral-900 dark:to-neutral-950/80",
          "backdrop-blur-xl border-2 shadow-lg",
          isFocused
            ? "border-primary/50 shadow-[0_0_0_4px_rgba(239,68,68,0.1)] dark:shadow-[0_0_0_4px_rgba(239,68,68,0.15)] shadow-xl"
            : "border-neutral-200/80 dark:border-neutral-800/80 hover:border-neutral-300 dark:hover:border-neutral-700",
          "overflow-hidden"
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <AnimatePresence>
          {(() => {
            console.log("Rendering attachments:", attachments.length, "upload queue:", uploadQueue.length);
            return (attachments.length > 0 || uploadQueue.length > 0);
          })() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="flex flex-wrap gap-2 sm:gap-3 px-4 py-4 border-b border-neutral-200/50 dark:border-neutral-800/50 bg-neutral-50/30 dark:bg-neutral-950/30"
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

        <div className="relative flex items-end w-full px-2 pt-3 pb-2">
          <Textarea
            ref={textareaRef}
            placeholder={
              messages.length > 0 ? "Reply Barzakh..." : "Ask Barzakh"
            }
            value={input}
            onChange={handleInput}
            className={cn(
              "pl-4 pr-14 py-3.5 text-base",
              "bg-transparent border-0 focus:ring-0 focus-visible:ring-0",
              "placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
              "resize-none"
            )}
            style={{ maxHeight: `${MAX_HEIGHT}px` }}
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                console.log("Enter pressed, uploadQueue length:", uploadQueue.length);
                // Only allow sending if no files are uploading
                if (uploadQueue.length === 0) {
                  submitForm();
                } else {
                  console.log("Blocked: Files still uploading");
                  toast.info("Please wait for file uploads to complete before sending.");
                }
              }
            }}
            onPaste={handlePaste}
          />
          <div className="absolute right-4 bottom-3.5 flex items-center gap-2">
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
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,image/ico,application/pdf,text/plain,text/markdown,text/csv,application/json,application/javascript,text/javascript,text/x-typescript,application/x-typescript,text/html,text/css,application/xml,text/xml,text/yaml,text/x-python,text/x-java-source,text/x-c,text/x-c++,text/x-csharp,text/x-php,text/x-ruby,text/x-go,text/x-rust,text/x-swift,text/x-kotlin,text/x-sql,text/x-shellscript,text/x-batch,text/x-powershell,application/x-zip,application/x-rar,application/x-7z,application/x-tar,application/gzip,text/x-dockerfile,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.html,.css,.scss,.sass,.less,.vue,.svelte,.json,.xml,.yaml,.yml,.toml,.ini,.cfg,.conf,.txt,.md,.csv,.tsv,.log,.rtf,.sql,.sh,.bat,.ps1,.dockerfile,.gitignore,.env"
        />



        <div className="flex items-center justify-between w-full px-3 pb-3 pt-1 border-t border-neutral-200/50 dark:border-neutral-800/50 bg-gradient-to-b from-transparent to-neutral-50/50 dark:to-neutral-950/50">
          <div className="flex flex-row gap-2 items-center">
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
            {!isReadonly && <ModelSelector selectedModelId={selectedModelId} disabled={selectedGroup === "coding" || selectedGroup === "imagine"} />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);