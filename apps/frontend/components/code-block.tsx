import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Code2, X, Maximize2, ExternalLink } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark as grayscale } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useArtifact } from '@/context/artifact-context';
import { generateUUID } from '@barzakh/shared/lib/utils/utils';

// --- KONFIGURASI & TIPE ---

const languageConfig = {
  python: { name: 'Python' },
  javascript: { name: 'JavaScript' },
  typescript: { name: 'TypeScript' },
  jsx: { name: 'JSX' },
  tsx: { name: 'TSX' },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  json: { name: 'JSON' },
  bash: { name: 'Bash' },
  sql: { name: 'SQL' },
  text: { name: 'Text' }
};

type Language = keyof typeof languageConfig;

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  fileName?: string;
  showLineNumbers?: boolean;
}

// --- SUB-KOMPONEN ---

const CodeHeader = ({ fileName, langName, lineCount }) => (
  <div className="flex items-center space-x-2">
    <span className="font-medium text-foreground truncate max-w-[180px]">{fileName}</span>
    <div className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground">
      {langName}
    </div>
    <span className="text-xs text-muted-foreground">
      {lineCount} {lineCount === 1 ? 'line' : 'lines'}
    </span>
  </div>
);

const CodeActions = ({ onCopy, isCopied, isCompact = false }) => (
  <div className="flex items-center space-x-2">
    <button onClick={onCopy} className={`flex items-center space-x-1.5 ${isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-muted text-muted-foreground rounded-md border hover:bg-accent transition-colors`} aria-label="Copy code to clipboard">
      {isCopied ? <span role="status" className="flex items-center space-x-1.5 font-medium"><Check className={isCompact ? "w-3 h-3" : "w-4 h-4"} /><span>Copied</span></span> : <span className="flex items-center space-x-1.5"><Copy className={isCompact ? "w-3 h-3" : "w-4 h-4"} /><span>Copy</span></span>}
    </button>
  </div>
);


// --- KOMPONEN UTAMA ---

export function CodeBlock({
  inline = false,
  className = '',
  children,
  fileName: initialFileName,
  showLineNumbers = true,
}: CodeBlockProps) {
  const { openArtifact } = useArtifact();
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // State untuk side-by-side view
  const [panelWidth, setPanelWidth] = useState(50); // 50% width default
  const [isResizingWidth, setIsResizingWidth] = useState(false);
  const resizeWidthRef = useRef<{ startX: number, startWidth: number } | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  useEffect(() => {
    document.body.style.overflow = isFullscreen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isFullscreen]);
  
  // Efek untuk menangani event resize horizontal
  useEffect(() => {
    const handleResizeWidthMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizingWidth || !resizeWidthRef.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - resizeWidthRef.current.startX;
      const containerWidth = document.body.clientWidth;
      let newWidth = resizeWidthRef.current.startWidth + (deltaX / containerWidth) * 100;

      // Batasi ukuran
      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;
      
      setPanelWidth(newWidth);
    };

    const handleResizeWidthEnd = () => {
      setIsResizingWidth(false);
      resizeWidthRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizingWidth) {
      document.addEventListener('mousemove', handleResizeWidthMove);
      document.addEventListener('touchmove', handleResizeWidthMove);
      document.addEventListener('mouseup', handleResizeWidthEnd);
      document.addEventListener('touchend', handleResizeWidthEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeWidthMove);
      document.removeEventListener('touchmove', handleResizeWidthMove);
      document.removeEventListener('mouseup', handleResizeWidthEnd);
      document.removeEventListener('touchend', handleResizeWidthEnd);
    };
  }, [isResizingWidth]);
  
  const handleResizeWidthStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizingWidth(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    resizeWidthRef.current = { startX: clientX, startWidth: panelWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  
  const language = (/language-(\w+)/.exec(className || '')?.[1] || 'text').toLowerCase() as Language;
  const codeContent = String(children).trim();
  const lineCount = codeContent.split('\n').length;
  const langConfig = languageConfig[language] || languageConfig.text;

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

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { console.error('Failed to copy code:', err); }
  }, [codeContent]);


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
      },
    });
  }, [openArtifact, language, fileName, codeContent, lineCount]);

  const handleToggleView = () => {
    if (isMobile) {
      setIsFullscreen(true);
    } else {
      setIsExpanded(!isExpanded);
      if (!isExpanded) {
        setPanelWidth(50); // Reset ke 50% saat pertama kali dibuka
      }
    }
  };

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded-md bg-muted text-sm font-mono">
        {codeContent}
      </code>
    );
  }
  
  const CodeContentDisplay = ({ inModal = false }) => (
    <div className={`flex-1 bg-card ${inModal ? 'overflow-auto' : 'relative'}`}>
      <SyntaxHighlighter 
        language={language} 
        style={grayscale} 
        showLineNumbers={showLineNumbers} 
        wrapLines={true} 
        customStyle={{ 
          margin: 0, 
          padding: '1rem', 
          backgroundColor: 'transparent', 
          fontSize: inModal ? '14px' : '13px', 
          minWidth: '100%',
          ...(inModal && { height: '100%' }) 
        }} 
        codeTagProps={{ 
          style: { 
            fontFamily: '"SF Mono", "Monaco", "Inconsolata", monospace', 
            lineHeight: '1.6' 
          } 
        }}
      >
        {codeContent}
      </SyntaxHighlighter>
    </div>
  );

  const FullscreenModal = () => (
    <div className="fixed inset-0 z-50 bg-card flex flex-col sm:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0">
        <CodeHeader fileName={fileName} langName={langConfig.name} lineCount={lineCount} />
        <button onClick={() => setIsFullscreen(false)} className="p-2 rounded-lg hover:bg-muted" aria-label="Close"><X className="w-5 h-5 text-muted-foreground" /></button>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b flex-shrink-0">
        <span className="text-xs text-muted-foreground">Swipe to scroll</span>
        <CodeActions onCopy={handleCopy} isCopied={isCopied} />
      </div>
      <div className="flex-grow flex flex-col overflow-hidden">
        <CodeContentDisplay inModal={true} />
      </div>
    </div>
  );

  return (
    <>
      <div className="my-4 max-w-full overflow-hidden text-sm group">
        <div className="border rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
            <CodeHeader fileName={fileName} langName={langConfig.name} lineCount={lineCount} />
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenInArtifact}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                title="Open in artifact viewer"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="hidden sm:inline">Open</span>
              </button>
              <button 
                onClick={handleToggleView} 
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background text-foreground border rounded-md hover:bg-muted transition-colors" 
                aria-expanded={isExpanded} 
                aria-label={isExpanded ? 'Hide code block' : 'Show code block'}
              >
                {isExpanded ? (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span className="hidden sm:inline">Collapse</span>
                  </>
                ) : (
                  <>
                    <ChevronRight className="w-3 h-3" />
                    <span className="hidden sm:inline">Expand</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {isExpanded && !isMobile && (
            <div className="flex flex-row relative" style={{ height: '400px' }}>
              {/* Panel Kode */}
              <div 
                className="flex-1 overflow-auto border-r" 
                style={{ width: `${panelWidth}%`, minWidth: '20%' }}
              >
                <div className="flex items-center justify-end px-4 py-2 bg-card border-b">
                  <CodeActions 
                    onCopy={handleCopy} 
                    isCopied={isCopied} 
                    isCompact={true} 
                  />
                </div>
                <CodeContentDisplay />
              </div>
              
              {/* Handle Resize */}
              <div
                className="absolute top-0 bottom-0 w-2 cursor-col-resize bg-muted hover:bg-accent transition-colors z-10"
                style={{ left: `calc(${panelWidth}% - 4px)` }}
                onMouseDown={handleResizeWidthStart}
                onTouchStart={handleResizeWidthStart}
              />
              
              {/* Panel Preview */}
              <div 
                className="flex-1 overflow-auto bg-muted" 
                style={{ width: `${100 - panelWidth}%`, minWidth: '20%' }}
              >
                <div className="p-4 h-full">
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                    <Code2 className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-center">Extended code view</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {isFullscreen && <FullscreenModal />}
    </>
  );
}