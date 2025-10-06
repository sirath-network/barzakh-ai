# Artifact System - Claude-like Code Viewer

## Overview

The artifact system provides a clean, professional way to display code and interactive content in a dedicated side panel, similar to Claude's artifact viewer.

## Features

### 1. **Compact Code Blocks in Chat**
- Code blocks now appear as compact preview cards in the chat
- Shows first 3 lines with a preview
- Displays file name, language, and line count
- "Open" button to view in artifact panel
- Smooth hover effects and animations

### 2. **Dedicated Artifact Viewer Panel**
- Slides in from the right side of the screen
- Full syntax highlighting with line numbers
- Copy, download, and run functionality
- Resizable and can go fullscreen
- Supports multiple file types:
  - Code (Python, JavaScript, TypeScript, etc.)
  - HTML with live preview
  - Images
  - Markdown
  - SVG
  - Mermaid diagrams

### 3. **Smart UX**
- Click "Open" on any code block to view in artifact panel
- Artifact panel stays open for easy reference while chatting
- Smooth animations and transitions
- Mobile-responsive design
- Works with existing chat functionality

## Usage

### For Users

1. **View Code**: When AI generates code, you'll see a compact preview card
2. **Open in Viewer**: Click the "Open" button to view in the full artifact panel
3. **Interact**: Use the artifact panel to:
   - Copy code to clipboard
   - Download as file
   - Run executable code (JavaScript, Python)
   - View HTML previews
4. **Close**: Click the X button or outside the panel to close

### For Developers

#### Using the Artifact Context

```typescript
import { useArtifact } from '@/context/artifact-context';

function MyComponent() {
  const { openArtifact } = useArtifact();
  
  const showCode = () => {
    openArtifact({
      id: 'unique-id',
      type: 'code',
      title: 'My Code',
      language: 'javascript',
      content: 'console.log("Hello");',
      metadata: {
        fileName: 'example.js',
        lineCount: 1,
        isExecutable: true,
      },
    });
  };
  
  return <button onClick={showCode}>Show Code</button>;
}
```

#### Artifact Types

- `code`: Syntax-highlighted code
- `html`: HTML with live preview in iframe
- `react`: React components (future)
- `markdown`: Rendered markdown
- `image`: Image display
- `svg`: SVG graphics
- `mermaid`: Mermaid diagrams (future)

## Architecture

### Components

1. **artifact-context.tsx**: React context for managing artifact state
2. **artifact-viewer.tsx**: Main viewer component with full functionality
3. **code-block-compact.tsx**: Compact preview cards for chat
4. **code-block.tsx**: Enhanced version with artifact integration

### File Structure

```
apps/javin/
├── context/
│   └── artifact-context.tsx     # State management
├── components/
│   ├── artifact-viewer.tsx      # Main viewer panel
│   ├── code-block-compact.tsx   # Compact preview
│   └── code-block.tsx           # Full code block (fallback)
└── ARTIFACT_SYSTEM.md           # This file
```

## Configuration

### Toggle Between Compact and Full Code Blocks

In `apps/javin/components/markdown.tsx`:

```typescript
// Set to true for compact preview cards (recommended)
// Set to false for traditional expandable code blocks
const USE_COMPACT_CODE_BLOCKS = true;
```

## Benefits

1. **Cleaner Chat Interface**: Code doesn't clutter the conversation
2. **Better Focus**: Dedicated space for viewing and interacting with code
3. **Professional Look**: Matches modern AI chat UX patterns
4. **Improved Workflow**: View code while continuing the conversation
5. **Mobile Friendly**: Optimized for all screen sizes

## Future Enhancements

- [ ] Diff viewer for code changes
- [ ] Multiple artifact tabs
- [ ] Artifact history
- [ ] Export to CodeSandbox/StackBlitz
- [ ] Collaborative editing
- [ ] Mermaid diagram support
- [ ] React component preview

## Troubleshooting

### Artifact panel not opening?
- Ensure `ArtifactProvider` wraps your chat component
- Check browser console for errors

### Code not syntax-highlighted?
- Verify language is correctly detected from markdown fence
- Check if Prism supports the language

### Mobile issues?
- Artifact panel goes fullscreen on mobile automatically
- Use the minimize button to return to normal view

## Credits

Inspired by Claude's artifact system by Anthropic.
Implemented with React, Framer Motion, and React Syntax Highlighter.

