import { useEffect, useState, useRef } from 'react';

export function useSmoothStreaming(
  targetText: string,
  isStreaming: boolean,
  speed: number = 10
) {
  // Initialize with targetText if not streaming, otherwise empty string (or current target if we want to jump start)
  // But usually for a new message streaming starts from empty.
  // If we switch chats, isStreaming might be false, so we show full text.
  const [displayedText, setDisplayedText] = useState(isStreaming ? '' : targetText);
  
  const displayedTextRef = useRef(displayedText);
  const targetTextRef = useRef(targetText);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Update target ref
  useEffect(() => {
    targetTextRef.current = targetText;
    
    // If not streaming, sync immediately to ensure we show full content
    if (!isStreaming) {
      setDisplayedText(targetText);
      displayedTextRef.current = targetText;
    }
  }, [targetText, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;

    const animate = () => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // Limit updates to avoid excessive re-renders (e.g., max 30fps = 33ms)
      // But we want it smooth, so maybe 60fps is fine if lightweight.
      // Let's try to update every frame but control the amount of text added.
      
      const current = displayedTextRef.current;
      const target = targetTextRef.current;

      if (current.length < target.length) {
        const diff = target.length - current.length;
        
        // Adaptive speed:
        // If diff is small, add 1 char.
        // If diff is large, add more to catch up.
        // We want to drain the buffer smoothly.
        
        // Base speed: 1 char per frame (60 chars/sec) is decent.
        // If diff > 50, speed up.
        
        let charsToAdd = 1;
        if (diff > 100) charsToAdd = 5;
        else if (diff > 50) charsToAdd = 3;
        else if (diff > 20) charsToAdd = 2;
        
        // Also consider the speed prop if we want to slow it down
        // But usually we want to be as fast as the LLM but smooth.
        
        const next = target.slice(0, current.length + charsToAdd);
        setDisplayedText(next);
        displayedTextRef.current = next;
        lastUpdateRef.current = now;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isStreaming]);

  return displayedText;
}
