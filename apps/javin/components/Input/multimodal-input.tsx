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
import { ChevronDown } from "lucide-react";

const SendIcon = ({ size = 24, className }: { size?: number; className?: string }) => (
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
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const MIN_HEIGHT = 24;
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
      textareaRef.current.style.height = 'auto'; 
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

    // ✅ Filter file yang didukung AI (gambar dan teks)
    const allowedTypes = [
        // Images
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
        
        // Documents
        'application/pdf',
        'text/plain',
        'text/markdown',
        'text/csv',
        
        // Programming & Data Files
        'application/json',
        'application/javascript', // for .js
        'text/javascript',       // also for .js
        'text/x-typescript',      // for .ts
        'application/x-typescript', // also for .ts
        'text/html',
        'text/css',
        'application/xml',
        'text/xml'
      ];

      const supportedAttachments = attachments.filter((att) =>
        allowedTypes.includes(att.contentType ?? '') // Use ?? '' for safety
      );

    handleSubmit(undefined, {
      body: { group: selectedGroup },
      experimental_attachments: supportedAttachments,
    });

    setInput('');
    setAttachments([]);
    setLocalStorageInput('');

    if (textareaRef.current) {
      textareaRef.current.value = '';
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

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadQueue(files.map((file) => file.name));
    try {
      const uploadedAttachments = await Promise.all(files.map(uploadFile));
      const successfulUploads = uploadedAttachments.filter(Boolean) as Attachment[];
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
  }, [setAttachments]);

  const handleGroupSelect = useCallback(async (group: SearchGroup) => {
    setSelectedGroup(group.id);
    setLocalStorageChatMode(group.id);
  }, [setSelectedGroup, setLocalStorageChatMode]);

  const scrollMessagesToBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("chat-scroll");
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // Remove attachment handler
  const removeAttachment = useCallback((indexToRemove: number) => {
    setAttachments((prev) => prev.filter((_, index) => index !== indexToRemove));
  }, [setAttachments]);

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "relative w-full flex flex-col gap-2 rounded-2xl transition-all duration-300 !font-sans",
        "bg-neutral-100/80 dark:bg-neutral-900/80 backdrop-blur-sm",
        "border border-neutral-300/50 dark:border-neutral-700/50",
        isFocused ? "shadow-[0_0_0_4px_rgba(239,68,68,0.2)] dark:shadow-[0_0_0_4px_rgba(239,68,68,0.15)]" : "",
        "p-2",
        className
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
              // Ensure remove buttons don't get clipped
              paddingTop: '12px',
              paddingBottom: '12px',
              marginTop: '-4px',
              marginBottom: '-4px'
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
          placeholder={messages.length > 0 ? "Reply Barzakh..." : "How may I assist you today?"}
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
      />

      <AnimatePresence>
        {!isAtBottom && (
          <motion.button
            onClick={scrollMessagesToBottom}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center p-2 rounded-full bg-rose-600 text-white cursor-pointer shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
            aria-label="Scroll to bottom"
          >
            <ChevronDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between w-full">
        <div className="flex flex-row gap-1.5 items-center">
           <AttachmentsButton fileInputRef={fileInputRef} isLoading={isLoading} />
           <GroupSelector
            selectedGroupId={selectedGroup}
            onGroupSelect={handleGroupSelect}
           />
        </div>
        <div className="flex flex-row gap-2 items-center">
          {!isReadonly && <ModelSelector selectedModelId={selectedModelId} />}
        </div>
      </div>
    </motion.div>
  );
}

export const MultimodalInput = memo(PureMultimodalInput);