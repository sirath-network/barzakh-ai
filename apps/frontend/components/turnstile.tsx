"use client";

import { forwardRef, useCallback, useRef, useState, useEffect } from "react";
import {
  Turnstile as ReactTurnstile,
  type TurnstileProps,
  type TurnstileInstance
} from "@marsidev/react-turnstile";

interface TurnstileComponentProps extends Omit<TurnstileProps, 'siteKey'> {
  onTokenChange?: (token: string) => void;
  maxRetries?: number;
  retryDelay?: number;
}

// Wrap the component with forwardRef
export const Turnstile = forwardRef<TurnstileInstance, TurnstileComponentProps>(
  function Turnstile({ onTokenChange, maxRetries = 3, retryDelay = 2000, ...props }, ref) {
    const [retryCount, setRetryCount] = useState(0);
    const internalRef = useRef<TurnstileInstance>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Use the forwarded ref or internal ref
    const turnstileRef = (ref as React.RefObject<TurnstileInstance>) || internalRef;

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
      };
    }, []);

    const handleSuccess = useCallback((token: string) => {
      setRetryCount(0); // Reset retry count on success
      onTokenChange?.(token);
    }, [onTokenChange]);

    const handleRetry = useCallback(() => {
      if (retryCount < maxRetries) {
        const delay = retryDelay * Math.pow(1.5, retryCount); // Exponential backoff
        console.log(`Turnstile: Retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);

        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          turnstileRef.current?.reset();
        }, delay);
      } else {
        console.error("Turnstile: Max retries reached");
        onTokenChange?.(""); // Clear token on max retries
      }
    }, [retryCount, maxRetries, retryDelay, turnstileRef, onTokenChange]);

    const handleError = useCallback(() => {
      console.warn("Turnstile: Error occurred, attempting retry...");
      onTokenChange?.(""); // Clear current token
      handleRetry();
    }, [onTokenChange, handleRetry]);

    const handleTimeout = useCallback(() => {
      console.warn("Turnstile: Timeout, attempting retry...");
      onTokenChange?.(""); // Clear current token
      handleRetry();
    }, [onTokenChange, handleRetry]);

    const handleExpire = useCallback(() => {
      console.log("Turnstile: Token expired, resetting...");
      onTokenChange?.("");
      // Auto-reset on expire
      turnstileRef.current?.reset();
    }, [onTokenChange, turnstileRef]);

    return (
      <ReactTurnstile
        ref={turnstileRef}
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={handleSuccess}
        onError={handleError}
        onExpire={handleExpire}
        onTimeout={handleTimeout}
        {...props}
      />
    );
  }
);
