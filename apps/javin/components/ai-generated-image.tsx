"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Eye, X, Copy, Check, AlertCircle, Share } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "./ui/dialog";
import { cn } from "@javin/shared/lib/utils/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { checkUrlExpiration } from "@/lib/image-storage";

interface AIGeneratedImageProps {
  imageUrl: string;
  alt?: string;
  className?: string;
}

export function AIGeneratedImage({ 
  imageUrl, 
  alt = "AI generated image",
  className 
}: AIGeneratedImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [isExpiredUrl, setIsExpiredUrl] = useState(false);
  
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
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      // Check if it's a data URL (base64)
      if (imageUrl.startsWith('data:')) {
        if (isMobile) {
          // Mobile: Use different approach for data URLs
          await downloadImageOnMobile(imageUrl, filename);
        } else {
          // Desktop: Direct download
          const link = document.createElement('a');
          link.href = imageUrl;
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
        await handleMobileDownload(imageUrl, filename, isIOS);
      } else {
        // Desktop download strategy
        try {
          // First try: Direct fetch (works for same-origin or CORS-enabled images)
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
          await downloadViaProxy(imageUrl, filename);
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
    
    // Show clear instructions for mobile users
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      setDownloadError('📱 Image opened in new tab. Tap and hold the image, then select "Save to Photos" or "Add to Photos".');
    } else if (isMobile) {
      setDownloadError('📱 Image opened in new tab. Long-press the image and select "Download image" or "Save image".');
    } else {
      setDownloadError('🖥️ Image opened in new tab. Right-click the image and select "Save image as..."');
    }
    
    setTimeout(() => setDownloadError(null), 8000);
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
      await navigator.clipboard.writeText(imageUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

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
      <div className="max-w-full my-4 p-6 bg-gradient-to-br from-gray-900/50 to-red-950/30 rounded-lg border border-red-900/40 text-center">
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
    <div className={cn("max-w-full my-6 group", className)}>
      <div 
        className="relative rounded-lg overflow-hidden border border-red-900/40 shadow-xl bg-gradient-to-br from-gray-900 to-red-950/30 max-w-lg mx-auto"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Enhanced Image Container */}
        <div className="relative">
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-auto block object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            style={{ maxHeight: '500px', objectFit: 'cover' }}
            onError={handleImageError}
            loading="lazy"
          />
          
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent pointer-events-none" />
          
          {/* Mobile Download Instructions Overlay */}
          {shouldShowMobileUI && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-4 text-white">
              <div className="text-sm font-medium mb-1">📱 To Download:</div>
              <div className="text-xs text-gray-200 leading-relaxed">
                {/iPad|iPhone|iPod/.test(navigator.userAgent) ? (
                  "Tap download button → Tap & hold image → Save to Photos"
                ) : (
                  "Tap download button → Long-press image → Download image"
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
              className="bg-red-600 hover:bg-red-700 text-white shadow-lg border border-red-500/50"
            >
              {isDownloading ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Download className="w-4 h-4" />
              )}
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white shadow-xl border border-red-700/50 backdrop-blur-sm"
                  style={{
                    boxShadow: '0 8px 20px rgba(139, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
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
                    src={imageUrl}
                    alt={alt}
                    className="w-full h-auto rounded-lg"
                    style={{ maxHeight: '80vh', objectFit: 'contain' }}
                  />
                  
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
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="flex gap-3">
                {/* Preview Button */}
                <Dialog>
                  <DialogTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white shadow-lg border border-red-500/50"
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
                        src={imageUrl}
                        alt={alt}
                        className="w-full h-auto rounded-lg"
                        style={{ maxHeight: '80vh', objectFit: 'contain' }}
                      />
                      
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
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg border border-red-500/50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </motion.div>

                {/* Copy URL Button */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopyUrl}
                    className="bg-red-600 hover:bg-red-700 text-white shadow-lg border border-red-500/50"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {isCopied ? 'Copied!' : 'Copy'}
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-red-200 text-xs opacity-80"
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
    <div className={cn("max-w-sm mx-auto", className)}>
      {/* Compact Header */}
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-400">
        <span>AI Generated Image</span>
      </div>
      
      <div className="relative group border border-red-900/40 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-red-950/30"
      >
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-auto object-cover filter drop-shadow-lg"
          style={{ maxHeight: '300px', objectFit: 'cover' }}
          loading="lazy"
        />
        
        {/* Mobile: Always visible download button with dark fantasy theme */}
        {shouldShowMobileUI ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
            className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white shadow-lg border border-red-500/50"
        >
            {isDownloading ? (
              <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
          <Download className="w-3 h-3" />
            )}
        </Button>
        ) : (
          /* Desktop: Hover-based download button with dark fantasy theme */
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white shadow-lg border border-red-700/50"
            style={{
              boxShadow: '0 6px 16px rgba(139, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}
          >
            <Download className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
