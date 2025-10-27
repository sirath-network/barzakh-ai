"use client";

import React, { useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  backupCode?: boolean; // For backup codes (8 alphanumeric chars) vs TOTP (6 digits)
  className?: string;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = false,
  backupCode = false,
  className = "",
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Filter and clean input based on mode
  const cleanValue = (input: string): string => {
    if (backupCode) {
      // For backup codes: alphanumeric, max 8 chars
      return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    } else {
      // For TOTP: digits only, max 6 chars
      return input.replace(/[^0-9]/g, "").slice(0, 6);
    }
  };

  // Note: We don't auto-clean the value in useEffect to avoid infinite loops
  // The parent component should handle cleaning

  const handleChange = (index: number, char: string) => {
    const cleanedChar = backupCode 
      ? char.replace(/[^A-Za-z0-9]/g, "").toUpperCase()
      : char.replace(/[^0-9]/g, "");
    
    if (!cleanedChar && index < length) {
      // Delete: clear current and move to previous
      const newValue = value.split("");
      newValue[index] = "";
      onChange(newValue.join(""));
      
      if (inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Insert: update value and move to next
    const newValue = value.split("");
    newValue[index] = cleanedChar;
    const updatedValue = newValue.join("").slice(0, length);
    onChange(updatedValue);

    // Move to next input
    if (cleanedChar && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
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
      return "w-9 h-10 sm:w-10 sm:h-12 text-base sm:text-lg";
    } else {
      // TOTP codes: slightly larger boxes
      return "w-11 h-12 sm:w-12 sm:h-14 text-lg sm:text-xl";
    }
  };

  return (
    <div className={`flex gap-1.5 sm:gap-2 justify-center px-2 ${className}`}>
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
          onChange={(e) => handleChange(index, e.target.value)}
          onInput={(e) => handleInput(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`${getBoxClasses()} text-center font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-800 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200`}
          autoComplete="off"
        />
      ))}
    </div>
  );
}
