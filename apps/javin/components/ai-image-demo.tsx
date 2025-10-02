"use client";

import React from "react";
import { AIGeneratedImage, AIGeneratedImageCompact } from "./ai-generated-image";

// Demo component to showcase the enhanced AI image functionality
export function AIImageDemo() {
  const sampleImageUrl = "https://picsum.photos/800/600"; // Sample image for demo

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold mb-4">AI Generated Image Components</h2>
        <p className="text-muted-foreground mb-6">
          Enhanced image components with preview and download functionality for AI-generated images.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3">Full Featured Component</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Hover over the image to see preview and download options.
          </p>
          <AIGeneratedImage 
            imageUrl={sampleImageUrl}
            alt="Sample AI generated image"
          />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">Compact Version</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Minimal version with just download on hover.
          </p>
          <div className="max-w-md">
            <AIGeneratedImageCompact 
              imageUrl={sampleImageUrl}
              alt="Sample AI generated image compact"
            />
          </div>
        </div>
      </div>

      <div className="bg-muted/30 p-4 rounded-lg">
        <h4 className="font-medium mb-2">Features:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Hover overlay with action buttons</li>
          <li>• Full-screen preview modal</li>
          <li>• One-click download with auto-generated filename</li>
          <li>• Copy image URL to clipboard</li>
          <li>• Error handling for failed image loads</li>
          <li>• Responsive design with smooth animations</li>
          <li>• Loading states and visual feedback</li>
        </ul>
      </div>
    </div>
  );
}
