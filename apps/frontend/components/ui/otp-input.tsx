"use client";

import React, { useRef, useEffect, KeyboardEvent, ClipboardEvent, useState } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void; // Callback when all digits are filled
  disabled?: boolean;
  autoFocus?: boolean;
  backupCode?: boolean; // For backup codes (8 alphanumeric chars) vs TOTP (6 digits)
  className?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  backupCode = false,
  className = "",
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);
  const lastValueRef = useRef("");

  useEffect(() => {
    // Initialize refs array
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  useEffect(() => {
    // Auto-focus first input
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  // Reset auto-submit flag when value changes significantly
  useEffect(() => {
    // If value is being modified (cleared, deleted, or changed)
    if (value.length < length || value !== lastValueRef.current) {
      // Reset the flag to allow auto-submit again
      if (value.length < length) {
        setHasAutoSubmitted(false);
      }
      lastValueRef.current = value;
    }
  }, [value, length]);

  // Auto-focus the next empty input when value changes
  useEffect(() => {
    // Find the first empty position or the position after the last filled one
    const nextEmptyIndex = value.length < length ? value.length : length - 1;

    // Only focus if the value just changed (not on initial render)
    if (value.length > 0 && value.length < length) {
      const nextInput = inputRefs.current[nextEmptyIndex];
      if (nextInput && document.activeElement !== nextInput) {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
          nextInput.focus();
        }, 0);
      }
    }
  }, [value, length]);

  // Auto-submit when all digits are entered (only once per complete entry)
  useEffect(() => {
    if (value.length === length && onComplete && !disabled && !hasAutoSubmitted) {
      // Small delay to ensure the last character is properly set
      const timer = setTimeout(() => {
        setHasAutoSubmitted(true);
        onComplete();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [value, length, onComplete, disabled, hasAutoSubmitted]);

  // Filter and clean input based on mode
  const cleanValue = (input: string): string => {
    if (backupCode) {
      // For backup codes: alphanumeric and underscore, max 8 chars
      return input.replace(/[^A-Za-z0-9_]/g, "").toUpperCase().slice(0, 8);
    } else {
      // For TOTP: digits only, max 6 chars
      return input.replace(/[^0-9]/g, "").slice(0, 6);
    }
  };

  // Note: We don't auto-clean the value in useEffect to avoid infinite loops
  // The parent component should handle cleaning

  const handleChange = (index: number, char: string) => {
    const cleanedChar = backupCode
      ? char.replace(/[^A-Za-z0-9_]/g, "").toUpperCase()
      : char.replace(/[^0-9]/g, "");

    if (!cleanedChar && index < length) {
      // Delete: clear current and move to previous
      const newValue = value.split("");
      newValue[index] = "";
      onChange(newValue.join(""));

      // Small delay to ensure React state update completes before focus
      setTimeout(() => {
        inputRefs.current[index - 1]?.focus();
      }, 10);
      return;
    }

    // Insert: update value and move to next
    const newValue = value.split("");
    newValue[index] = cleanedChar;
    const updatedValue = newValue.join("").slice(0, length);
    onChange(updatedValue);

    // Move to next input with a small delay to ensure state update completes
    if (cleanedChar && index < length - 1) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 10);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    // Check if it's a valid character for input
    const isValidChar = backupCode
      ? /^[A-Za-z0-9_]$/.test(key)
      : /^[0-9]$/.test(key);

    // If current box already has a value and user types a valid character,
    // move to next box and insert there (prevents maxLength blocking)
    if (isValidChar && value[index] && index < length - 1) {
      e.preventDefault();
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        // Insert the character into the next position
        const cleanedChar = backupCode ? key.toUpperCase() : key;
        const newValue = value.split("");
        newValue[index + 1] = cleanedChar;
        onChange(newValue.join("").slice(0, length));

        // Move focus to the next-next input if available
        if (index + 2 < length) {
          setTimeout(() => {
            inputRefs.current[index + 2]?.focus();
          }, 10);
        }
      }
      return;
    }

    if (e.key === "Backspace" && !value[index] && index > 0) {
      // If current is empty and backspace is pressed, move to previous
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === "Delete" && value[index]) {
      const newValue = value.split("");
      newValue[index] = "";
      onChange(newValue.join(""));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const cleaned = cleanValue(pastedData);

    if (cleaned) {
      onChange(cleaned);
      // Focus the last filled input or the last input
      const focusIndex = Math.min(cleaned.length - 1, length - 1);
      if (inputRefs.current[focusIndex]) {
        inputRefs.current[focusIndex]?.focus();
      }

    }
  };

  const handleInput = (index: number, e: React.FormEvent<HTMLInputElement>) => {
    const input = e.currentTarget.value;
    if (input.length > 1) {
      // Handle case where user types multiple characters at once
      const cleaned = cleanValue(input);
      if (cleaned.length > 1) {
        onChange(cleaned);
        const focusIndex = Math.min(cleaned.length - 1, length - 1);
        if (inputRefs.current[focusIndex]) {
          inputRefs.current[focusIndex]?.focus();
        }
        return;
      }
    }
    handleChange(index, input);
  };

  // Responsive sizing based on mode and screen size
  const getBoxClasses = () => {
    if (backupCode) {
      // Backup codes: smaller boxes with tighter spacing
      return "w-7 h-8 min-[350px]:w-8 min-[350px]:h-10 sm:w-9 sm:h-11 text-sm sm:text-base";
    } else {
      // TOTP codes: slightly larger boxes
      return "w-8 h-10 min-[350px]:w-9 min-[350px]:h-10 min-[375px]:w-10 min-[375px]:h-11 sm:w-11 sm:h-12 text-lg sm:text-xl";
    }
  };

  return (
    <div className="flex flex-col gap-3 w-fit mx-auto overflow-hidden p-1">
      <div className={`flex ${backupCode ? "gap-1 sm:gap-1.5 px-0" : "gap-1 min-[350px]:gap-1.5 sm:gap-2 px-0 min-[350px]:px-2"} justify-center ${className}`}>
        {Array.from({ length }).map((_, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode={backupCode ? "text" : "numeric"}
            maxLength={1}
            value={value[index] || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={disabled}
            className={`${getBoxClasses()} text-center font-semibold border border-zinc-700 rounded-lg focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 bg-zinc-800/50 text-white transition-colors duration-200 outline-none placeholder:text-zinc-600 block`}
            autoComplete="off"
          />
        ))}
      </div>
    </div>
  );
}
