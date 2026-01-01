"use client";
import Link from "next/link";
import type { Attachment, ChatRequestOptions, CreateMessage, Message } from "ai";
import type React from "react";
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
  createElement,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from "react";
import { toast } from "sonner";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import { sanitizeUIMessages } from "@barzakh/shared/lib/utils/utils";
import { StopIcon } from "../icons";
import { PreviewAttachment } from "../preview-attachment";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { User } from "next-auth";
import { cn, SearchGroup, SearchGroupId } from "@barzakh/shared/lib/utils/utils";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import { ModelSelector } from "./model-selector";
import { GroupSelector } from "./GroupSelector";
import {
  ArrowDown,
  Plus,
} from "lucide-react";
import type { Chat as ChatHistory } from "@/lib/db/schema";
import { QuestionSuggestions } from "./question-suggestions";

// =====================================================================
// START OF MODIFIED CODE
// =====================================================================

// Chain-specific groups - these do NOT force a model, user can choose any
const CHAIN_FORCED_GROUPS: ReadonlyArray<SearchGroupId> = [
  "on_chain",
  "wormhole",
  "sei",
  "creditcoin",
  "vana",
  "flow",
  "zeta",
  "aptos",
  "monad",
  "solana",
] as const;

// Only coding and imagine force a specific model
// Chain-specific tools use the user's selected model
const FORCED_MODEL_BY_GROUP: Partial<Record<SearchGroupId, string>> = {
  coding: "chat-model-claude",
  imagine: "chat-model-large",
};

// Only lock model selector for coding and imagine
const MODEL_SELECTOR_LOCKED_GROUPS: ReadonlySet<SearchGroupId> = new Set([
  "coding",
  "imagine",
]);

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk as any);
  }

  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa(binary);
  }

  throw new Error("Base64 conversion is not supported in this environment.");
};
// =====================================================================
// END OF MODIFIED CODE
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
        "rounded-full p-2 h-9 w-9 transition-all duration-200",
        "text-neutral-500 dark:text-neutral-400",
        "hover:text-neutral-800 dark:hover:text-neutral-100",
        "hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50",
        "disabled:opacity-50"
      )}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={isLoading}
      variant="ghost"
      aria-label="Attach files"
    >
      {createElement(Plus as any, { size: 20, strokeWidth: 2 })}
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
        "group rounded-xl p-2.5 h-fit w-fit relative overflow-hidden",
        "bg-gradient-to-br from-gray-800 to-gray-900 text-white",
        "dark:from-red-500 dark:to-rose-600",
        "shadow-lg shadow-gray-800/30 hover:shadow-xl hover:shadow-gray-800/40",
        "dark:shadow-red-500/30 dark:hover:shadow-xl dark:hover:shadow-red-500/40",
        "hover:-translate-y-0.5 active:translate-y-0"
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
      key="send-button"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1] // Smooth ease-out curve
      }}
    >
      <Button
        className={cn(
          "group rounded-xl p-2.5 h-fit w-fit relative overflow-hidden",
          "bg-gradient-to-br from-gray-800 to-gray-900 text-white",
          "dark:from-red-500 dark:to-rose-600",
          "shadow-lg shadow-gray-800/30 hover:shadow-xl hover:shadow-gray-800/40",
          "dark:shadow-red-500/30 dark:hover:shadow-xl dark:hover:shadow-red-500/40",
          "hover:-translate-y-0.5 active:translate-y-0",
          "disabled:from-gray-400/50 disabled:to-gray-500/50",
          "dark:disabled:from-red-400/50 dark:disabled:to-rose-500/50",
          "disabled:shadow-none disabled:cursor-not-allowed disabled:hover:translate-y-0",
          "transition-all duration-300 ease-out",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent",
          "before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300"
        )}
        onClick={(event) => {
          event.preventDefault();
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
  onModelChange,
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
  onSubmitMessage,
  disableSuggestions,
}: {
  chatId: string;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isReadonly: boolean;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
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
  onSubmitMessage?: () => void;
  disableSuggestions?: boolean;
}) {
  // Early return for read-only mode - ONLY for guests (not logged in)
  // Logged-in users viewing shared chats should still be able to interact (fork the chat)
  if (isReadonly && !user?.id) {
    return (
      <div className="flex items-center justify-center py-4 px-6">
        <p className="text-sm text-muted-foreground text-center">
          This is a shared conversation. Sign in to start your own chat.
        </p>
      </div>
    );
  }

  // Defensive fallback for messages to handle ai SDK v5 useChat hook behavior
  const safeMessages = messages ?? [];

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  const showSuggestions = messages.length === 0 && !input && !disableSuggestions;

  // Dynamic rotating placeholders with typewriter effect
  const placeholders = useMemo(() => [
    // Web Search - Advanced
    "Research MEV strategies on Ethereum",
    "Find alpha on upcoming token unlocks",
    // On-chain Analytics - Advanced
    "Trace smart money accumulation patterns",
    "Detect unusual DEX volume spikes",
    // Imagine (AI Image Generation)
    "Generate cyberpunk wallet interface",
    "Design tokenomics infographic",
    // Sei Blockchain - Advanced
    "Analyze Sei parallel execution metrics",
    // Wormhole Cross-chain - Advanced
    "Compare Wormhole vs LayerZero flows",
    // Coding & Smart Contracts - Advanced
    "Audit this flash loan contract",
    "Optimize gas in my ERC-4337 code",
    // Research & Analysis - Advanced
    "Model impermanent loss scenarios",
    "Backtest this trading strategy",
  ], []);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    // Only animate when there are no messages, input is empty, and not focused
    if (messages.length > 0 || input || isFocused) {
      if (messages.length > 0) {
        setDisplayedText("Reply Barzakh");
      }
      return;
    }

    const currentText = placeholders[placeholderIndex];
    let timeout: NodeJS.Timeout;

    if (isTyping) {
      // Typing effect
      if (displayedText.length < currentText.length) {
        timeout = setTimeout(() => {
          setDisplayedText(currentText.slice(0, displayedText.length + 1));
        }, 50); // Typing speed
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000); // Pause before deleting
      }
    } else {
      // Deleting effect
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 30); // Deleting speed (faster than typing)
      } else {
        // Finished deleting, move to next placeholder
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        setIsTyping(true);
      }
    }

    return () => clearTimeout(timeout);
  }, [messages.length, input, isFocused, placeholders, placeholderIndex, displayedText, isTyping]);

  const currentPlaceholder = messages.length > 0
    ? "Reply Barzakh"
    : displayedText || placeholders[0].charAt(0);

  const imageInlineCacheRef = useRef<Record<string, string>>({});
  const imageInlinePromisesRef = useRef<
    Record<string, Promise<string | null> | undefined>
  >({});

  const convertToDataUri = useCallback(
    async (attachment: Attachment) => {
      try {
        const response = await fetch("/api/proxy-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: attachment.url,
            forceDownload: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const base64String = arrayBufferToBase64(arrayBuffer);
        const mimeType =
          response.headers.get("content-type") ||
          attachment.contentType ||
          blob.type ||
          "image/jpeg";

        return `data:${mimeType};base64,${base64String}`;
      } catch (error) {
        console.error(
          `Failed to inline image attachment ${attachment.name}:`,
          error
        );
        return null;
      }
    },
    []
  );

  const ensureInlineImage = useCallback(
    (attachment: Attachment) => {
      if (!attachment?.contentType?.startsWith("image/")) {
        return Promise.resolve<string | null>(null);
      }

      const key = attachment.url;
      if (!key) {
        return Promise.resolve<string | null>(null);
      }

      const cached = imageInlineCacheRef.current[key];
      if (cached) {
        return Promise.resolve(cached);
      }

      if (imageInlinePromisesRef.current[key]) {
        return imageInlinePromisesRef.current[key];
      }

      const promise = convertToDataUri(attachment)
        .then((dataUri) => {
          if (dataUri) {
            imageInlineCacheRef.current = {
              ...imageInlineCacheRef.current,
              [key]: dataUri,
            };
          }
          return dataUri;
        })
        .catch((error) => {
          console.error("Inline image preparation failed:", error);
          return null;
        });

      const trackedPromise = promise.finally(() => {
        delete imageInlinePromisesRef.current[key];
      });

      imageInlinePromisesRef.current[key] = trackedPromise;
      return trackedPromise;
    },
    [convertToDataUri]
  );

  useEffect(() => {
    if (attachments.length === 0) return;

    attachments.forEach((attachment) => {
      if (!attachment?.contentType?.startsWith("image/")) return;
      ensureInlineImage(attachment);
    });
  }, [attachments, ensureInlineImage]);

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

  // Sync model with forced model when component mounts and group is a forced-model group
  // This ensures that when user returns after closing browser, the correct model is displayed
  useEffect(() => {
    const forcedModel = FORCED_MODEL_BY_GROUP[selectedGroup];

    if (forcedModel) {
      // If current group requires a forced model but the displayed model is different
      if (selectedModelId !== forcedModel) {
        // Save current model as previous (if not already in a forced group)
        if (!previousModel) {
          setPreviousModel(selectedModelId);
        }
        // Update the displayed model to match the forced model
        onModelChange?.(forcedModel);
      }
    } else {
      // Current group doesn't require a forced model
      // If we have a previousModel saved, it means user was previously in a forced group
      // and we should restore their preferred model
      if (previousModel && selectedModelId !== previousModel) {
        // Check if the current model is one of the forced models (meaning it was set by a group)
        const forcedModelValues = Object.values(FORCED_MODEL_BY_GROUP);
        if (forcedModelValues.includes(selectedModelId)) {
          onModelChange?.(previousModel);
          // Also update the cookie to persist the restoration
          fetch("/api/set-model-cookie", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: previousModel }),
          });
        }
        setPreviousModel(null);
      }
    }
    // Only run on mount and when selectedGroup changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const submitForm = useCallback(async () => {
    if (!user?.id) {
      toast.error("Please login to continue", { position: "bottom-center" });
      return;
    }
    if (isLoading) {
      toast.error("Please wait for the previous response to complete.");
      return;
    }
    if (uploadQueue.length > 0) {
      toast.info("Please wait for file uploads to complete before sending.");
      return;
    }

    window.history.replaceState({}, "", `/c/${chatId}`);

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
      const cachedImages: Array<{ dataUri: string; originalUrl: string }> = [];
      const pendingAttachments: Attachment[] = [];

      imageAttachments.forEach((attachment) => {
        const dataUri = imageInlineCacheRef.current[attachment.url];
        if (dataUri) {
          cachedImages.push({
            dataUri,
            originalUrl: attachment.url,
          });
        } else {
          pendingAttachments.push(attachment);
        }
      });

      let newlyPrepared: Array<{ dataUri: string; originalUrl: string }> = [];

      if (pendingAttachments.length > 0) {
        const prepared = await Promise.all(
          pendingAttachments.map((attachment) => ensureInlineImage(attachment))
        );

        const failedAttachments: Attachment[] = [];

        newlyPrepared = prepared
          .map((dataUri, index) => {
            if (!dataUri) {
              failedAttachments.push(pendingAttachments[index]);
              return null;
            }

            return {
              dataUri,
              originalUrl: pendingAttachments[index].url,
            };
          })
          .filter(Boolean) as Array<{ dataUri: string; originalUrl: string }>;

        if (failedAttachments.length > 0) {
          const failedNames = failedAttachments
            .map((attachment) => attachment.name || attachment.url)
            .filter(Boolean)
            .join(", ");

          toast.error(
            `Failed to process ${failedNames}. Please try re-uploading the image.`,
            { position: "bottom-center" }
          );
        }
      }

      const successfulImages = [...cachedImages, ...newlyPrepared];

      if (successfulImages.length === 0) {
        toast.error(
          "Unable to inline any of the attached images. Please try again.",
          { position: "bottom-center" }
        );
        return;
      }

      const content = [{ type: "text", text: input }];
      const imageParts = successfulImages.map(({ dataUri }) => ({
        type: "image",
        image: dataUri,
      }));

      content.push(...(imageParts as any[]));
      messageContent = content;

      const originalUrls = successfulImages.map((item) => item.originalUrl);

      content.push({
        type: "text",
        text: `\n\n[ORIGINAL_IMAGE_URLS_FOR_EDITING: ${originalUrls.join(
          ", "
        )}]`,
      });
    }

    if (otherAttachments.length > 0) {
      // For non-image attachments, we'll read the file content and include it in the text
      // instead of using experimental_attachments which only supports PDFs
      const fileContentPromises = otherAttachments.map(async (attachment) => {
        const attachmentName = attachment.name || 'file';
        try {
          // Try direct fetch first
          let response = await fetch(attachment.url);

          // If direct fetch fails (CORS), try via proxy
          if (!response.ok) {
            response = await fetch('/api/proxy-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ fileUrl: attachment.url }),
            });
          }

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }

          const content = await response.text();
          return `\n\n${attachmentName}\n\`\`\`${attachmentName.split('.').pop() || 'text'}\n${content}\n\`\`\``;
        } catch (error) {
          console.error(`Failed to read file ${attachmentName}:`, error);
          return `\n\n${attachmentName} - Unable to read content (URL: ${attachment.url})`;
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
          content: messageContent as any,
        },
        chatRequestOptions
      );
    } else {
      handleSubmit(undefined, chatRequestOptions);
    }

    // Scroll to bottom when message is sent
    onSubmitMessage?.();

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
    ensureInlineImage,
  ]);

  const uploadFile = async (file: File) => {

    // Client-side size validation (25MB limit for Cloudflare R2)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`File "${file.name}" is too large (${sizeMB}MB). Maximum size is 25MB.`);
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        const attachment = {
          url: data.url,
          name: data.pathname,
          contentType: data.contentType,
        };
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

      setUploadQueue(files.map((file) => file.name));
      try {
        const uploadedAttachments = await Promise.all(files.map(uploadFile));
        const successfulUploads = uploadedAttachments.filter(
          Boolean
        ) as Attachment[];
        setAttachments((prev) => {
          const newAttachments = [...prev, ...successfulUploads];
          return newAttachments;
        });
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
      const currentForcedModel = FORCED_MODEL_BY_GROUP[selectedGroup as SearchGroupId];
      const nextForcedModel = FORCED_MODEL_BY_GROUP[group.id as SearchGroupId];

      const updateGroupState = () => {
        setSelectedGroup(group.id as SearchGroupId);
        setLocalStorageChatMode(group.id as SearchGroupId);
      };

      // Entering or switching to a forced-model group
      if (nextForcedModel) {
        if (!previousModel) {
          setPreviousModel(selectedModelId);
        }

        updateGroupState();

        if (selectedModelId !== nextForcedModel) {
          await fetch("/api/set-model-cookie", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: nextForcedModel }),
          });
          onModelChange?.(nextForcedModel);
        }

        return;
      }

      // Leaving a forced-model group
      if (currentForcedModel) {
        updateGroupState();

        if (previousModel) {
          if (previousModel !== selectedModelId) {
            await fetch("/api/set-model-cookie", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ model: previousModel }),
            });
            onModelChange?.(previousModel);
          }
          setPreviousModel(null);
        }
        return;
      }

      // Normal group selection
      updateGroupState();
    },
    [
      previousModel,
      selectedGroup,
      selectedModelId,
      onModelChange,
      setLocalStorageChatMode,
      setPreviousModel,
      setSelectedGroup,
    ]
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

        setUploadQueue(files.map((file) => file.name));
        try {
          const uploadedAttachments = await Promise.all(files.map(uploadFile));
          const successfulUploads = uploadedAttachments.filter(
            Boolean
          ) as Attachment[];
          setAttachments((prev) => [...prev, ...successfulUploads]);
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

  const handleModelSelect = useCallback(
    (modelId: string) => {
      onModelChange?.(modelId);
    },
    [onModelChange]
  );

  return (
    <motion.div
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
                {createElement(ArrowDown as any, { className: "h-4 w-4 opacity-70 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110" })}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "relative w-full flex flex-col rounded-2xl transition-all duration-300",
          "bg-gradient-to-b from-white to-neutral-50/80 dark:from-neutral-900 dark:to-neutral-950/80",
          "backdrop-blur-xl border-1 shadow-lg",
          "border-neutral-200/80 dark:border-neutral-800/80",
          "overflow-hidden"
        )}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <AnimatePresence>
          {(() => {
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
                      size={isMounted && width < 640 ? "small" : "default"}
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
                      size={isMounted && width < 640 ? "small" : "default"}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
        </AnimatePresence>

        <div className="relative flex items-end w-full px-2 pt-2 pb-2">
          {/* Custom animated placeholder - only when not focused */}
          {!input && messages.length === 0 && !isFocused && (
            <div className="absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center text-neutral-500 dark:text-neutral-500 text-base">
              <span>{displayedText}</span>
            </div>
          )}
          <Textarea
            ref={textareaRef}
            placeholder={messages.length > 0 ? "Reply Barzakh" : (isFocused ? "Ask Barzakh" : "")}
            value={input}
            onChange={handleInput}
            className={cn(
              "pl-4 pr-14 py-3.5 text-base",
              "bg-transparent border-0 focus:ring-0 focus-visible:ring-0",
              "placeholder:text-neutral-500 dark:placeholder:text-neutral-500",
              "resize-none"
            )}
            style={{ maxHeight: `${MAX_HEIGHT}px` }}
            rows={1}
            onKeyDown={(event) => {
              // On mobile/tablet (width < 768), Enter adds a new line
              // On desktop, Enter sends the message (Shift+Enter for new line)
              const isDesktop = width && width >= 768;

              if (event.key === "Enter" && !event.shiftKey && isDesktop) {
                event.preventDefault();
                // Only allow sending if no files are uploading
                if (uploadQueue.length === 0) {
                  submitForm();
                } else {
                  toast.info("Please wait for file uploads to complete before sending.");
                }
              }
            }}
            onPaste={handlePaste}
          />
          <div className="absolute right-3 sm:right-4 bottom-3.5 flex items-center gap-2">
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

        <AnimatePresence>
          {((isMounted && width < 768) || messages.length > 0 || input.length > 0 || attachments.length > 0) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between w-full px-2 pb-2 pt-1">
                <div className="flex flex-row gap-1 items-center">
                  <AttachmentsButton
                    fileInputRef={fileInputRef}
                    isLoading={isLoading}
                  />
                  <GroupSelector
                    selectedGroupId={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                  />
                </div>
                <div className="flex flex-row gap-1 items-center">
                  {/* Show model selector unless user is a guest (not logged in) on a readonly chat */}
                  {!(isReadonly && !user?.id) && (
                    <ModelSelector
                      selectedModelId={selectedModelId}
                      onModelSelect={handleModelSelect}
                      disabled={MODEL_SELECTOR_LOCKED_GROUPS.has(selectedGroup)}
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>

      <p className="hidden md:block text-center text-xs text-neutral-500 dark:text-neutral-500 py-2">
        Barzakh can make mistakes, so double-check it
      </p>

      {messages.length === 0 && input.length === 0 && (
        <div className="relative w-full flex justify-center items-center px-4 py-2 md:fixed md:bottom-4 md:left-0 md:py-0 md:pointer-events-none md:z-0">
          <div className="text-[10px] md:text-xs text-center text-neutral-500 dark:text-neutral-500 max-w-3xl leading-tight md:pointer-events-auto">
            <span>By sending a message to Barzakh, you agree to our </span>
            <a href="/terms-of-service" className="underline hover:text-accent-foreground transition-colors">
              Terms of Service
            </a>
            <span> and have read our </span>
            <a href="/privacy-policy" className="underline hover:text-accent-foreground transition-colors">
              Privacy Policy
            </a>
            .
          </div>
        </div>
      )}
    </motion.div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);