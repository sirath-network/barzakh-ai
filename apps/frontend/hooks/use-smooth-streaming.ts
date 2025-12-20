import { useEffect, useState, useRef, useCallback } from 'react';

export function useSmoothStreaming(
  targetText: string,
  isStreaming: boolean,
  speed: number = 10
) {
  // When not streaming, we want to show full text immediately
  // When streaming, we animate from empty (or current position)
  const [displayedText, setDisplayedText] = useState(() =>
    isStreaming ? '' : targetText
  );

  const displayedTextRef = useRef(displayedText);
  const targetTextRef = useRef(targetText);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const prevIsStreamingRef = useRef(isStreaming);

  // Sync displayedTextRef with state
  useEffect(() => {
    displayedTextRef.current = displayedText;
  }, [displayedText]);

  // Update target ref and handle streaming state changes
  useEffect(() => {
    targetTextRef.current = targetText;

    // Only sync immediately when:
    // 1. Not streaming AND
    // 2. Either we just stopped streaming OR the displayed text doesn't match target
    if (!isStreaming) {
      // Check if we actually need to update to avoid infinite loops
      if (displayedTextRef.current !== targetText) {
        setDisplayedText(targetText);
        displayedTextRef.current = targetText;
      }
    }

    // Reset displayed text when streaming starts fresh
    if (isStreaming && !prevIsStreamingRef.current) {
      // Starting to stream - reset if target is new content
      if (targetText.length < displayedTextRef.current.length) {
        setDisplayedText('');
        displayedTextRef.current = '';
      }
    }

    prevIsStreamingRef.current = isStreaming;
  }, [targetText, isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      // Cancel any ongoing animation when streaming stops
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      const now = Date.now();

      const current = displayedTextRef.current;
      const target = targetTextRef.current;

      if (current.length < target.length) {
        const diff = target.length - current.length;

        // Adaptive speed based on buffer size
        let charsToAdd = 1;
        if (diff > 100) charsToAdd = 5;
        else if (diff > 50) charsToAdd = 3;
        else if (diff > 20) charsToAdd = 2;

        const next = target.slice(0, current.length + charsToAdd);
        displayedTextRef.current = next;
        setDisplayedText(next);
        lastUpdateRef.current = now;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isStreaming]);

  return displayedText;
}

