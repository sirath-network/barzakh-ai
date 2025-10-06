"use client";

import React from "react";
import { FileCode, X } from "lucide-react";
import { useArtifact } from "@/context/artifact-context";
import { Button } from "./ui/button";
import { cn } from "@javin/shared/lib/utils/utils";

export function ArtifactToggle() {
  const { currentArtifact, isArtifactOpen, toggleArtifact } = useArtifact();

  // Don't show if no artifact
  if (!currentArtifact) return null;

  return (
    <Button
      variant={isArtifactOpen ? "default" : "outline"}
      size="sm"
      onClick={toggleArtifact}
      className={cn(
        "gap-2 transition-all",
        isArtifactOpen && "bg-primary text-primary-foreground"
      )}
      title={isArtifactOpen ? "Close artifact viewer" : "Open artifact viewer"}
    >
      {isArtifactOpen ? (
        <>
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Close Artifact</span>
        </>
      ) : (
        <>
          <FileCode className="w-4 h-4" />
          <span className="hidden sm:inline">View Artifact</span>
        </>
      )}
    </Button>
  );
}

