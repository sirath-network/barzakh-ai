'use client';

import { EditorView } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Code, Copy, Download, Maximize2, Minimize2, Settings, Terminal } from 'lucide-react';

// Mock Suggestion type for demo
type Suggestion = {
  id: string;
  content: string;
};

type EditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
};

function PureCodeEditor({ content, onSaveContent, status, isCurrentVersion, currentVersionIndex, suggestions }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [lineNumbers, setLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);

  // Custom extensions based on settings
  const getExtensions = useCallback(() => {
    const extensions = [
      basicSetup,
      python(),
      oneDark,
      EditorView.theme({
        '&': {
          fontSize: `${fontSize}px`,
          height: '100%',
        },
        '.cm-content': {
          padding: '12px',
          minHeight: '100%',
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-editor': {
          borderRadius: '8px',
        },
        '.cm-scroller': {
          fontFamily: 'JetBrains Mono, Consolas, Monaco, "Courier New", monospace',
        },
      }),
      EditorView.lineWrapping.of(wordWrap),
    ];

    return extensions;
  }, [fontSize, wordWrap]);

  useEffect(() => {
    if (containerRef.current && !editorRef.current) {
      const startState = EditorState.create({
        doc: content,
        extensions: getExtensions(),
      });

      editorRef.current = new EditorView({
        state: startState,
        parent: containerRef.current,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Update extensions when settings change
  useEffect(() => {
    if (editorRef.current) {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const transaction = update.transactions.find(
            (tr) => !tr.annotation(Transaction.remote),
          );

          if (transaction) {
            const newContent = update.state.doc.toString();
            onSaveContent(newContent, true);
          }
        }
      });

      const currentSelection = editorRef.current.state.selection;
      const extensions = [...getExtensions(), updateListener];

      const newState = EditorState.create({
        doc: editorRef.current.state.doc,
        extensions,
        selection: currentSelection,
      });

      editorRef.current.setState(newState);
    }
  }, [onSaveContent, getExtensions]);

  useEffect(() => {
    if (editorRef.current && content) {
      const currentContent = editorRef.current.state.doc.toString();

      if (status === 'streaming' || currentContent !== content) {
        const transaction = editorRef.current.state.update({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
          annotations: [Transaction.remote.of(true)],
        });

        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status]);

  const copyToClipboard = async () => {
    if (editorRef.current) {
      const content = editorRef.current.state.doc.toString();
      try {
        await navigator.clipboard.writeText(content);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const downloadCode = () => {
    if (editorRef.current) {
      const content = editorRef.current.state.doc.toString();
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'code.py';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative bg-gray-900 border border-gray-700 rounded-lg overflow-hidden transition-all duration-300 ${
      isFullscreen 
        ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]' 
        : 'w-full h-96 md:h-[500px] lg:h-[600px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-gray-300">Python Editor</span>
          {status === 'streaming' && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-orange-400">Streaming...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Mobile: Show fewer buttons */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={copyToClipboard}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Copy Code"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={downloadCode}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          
          {/* Mobile menu button */}
          <div className="sm:hidden relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-12 right-2 bg-gray-800 border border-gray-600 rounded-lg p-3 z-10 min-w-48 shadow-lg">
          <h3 className="text-sm font-medium text-white mb-2">Editor Settings</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-300 block mb-1">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600"
              >
                <option value={12}>12px</option>
                <option value={14}>14px</option>
                <option value={16}>16px</option>
                <option value={18}>18px</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300">Line Numbers</label>
              <input
                type="checkbox"
                checked={lineNumbers}
                onChange={(e) => setLineNumbers(e.target.checked)}
                className="text-blue-500"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300">Word Wrap</label>
              <input
                type="checkbox"
                checked={wordWrap}
                onChange={(e) => setWordWrap(e.target.checked)}
                className="text-blue-500"
              />
            </div>
            
            {/* Mobile actions */}
            <div className="sm:hidden pt-2 border-t border-gray-600 space-y-2">
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center gap-2 text-xs text-gray-300 hover:text-white p-1"
              >
                <Copy className="w-3 h-3" />
                Copy Code
              </button>
              <button
                onClick={downloadCode}
                className="w-full flex items-center gap-2 text-xs text-gray-300 hover:text-white p-1"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Container */}
      <div 
        className={`relative w-full transition-all ${
          isFullscreen ? 'h-[calc(100%-3rem)]' : 'h-[calc(100%-3rem)]'
        }`}
        ref={containerRef}
      />

      {/* Status Bar */}
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1 text-xs text-gray-400 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <span>Python</span>
          <span>UTF-8</span>
          {isCurrentVersion && (
            <span className="text-green-400">● Current Version</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          {suggestions.length > 0 && (
            <span>{suggestions.length} suggestions</span>
          )}
          <span>Ln 1, Col 1</span>
        </div>
      </div>

      {/* Fullscreen overlay backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleFullscreen}
        />
      )}
    </div>
  );
}

function areEqual(prevProps: EditorProps, nextProps: EditorProps) {
  if (prevProps.suggestions !== nextProps.suggestions) return false;
  if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex) return false;
  if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
  if (prevProps.status === 'streaming' && nextProps.status === 'streaming') return false;
  if (prevProps.content !== nextProps.content) return false;
  return true;
}

// Demo component with sample data
export default function CodeEditorDemo() {
  const [code, setCode] = useState(`# Python Code Editor Demo
def fibonacci(n):
    """Generate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    elif n == 2:
        return [0, 1]
    
    sequence = [0, 1]
    for i in range(2, n):
        next_num = sequence[i-1] + sequence[i-2]
        sequence.append(next_num)
    
    return sequence

# Example usage
if __name__ == "__main__":
    terms = 10
    result = fibonacci(terms)
    print(f"Fibonacci sequence with {terms} terms:")
    print(result)
    
    # Calculate sum of sequence
    total = sum(result)
    print(f"Sum of all terms: {total}")
`);

  const [status, setStatus] = useState<'streaming' | 'idle'>('idle');

  const handleSaveContent = (content: string, debounce: boolean) => {
    setCode(content);
    // Simulate saving logic here
    console.log('Saving content:', { content: content.substring(0, 50) + '...', debounce });
  };

  const CodeEditor = memo(PureCodeEditor, areEqual);

  return (
    <div className="w-full max-w-full mx-auto p-4 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Responsive Code Editor</h1>
        <p className="text-gray-600">A fully responsive Python code editor with mobile support</p>
      </div>
      
      <CodeEditor
        content={code}
        onSaveContent={handleSaveContent}
        status={status}
        isCurrentVersion={true}
        currentVersionIndex={0}
        suggestions={[]}
      />
      
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setStatus(status === 'streaming' ? 'idle' : 'streaming')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Toggle {status === 'streaming' ? 'Idle' : 'Streaming'} Mode
        </button>
      </div>
    </div>
  );
}