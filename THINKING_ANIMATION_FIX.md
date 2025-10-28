# Thinking Animation Enhancement

## Problem Fixed
Previously, the "Thinking..." animation had a glitchy behavior where it would:
1. Show "Thinking..."
2. Display intermediate content (e.g., "I'll help you explore...")
3. Show tool invocations (e.g., "Web Search")
4. Show "Thinking..." again
5. Repeat this cycle until the response was complete

This created a jarring user experience with flickering between thinking animation, intermediate content, and tools.

## Solution Implemented
Enhanced the thinking state logic in `apps/frontend/components/message.tsx` to enable smooth streaming without glitchy toggling:

### Key Changes

1. **Content Tracking**: Monitor when content starts appearing
   ```typescript
   const [hasContentStarted, setHasContentStarted] = useState(false);
   
   useEffect(() => {
     if (message.role === 'assistant' && message.content) {
       setHasContentStarted(true);
     }
   }, [message.content, message.role]);
   ```

2. **Smart Thinking Logic**: Show thinking ONLY before streaming starts
   ```typescript
   const isThinking = 
     message.role === 'assistant' && 
     isLoading &&
     !hasContentStarted; // Hide thinking once content starts streaming
   ```

3. **One-Way Transition**: Once content starts streaming, thinking NEVER shows again
   ```typescript
   useEffect(() => {
     setHasContentStarted(false); // Reset for new messages
   }, [message.id]);
   ```

4. **Smooth Fade**: Smooth transition from thinking to streaming content
   ```typescript
   useEffect(() => {
     if (isThinking) {
       setShowThinking(true);
     } else {
       const timer = setTimeout(() => {
         setShowThinking(false);
       }, 200);
       return () => clearTimeout(timer);
     }
   }, [isThinking]);
   ```

## User Experience Flow

### Before (Glitchy):
```
🤖 Thinking... 
→ "I'll help you explore..." (intermediate text)
→ [Web Search tool shows]
→ 🤖 Thinking... 
→ More partial content
→ 🤖 Thinking...
→ Final response
```

### After (Smooth with Streaming):
```
🤖 Thinking... (initial state)
→ Content starts streaming in real-time
→ More content streams...
→ Tools execute and results stream...
→ Final response completes
→ ✅ No glitchy toggling!
```

## Benefits

✅ **No More Glitches**: Thinking animation NEVER toggles back once content starts
✅ **Real-Time Streaming**: See the AI's response as it's being generated
✅ **Smooth Transitions**: Clean fade from thinking to streaming content
✅ **Professional Experience**: Predictable, consistent behavior without flickering

## Technical Details

- **File Modified**: `apps/frontend/components/message.tsx`
- **Lines Changed**: Lines 96, 152-184
- **State Management**: Uses React hooks (useState, useEffect) with `hasContentStarted` tracking
- **Animation**: Framer Motion AnimatePresence with `mode="wait"` for smooth transitions
- **Logic**: One-way state transition prevents thinking from reappearing once streaming starts

