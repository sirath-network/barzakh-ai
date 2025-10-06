"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { cn } from "@javin/shared/lib/utils/utils";

type ViewMode = 'preview' | 'code';

export function ArtifactViewer() {
  const { currentArtifact, isArtifactOpen, closeArtifact } = useArtifact();
  const [isCopied, setIsCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

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
          "bg-gradient-to-br from-background via-background to-muted/20",
          "border-l-2 border-primary/20",
          "shadow-2xl shadow-black/20",
          isFullscreen ? "w-full" : "w-full md:w-[48%] lg:w-[42%]"
        )}
      >
        {/* Header with gradient */}
        <div className="relative flex items-center justify-between px-5 py-4 border-b border-border/50 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 flex-shrink-0 backdrop-blur-xl">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center gap-3 flex-1 min-w-0">
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary border border-primary/20 shadow-lg shadow-primary/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base truncate">
                  {currentArtifact.title}
                </h3>
              {currentArtifact.metadata?.fileName && (
                <p className="text-xs text-muted-foreground/80 truncate font-mono">
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
              className="h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeArtifact}
              className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Action Bar with modern design */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50 bg-muted/30 flex-shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {currentArtifact.language && (
              <span className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30">
                {currentArtifact.language.toUpperCase()}
              </span>
            )}
            {currentArtifact.metadata?.lineCount && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Code2 className="w-3.5 h-3.5" />
                {currentArtifact.metadata.lineCount} lines
              </span>
            )}
            
            {/* View Mode Toggle for HTML */}
            {currentArtifact.type === "html" && (
              <div className="flex items-center gap-1 p-1 rounded-lg bg-background/60 border border-border/50">
                <button
                  onClick={() => setViewMode('preview')}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all",
                    viewMode === 'preview'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                  title="Preview only"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button
                  onClick={() => setViewMode('code')}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all",
                    viewMode === 'code'
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                  title="Code only"
                >
                  <Code2 className="w-3.5 h-3.5" />
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
              className="h-9 gap-2 font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-9 gap-2 font-semibold hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="hidden sm:inline text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content Area with better styling */}
        <div className="flex-1 overflow-hidden bg-gradient-to-br from-[#1e1e1e] to-[#252526]">
          {currentArtifact.type === "code" ? (
            <div className="h-full overflow-auto">
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
                  <div className="h-full bg-white overflow-auto">
                    <iframe
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
                  <div className="h-full overflow-auto">
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
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={currentArtifact.content}
                alt={currentArtifact.title}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="p-4 overflow-auto h-full">
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

