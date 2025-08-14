"use client";

import { forwardRef } from "react";
import { 
  Turnstile as ReactTurnstile, 
  type TurnstileProps,
  type TurnstileInstance 
} from "@marsidev/react-turnstile";

interface TurnstileComponentProps extends Omit<TurnstileProps, 'siteKey'> {
  onTokenChange?: (token: string) => void;
}

// Wrap the component with forwardRef
export const Turnstile = forwardRef<TurnstileInstance, TurnstileComponentProps>(
  function Turnstile({ onTokenChange, ...props }, ref) {
    const handleSuccess = (token: string) => {
      onTokenChange?.(token);
    };

    return (
      <ReactTurnstile
        // Pass the ref to the underlying component
        ref={ref}
        siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
        onSuccess={handleSuccess}
        onError={() => onTokenChange?.("")}
        onExpire={() => onTokenChange?.("")}
        {...props}
      />
    );
  }
);