"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Eye, X, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader } from "./ui/dialog";
import { cn } from "@javin/shared/lib/utils/utils";

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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `ai-generated-image-${timestamp}.${extension}`;

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
      
      // Provide helpful message for domain restrictions
      if (errorMessage.includes('Domain not allowed')) {
        setDownloadError('Image domain not whitelisted. Opening in new tab instead...');
      } else {
        setDownloadError(`Download failed: ${errorMessage}`);
      }
      
      // Clear error after 5 seconds
      setTimeout(() => setDownloadError(null), 5000);
      
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
        
        // Method 4: Create a temporary download page
        await createMobileDownloadPage(imageUrl, filename);
      }
    }
  };

  const downloadBlobOnMobile = async (blob: Blob, filename: string, isIOS: boolean) => {
    // Method 1: Try Web Share API first (most native experience)
    if (navigator.share && 'canShare' in navigator) {
      try {
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'AI Generated Image',
            text: 'Save this AI generated image'
          });
          return; // Success!
        }
      } catch (shareError) {
        console.warn('Web Share API failed:', shareError);
      }
    }

    // Method 2: Force download using blob URL with better mobile handling
    const blobUrl = URL.createObjectURL(blob);
    
    if (isIOS) {
      // iOS: Create a temporary page that forces download
      const downloadWindow = window.open('', '_blank');
      if (downloadWindow) {
        downloadWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Download Image</title>
            <style>
              body { 
                margin: 0; 
                padding: 20px; 
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                background: #f5f5f5;
                text-align: center;
              }
              .container {
                max-width: 400px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              img { 
                max-width: 100%; 
                height: auto; 
                border-radius: 8px;
                margin: 20px 0;
              }
              .download-btn {
                display: inline-block;
                background: #007AFF;
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                margin: 10px;
              }
              .instructions {
                color: #666;
                font-size: 14px;
                margin-top: 20px;
                line-height: 1.4;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>AI Generated Image</h2>
              <img src="${blobUrl}" alt="AI Generated Image">
              <div>
                <a href="${blobUrl}" download="${filename}" class="download-btn">
                  📱 Download Image
                </a>
              </div>
              <div class="instructions">
                Tap the download button above, or long-press the image and select "Save to Photos"
              </div>
            </div>
            <script>
              // Auto-trigger download
              setTimeout(() => {
                const link = document.createElement('a');
                link.href = '${blobUrl}';
                link.download = '${filename}';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }, 500);
            </script>
          </body>
          </html>
        `);
        downloadWindow.document.close();
      }
    } else {
      // Android: Use a more aggressive download approach
      try {
        // Create hidden iframe for download
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(`
            <html>
            <body>
              <a id="downloadLink" href="${blobUrl}" download="${filename}">Download</a>
              <script>
                document.getElementById('downloadLink').click();
                setTimeout(() => {
                  parent.document.body.removeChild(parent.document.querySelector('iframe[style*="display: none"]'));
                }, 1000);
              </script>
            </body>
            </html>
          `);
          iframeDoc.close();
        }
      } catch (iframeError) {
        // Final fallback: Direct link click
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Multiple click attempts for better compatibility
        setTimeout(() => link.click(), 0);
        setTimeout(() => link.click(), 100);
        setTimeout(() => link.click(), 200);
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 1000);
      }
    }
    
    // Cleanup blob URL after delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  const createMobileDownloadPage = async (imageUrl: string, filename: string) => {
    // Create a dedicated download page as final fallback
    const downloadWindow = window.open('', '_blank');
    if (downloadWindow) {
      downloadWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Download AI Image</title>
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: -apple-system, BlinkMacSystemFont, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-align: center;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: rgba(255,255,255,0.1);
              backdrop-filter: blur(10px);
              border-radius: 20px;
              padding: 30px;
              max-width: 400px;
              width: 90%;
            }
            img { 
              max-width: 100%; 
              height: auto; 
              border-radius: 12px;
              margin: 20px 0;
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            }
            .download-btn {
              display: inline-block;
              background: rgba(255,255,255,0.2);
              color: white;
              padding: 15px 30px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 600;
              margin: 15px 0;
              border: 2px solid rgba(255,255,255,0.3);
              transition: all 0.3s ease;
            }
            .download-btn:hover {
              background: rgba(255,255,255,0.3);
              transform: translateY(-2px);
            }
            .instructions {
              font-size: 14px;
              margin-top: 20px;
              line-height: 1.6;
              opacity: 0.9;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>🎨 AI Generated Image</h2>
            <img src="${imageUrl}" alt="AI Generated Image" crossorigin="anonymous">
            <div>
              <a href="${imageUrl}" download="${filename}" class="download-btn">
                📥 Download Image
              </a>
            </div>
            <div class="instructions">
              Tap the download button above.<br>
              If that doesn't work, long-press the image and select "Save Image" or "Download Image"
            </div>
          </div>
        </body>
        </html>
      `);
      downloadWindow.document.close();
    }
    
    // Show success message
    setDownloadError('Download page opened in new tab. Tap the download button there.');
    setTimeout(() => setDownloadError(null), 5000);
  };

  const downloadImageOnMobile = async (dataUrl: string, filename: string) => {
    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Try native share API first (works well on mobile)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'AI Generated Image',
            text: 'Save AI generated image'
          });
          return;
        }
      }
      
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
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className="max-w-full my-4 p-6 bg-muted/50 rounded-lg border border-border/20 text-center">
        <div className="text-muted-foreground">
          <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Failed to load generated image</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => window.open(imageUrl, '_blank')}
          >
            Open in new tab
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-full my-6 group", className)}>
      <div 
        className="relative rounded-xl overflow-hidden border border-border/30 shadow-xl bg-gradient-to-br from-muted/20 to-muted/5 max-w-lg mx-auto backdrop-blur-sm"
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
        </div>

        {/* Hover Overlay with Actions */}
        <AnimatePresence>
          {isHovered && (
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
                        className="bg-white/95 hover:bg-white text-black shadow-xl border-0 backdrop-blur-sm"
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
                    className="bg-white/95 hover:bg-white text-black shadow-xl border-0 backdrop-blur-sm"
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
                    className="bg-white/95 hover:bg-white text-black shadow-xl border-0 backdrop-blur-sm"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
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

        {/* Subtle info badge */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 px-3 py-1.5 bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-medium"
            >
              <Eye className="w-3 h-3" />
              <span>AI Generated</span>
            </motion.div>
            
            {!isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="px-2 py-1 bg-black/50 backdrop-blur-md rounded-full text-white text-xs opacity-70"
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    
    try {
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
      const filename = `ai-generated-image-${timestamp}.${extension}`;

      // Check if it's a data URL (base64)
      if (imageUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // For external URLs, try fetch first
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
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Eye className="w-3 h-3" />
        <span>AI Generated Image</span>
      </div>
      
      <div className="relative group">
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-auto rounded-lg border border-border/20 object-cover"
          style={{ maxHeight: '300px', objectFit: 'cover' }}
          loading="lazy"
        />
        
        {/* Compact Download Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 hover:bg-white text-black shadow-lg"
        >
          <Download className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
