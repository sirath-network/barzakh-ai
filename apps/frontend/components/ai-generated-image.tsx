"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import { Download, Eye, X, AlertCircle, Share2, ChevronLeft, ChevronRight, Images, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "./ui/dialog";
import { cn } from "@barzakh/shared/lib/utils/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { checkUrlExpiration } from "@/lib/image-storage";
import { useSignedR2Url } from "@/hooks/use-signed-r2-url";
import { toast } from "sonner";

interface AIGeneratedImageProps {
  imageUrl: string;
  alt?: string;
  className?: string;
  allImages?: string[];
  currentIndex?: number;
}

interface AIGeneratedImageGridProps {
  imageUrls: string[];
  alt?: string;
  className?: string;
}

export function AIGeneratedImage({
  imageUrl,
  alt = "AI generated image",
  className,
  allImages,
  currentIndex = 0
}: AIGeneratedImageProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [isExpiredUrl, setIsExpiredUrl] = useState(false);

  // Navigation state for multiple images
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Get signed URL for R2 images
  const { url: signedUrl, isLoading: isLoadingSignedUrl, error: signedUrlError } = useSignedR2Url(imageUrl);

  // Get current image for display (use signed URL if available)
  const displayUrl = signedUrl || imageUrl;
  const currentImage = allImages && allImages.length > 1
    ? allImages[currentImageIndex]
    : displayUrl;

  const isMobile = useIsMobile();

  // Check if URL is expired on component mount
  useEffect(() => {
    // Only check expiration for URLs that have signed URL parameters
    const urlToCheck = displayUrl;
    if (urlToCheck && (urlToCheck.includes('X-Goog-Expires') || urlToCheck.includes('Expires') || urlToCheck.includes('X-Amz-Expires'))) {
      const urlInfo = checkUrlExpiration(urlToCheck);
      if (urlInfo.isExpired) {
        setIsExpiredUrl(true);
        setImageError(true);
      }
    }
  }, [displayUrl]);

  // Fallback mobile detection for cases where useIsMobile might not work
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;

      const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
      setIsMobileDevice(mobile);

      // Optional: Debug logging (remove in production)
      // console.log('Mobile Detection:', { isMobile, isMobileUA, isTouchDevice, isSmallScreen, mobile });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);

  // Use either hook result or fallback detection
  const shouldShowMobileUI = isMobile || isMobileDevice;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);

    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // Extract extension properly from URL, handling signed URLs
      let extension = 'png'; // Default extension
      try {
        const url = new URL(currentImage);
        const pathname = url.pathname;
        const pathExtension = pathname.split('.').pop();
        if (pathExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(pathExtension.toLowerCase())) {
          extension = pathExtension.toLowerCase();
        }
      } catch (e) {
        // Fallback for non-URL strings
        const urlPart = currentImage.split('?')[0]; // Remove query parameters
        const pathExtension = urlPart.split('.').pop();
        if (pathExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(pathExtension.toLowerCase())) {
          extension = pathExtension.toLowerCase();
        }
      }
      const filename = `barzakh-ai-image-${timestamp}.${extension}`;

      // Detect mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      // Check if it's a data URL (base64)
      if (currentImage.startsWith('data:')) {
        if (isMobile) {
          // Mobile: Use different approach for data URLs
          await downloadImageOnMobile(currentImage, filename);
        } else {
          // Desktop: Direct download
          const link = document.createElement('a');
          link.href = currentImage;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        return;
      }

      // For external URLs, try different approaches based on device
      if (isMobile) {
        // Mobile-specific download strategy
        await handleMobileDownload(currentImage, filename, isIOS);
      } else {
        // Desktop download strategy
        try {
          // First try: Direct fetch (works for same-origin or CORS-enabled images)
          const response = await fetch(currentImage, {
            mode: 'cors',
            credentials: 'omit'
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (fetchError) {
          console.warn('Direct fetch failed, trying server proxy:', fetchError);

          // Fallback: Try server-side proxy
          await downloadViaProxy(currentImage, filename);
        }
      }
    } catch (error) {
      console.error('Failed to download image:', error);

      // Show error message to user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide helpful messages for common issues
      if (errorMessage.includes('Domain not allowed')) {
        setDownloadError('Image domain not whitelisted. Opening in new tab instead...');
      } else if (errorMessage.includes('popup') || errorMessage.includes('blocked')) {
        setDownloadError('Popup blocked. Please allow popups for this site or long-press the image to save.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
        setDownloadError('Permission denied. Please check your browser settings and allow downloads.');
      } else {
        setDownloadError(`Download failed: ${errorMessage}. Try long-pressing the image to save.`);
      }

      // Clear error after 7 seconds for mobile users to read
      setTimeout(() => setDownloadError(null), 7000);

      // Final fallback: Open in new tab
      const link = document.createElement('a');
      link.href = currentImage;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMobileDownload = async (imageUrl: string, filename: string, isIOS: boolean) => {
    try {
      // Method 1: Try server proxy with mobile-optimized approach
      const response = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          mobile: true, // Flag for mobile optimization
          forceDownload: true
        }),
      });

      if (!response.ok) {
        throw new Error(`Proxy failed: ${response.status}`);
      }

      const blob = await response.blob();

      // Method 2: Use the most compatible mobile download approach
      await downloadBlobOnMobile(blob, filename, isIOS);

    } catch (proxyError) {
      console.warn('Proxy download failed on mobile:', proxyError);

      try {
        // Method 3: Direct fetch as fallback
        const response = await fetch(imageUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/*',
            'Cache-Control': 'no-cache'
          },
          mode: 'cors',
          credentials: 'omit'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        await downloadBlobOnMobile(blob, filename, isIOS);

      } catch (fetchError) {
        console.warn('All download methods failed on mobile:', fetchError);

        // Method 4: Open image directly for mobile download
        await openImageForMobileDownload(imageUrl, filename);
      }
    }
  };

  const downloadBlobOnMobile = async (blob: Blob, filename: string, isIOS: boolean) => {
    try {
      // Method 1: Try Web Share API for iOS (if available and user wants it)
      if (isIOS && navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: blob.type });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'AI Generated Image',
              text: 'Download this AI generated image'
            });
            return;
          }
        } catch (shareError) {
          console.warn('Web Share API failed:', shareError);
        }
      }

      // Method 2: Create blob URL and trigger download
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';

      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

    } catch (error) {
      console.error('Mobile blob download failed:', error);
      // Fallback: Open image directly
      await openImageForMobileDownload(imageUrl, filename);
    }
  };

  const openImageForMobileDownload = async (imageUrl: string, filename: string) => {
    try {
      // Try to create a download link with the original URL
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Add to DOM temporarily
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.warn('Download link failed, opening in new tab:', error);
      // Final fallback: Open in new tab
      window.open(imageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const downloadImageOnMobile = async (dataUrl: string, filename: string) => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Skip Web Share API to avoid unwanted share popup on mobile

      // Fallback: Create download link
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.target = '_blank';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error('Mobile data URL download failed:', error);
      throw error;
    }
  };

  const downloadViaProxy = async (imageUrl: string, filename: string): Promise<void> => {
    try {
      const response = await fetch('/api/proxy-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        throw new Error(`Proxy request failed: ${errorMessage}`);
      }

      const blob = await response.blob();

      // Verify we got a valid blob
      if (!blob || blob.size === 0) {
        throw new Error('Received empty response from proxy');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Proxy download error details:', error);
      throw new Error(`Server-side download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  // Navigation functions for multiple images
  const goToPreviousImage = () => {
    if (allImages && allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
    }
  };

  const goToNextImage = () => {
    if (allImages && allImages.length > 1) {
      setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
    }
  };

  const handlePreviewOpen = () => {
    setCurrentImageIndex(currentIndex);
    setIsPreviewOpen(true);
    // Load image to get dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = currentImage;
  };

  // Update image dimensions when current image changes
  useEffect(() => {
    if (isPreviewOpen && currentImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.src = currentImage;
    }
  }, [isPreviewOpen, currentImage, currentImageIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPreviewOpen || !allImages || allImages.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousImage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextImage();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsPreviewOpen(false);
      }
    };

    if (isPreviewOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPreviewOpen, allImages]);

  const handleImageError = () => {
    // Only check expiration for URLs that have signed URL parameters
    if (imageUrl.includes('X-Goog-Expires') || imageUrl.includes('Expires')) {
      const urlInfo = checkUrlExpiration(imageUrl);
      if (urlInfo.isExpired) {
        setIsExpiredUrl(true);
      }
    }
    setImageError(true);
  };

  if (isLoadingSignedUrl) {
    return (
      <div className={cn("w-full", className)}>
        <Skeleton className="w-full h-64 md:h-80 rounded-3xl" />
      </div>
    );
  }

  if (imageError || signedUrlError) {
    return (
      <div className="max-w-full p-6 bg-muted/50 rounded-2xl border border-border/40 text-center">
        <div className="text-muted-foreground">
          {isExpiredUrl ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-800 to-red-950/50 rounded-lg flex items-center justify-center border border-red-800/30">
                {(() => { const EyeAny = Eye as any; return <EyeAny className="w-8 h-8 text-red-400/70" />; })()}
              </div>
              <p className="text-red-300/80 font-medium mb-2">Image auto-deleted after 1h</p>
              <p className="text-gray-400 text-xs mb-4">Barzakh AI generates temporary links for security</p>
              <div className="space-y-2">
                <p className="text-gray-300 text-sm">💡 What you can do:</p>
                <div className="text-xs text-gray-400 leading-relaxed">
                  • Generate a new image with the same prompt<br />
                  • Download images immediately after generation<br />
                  • Save important images right away
                </div>
              </div>
            </>
          ) : (
            <>
              {(() => { const EyeAny = Eye as any; return <EyeAny className="w-8 h-8 mx-auto mb-2 opacity-50" />; })()}
              <p className="text-sm">Failed to load generated image</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-red-600/50 text-red-300 hover:bg-red-950/30"
                onClick={() => window.open(imageUrl, '_blank')}
              >
                Open in new tab
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full group flex flex-col justify-start", className)}>
      <div
        className={cn(
          "relative rounded-3xl overflow-hidden border border-border/20 shadow-lg w-full max-w-full group/image",
          shouldShowMobileUI ? "bg-transparent" : "bg-gradient-to-br from-muted/40 to-muted/20"
        )}
      >
        {/* Enhanced Image Container */}
        <div className="relative overflow-hidden rounded-3xl w-full bg-transparent">
          <img
            src={displayUrl}
            alt={alt}
            className="block w-full h-auto object-contain"
            style={{
              maxWidth: '100%',
              width: '100%',
              height: 'auto',
              display: 'block'
            }}
            onError={handleImageError}
            loading="lazy"
          />
        </div>

        {/* Click to open preview */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={handlePreviewOpen}
        />
      </div>

      {/* Shared Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className="max-w-[100vw] w-full h-full max-h-[100vh] p-0 overflow-hidden border-none bg-white/80 dark:bg-black/80 rounded-none sm:rounded-none"
          onOpenAutoFocus={(e: Event) => e.preventDefault()}
          hideCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              AI Generated Image Preview
            </DialogTitle>
          </DialogHeader>

          {/* Custom Header Bar */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Close preview"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800 dark:text-white">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-gray-800 dark:text-white font-medium">Barzakh AI</span>
            </div>

            {/* Action Icons - Right side (Desktop only) */}
            <div className="hidden md:flex items-center gap-6">
              {/* Image counter for multiple images */}
              {allImages && allImages.length > 1 && (
                <span className="text-gray-600 dark:text-white/70 text-sm mr-2">
                  {currentImageIndex + 1} / {allImages.length}
                </span>
              )}

              {/* Share Icon */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'AI Generated Image',
                      url: currentImage
                    }).catch(() => { });
                  } else {
                    window.open(currentImage, '_blank');
                  }
                }}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Share"
              >
                {(() => { const ShareAny = Share2 as any; return <ShareAny className="w-5 h-5 text-gray-800 dark:text-white" />; })()}
              </button>

              {/* Copy Icon */}
              <button
                onClick={async () => {
                  try {
                    // Use proxy to fetch image (avoids CORS)
                    const response = await fetch('/api/proxy-image', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ imageUrl: currentImage, forceDownload: true }),
                    });

                    if (!response.ok) throw new Error('Failed to fetch image');

                    const blob = await response.blob();

                    // Create a ClipboardItem with the image blob
                    const item = new ClipboardItem({ [blob.type]: blob });
                    await navigator.clipboard.write([item]);

                    toast.success('Copied to clipboard');
                  } catch (error) {
                    console.error('Failed to copy image:', error);
                    // Fallback: copy URL if image copy fails
                    await navigator.clipboard.writeText(currentImage);
                    toast.success('Copied link to clipboard');
                  }
                }}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label="Copy image"
              >
                {(() => { const ImagesAny = Images as any; return <ImagesAny className="w-5 h-5 text-gray-800 dark:text-white" />; })()}
              </button>

              {/* Download Icon */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                aria-label="Download"
              >
                {isDownloading ? (
                  <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-t-transparent" />
                ) : (
                  (() => { const DownloadAny = Download as any; return <DownloadAny className="w-5 h-5 text-gray-800 dark:text-white" />; })()
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="w-full h-full flex items-center justify-center pt-14 pb-20 md:pb-4 px-4">
            <img
              src={currentImage}
              alt={alt}
              className="max-w-full max-h-[75vh] md:max-h-[85vh] object-contain rounded-2xl"
              style={{
                aspectRatio: imageDimensions ? `${imageDimensions.width} / ${imageDimensions.height}` : 'auto'
              }}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (!imageDimensions) {
                  setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
                }
              }}
            />

            {/* Navigation for multiple images */}
            {allImages && allImages.length > 1 && (
              <>
                {/* Previous button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-gray-200/80 dark:bg-black/60 backdrop-blur-sm text-gray-800 dark:text-white hover:bg-gray-300/80 dark:hover:bg-black/80 rounded-full"
                >
                  {(() => { const ChevronLeftAny = ChevronLeft as any; return <ChevronLeftAny className="h-5 w-5" />; })()}
                </Button>

                {/* Next button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-gray-200/80 dark:bg-black/60 backdrop-blur-sm text-gray-800 dark:text-white hover:bg-gray-300/80 dark:hover:bg-black/80 rounded-full"
                >
                  {(() => { const ChevronRightAny = ChevronRight as any; return <ChevronRightAny className="h-5 w-5" />; })()}
                </Button>
              </>
            )}
          </div>

          {/* Mobile Bottom Action Bar */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-20 px-4 py-4 bg-gradient-to-t from-white/80 dark:from-black/80 to-transparent">
            {/* Share */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'AI Generated Image',
                    url: currentImage
                  }).catch(() => { });
                } else {
                  window.open(currentImage, '_blank');
                }
              }}
              className="flex flex-col items-center gap-1.5 text-gray-800 dark:text-white"
              aria-label="Share"
            >
              {(() => { const ShareAny = Share2 as any; return <ShareAny className="w-6 h-6" />; })()}
              <span className="text-xs">Share</span>
            </button>

            {/* Copy */}
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/proxy-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imageUrl: currentImage, forceDownload: true }),
                  });

                  if (!response.ok) throw new Error('Failed to fetch image');

                  const blob = await response.blob();
                  const item = new ClipboardItem({ [blob.type]: blob });
                  await navigator.clipboard.write([item]);

                  toast.success('Copied to clipboard');
                } catch (error) {
                  console.error('Failed to copy image:', error);
                  await navigator.clipboard.writeText(currentImage);
                  toast.success('Copied link to clipboard');
                }
              }}
              className="flex flex-col items-center gap-1.5 text-gray-800 dark:text-white"
              aria-label="Copy image"
            >
              {(() => { const ImagesAny = Images as any; return <ImagesAny className="w-6 h-6" />; })()}
              <span className="text-xs">Copy</span>
            </button>

            {/* Save/Download */}
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex flex-col items-center gap-1.5 text-gray-800 dark:text-white disabled:opacity-50"
              aria-label="Save"
            >
              {isDownloading ? (
                <div className="w-6 h-6 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-t-transparent" />
              ) : (
                (() => { const DownloadAny = Download as any; return <DownloadAny className="w-6 h-6" />; })()
              )}
              <span className="text-xs">Save</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Display */}
      <AnimatePresence>
        {downloadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md border border-red-200 dark:border-red-800"
          >
            {(() => { const AlertCircleAny = AlertCircle as any; return <AlertCircleAny className="w-3 h-3 flex-shrink-0" />; })()}
            <span className="flex-1">{downloadError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDownloadError(null)}
              className="h-auto p-0 text-red-600 hover:text-red-700"
            >
              {(() => { const XAny = X as any; return <XAny className="w-3 h-3" />; })()}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// Simplified version for smaller contexts
export function AIGeneratedImageCompact({
  imageUrl,
  alt = "AI generated image",
  className
}: AIGeneratedImageProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const isMobile = useIsMobile();

  // Get signed URL for R2 images
  const { url: signedUrl, isLoading: isLoadingSignedUrl } = useSignedR2Url(imageUrl);
  const displayUrl = signedUrl || imageUrl;

  // Fallback mobile detection
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;

      const mobile = isMobileUA || (isTouchDevice && isSmallScreen);
      setIsMobileDevice(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const shouldShowMobileUI = isMobile || isMobileDevice;

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);

    try {
      // Generate filename with timestamp  
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // Extract extension properly from URL, handling signed URLs
      let extension = 'png'; // Default extension
      try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        const pathExtension = pathname.split('.').pop();
        if (pathExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(pathExtension.toLowerCase())) {
          extension = pathExtension.toLowerCase();
        }
      } catch (e) {
        // Fallback for non-URL strings
        const urlPart = imageUrl.split('?')[0]; // Remove query parameters
        const pathExtension = urlPart.split('.').pop();
        if (pathExtension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(pathExtension.toLowerCase())) {
          extension = pathExtension.toLowerCase();
        }
      }
      const filename = `barzakh-ai-image-${timestamp}.${extension}`;

      // Detect mobile device
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      // Check if it's a data URL (base64)
      if (imageUrl.startsWith('data:')) {

        // Fallback for data URLs
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For external URLs, use mobile-optimized approach
      if (isMobileDevice) {
        // Mobile-specific download strategy
        try {
          // Try server proxy with mobile optimization
          const response = await fetch('/api/proxy-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl,
              mobile: true,
              forceDownload: true
            }),
          });

          if (!response.ok) {
            throw new Error(`Proxy failed: ${response.status}`);
          }

          const blob = await response.blob();

          // Try Web Share API for iOS first
          if (isIOS && navigator.share && navigator.canShare) {
            try {
              const file = new File([blob], filename, { type: blob.type });
              if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                  files: [file],
                  title: 'AI Generated Image',
                  text: 'Download this AI generated image'
                });
                return;
              }
            } catch (shareError) {
              console.warn('Web Share API failed:', shareError);
            }
          }

          // Fallback: Create download link
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = filename;
          link.target = '_blank';
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

        } catch (mobileError) {
          console.warn('Mobile download failed:', mobileError);

          // Final mobile fallback: Create download link with original URL
          const link = document.createElement('a');
          link.href = imageUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Desktop download strategy
        try {
          const response = await fetch(imageUrl, {
            mode: 'cors',
            credentials: 'omit'
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (fetchError) {
          console.warn('Direct fetch failed, trying server proxy:', fetchError);

          // Fallback: Try server-side proxy
          try {
            const response = await fetch('/api/proxy-image', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ imageUrl }),
            });

            if (!response.ok) {
              throw new Error(`Proxy request failed: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
          } catch (proxyError) {
            console.warn('Proxy download failed:', proxyError);

            // Final fallback: Open in new tab
            const link = document.createElement('a');
            link.href = imageUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      }
    } catch (error) {
      console.error('Failed to download image:', error);

      // Final fallback: Open in new tab
      const link = document.createElement('a');
      link.href = imageUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={cn("inline-block", className)}>
      {/* Compact Header */}
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        <span>AI Generated Image</span>
      </div>

      <div className="relative group border border-border/20 rounded-3xl overflow-hidden bg-gradient-to-br from-muted/40 to-muted/20 shadow-lg hover:shadow-xl transition-all duration-300 w-full"
      >
        <img
          src={displayUrl}
          alt={alt}
          className="block w-full h-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          style={{ maxHeight: 'min(400px, 60vh)', maxWidth: '100%' }}
          loading="lazy"
        />

        {/* Mobile: Always visible download button */}
        {shouldShowMobileUI ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="absolute top-3 right-3 bg-white/95 hover:bg-white border-white/20 shadow-lg backdrop-blur-sm text-gray-700 hover:text-gray-900 transition-all duration-200"
            >
              {isDownloading ? (
                <div className="w-3 h-3 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                (() => { const DownloadAny = Download as any; return <DownloadAny className="w-3 h-3" />; })()
              )}
            </Button>
          </>
        ) : (
          /* Desktop: Hover-based download button */
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/95 hover:bg-white border-white/20 shadow-xl backdrop-blur-sm text-gray-700 hover:text-gray-900"
          >
            {isDownloading ? (
              <div className="w-3 h-3 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
            ) : (
              (() => { const DownloadAny = Download as any; return <DownloadAny className="w-3 h-3" />; })()
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// New component for displaying multiple images in a grid
export function AIGeneratedImageGrid({
  imageUrls,
  alt = "AI generated images",
  className
}: AIGeneratedImageGridProps) {
  const isMobile = useIsMobile();

  // Responsive grid layout
  const gridCols = isMobile ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2";
  const gap = isMobile ? "gap-3" : "gap-6";

  return (
    <div className={cn("w-full pr-1.5", className)}>

      <div className={cn("grid", gridCols, gap, "auto-rows-max")}>
        {imageUrls.map((imageUrl, index) => (
          <AIGeneratedImage
            key={index}
            imageUrl={imageUrl}
            alt={`${alt} ${index + 1}`}
            className="w-full"
            allImages={imageUrls}
            currentIndex={index}
          />
        ))}
      </div>
    </div>
  );
}
