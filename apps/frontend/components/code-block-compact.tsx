"use client";

import React, { useCallback } from "react";
import { ExternalLink, FileCode, Sparkles, Code2, Play } from "lucide-react";
import { useArtifact } from "@/context/artifact-context";
import { generateUUID } from "@barzakh/shared/lib/utils/utils";
import { cn } from "@barzakh/shared/lib/utils/utils";

const languageConfig = {
  python: { name: 'Python', executable: true, icon: '🐍', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
  javascript: { name: 'JavaScript', executable: true, icon: '⚡', color: 'from-yellow-500/20 to-orange-500/20', border: 'border-yellow-500/30' },
  typescript: { name: 'TypeScript', executable: false, icon: '📘', color: 'from-blue-600/20 to-indigo-600/20', border: 'border-blue-600/30' },
  jsx: { name: 'JSX', executable: false, icon: '⚛️', color: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30' },
  tsx: { name: 'TSX', executable: false, icon: '⚛️', color: 'from-cyan-600/20 to-blue-600/20', border: 'border-cyan-600/30' },
  html: { name: 'HTML', executable: false, icon: '🌐', color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30' },
  css: { name: 'CSS', executable: false, icon: '🎨', color: 'from-pink-500/20 to-purple-500/20', border: 'border-pink-500/30' },
  json: { name: 'JSON', executable: false, icon: '📋', color: 'from-gray-500/20 to-slate-500/20', border: 'border-gray-500/30' },
  bash: { name: 'Bash', executable: false, icon: '💻', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' },
  sql: { name: 'SQL', executable: false, icon: '🗄️', color: 'from-indigo-500/20 to-violet-500/20', border: 'border-indigo-500/30' },
  text: { name: 'Text', executable: false, icon: '📄', color: 'from-gray-400/20 to-gray-500/20', border: 'border-gray-400/30' }
};

type Language = keyof typeof languageConfig;

interface CodeBlockCompactProps {
  className?: string;
  children: React.ReactNode;
  fileName?: string;
}

export function CodeBlockCompact({
  className = '',
  children,
  fileName: initialFileName,
}: CodeBlockCompactProps) {
  const { openArtifact } = useArtifact();
  
  const language = (/language-(\w+)/.exec(className || '')?.[1] || 'text').toLowerCase() as Language;
  const codeContent = String(children).trim();
  const lineCount = codeContent.split('\n').length;
  const langConfig = languageConfig[language] || languageConfig.text;
  const fileName = initialFileName || `file.${language}`;

  // Show preview of first few lines
  const previewLines = codeContent.split('\n').slice(0, 3).join('\n');
  const hasMore = lineCount > 3;

  const handleOpenInArtifact = useCallback(() => {
    openArtifact({
      id: generateUUID(),
      type: language === 'html' ? 'html' : 'code',
      title: fileName,
      language: language,
      content: codeContent,
      metadata: {
        fileName: fileName,
        lineCount: lineCount,
        isExecutable: langConfig.executable,
      },
    });
  }, [openArtifact, language, fileName, codeContent, lineCount, langConfig.executable]);

  return (
    <div className="my-4 max-w-full overflow-hidden group">
      <div className={cn(
        "relative rounded-xl overflow-hidden",
        "bg-gradient-to-br", langConfig.color,
        "border-2", langConfig.border,
        "shadow-lg shadow-black/5",
        "hover:shadow-xl hover:shadow-black/10",
        "hover:scale-[1.01]",
        "transition-all duration-300 ease-out",
        "backdrop-blur-xl"
      )}>
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/20 backdrop-blur">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Icon with glow */}
            <div className="relative">
              <div className="absolute inset-0 blur-md opacity-50">{langConfig.icon}</div>
              <span className="relative text-xl" role="img" aria-label={langConfig.name}>
                {langConfig.icon}
              </span>
            </div>
            
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-bold truncate text-foreground">
                {fileName}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-background/60 text-foreground border border-white/10">
                  {langConfig.name}
                </span>
                <span className="text-[10px] text-muted-foreground/80">
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                </span>
                {langConfig.executable && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                    <Play className="w-2.5 h-2.5" />
                    Executable
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Open Button with shine effect */}
          <button
            onClick={handleOpenInArtifact}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg",
              "bg-gradient-to-r from-primary to-primary/80",
              "text-primary-foreground",
              "shadow-lg shadow-primary/25",
              "hover:shadow-xl hover:shadow-primary/40",
              "hover:scale-105 active:scale-95",
              "transition-all duration-200",
              "border border-white/20",
              "group-hover:animate-pulse"
            )}
            title="Open in artifact viewer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Code Preview with better styling */}
        <div className="relative bg-black/40 backdrop-blur-sm">
          <pre className="text-xs leading-relaxed p-4 overflow-x-auto font-mono">
            <code className="text-gray-300">
              {previewLines}
            </code>
          </pre>
          
          {/* Fade overlay for long code */}
          {hasMore && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 via-black/30 to-transparent pointer-events-none" />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold rounded-full bg-black/60 text-gray-300 border border-white/10 backdrop-blur-sm">
                  <Code2 className="w-3 h-3" />
                  {lineCount - 3} more lines
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer with gradient */}
        <div className="relative px-4 py-2 border-t border-white/10 bg-gradient-to-r from-black/30 to-black/20 backdrop-blur">
          <div className="text-[10px] text-center text-gray-400 font-medium">
            ✨ Click <span className="font-bold text-primary">Open</span> to view full code with syntax highlighting
          </div>
        </div>
      </div>
    </div>
  );
}

