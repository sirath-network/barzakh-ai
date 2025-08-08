import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Copy, Check, Play, Terminal, ChevronDown, ChevronRight, Code2, X, Maximize2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark as grayscale } from 'react-syntax-highlighter/dist/cjs/styles/prism';

// --- KONFIGURASI & TIPE ---
const DEFAULT_OUTPUT_HEIGHT = 192; // Default: 192px (h-48)
const MIN_OUTPUT_HEIGHT = 80;    // Min height 80px
const MAX_OUTPUT_HEIGHT_RATIO = 0.8; // Max 80% of viewport height

const languageConfig = {
  python: { name: 'Python', executable: true },
  javascript: { name: 'JavaScript', executable: true },
  typescript: { name: 'TypeScript', executable: false },
  jsx: { name: 'JSX', executable: false },
  tsx: { name: 'TSX', executable: false },
  html: { name: 'HTML', executable: false },
  css: { name: 'CSS', executable: false },
  json: { name: 'JSON', executable: false },
  bash: { name: 'Bash', executable: false },
  sql: { name: 'SQL', executable: false },
  text: { name: 'Text', executable: false }
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
    <span className="font-medium text-gray-900 truncate max-w-[180px]">{fileName}</span>
    <div className="px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
      {langName}
    </div>
    <span className="text-xs text-gray-500">
      {lineCount} {lineCount === 1 ? 'line' : 'lines'}
    </span>
  </div>
);

const CodeActions = ({ onCopy, onRun, isCopied, isRunning, isExecutable, isCompact = false }) => (
  <div className="flex items-center space-x-2">
    {isExecutable && (
      <button onClick={onRun} disabled={isRunning} className={`flex items-center space-x-1.5 ${isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-white text-gray-800 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:text-gray-400`} aria-label="Run code snippet">
        <Play className={isCompact ? "w-3 h-3" : "w-4 h-4"} />
        <span>{isRunning ? 'Running...' : 'Run'}</span>
      </button>
    )}
    <button onClick={onCopy} className={`flex items-center space-x-1.5 ${isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} bg-gray-100 text-gray-800 rounded-md border border-gray-300 hover:bg-gray-200 transition-colors`} aria-label="Copy code to clipboard">
      {isCopied ? <span role="status" className="flex items-center space-x-1.5 font-medium"><Check className={isCompact ? "w-3 h-3" : "w-4 h-4"} /><span>Copied</span></span> : <span className="flex items-center space-x-1.5"><Copy className={isCompact ? "w-3 h-3" : "w-4 h-4"} /><span>Copy</span></span>}
    </button>
  </div>
);

/** Handle untuk mengubah ukuran panel */
const ResizeHandle = ({ onResizeStart }) => (
  <div
    className="absolute -top-1 left-0 w-full h-2 cursor-row-resize flex items-center justify-center"
    onMouseDown={onResizeStart}
    onTouchStart={onResizeStart}
  >
    <div className="w-8 h-1 bg-gray-400 rounded-full" />
  </div>
);

/** Panel output yang bisa diubah ukurannya */
const OutputPanel = ({ output, isRunning, onClose, height, onResizeStart }) => (
  <div className="relative border-t border-gray-300" style={{ height: `${height}px` }}>
    <ResizeHandle onResizeStart={onResizeStart} />
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 text-white flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4" />
          <span className="text-sm font-medium">Output</span>
        </div>
        <button onClick={onClose} className="text-gray-300 hover:text-white text-xs" aria-label="Hide output">
          Close
        </button>
      </div>
      <div className="bg-gray-900 text-gray-100 p-4 overflow-y-auto flex-grow">
        {isRunning ? (
          <div className="flex items-center space-x-2 text-sm"><div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full"></div><span>Running...</span></div>
        ) : (
          <pre className="font-mono whitespace-pre-wrap break-words text-sm">{output || 'No output.'}</pre>
        )}
      </div>
    </div>
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
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // State untuk mengubah ukuran panel output
  const [outputHeight, setOutputHeight] = useState(DEFAULT_OUTPUT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number, startHeight: number } | null>(null);

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
  
  // Efek untuk menangani event resize vertikal
  useEffect(() => {
    const handleResizeMove = (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !resizeRef.current) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = clientY - resizeRef.current.startY;
      let newHeight = resizeRef.current.startHeight - deltaY;

      // Batasi ukuran
      const maxHeight = window.innerHeight * MAX_OUTPUT_HEIGHT_RATIO;
      if (newHeight < MIN_OUTPUT_HEIGHT) newHeight = MIN_OUTPUT_HEIGHT;
      if (newHeight > maxHeight) newHeight = maxHeight;
      
      setOutputHeight(newHeight);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('touchmove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.addEventListener('touchend', handleResizeEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('touchmove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('touchend', handleResizeEnd);
    };
  }, [isResizing]);
  
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
  
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    resizeRef.current = { startY: clientY, startHeight: outputHeight };
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };
  
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

  const fileName = initialFileName || `file.${language}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) { console.error('Failed to copy code:', err); }
  }, [codeContent]);

  const handleRun = useCallback(async () => {
    if (!langConfig.executable) return;
    setIsRunning(true);
    setShowOutput(true);
    setOutput('');
    await new Promise(resolve => setTimeout(resolve, 750));
    try {
      if (language === 'javascript') {
        let capturedOutput = '';
        const originalLog = console.log;
        console.log = (...args) => { capturedOutput += args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '\n'; };
        eval(codeContent);
        console.log = originalLog;
        setOutput(capturedOutput || 'Code executed without console output.');
      } else if (language === 'python') {
        setOutput(`Simulating Python execution...\n\nOutput:\n${codeContent.includes('print') ? 'Hello from Python!' : 'Execution finished.'}\n\n# Note: This is a mock execution.`);
      }
    } catch (error) { setOutput(error.toString()); } finally { setIsRunning(false); }
  }, [codeContent, language, langConfig.executable]);

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

  const handleCloseOutput = () => {
    setShowOutput(false);
    setOutputHeight(DEFAULT_OUTPUT_HEIGHT); // Reset tinggi saat ditutup
  };

  if (inline) {
    return <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200">{children}</code>;
  }
  
  const CodeContentDisplay = ({ inModal = false }) => (
    <div className={`flex-1 bg-white ${inModal ? 'overflow-auto' : 'relative'}`}>
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
    <div className="fixed inset-0 z-50 bg-white flex flex-col sm:hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 flex-shrink-0">
        <CodeHeader fileName={fileName} langName={langConfig.name} lineCount={lineCount} />
        <button onClick={() => setIsFullscreen(false)} className="p-2 rounded-lg hover:bg-gray-200" aria-label="Close"><X className="w-5 h-5 text-gray-600" /></button>
      </div>
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-300 flex-shrink-0">
        <span className="text-xs text-gray-500">Swipe to scroll</span>
        <CodeActions onCopy={handleCopy} onRun={handleRun} isCopied={isCopied} isRunning={isRunning} isExecutable={langConfig.executable} />
      </div>
      <div className="flex-grow flex flex-col overflow-hidden">
        <CodeContentDisplay inModal={true} />
        {showOutput && <OutputPanel output={output} isRunning={isRunning} onClose={handleCloseOutput} height={outputHeight} onResizeStart={handleResizeStart} />}
      </div>
    </div>
  );

  return (
    <>
      <div className="my-4 max-w-full overflow-hidden text-sm">
        <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
          <button 
            onClick={handleToggleView} 
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors border-b border-gray-300 text-left" 
            aria-expanded={isExpanded} 
            aria-label={isExpanded ? 'Hide code block' : 'Show code block'}
          >
            <CodeHeader fileName={fileName} langName={langConfig.name} lineCount={lineCount} />
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-1.5 text-xs text-gray-500">
                <Code2 className="w-4 h-4" />
                <span>{isExpanded ? 'Hide' : 'Show Code'}</span>
              </div>
              <div className="flex sm:hidden items-center space-x-1.5 text-xs text-gray-500">
                <Maximize2 className="w-4 h-4" />
                <span>Fullscreen</span>
              </div>
            </div>
          </button>
          
          {isExpanded && !isMobile && (
            <div className="flex flex-row relative" style={{ height: '400px' }}>
              {/* Panel Kode */}
              <div 
                className="flex-1 overflow-auto border-r border-gray-300" 
                style={{ width: `${panelWidth}%`, minWidth: '20%' }}
              >
                <div className="flex items-center justify-end px-4 py-2 bg-white border-b border-gray-300">
                  <CodeActions 
                    onCopy={handleCopy} 
                    onRun={handleRun} 
                    isCopied={isCopied} 
                    isRunning={isRunning} 
                    isExecutable={langConfig.executable} 
                    isCompact={true} 
                  />
                </div>
                <CodeContentDisplay />
              </div>
              
              {/* Handle Resize */}
              <div
                className="absolute top-0 bottom-0 w-2 cursor-col-resize bg-gray-200 hover:bg-gray-300 transition-colors z-10"
                style={{ left: `calc(${panelWidth}% - 4px)` }}
                onMouseDown={handleResizeWidthStart}
                onTouchStart={handleResizeWidthStart}
              />
              
              {/* Panel Preview/Output */}
              <div 
                className="flex-1 overflow-auto bg-gray-50" 
                style={{ width: `${100 - panelWidth}%`, minWidth: '20%' }}
              >
                <div className="p-4 h-full">
                  {showOutput ? (
                    <OutputPanel 
                      output={output} 
                      isRunning={isRunning} 
                      onClose={handleCloseOutput} 
                      height={outputHeight} 
                      onResizeStart={handleResizeStart} 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                      <Terminal className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="text-center">Code output will appear here when you run the code</p>
                      {langConfig.executable && (
                        <button 
                          onClick={handleRun}
                          className="mt-4 flex items-center space-x-1.5 px-3 py-1.5 text-sm bg-white text-gray-800 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors"
                        >
                          <Play className="w-4 h-4" />
                          <span>Run Code</span>
                        </button>
                      )}
                    </div>
                  )}
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