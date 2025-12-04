"use client";

import React from "react";
import { FileCode, X } from "lucide-react";
import { useArtifact } from "@/context/artifact-context";
import { Button } from "./ui/button";
import { cn } from "@barzakh/shared/lib/utils/utils";

export function ArtifactToggle() {
  const { currentArtifact, isArtifactOpen, toggleArtifact } = useArtifact();

  // Don't show if no artifact
  if (!currentArtifact) return null;

  const ButtonAny = Button as any;
  const XAny = X as any;
  const FileCodeAny = FileCode as any;

  return (
    <ButtonAny
      variant={isArtifactOpen ? "default" : "outline"}
      size="icon"
      onClick={toggleArtifact}
      className={cn(
        "h-9 w-9 transition-all",
        isArtifactOpen && "bg-primary text-primary-foreground"
      )}
      title={isArtifactOpen ? "Close artifact viewer" : "Open artifact viewer"}
    >
      {isArtifactOpen ? (
        <XAny className="w-4 h-4" />
      ) : (
        <FileCodeAny className="w-4 h-4" />
      )}
    </ButtonAny>
  );
}

