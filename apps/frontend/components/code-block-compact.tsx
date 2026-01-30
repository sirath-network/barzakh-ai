"use client";

import React, { useCallback, useMemo } from "react";
import { ExternalLink, FileCode, Sparkles, Code2, Eye } from "lucide-react";
import { useArtifact } from "@/context/artifact-context";
import { generateUUID } from "@barzakh/shared/lib/utils/utils";
import { cn } from "@barzakh/shared/lib/utils/utils";
import { combineWebFiles, type WebFile } from "@/lib/combine-web-files";

const languageConfig = {
  python: { name: 'Python', icon: '🐍' },
  javascript: { name: 'JavaScript', icon: '⚡' },
  typescript: { name: 'TypeScript', icon: '📘' },
  jsx: { name: 'JSX', icon: '⚛️' },
  tsx: { name: 'TSX', icon: '⚛️' },
  html: { name: 'HTML', icon: '🌐' },
  css: { name: 'CSS', icon: '🎨' },
  json: { name: 'JSON', icon: '📋' },
  bash: { name: 'Bash', icon: '💻' },
  sql: { name: 'SQL', icon: '🗄️' },
  text: { name: 'Text', icon: '📄' }
};

type Language = keyof typeof languageConfig;

interface CodeBlockCompactProps {
  className?: string;
  children: React.ReactNode;
  fileName?: string;
  allCodeBlocks?: WebFile[]; // All code blocks from the same message for combining
}

export function CodeBlockCompact({
  className = '',
  children,
  fileName: initialFileName,
  allCodeBlocks = [],
}: CodeBlockCompactProps) {
  const { openArtifact } = useArtifact();

  const EyeAny = Eye as any;
  const SparklesAny = Sparkles as any;
  const ExternalLinkAny = ExternalLink as any;
  const Code2Any = Code2 as any;

  const language = (/language-(\w+)/.exec(className || '')?.[1] || 'text').toLowerCase() as Language;
  const codeContent = String(children).trim();
  const lineCount = codeContent.split('\n').length;
  const langConfig = languageConfig[language] || languageConfig.text;

  // Check if this message has multiple web files that can be combined
  const webFiles = useMemo(() => {
    return allCodeBlocks.filter(f =>
      ['html', 'css', 'javascript', 'js'].includes(f.language.toLowerCase())
    );
  }, [allCodeBlocks]);

  const canShowPreview = webFiles.length > 0 &&
    ['html', 'css', 'javascript', 'js'].includes(language);

  // Smart filename detection from code content
  const detectFileNameFromContent = (code: string, lang: string): string => {
    const lines = code.split('\n').slice(0, 5); // Check first 5 lines

    // Try to find file path in comments
    for (const line of lines) {
      // Python, Bash, SQL: # path/to/file.ext
      const hashMatch = line.match(/^#\s+(.+?\.(py|sh|sql|js|ts|jsx|tsx|html|css|json|txt|yaml|yml|md|go|rs|java|cpp|c|h))\s*$/i);
      if (hashMatch) {
        const fullPath = hashMatch[1];
        return fullPath.split('/').pop() || fullPath.split('\\').pop() || fullPath;
      }

      // JavaScript/TypeScript/CSS: // path/to/file.ext
      const slashMatch = line.match(/^\/\/\s+(.+?\.(js|ts|jsx|tsx|html|css|json|txt|yaml|yml|md))\s*$/i);
      if (slashMatch) {
        const fullPath = slashMatch[1];
        return fullPath.split('/').pop() || fullPath.split('\\').pop() || fullPath;
      }

      // HTML: <!-- path/to/file.ext -->
      const htmlMatch = line.match(/^<!--\s+(.+?\.(html|htm))\s+-->\s*$/i);
      if (htmlMatch) {
        const fullPath = htmlMatch[1];
        return fullPath.split('/').pop() || fullPath.split('\\').pop() || fullPath;
      }
    }

    // Fallback: Smart defaults based on language
    const smartDefaults: Record<string, string> = {
      python: 'main.py',
      javascript: 'index.js',
      typescript: 'main.ts',
      jsx: 'App.jsx',
      tsx: 'App.tsx',
      html: 'index.html',
      css: 'styles.css',
      json: 'data.json',
      bash: 'script.sh',
      sql: 'query.sql',
      text: 'file.txt'
    };
    return smartDefaults[lang] || `file.${lang}`;
  };

  const fileName = initialFileName || detectFileNameFromContent(codeContent, language);

  // Show preview of first few lines
  const previewLines = codeContent.split('\n').slice(0, 3).join('\n');
  const hasMore = lineCount > 3;

  const handleOpenInArtifact = useCallback(() => {
    // If we have multiple web files, combine them for preview
    if (canShowPreview && webFiles.length > 1) {
      const combinedHTML = combineWebFiles(webFiles);
      openArtifact({
        id: generateUUID(),
        type: 'html',
        title: 'Combined Preview',
        language: 'html',
        content: combinedHTML,
        metadata: {
          fileName: 'preview.html',
          lineCount: combinedHTML.split('\n').length,
          isCombined: true,
          sourceFiles: webFiles.map(f => f.fileName).join(', '),
        },
      });
    } else {
      // Single file view
      openArtifact({
        id: generateUUID(),
        type: language === 'html' ? 'html' : 'code',
        title: fileName,
        language: language,
        content: codeContent,
        metadata: {
          fileName: fileName,
          lineCount: lineCount,
        },
      });
    }
  }, [openArtifact, language, fileName, codeContent, lineCount, canShowPreview, webFiles]);

  return (
    <div className="my-3 max-w-full min-w-0">
      <div className={cn(
        "relative rounded-lg overflow-hidden max-w-full",
        "bg-card border", // Standard card background and border
        "shadow-sm"       // Minimal static shadow
      )}>

        {/* Header - Flat, solid background with subtle contrast */}
        <div className="relative flex items-center justify-between px-3 py-2.5 bg-secondary/30 backdrop-blur-sm border-b">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Styled Icon Container */}
            <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background border text-base shadow-sm shrink-0">
              {langConfig.icon}
            </div>

            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium truncate text-foreground">
                {fileName}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="px-1.5 py-px text-[10px] font-medium rounded-md border bg-muted/50 text-muted-foreground">
                  {langConfig.name}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                </span>
              </div>
            </div>
          </div>

          {/* Flat Outline Action Button */}
          <button
            onClick={handleOpenInArtifact}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md",
              "border bg-background text-foreground", // Outline style
              "hover:bg-muted hover:text-foreground", // Clean hover
              "transition-colors shadow-sm"
            )}
            title={canShowPreview && webFiles.length > 1 ? "Preview combined files" : "Open in artifact viewer"}
          >
            {canShowPreview && webFiles.length > 1 ? (
              <>
                <EyeAny className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Preview</span>
              </>
            ) : (
              <>
                <span>Open</span>
                <ExternalLinkAny className="w-3.5 h-3.5 text-muted-foreground" />
              </>
            )}
          </button>
        </div>

        {/* Code Preview - Flat solid background */}
        <div className="relative bg-muted/20 max-w-full overflow-hidden">
          <pre className="text-xs leading-relaxed p-4 overflow-x-auto font-mono max-w-full break-words">
            <code className="text-muted-foreground/90 break-words">
              {previewLines}
            </code>
          </pre>

          {/* Simple Fade overlay */}
          {hasMore && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none opacity-80" />
              <div className="absolute bottom-2 left-0 right-0 text-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-full bg-background border text-muted-foreground shadow-sm">
                  <Code2Any className="w-3 h-3" />
                  {lineCount - 3} more lines
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


