"use client";

import { useState, useEffect, useRef } from "react";
import { X, RotateCcw, ZoomIn, ZoomOut, Minus, Plus, Move, Crop, AlertCircle } from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string;
  onSave: (croppedImage: string) => void;
  onCancel: () => void;
}

export default function ImageCropModal({ imageSrc, onSave, onCancel }: ImageCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null);
  const [currentImageSrc, setCurrentImageSrc] = useState(imageSrc);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(150);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ size: 150, mouseY: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Smaller responsive canvas size
  const [canvasSize, setCanvasSize] = useState(240);
  const [isMobile, setIsMobile] = useState(false);

  const MIN_CROP_SIZE = 50;
  const MAX_CROP_SIZE = Math.min(canvasSize * 0.85, 250);

  const getBaseScale = () => {
    if (!imageElement) return 1;
    const coverageTarget = Math.max(cropSize, canvasSize * 0.85);
    return Math.max(
      coverageTarget / imageElement.width,
      coverageTarget / imageElement.height
    );
  };

  const getDisplayDimensions = () => {
    if (!imageElement) {
      return { width: canvasSize, height: canvasSize };
    }
    const baseScale = getBaseScale();
    return {
      width: imageElement.width * baseScale * scale,
      height: imageElement.height * baseScale * scale,
    };
  };

  const clampPosition = (pos: { x: number; y: number }) => {
    if (!imageElement) return pos;
    const { width, height } = getDisplayDimensions();
    const maxOffsetX = Math.max(0, (width - canvasSize) / 2);
    const maxOffsetY = Math.max(0, (height - canvasSize) / 2);

    return {
      x: Math.min(Math.max(pos.x, -maxOffsetX), maxOffsetX),
      y: Math.min(Math.max(pos.y, -maxOffsetY), maxOffsetY),
    };
  };

  // Update canvas size based on viewport
  useEffect(() => {
    const updateCanvasSize = () => {
      if (typeof window !== 'undefined') {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);

        if (mobile) {
          setCanvasSize(200); // Much smaller for mobile
        } else {
          setCanvasSize(300);
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Load image function
  const loadImage = (src: string) => {
    setIsLoading(true);
    setLoadError(false);

    const img = new Image();

    const isDataUrl = src.startsWith('data:');
    const isBlobUrl = src.startsWith('blob:');
    const isSameOrigin = src.startsWith('/') || src.startsWith(window.location.origin);

    if (!isDataUrl && !isBlobUrl && !isSameOrigin) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      setImageElement(img);
      setImagePosition({ x: 0, y: 0 });
      setCropSize(MAX_CROP_SIZE);
      setScale(1);
      setIsLoading(false);
    };

    img.onerror = (e) => {
      console.error('Image load error:', e);

      if (img.crossOrigin) {
        const retryImg = new Image();

        retryImg.onload = () => {
          setImageElement(retryImg);
          setImagePosition({ x: 0, y: 0 });
          setCropSize(MAX_CROP_SIZE);
          setScale(1);
          setIsLoading(false);
        };

        retryImg.onerror = () => {
          console.error('Retry failed');
          setIsLoading(false);
          setLoadError(true);
        };

        retryImg.src = src;
      } else {
        setIsLoading(false);
        setLoadError(true);
      }
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  };

  // Initial image load
  useEffect(() => {
    return loadImage(currentImageSrc);
  }, [currentImageSrc, MAX_CROP_SIZE]);

  // Handle new image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCurrentImageSrc(result);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (imageElement && canvasRef.current) {
      drawCanvas();
      drawPreview();
    }
  }, [imageElement, imagePosition, scale, cropSize, canvasSize]);

  useEffect(() => {
    if (!imageElement) return;
    setImagePosition(prev => {
      const clamped = clampPosition(prev);
      if (clamped.x === prev.x && clamped.y === prev.y) {
        return prev;
      }
      return clamped;
    });
  }, [scale, canvasSize, imageElement]);

  useEffect(() => {
    setCropSize(prev => Math.min(prev, MAX_CROP_SIZE));
  }, [MAX_CROP_SIZE]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx || !imageElement) return;

    canvas.width = canvasSize;
    canvas.height = canvasSize;
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const baseScale = getBaseScale();
    const displayWidth = imageElement.width * baseScale * scale;
    const displayHeight = imageElement.height * baseScale * scale;

    const imageX = (canvasSize - displayWidth) / 2 + imagePosition.x;
    const imageY = (canvasSize - displayHeight) / 2 + imagePosition.y;

    try {
      ctx.drawImage(imageElement, imageX, imageY, displayWidth, displayHeight);
    } catch (error) {
      console.error('Error drawing image:', error);
      return;
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    const cropX = (canvasSize - cropSize) / 2;
    const cropY = (canvasSize - cropSize) / 2;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cropX + cropSize / 2, cropY + cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cropX + cropSize / 2, cropY + cropSize / 2, cropSize / 2, 0, Math.PI * 2);
    ctx.stroke();
  };

  const drawPreview = () => {
    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas?.getContext('2d', { willReadFrequently: false });
    if (!previewCanvas || !ctx || !imageElement) return;

    const previewSize = isMobile ? 60 : 80; // Smaller preview on mobile
    previewCanvas.width = previewSize;
    previewCanvas.height = previewSize;

    const baseScale = getBaseScale();
    const displayWidth = imageElement.width * baseScale * scale;
    const displayHeight = imageElement.height * baseScale * scale;

    const imageX = (canvasSize - displayWidth) / 2 + imagePosition.x;
    const imageY = (canvasSize - displayHeight) / 2 + imagePosition.y;

    const cropCenterX = canvasSize / 2;
    const cropCenterY = canvasSize / 2;
    const cropRadius = cropSize / 2;

    const cropLeft = cropCenterX - cropRadius - imageX;
    const cropTop = cropCenterY - cropRadius - imageY;
    const cropDisplaySize = cropSize;

    const scaleToOriginal = imageElement.width / displayWidth;
    const sourceX = Math.max(0, cropLeft * scaleToOriginal);
    const sourceY = Math.max(0, cropTop * scaleToOriginal);
    const sourceSize = cropDisplaySize * scaleToOriginal;

    ctx.beginPath();
    ctx.arc(previewSize / 2, previewSize / 2, previewSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.clearRect(0, 0, previewSize, previewSize);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    try {
      ctx.drawImage(
        imageElement,
        sourceX, sourceY, sourceSize, sourceSize,
        0, 0, previewSize, previewSize
      );
    } catch (error) {
      console.error('Error drawing preview:', error);
    }
  };

  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize / rect.width;
    const scaleY = canvasSize / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getTouchPos = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize / rect.width;
    const scaleY = canvasSize / rect.height;

    return {
      x: (e.touches[0].clientX - rect.left) * scaleX,
      y: (e.touches[0].clientY - rect.top) * scaleY
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setImagePosition(prev => {
        const next = {
          x: prev.x + deltaX * 0.5,
          y: prev.y + deltaY * 0.5
        };
        return clampPosition(next);
      });

      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const deltaX = e.touches[0].clientX - dragStart.x;
      const deltaY = e.touches[0].clientY - dragStart.y;

      setImagePosition(prev => {
        const next = {
          x: prev.x + deltaX * 0.3,
          y: prev.y + deltaY * 0.3
        };
        return clampPosition(next);
      });

      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleSave = () => {
    if (!imageElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) return;

    const outputSize = 200;
    canvas.width = outputSize;
    canvas.height = outputSize;

    const baseScale = getBaseScale();
    const displayWidth = imageElement.width * baseScale * scale;
    const displayHeight = imageElement.height * baseScale * scale;

    const imageX = (canvasSize - displayWidth) / 2 + imagePosition.x;
    const imageY = (canvasSize - displayHeight) / 2 + imagePosition.y;

    const cropCenterX = canvasSize / 2;
    const cropCenterY = canvasSize / 2;
    const cropRadius = cropSize / 2;

    const cropLeft = cropCenterX - cropRadius - imageX;
    const cropTop = cropCenterY - cropRadius - imageY;
    const cropDisplaySize = cropSize;

    const scaleToOriginal = imageElement.width / displayWidth;
    const sourceX = Math.max(0, cropLeft * scaleToOriginal);
    const sourceY = Math.max(0, cropTop * scaleToOriginal);
    const sourceSize = cropDisplaySize * scaleToOriginal;

    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    try {
      ctx.drawImage(
        imageElement,
        sourceX, sourceY, sourceSize, sourceSize,
        0, 0, outputSize, outputSize
      );

      const croppedImage = canvas.toDataURL('image/png', 1.0);
      onSave(croppedImage);
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Failed to save image. Please try uploading the image again.');
    }
  };

  const resetCrop = () => {
    if (!imageElement) return;

    setScale(1);
    setImagePosition({ x: 0, y: 0 });
    setCropSize(MAX_CROP_SIZE);
  };

  const zoomIn = () => setScale(prev => Math.min(3, prev + 0.1));
  const zoomOut = () => setScale(prev => Math.max(1, prev - 0.1));
  const increaseSize = () => setCropSize(prev => Math.min(MAX_CROP_SIZE, prev + 10));
  const decreaseSize = () => setCropSize(prev => Math.max(MIN_CROP_SIZE, prev - 10));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl sm:rounded-2xl w-full max-w-sm sm:max-w-3xl shadow-2xl mx-2">

        {/* Header - Compact for mobile */}
        <div className="flex items-center justify-between p-3 sm:p-5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-9 sm:h-9 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center justify-center">
              <Crop className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-900 dark:text-white" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">
                Crop Image
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
                Adjust and crop your profile picture
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 sm:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-3 sm:p-5">
          <div className="flex flex-col lg:grid lg:grid-cols-[auto,280px] gap-4 sm:gap-5">

            {/* Canvas Area - Much smaller for mobile */}
            <div className="flex flex-col items-center">
              <div ref={containerRef} className="relative bg-zinc-50 dark:bg-zinc-950 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] dark:from-zinc-900/50 dark:to-zinc-950 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-zinc-200 dark:border-zinc-800">

                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg sm:rounded-xl z-10">
                    <div className="text-center">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 sm:border-3 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mx-auto mb-1 sm:mb-2"></div>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">Loading...</p>
                    </div>
                  </div>
                )}

                {loadError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-lg sm:rounded-xl z-10">
                    <div className="text-center p-3 sm:p-4">
                      <AlertCircle className="w-6 h-6 sm:w-10 sm:h-10 text-red-500 mx-auto mb-1 sm:mb-2" />
                      <p className="text-xs font-medium text-zinc-900 dark:text-white mb-1">Failed to load</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 sm:mb-3 hidden sm:block">
                        Try uploading a new image
                      </p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs px-2 py-1 sm:px-3 sm:py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                      >
                        Upload New
                      </button>
                    </div>
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  className="w-full rounded-md sm:rounded-lg"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleMouseUp}
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              {/* Canvas Actions */}
              <div className="w-full mt-3 sm:mt-4 flex flex-col sm:flex-row gap-1.5 sm:gap-2">
                <button
                  onClick={resetCrop}
                  className="flex-1 px-3 py-1.5 sm:py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 text-xs sm:text-sm font-medium"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading || loadError}
                  className="flex-1 px-3 py-1.5 sm:py-2 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium"
                >
                  Save
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 px-3 py-1.5 sm:py-2 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors text-xs sm:text-sm font-medium"
                >
                  Cancel
                </button>
              </div>

              {/* Mobile Helper Text */}
              <div className="lg:hidden mt-2 flex items-center justify-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-1">
                  <Move className="w-3 h-3" />
                  <span>Drag to move</span>
                </div>
              </div>
            </div>

            {/* Controls - Compact for mobile */}
            <div className="flex flex-col gap-3 sm:gap-5">

              {/* Live Preview */}
              <div>
                <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2 sm:mb-3">
                  Preview
                </label>
                <div className="flex justify-center">
                  <div className={`relative ${isMobile ? 'w-16 h-16' : 'w-20 h-20'} rounded-full border-2 border-zinc-200 dark:border-zinc-700 overflow-hidden bg-zinc-100 dark:bg-zinc-800`}>
                    <canvas
                      ref={previewCanvasRef}
                      className="w-full h-full"
                      width={isMobile ? 60 : 80}
                      height={isMobile ? 60 : 80}
                    />
                  </div>
                </div>
              </div>

              {/* Zoom Control */}
              <div>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-white">
                    Zoom
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={zoomOut}
                    disabled={scale <= 1}
                    className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ZoomOut className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-900 dark:text-white" />
                  </button>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(Math.max(1, parseFloat(e.target.value)))}
                    className="flex-1 h-1.5 sm:h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer modern-slider"
                  />
                  <button
                    onClick={zoomIn}
                    disabled={scale >= 3}
                    className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-900 dark:text-white" />
                  </button>
                </div>
              </div>

              {/* Crop Size Control */}
              <div>
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <label className="text-sm font-medium text-zinc-900 dark:text-white">
                    Crop Size
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {Math.round(cropSize)}px
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={decreaseSize}
                    disabled={cropSize <= MIN_CROP_SIZE}
                    className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-900 dark:text-white" />
                  </button>
                  <input
                    type="range"
                    min={MIN_CROP_SIZE}
                    max={MAX_CROP_SIZE}
                    step="5"
                    value={cropSize}
                    onChange={(e) => setCropSize(parseInt(e.target.value))}
                    className="flex-1 h-1.5 sm:h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full appearance-none cursor-pointer modern-slider"
                  />
                  <button
                    onClick={increaseSize}
                    disabled={cropSize >= MAX_CROP_SIZE}
                    className="p-1.5 sm:p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-900 dark:text-white" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modern-slider::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #18181b;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .dark .modern-slider::-webkit-slider-thumb {
          background: white;
          border: 2px solid #18181b;
        }
        
        .modern-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        
        .modern-slider::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #18181b;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .dark .modern-slider::-moz-range-thumb {
          background: white;
          border: 2px solid #18181b;
        }
      `}</style>
    </div>
  );
}