"use client";

import { JavinMan } from "./icons";

// Komponen Avatar sederhana tanpa video
export const AssistantAvatar = ({ 
  showIcon = true,
  staticImageSrc,
  size = 32 
}: { 
  showIcon?: boolean;
  staticImageSrc?: string;
  size?: number;
}) => {
  if (!showIcon) return null;

  return (
    <div 
      className="hidden md:flex items-center justify-center rounded-full bg-background overflow-hidden border border-border/20 shadow-sm relative flex-shrink-0"
      style={{ 
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
      }}
    >
      <div
        className="absolute inset-0 w-full h-full flex items-center justify-center"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        {staticImageSrc ? (
          <img 
            src={staticImageSrc} 
            alt="Assistant Avatar" 
            width={size}
            height={size}
            className="w-full h-full object-cover rounded-full"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              maxWidth: `${size}px`,
              maxHeight: `${size}px`,
              objectFit: 'cover',
              imageRendering: 'optimizeQuality',
            }}
          />
        ) : (
          <JavinMan size={Math.floor(size * 0.90)} />
        )}
      </div>
    </div>
  );
};
