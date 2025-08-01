// PreviewAttachment.tsx

import type { Attachment } from "ai";
import { LoaderIcon } from "./icons";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo } from "react";
import clsx from "clsx";

// --- ICONS & HELPERS (Moved outside the component) ---

const FileIcons = {
  pdf: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-500">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="16" textAnchor="middle" fontSize="6" fill="currentColor" fontWeight="bold">PDF</text>
    </svg>
  ),
  code: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-blue-500">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13l-4 4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 9l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  text: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-500">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 13H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 17H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 9H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  json: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-yellow-500">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="16" textAnchor="middle" fontSize="5" fill="currentColor" fontWeight="bold">JSON</text>
    </svg>
  ),
  default: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

type FileType = keyof typeof FileIcons;

const useAttachmentInfo = (attachment: Attachment) => {
  return useMemo(() => {
    const { contentType = "", name = "" } = attachment;
    const extension = name.split('.').pop()?.toLowerCase() || '';

    let fileType: FileType = 'default';
    if (contentType.includes('pdf')) fileType = 'pdf';
    else if (contentType.includes('json') || extension === 'json') fileType = 'json';
    else if (contentType.includes('javascript') || contentType.includes('typescript') || ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'sh'].includes(extension)) fileType = 'code';
    else if (contentType.startsWith('text/') || ['txt', 'md', 'csv'].includes(extension)) fileType = 'text';

    const Icon = FileIcons[fileType];
    const fileExtension = extension.toUpperCase() || 'FILE';

    return { Icon, fileExtension, fileType };
  }, [attachment]);
};

// --- RESPONSIVE SIZE CONFIGURATION ---

const sizeConfig = {
  small: {
    container: "w-20 h-16",
    text: "text-xs w-20",
    badge: "text-[9px] px-1.5 py-0.5",
    removeButton: "w-4 h-4 -top-1.5 -right-1.5",
    removeButtonIconSize: 10,
  },
  default: {
    container: "w-24 h-20 md:w-28 md:h-24",
    text: "text-xs w-24 md:w-28",
    badge: "text-[10px] px-1.5 py-0.5",
    removeButton: "w-5 h-5 -top-2 -right-2",
    removeButtonIconSize: 12,
  },
  large: {
    container: "w-32 h-28 md:w-36 md:h-32",
    text: "text-sm w-32 md:w-36",
    badge: "text-xs px-2 py-1",
    removeButton: "w-6 h-6 -top-2.5 -right-2.5",
    removeButtonIconSize: 14,
  }
};

type PreviewAttachmentProps = {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
  size?: keyof typeof sizeConfig;
};

// --- THE COMPONENT ---

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
  size = "default"
}: PreviewAttachmentProps) => {
  const { name, url, contentType } = attachment;
  const isImage = contentType?.startsWith("image/");
  const { Icon, fileExtension } = useAttachmentInfo(attachment);
  const config = sizeConfig[size];

  const PreviewContainer = ({ children }: { children: React.ReactNode }) =>
    isImage || !url ? (
      <div className={config.container}>{children}</div>
    ) : (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={clsx(config.container, "hover:shadow-lg")}
        aria-label={`Open file ${name}`}
      >
        {children}
      </a>
    );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="flex flex-col gap-2 items-center relative group"
    >
      <PreviewContainer>
        <div className="bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-800 dark:to-neutral-900 w-full h-full rounded-xl relative flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-sm transition-all duration-300 overflow-hidden">
          {isImage ? (
            <div className="relative w-full h-full">
              <img
                key={url}
                src={url}
                alt={name ?? "Image attachment"}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 p-2">
              <Icon />
              <div className={clsx(config.badge, "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-md font-medium")}>
                {fileExtension}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm flex items-center justify-center">
              <div className="animate-spin text-neutral-600 dark:text-neutral-400">
                <LoaderIcon />
              </div>
            </div>
          )}
        </div>
      </PreviewContainer>

      {onRemove && !isUploading && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className={clsx(
            "absolute bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10 border-2 border-white dark:border-neutral-800",
            "opacity-0 group-hover:opacity-100",
            config.removeButton
          )}
          aria-label="Remove attachment"
        >
          <X size={config.removeButtonIconSize} />
        </motion.button>
      )}

      <p className={clsx(config.text, "text-neutral-600 dark:text-neutral-400 text-center truncate px-1 leading-tight")}>
        {name || "Unnamed file"}
      </p>
    </motion.div>
  );
};