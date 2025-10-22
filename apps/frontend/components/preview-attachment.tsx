// PreviewAttachment.tsx

import type { Attachment } from "ai";
import { LoaderIcon } from "./icons";
import { X, Eye, Code, Download, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

const MotionDiv = motion.div as React.ComponentType<
  React.HTMLAttributes<HTMLDivElement> & import('framer-motion').MotionProps
>;

const MotionSpan = motion.span as React.ComponentType<
  React.HTMLAttributes<HTMLSpanElement> & import('framer-motion').MotionProps
>;

const MotionButton = motion.button as React.ComponentType<
  React.ComponentProps<'button'> & import('framer-motion').MotionProps
>;
import clsx from "clsx";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "./ui/dialog";
import { Button } from "./ui/button";

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
      (name || 'file').split('.').pop()?.toLowerCase() || ''
    );
  const { Icon, fileExtension } = useAttachmentInfo(attachment);
  const config = sizeConfig[size];
  
  // Preview states
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);

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

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = name || 'file';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
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

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col gap-2 items-center relative group select-none"
    >
      <PreviewContainer>
        <div 
          className="bg-gradient-to-br from-muted/40 to-muted/20 w-full h-full rounded-2xl relative flex items-center justify-center border border-border/20 shadow-lg hover:shadow-2xl transition-all duration-500 ease-out overflow-hidden group/card cursor-pointer transform hover:scale-105 active:scale-95 touch-manipulation focus:ring-2 focus:ring-primary/50 focus:outline-none"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handlePreview}
          onTouchStart={() => setIsHovered(true)}
          onTouchEnd={() => setIsHovered(false)}
        >
          {isImage ? (
            <div className="relative w-full h-full overflow-hidden">
              <img
                key={url}
                src={url}
                alt={name ?? "Image attachment"}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover/card:scale-110"
              />
              {/* Subtle overlay for better text visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 ease-out" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 p-3">
              <div className="relative transition-transform duration-500 ease-out group-hover/card:scale-110">
                <Icon />
                {/* Enhanced glow effect for code files */}
                {isCodeFile && (
                  <MotionDiv 
                    className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm -z-10"
                    animate={isHovered ? { scale: 1.2, opacity: 0.4 } : { scale: 1, opacity: 0.2 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                )}
              </div>
              <MotionDiv 
                className={clsx(
                  config.badge, 
                  "bg-white/90 text-gray-700 rounded-full font-semibold border border-white/30 shadow-sm",
                  isCodeFile && "bg-blue-100 text-blue-700 border-blue-200"
                )}
                animate={isHovered ? { scale: 1.05 } : { scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {fileExtension}
              </MotionDiv>
            </div>
          )}

          {/* Enhanced preview overlay indicator */}
          <AnimatePresence>
            {isHovered && (
              <MotionDiv
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center"
              >
                <MotionDiv 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                  className="bg-white/90 text-gray-600 px-2 py-1.5 rounded-lg shadow-lg flex items-center gap-1.5 text-xs font-medium border border-white/30 backdrop-blur-sm"
                >
                  <MotionDiv
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                  >
                    <Eye className="w-3 h-3" />
                  </MotionDiv>
                  {isImage ? 'View' : 'Preview'}
                </MotionDiv>
              </MotionDiv>
            )}
          </AnimatePresence>

          {isUploading && (
            <MotionDiv 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <MotionDiv 
                className="flex flex-col items-center gap-2"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <MotionDiv
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="text-muted-foreground"
                >
                  <LoaderIcon />
                </MotionDiv>
                <MotionSpan 
                  className="text-xs text-muted-foreground"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Uploading...
                </MotionSpan>
              </MotionDiv>
            </MotionDiv>
          )}
        </div>
      </PreviewContainer>

      {onRemove && !isUploading && (
        <MotionButton
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
            "absolute bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10 border-2 border-background hover:shadow-red-500/25",
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
        </MotionButton>
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
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl w-full p-2">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {isImage ? 'Image Preview' : 'Code Preview'}
            </DialogTitle>
          </DialogHeader>
          <div className="relative">
            {isImage ? (
              <img
                src={url}
                alt={name ?? "Image attachment"}
                className="w-full h-auto rounded-lg"
                style={{ maxHeight: '80vh', objectFit: 'contain' }}
              />
            ) : (
              <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
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
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyUrl}
                      className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 mr-1 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      {isCopied ? 'Copied!' : 'Copy URL'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                </div>
                <div className="p-4 max-h-96 overflow-auto bg-gray-900/50">
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
            
            {/* Image Preview Actions */}
            {isImage && (
              <div className="absolute bottom-4 right-4 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="bg-white/95 hover:bg-white text-gray-700 hover:text-gray-900 shadow-xl border-white/20 backdrop-blur-sm"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {isCopied ? 'Copied!' : 'Copy URL'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="bg-white/95 hover:bg-white text-gray-700 hover:text-gray-900 shadow-xl border-white/20 backdrop-blur-sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isDownloading ? 'Downloading...' : 'Download'}
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </MotionDiv>
  );
};