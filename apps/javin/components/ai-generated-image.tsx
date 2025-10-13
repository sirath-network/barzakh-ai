"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Eye, X, Copy, Check, AlertCircle, Share, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "./ui/dialog";
import { cn } from "@javin/shared/lib/utils/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { checkUrlExpiration } from "@/lib/image-storage";

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
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [isExpiredUrl, setIsExpiredUrl] = useState(false);
  
  // Navigation state for multiple images
  const [currentImageIndex, setCurrentImageIndex] = useState(currentIndex);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Get current image for display
  const currentImage = allImages && allImages.length > 1 
    ? allImages[currentImageIndex] 
    : imageUrl;
  
  const isMobile = useIsMobile();
  
  // Check if URL is expired on component mount
  useEffect(() => {
    // Only check expiration for URLs that have signed URL parameters
    if (imageUrl.includes('X-Goog-Expires') || imageUrl.includes('Expires')) {
      const urlInfo = checkUrlExpiration(imageUrl);
      if (urlInfo.isExpired) {
        setIsExpiredUrl(true);
        setImageError(true);
      }
    }
  }, [imageUrl]);
  
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
    // Skip Web Share API - go directly to URL opening for mobile
    // This prevents the unwanted share popup
    
    console.log('📱 Skipping Web Share API, opening image directly for mobile download');
    
    // Direct image opening without share popup
    await openImageForMobileDownload(imageUrl, filename);
  };

  const openImageForMobileDownload = async (imageUrl: string, filename: string) => {
    // For mobile: Use ORIGINAL Fireworks URL (not proxy) as requested
    const urlToUse = imageUrl; // Always use original URL
    
    console.log('📱 Opening original image URL for mobile download:', urlToUse);
    
    // Open image directly in new tab
    window.open(urlToUse, '_blank');
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


  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(currentImage);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
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
  };

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

  if (imageError) {
    return (
      <div className="max-w-full p-6 bg-muted/50 rounded-2xl border border-border/40 text-center">
        <div className="text-muted-foreground">
          {isExpiredUrl ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-800 to-red-950/50 rounded-lg flex items-center justify-center border border-red-800/30">
                <Eye className="w-8 h-8 text-red-400/70" />
              </div>
              <p className="text-red-300/80 font-medium mb-2">Image expired — auto-deleted after 1h</p>
              <p className="text-gray-400 text-xs mb-4">Barzakh AI generates temporary links for security</p>
              <div className="space-y-2">
                <p className="text-gray-300 text-sm">💡 What you can do:</p>
                <div className="text-xs text-gray-400 leading-relaxed">
                  • Generate a new image with the same prompt<br/>
                  • Download images immediately after generation<br/>
                  • Save important images right away
                </div>
              </div>
            </>
          ) : (
            <>
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
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
        className="relative rounded-3xl overflow-hidden border border-border/20 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-muted/40 to-muted/20 inline-block w-fit max-w-full group/image"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Enhanced Image Container */}
        <div className="relative overflow-hidden rounded-3xl">
          <img
            src={imageUrl}
            alt={alt}
            className="block object-contain max-w-full transition-transform duration-300 group-hover/image:scale-[1.02]"
            style={{ maxHeight: '400px', width: 'auto' }}
            onError={handleImageError}
            loading="lazy"
          />
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent pointer-events-none" />
          
          {/* Mobile Download Instructions Overlay */}
          {shouldShowMobileUI && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3 text-white">
              <div className="text-xs font-medium mb-1 flex items-center gap-1">
                <Download className="w-3 h-3" />
                Download
              </div>
              <div className="text-xs text-gray-200 leading-relaxed">
                {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                  "Tap button → Hold image → Save to Photos"
                ) : (
                  "Tap button → Long-press image → Download"
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Action Buttons - Always visible on mobile */}
        {shouldShowMobileUI && (
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={isDownloading}
              className="bg-white/95 hover:bg-white border-white/20 shadow-lg backdrop-blur-sm text-gray-700 hover:text-gray-900 transition-all duration-200"
            >
              {isDownloading ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-white/95 hover:bg-white border-white/20 shadow-lg backdrop-blur-sm text-gray-700 hover:text-gray-900 transition-all duration-200"
                  onClick={handlePreviewOpen}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl w-full p-2">
                <DialogHeader>
                  <DialogTitle className="sr-only">
                    AI Generated Image Preview
                  </DialogTitle>
                </DialogHeader>
                <div className="relative">
                  <img
                    src={currentImage}
                    alt={alt}
                    className="w-full h-auto rounded-lg"
                    style={{ maxHeight: '70vh', objectFit: 'contain' }}
                  />
                  
                  {/* Navigation for multiple images */}
                  {allImages && allImages.length > 1 && (
                    <>
                      {/* Image counter */}
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {allImages.length}
                      </div>
                      
                      {/* Previous button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToPreviousImage}
                        className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      
                      {/* Next button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={goToNextImage}
                        className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </>
                  )}
                  
                  {/* Mobile Preview Actions */}
                  <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyUrl}
                      className="bg-white/90 hover:bg-white text-black shadow-lg"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 mr-1 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      {isCopied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="bg-white/90 hover:bg-white text-black shadow-lg"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Desktop Hover Overlay with Actions */}
        <AnimatePresence>
          {!shouldShowMobileUI && isHovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/40 to-black/20 backdrop-blur-md flex items-center justify-center"
            >
              <div className="flex gap-3">
                {/* Preview Button */}
                <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                  <DialogTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-white/95 hover:bg-white border-white/20 shadow-xl backdrop-blur-sm text-gray-700 hover:text-gray-900 transition-all duration-200 px-4 py-2"
                        onClick={handlePreviewOpen}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full p-2">
                    <DialogHeader>
                      <DialogTitle className="sr-only">
                        AI Generated Image Preview
                      </DialogTitle>
                    </DialogHeader>
                    <div className="relative">
                      <img
                        src={currentImage}
                        alt={alt}
                        className="w-full h-auto rounded-lg"
                        style={{ maxHeight: '70vh', objectFit: 'contain' }}
                      />
                      
                      {/* Navigation for multiple images */}
                      {allImages && allImages.length > 1 && (
                        <>
                          {/* Image counter */}
                          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                            {currentImageIndex + 1} / {allImages.length}
                          </div>
                          
                          {/* Previous button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToPreviousImage}
                            className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </Button>
                          
                          {/* Next button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={goToNextImage}
                            className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </Button>
                        </>
                      )}
                      
                      {/* Preview Actions */}
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleCopyUrl}
                          className="bg-white/90 hover:bg-white text-black shadow-lg"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 mr-1 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 mr-1" />
                          )}
                          {isCopied ? 'Copied!' : 'Copy URL'}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleDownload}
                          disabled={isDownloading}
                          className="bg-white/90 hover:bg-white text-black shadow-lg"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {isDownloading ? 'Downloading...' : 'Download'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Download Button */}
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="bg-white/95 hover:bg-white border-white/20 shadow-xl backdrop-blur-sm text-gray-700 hover:text-gray-900 transition-all duration-200 px-4 py-2"
                  >
                    {isDownloading ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </motion.div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simple Info Badge */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex justify-end">
            {!isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                className="px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full text-gray-600 text-xs font-medium border border-white/20 shadow-lg"
              >
                Powered by Barzakh
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {downloadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-md border border-red-200 dark:border-red-800"
          >
            <AlertCircle className="w-3 h-3 flex-shrink-0" />
            <span className="flex-1">{downloadError}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDownloadError(null)}
              className="h-auto p-0 text-red-600 hover:text-red-700"
            >
              <X className="w-3 h-3" />
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
        if (isMobileDevice) {
          // Mobile: Skip Web Share API to avoid unwanted share popup
          console.log('📱 Mobile detected - skipping Web Share API');
        }
        
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
          
          // Skip Web Share API to avoid unwanted share popup
          
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
          
        } catch (mobileError) {
          console.warn('Mobile download failed:', mobileError);
          
          // Final mobile fallback: Open in new tab with instructions
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
      
      <div className="relative group border border-border/20 rounded-3xl overflow-hidden bg-gradient-to-br from-muted/40 to-muted/20 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <img
          src={imageUrl}
          alt={alt}
          className="block object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          style={{ maxHeight: '300px', width: 'auto' }}
          loading="lazy"
        />
        
        {/* Mobile: Always visible download button */}
        {shouldShowMobileUI ? (
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
            <Download className="w-3 h-3" />
          )}
        </Button>
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
              <Download className="w-3 h-3" />
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
    <div className={cn("w-full my-4", className)}>
      
      <div className={cn("grid", gridCols, gap)}>
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
