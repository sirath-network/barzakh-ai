"use client";

import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@javin/shared/lib/utils/utils";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  fullscreen?: boolean;
  className?: string;
  showHandle?: boolean; // Prop untuk menampilkan/menyembunyikan handle
  maxHeight?: string; // Prop untuk mengatur max height custom
  snapPoints?: number[]; // Snap points untuk drag behavior (dalam persen)
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  fullscreen = false,
  className,
  showHandle = true,
  maxHeight = "90vh",
  snapPoints = [0.3, 0.6, 0.9], // Default snap points
}: BottomSheetProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [currentSnapPoint, setCurrentSnapPoint] = useState(snapPoints[snapPoints.length - 1]);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Mencegah body scroll saat sheet terbuka
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Prevent zoom on iOS
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      // Mengembalikan scroll setelah animasi exit selesai
      setTimeout(() => {
        document.body.style.overflow = "";
        document.body.style.position = "";
        document.body.style.width = "";
      }, 300);
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  // Find closest snap point
  const findClosestSnapPoint = (dragOffset: number, sheetHeight: number) => {
    const dragPercent = Math.abs(dragOffset) / sheetHeight;
    const currentIndex = snapPoints.findIndex(point => Math.abs(point - currentSnapPoint) < 0.01);
    
    if (dragOffset > 0) { // Dragging down
      const nextIndex = Math.max(0, currentIndex - 1);
      return snapPoints[nextIndex];
    } else { // Dragging up
      const nextIndex = Math.min(snapPoints.length - 1, currentIndex + 1);
      return snapPoints[nextIndex];
    }
  };

  // Menangani gestur drag untuk menutup sheet atau snap ke posisi tertentu
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const dragVelocity = info.velocity.y;
    const dragOffset = info.offset.y;
    const sheetHeight = sheetRef.current?.clientHeight || 0;

    // Tutup jika di-drag ke bawah dengan cepat atau offset besar
    if (dragVelocity > 500 || dragOffset > sheetHeight * 0.4) {
      onClose();
      return;
    }

    // Snap ke posisi terdekat untuk drag kecil
    if (Math.abs(dragOffset) > 50) {
      const newSnapPoint = findClosestSnapPoint(dragOffset, sheetHeight);
      setCurrentSnapPoint(newSnapPoint);
    }
  };

  const sheetContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Konten Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 z-50 flex w-full flex-col",
              "bg-background/95 backdrop-blur-md text-foreground shadow-2xl",
              "border-t border-border/50",
              fullscreen
                ? "top-0 h-full rounded-none"
                : `max-h-[${maxHeight}] rounded-t-3xl`,
              // Mobile optimizations
              "touch-pan-y overscroll-contain",
              className,
            )}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 30,
              mass: 0.8 
            }}
            style={{
              height: fullscreen ? "100%" : `${currentSnapPoint * 100}vh`,
            }}
          >
            {/* Header dengan Handle */}
            {showHandle && (
              <motion.div 
                className="flex-shrink-0 cursor-grab active:cursor-grabbing p-4 pt-3 pb-2"
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                onDragEnd={handleDragEnd}
              >
                <div className="mx-auto h-1.5 w-12 rounded-full bg-muted-foreground/30 mb-2" />
                {title && (
                  <h2 className="text-center text-lg font-semibold text-foreground/90">
                    {title}
                  </h2>
                )}
              </motion.div>
            )}

            {/* Title tanpa handle */}
            {!showHandle && title && (
              <div className="flex-shrink-0 p-4 pb-2 border-b border-border/20">
                <h2 className="text-center text-lg font-semibold text-foreground/90">
                  {title}
                </h2>
              </div>
            )}

            {/* Konten Scrollable */}
            <div 
              className={cn(
                "flex-1 overflow-y-auto min-h-0",
                // Custom scrollbar untuk mobile
                "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
                // Smooth scrolling
                "scroll-smooth",
                // Padding adjustment
                showHandle || title ? "" : "pt-4"
              )}
              style={{
                // Prevent momentum scrolling issues on iOS
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
              }}
            >
              <div className="px-4 pb-4">
                {children}
              </div>
            </div>

            {/* Safe area untuk mobile devices */}
            <div className="flex-shrink-0 h-safe-area-inset-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  if (!isMounted) {
    return null;
  }

  return createPortal(sheetContent, document.body);
}