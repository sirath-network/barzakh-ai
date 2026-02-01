// PreviewAttachment.tsx

import type { Attachment } from "ai";
import { LoaderIcon } from "./icons";
import { X, Code } from "lucide-react";
import { motion } from "@/lib/framer-motion";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "./ui/dialog";
import { Button } from "./ui/button";
import { useSignedR2Url } from "@/hooks/use-signed-r2-url";
import { Skeleton } from "./ui/skeleton";

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
      <path d="M16 13l-4 4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
    else if (contentType.includes('javascript') || contentType.includes('typescript') ||
      ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
        'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'sh', 'bat', 'ps1',
        'sql', 'dockerfile', 'gitignore', 'env', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf'].includes(extension)) fileType = 'code';
    else if (contentType.startsWith('text/') || ['txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'rtf'].includes(extension)) fileType = 'text';

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
  },
  custom250: {
    container: "w-[250px] h-[200px]",
    text: "text-sm w-[250px]",
    badge: "text-xs px-2 py-1",
    removeButton: "w-6 h-6 -top-2.5 -right-2.5",
    removeButtonIconSize: 14,
  },
  custom100: {
    container: "w-[100px] h-[80px]",
    text: "text-xs w-[100px]",
    badge: "text-[10px] px-1.5 py-0.5",
    removeButton: "w-5 h-5 -top-2 -right-2",
    removeButtonIconSize: 12,
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
  const isCodeFile = contentType?.includes('javascript') || contentType?.includes('typescript') ||
    contentType?.includes('json') || contentType?.includes('html') || contentType?.includes('css') ||
    ['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'java', 'cpp', 'c', 'sh', 'json'].includes(
      (name || '').split('.').pop()?.toLowerCase() || ''
    );
  const { Icon, fileExtension } = useAttachmentInfo(attachment);
  const config = sizeConfig[size];

  // Preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // Use signed URL for R2 storage images
  const { url: signedUrl, isLoading: isLoadingSignedUrl } = useSignedR2Url(url || '');
  const displayUrl = signedUrl || url;

  // Load file content for code files
  const loadFileContent = async () => {
    if (!isCodeFile || fileContent !== null) return;

    try {
      const response = await fetch(url);
      const text = await response.text();
      setFileContent(text);
    } catch (error) {
      console.error('Failed to load file content:', error);
    }
  };

  const handlePreview = () => {
    if (isCodeFile) {
      loadFileContent();
    }
    setIsPreviewOpen(true);
  };



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

  const DialogAny = Dialog as any;
  const DialogContentAny = DialogContent as any;
  const DialogHeaderAny = DialogHeader as any;
  const DialogTitleAny = DialogTitle as any;
  const ButtonAny = Button as any;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      {...(!isImage && {
        whileHover: { y: -2 },
        whileTap: { scale: 0.98 }
      })}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col gap-2 items-center relative group select-none"
    >
      <PreviewContainer>
        <div
          className={clsx(
            "w-full h-full relative flex items-center justify-center cursor-pointer touch-manipulation focus:ring-2 focus:ring-primary/50 focus:outline-none",
            isImage ? "" : "rounded-2xl overflow-hidden bg-gradient-to-br from-muted/40 to-muted/20 border border-border/20 shadow-lg group/card"
          )}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handlePreview}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {isImage ? (
            isLoadingSignedUrl ? (
              <Skeleton className="w-full h-full rounded-2xl" />
            ) : (
              <img
                key={displayUrl}
                src={displayUrl}
                alt={name ?? "Image attachment"}
                loading="lazy"
                className="w-full h-full object-cover rounded-2xl"
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-3">
              <div className="relative transition-transform duration-500 ease-out group-hover/card:scale-110">
                <Icon />
                {/* Enhanced glow effect for code files */}
                {isCodeFile && (
                  <motion.div
                    className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm -z-10"
                    animate={isHovered ? { scale: 1.2, opacity: 0.4 } : { scale: 1, opacity: 0.2 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                )}
              </div>
              <motion.div
                className={clsx(
                  config.badge,
                  "bg-white/90 text-gray-700 rounded-full font-semibold border border-white/30 shadow-sm",
                  isCodeFile && "bg-blue-100 text-blue-700 border-blue-200"
                )}
                animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {fileExtension}
              </motion.div>
            </div>
          )}

          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <motion.div
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="text-muted-foreground"
                >
                  <LoaderIcon />
                </motion.div>
                <motion.span
                  className="text-xs text-muted-foreground"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Uploading...
                </motion.span>
              </motion.div>
            </motion.div>
          )}
        </div>
      </PreviewContainer>

      {onRemove && !isUploading && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.15, rotate: 90 }}
          whileTap={{ scale: 0.85 }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove();
          }}
          className={clsx(
            "absolute bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-full flex items-center justify-center shadow-sm transition-all duration-200 z-10 border border-neutral-200 dark:border-neutral-700",
            "opacity-0 group-hover:opacity-100",
            config.removeButton
          )}
          aria-label="Remove attachment"
        >
          <motion.div
            animate={{ rotate: 0 }}
            whileHover={{ rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <X size={config.removeButtonIconSize} />
          </motion.div>
        </motion.button>
      )}

      <div className="flex flex-col items-center gap-1">
        {!isImage && (
          <p className={clsx(config.text, "text-foreground/80 text-center truncate px-1 leading-tight font-medium")}>
            {name || "Unnamed file"}
          </p>
        )}
        {(isImage || isCodeFile) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            {isImage ? (
              <>
              </>
            ) : (
              <>
              </>
            )}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <DialogAny open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContentAny
          className="max-w-[100vw] w-full h-full max-h-[100vh] p-0 overflow-hidden border-none bg-white/80 dark:bg-black/80 rounded-none sm:rounded-none"
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          hideCloseButton
        >
          <DialogHeaderAny className="sr-only">
            <DialogTitleAny>
              {isImage ? 'Image Preview' : 'Code Preview'}
            </DialogTitleAny>
          </DialogHeaderAny>

          {/* Custom Header Bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              aria-label="Close preview"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800 dark:text-white">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              {isImage ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
              ) : (
                <Code className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
              )}
              <span className="text-sm text-gray-800 dark:text-white font-medium truncate max-w-[60vw]">
                {name || (isImage ? 'Image' : 'File')}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="w-full h-full flex items-center justify-center pt-14 pb-4 px-4">
            {isImage ? (
              isLoadingSignedUrl ? (
                <Skeleton className="w-full h-[50vh] rounded-2xl" />
              ) : (
                <img
                  src={displayUrl}
                  alt={name ?? "Image attachment"}
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                />
              )
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-2xl max-w-4xl w-full">
                <div className="flex items-center justify-between bg-gradient-to-r from-gray-800 to-gray-750 px-4 py-3 border-b border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-semibold text-gray-100">{name}</span>
                    </div>
                    <div className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-md border border-blue-500/30">
                      {fileExtension}
                    </div>
                  </div>
                </div>
                <div className="p-4 max-h-[60vh] overflow-auto bg-gray-900/50">
                  {fileContent ? (
                    <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                      {fileContent}
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span className="text-sm text-gray-400">Loading file content...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContentAny>
      </DialogAny>
    </motion.div>
  );
};