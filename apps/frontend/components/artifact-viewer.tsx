"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import {
  X,
  Copy,
  Check,
  Code2,
  FileCode,
  Maximize2,
  Minimize2,
  Download,
  Sparkles,
  Eye
} from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useArtifact, type Artifact } from "@/context/artifact-context";
import { Button } from "./ui/button";
import { cn } from "@barzakh/shared/lib/utils/utils";

type ViewMode = 'preview' | 'code';

export function ArtifactViewer() {
  const { currentArtifact, isArtifactOpen, closeArtifact } = useArtifact();
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  const SparklesAny = Sparkles as any;
  const Minimize2Any = Minimize2 as any;
  const Maximize2Any = Maximize2 as any;
  const XAny = X as any;
  const Code2Any = Code2 as any;
  const EyeAny = Eye as any;
  const DownloadAny = Download as any;
  const CheckAny = Check as any;
  const CopyAny = Copy as any;

  // Create a simple hash of the content to force iframe refresh when content changes
  const contentHash = useCallback(() => {
    if (!currentArtifact?.content) return '';
    // Simple hash function for content change detection
    let hash = 0;
    for (let i = 0; i < currentArtifact.content.length; i++) {
      const char = currentArtifact.content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }, [currentArtifact?.content]);

  const handleCopy = useCallback(async () => {
    if (!currentArtifact) return;

    try {
      await navigator.clipboard.writeText(currentArtifact.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [currentArtifact]);


  const handleDownload = useCallback(() => {
    if (!currentArtifact) return;

    const blob = new Blob([currentArtifact.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = currentArtifact.metadata?.fileName || `artifact.${currentArtifact.language || "txt"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentArtifact]);


  if (!isArtifactOpen || !currentArtifact) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%", opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 250 }}
        className={cn(
          "fixed top-0 right-0 h-full z-40 flex flex-col",
          "bg-background",
          "border-l border-border", // Standard border
          "shadow-2xl shadow-black/10", // Softer shadow
          isFullscreen ? "w-full" : "w-full md:w-[48%] lg:w-[42%]"
        )}
      >
        {/* Header - Flat, Clean */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b bg-secondary/30 backdrop-blur-sm flex-shrink-0">
          <div className="relative flex items-center gap-3 flex-1 min-w-0">
            {/* Styled Icon Container - Matches CodeBlockCompact */}
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background border text-base shrink-0 text-foreground/80 shadow-sm">
              <SparklesAny className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate text-foreground">
                {currentArtifact.title}
              </h3>
              {currentArtifact.metadata?.fileName && (
                <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                  {currentArtifact.metadata.fileName}
                </p>
              )}
            </div>
          </div>

          <div className="relative flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2Any className="w-4 h-4" />
              ) : (
                <Maximize2Any className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeArtifact}
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Close"
            >
              <XAny className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action Bar - Secondary Background */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background/50 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            {currentArtifact.language && (
              <span className="px-2 py-1 text-[10px] font-medium rounded-md bg-primary/10 text-primary border border-primary/20">
                {currentArtifact.language.toUpperCase()}
              </span>
            )}
            {currentArtifact.metadata?.lineCount && (
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                <Code2Any className="w-3 h-3" />
                {currentArtifact.metadata.lineCount} lines
              </span>
            )}

            {/* View Mode Toggle for HTML */}
            {currentArtifact.type === "html" && (
              <div className="flex items-center p-0.5 rounded-md bg-muted border ml-2">
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-sm transition-all",
                    viewMode === 'preview'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Preview only"
                >
                  <EyeAny className="w-3 h-3" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-sm transition-all",
                    viewMode === 'code'
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Code only"
                >
                  <Code2Any className="w-3 h-3" />
                  <span className="hidden sm:inline">Code</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="h-7 gap-1.5 text-[10px] border-input hover:bg-accent hover:text-accent-foreground px-2.5"
            >
              <DownloadAny className="w-3 h-3" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-7 gap-1.5 text-[10px] border-input hover:bg-accent hover:text-accent-foreground px-2.5"
            >
              {isCopied ? (
                <>
                  <CheckAny className="w-3 h-3 text-green-500" />
                  <span className="hidden sm:inline text-green-600 dark:text-green-500">Copied</span>
                </>
              ) : (
                <>
                  <CopyAny className="w-3 h-3" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-card">
          {currentArtifact.type === "code" ? (
            <div className="h-full overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40">
              <SyntaxHighlighter
                language={currentArtifact.language || "text"}
                style={vscDarkPlus}
                showLineNumbers
                wrapLines
                customStyle={{
                  margin: 0,
                  padding: "1.5rem",
                  backgroundColor: "transparent",
                  fontSize: "13px",
                  height: "100%",
                  lineHeight: "1.65",
                }}
                lineNumberStyle={{
                  minWidth: "3em",
                  paddingRight: "1.5em",
                  color: "#858585",
                  userSelect: "none",
                }}
                codeTagProps={{
                  style: {
                    fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Consolas", monospace',
                    fontWeight: "450",
                    letterSpacing: "0.01em",
                  },
                }}
              >
                {currentArtifact.content}
              </SyntaxHighlighter>
            </div>
          ) : currentArtifact.type === "html" ? (
            // HTML with preview/code views
            <div className="h-full">
              {viewMode === 'preview' ? (
                <div className="h-full bg-white overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:hover:bg-gray-400">
                  <iframe
                    key={`${currentArtifact.id}-${contentHash()}`}
                    srcDoc={(() => {
                      // Fix relative paths in HTML content to prevent 404 requests
                      let htmlContent = currentArtifact.content;

                      // Remove or fix script and stylesheet references that would cause 404s
                      htmlContent = htmlContent
                        .replace(/<script[^>]*src=["']([^"']*\.js)["'][^>]*><\/script>/gi, '<!-- Script removed to prevent 404: $1 -->')
                        .replace(/<link[^>]*href=["']([^"']*\.css)["'][^>]*>/gi, '<!-- Stylesheet removed to prevent 404: $1 -->');

                      return htmlContent;
                    })()}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts"
                    title="HTML Preview"
                  />
                </div>
              ) : (
                <div className="h-full overflow-auto bg-[#1e1e1e] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40">
                  <SyntaxHighlighter
                    language="html"
                    style={vscDarkPlus}
                    showLineNumbers
                    wrapLines
                    customStyle={{
                      margin: 0,
                      padding: "1.5rem",
                      backgroundColor: "transparent",
                      fontSize: "13px",
                      height: "100%",
                      lineHeight: "1.65",
                    }}
                    lineNumberStyle={{
                      minWidth: "3em",
                      paddingRight: "1.5em",
                      color: "#858585",
                      userSelect: "none",
                    }}
                    codeTagProps={{
                      style: {
                        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", "Monaco", "Consolas", monospace',
                        fontWeight: "450",
                        letterSpacing: "0.01em",
                      },
                    }}
                  >
                    {currentArtifact.content}
                  </SyntaxHighlighter>
                </div>
              )}
            </div>
          ) : currentArtifact.type === "image" ? (
            <div className="flex items-center justify-center h-full p-4 bg-muted/20">
              <img
                src={currentArtifact.content}
                alt={currentArtifact.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="p-4 overflow-auto h-full [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/40">
              <pre className="whitespace-pre-wrap break-words font-mono text-sm">
                {currentArtifact.content}
              </pre>
            </div>
          )}
        </div>

      </motion.div>
    </AnimatePresence>
  );
}

