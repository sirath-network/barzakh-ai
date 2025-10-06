# Quick Start Guide - Artifact System

## TL;DR

Your chat now has a **Claude-like artifact system** that makes code display clean and professional! 

**What changed:**
- ✅ Code blocks now show as compact preview cards
- ✅ Click "Open" to view code in a dedicated side panel
- ✅ Cleaner chat interface with better UX

## Visual Example

### Before:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chat Message
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┌─────────────────────────────────┐
│ file.py        [Show Code ▼]    │
├─────────────────────────────────┤
│ 1  def hello():                 │
│ 2      print("Hello")           │
│ 3      print("World")           │
│ ... (50 more lines)             │
│                                 │
│ [Takes up entire screen] 😵     │
└─────────────────────────────────┘
Chat Message (Hard to see)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### After:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chat Message                                    │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│
┌────────────────────────────┐                  │
│ 🐍 file.py  [Python] 53 lines │                  │  ┌──────────────────┐
│ ────────────────────────── │                  │  │ 🎨 Artifact      │
│ def hello():               │                  │  │ Viewer           │
│   print("Hello")           │    [Open] ────────────>                   │
│   ... 50 more lines        │                  │  │ Full code with   │
└────────────────────────────┘                  │  │ - Syntax hilight │
                                                │  │ - Line numbers   │
Chat Message (Easy to see!) 🎉                  │  │ - Copy button    │
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━│ │ - Run button     │
                                                │  │ - Download       │
                                                │  └──────────────────┘
```

## How to Use

### For End Users

1. **Chat normally** - AI responds as usual
2. **See code preview** - Code appears as compact cards
3. **Click "Open"** - View full code in artifact panel
4. **Interact** - Copy, download, or run code
5. **Keep chatting** - Artifact stays open for reference

### For Developers

#### Open an artifact programmatically:

```typescript
import { useArtifact } from '@/context/artifact-context';

function MyComponent() {
  const { openArtifact } = useArtifact();
  
  const showMyCode = () => {
    openArtifact({
      id: 'unique-id',
      type: 'code',
      title: 'My Cool Script',
      language: 'javascript',
      content: 'console.log("Hello!");',
      metadata: {
        fileName: 'script.js',
        lineCount: 1,
        isExecutable: true,
      },
    });
  };
  
  return <button onClick={showMyCode}>Show Code</button>;
}
```

## Testing the System

### Option 1: Use the Demo Component

Add to any page for testing:

```tsx
import { ArtifactDemo } from '@/components/artifact-demo';

export default function TestPage() {
  return (
    <div>
      <ArtifactDemo />
    </div>
  );
}
```

### Option 2: Test in Chat

Just ask the AI to generate code! For example:

```
User: "Can you create a Python script that calculates fibonacci numbers?"

AI: "Here's a Python script for fibonacci numbers..."
[Shows compact code preview with "Open" button] ✨
```

## Configuration

### Switch Between Compact and Full View

Edit `apps/javin/components/markdown.tsx` line 11:

```typescript
// Compact preview cards (RECOMMENDED) ✨
const USE_COMPACT_CODE_BLOCKS = true;

// Traditional expandable blocks
// const USE_COMPACT_CODE_BLOCKS = false;
```

## Key Features

| Feature | Description | Status |
|---------|-------------|--------|
| **Compact Previews** | 3-line code preview cards | ✅ |
| **Artifact Viewer** | Dedicated side panel | ✅ |
| **Syntax Highlighting** | Full Prism.js support | ✅ |
| **Copy to Clipboard** | One-click code copy | ✅ |
| **Download** | Save as file | ✅ |
| **Run Code** | Execute JavaScript | ✅ |
| **HTML Preview** | Live iframe rendering | ✅ |
| **Mobile Support** | Fullscreen on mobile | ✅ |
| **Animations** | Smooth Framer Motion | ✅ |

## Supported Languages

- 🐍 Python
- 📜 JavaScript
- 📘 TypeScript
- ⚛️ JSX / TSX
- 🌐 HTML
- 🎨 CSS
- 📋 JSON
- 💻 Bash
- 🗄️ SQL
- 📄 Plain Text

## Keyboard Shortcuts (Future)

Coming soon:
- `Cmd/Ctrl + K` - Open artifact search
- `Escape` - Close artifact panel
- `Cmd/Ctrl + C` - Copy code
- `Cmd/Ctrl + D` - Download
- `Cmd/Ctrl + Enter` - Run code

## Troubleshooting

### Q: Artifact panel doesn't open?
**A:** Make sure you're in chat mode (not settings). Check browser console for errors.

### Q: Code not highlighted?
**A:** Verify the language is supported. Check markdown fence: ` ```javascript `

### Q: "Open" button missing?
**A:** Ensure `USE_COMPACT_CODE_BLOCKS = true` in `markdown.tsx`

### Q: Mobile issues?
**A:** Artifact auto-opens fullscreen on mobile. Use back button or close (X) to exit.

## What's Next?

### Coming Soon
- Multiple artifact tabs
- Artifact history
- Code diff viewer
- Export to CodeSandbox

### Long Term
- Mermaid diagrams
- React component preview
- Collaborative editing
- AI-assisted code editing

## Need Help?

Check these files:
- **Full docs**: `ARTIFACT_SYSTEM.md`
- **Implementation**: `IMPLEMENTATION_SUMMARY.md`
- **Demo code**: `components/artifact-demo.tsx`

## Enjoy! 🎉

You now have a professional, modern code viewer that makes your AI chat interface world-class!

**Star Features:**
- 🧹 Cleaner chat interface
- 🎨 Beautiful design
- 🚀 Better performance
- 📱 Mobile-friendly
- 🎭 Smooth animations
- 💪 Production-ready

Built with ❤️ using React, TypeScript, and Framer Motion.

