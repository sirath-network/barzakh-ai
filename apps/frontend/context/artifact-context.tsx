"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ArtifactType = 
  | "code" 
  | "html" 
  | "react" 
  | "markdown" 
  | "image"
  | "svg"
  | "mermaid";

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  language?: string;
  content: string;
  metadata?: {
    fileName?: string;
    lineCount?: number;
    isCombined?: boolean;
    sourceFiles?: string;
  };
}

interface ArtifactContextType {
  currentArtifact: Artifact | null;
  setCurrentArtifact: (artifact: Artifact | null) => void;
  isArtifactOpen: boolean;
  openArtifact: (artifact: Artifact) => void;
  closeArtifact: () => void;
  toggleArtifact: () => void;
}

const ArtifactContext = createContext<ArtifactContextType | undefined>(undefined);

export function ArtifactProvider({ children }: { children: React.ReactNode }) {
  const [currentArtifact, setCurrentArtifact] = useState<Artifact | null>(null);
  const [isArtifactOpen, setIsArtifactOpen] = useState(false);

  const openArtifact = useCallback((artifact: Artifact) => {
    setCurrentArtifact(artifact);
    setIsArtifactOpen(true);
  }, []);

  const closeArtifact = useCallback(() => {
    setIsArtifactOpen(false);
    // Don't clear the artifact immediately to allow smooth animation
    setTimeout(() => {
      setCurrentArtifact(null);
    }, 300);
  }, []);

  const toggleArtifact = useCallback(() => {
    setIsArtifactOpen(prev => !prev);
  }, []);

  return (
    <ArtifactContext.Provider
      value={{
        currentArtifact,
        setCurrentArtifact,
        isArtifactOpen,
        openArtifact,
        closeArtifact,
        toggleArtifact,
      }}
    >
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error("useArtifact must be used within an ArtifactProvider");
  }
  return context;
}

