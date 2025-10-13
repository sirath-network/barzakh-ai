"use client";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { EyeOff, Eye } from "lucide-react";
import { useState, useEffect, type RefObject } from "react";
import Link from "next/link";
import { Turnstile } from "./turnstile";
import type { TurnstileInstance } from "@marsidev/react-turnstile";

export function AuthForm({
  children,
  defaultEmail = "",
  fieldErrors,
  emailNeeded = true,
  passwordNeeded = true,
  passwordConfirmNeeded = false,
  forgotPasswordNeeded = true,
  showOTPField = false,
  onResendOTP,
  onTurnstileSuccess,
  turnstileToken,
  turnstileRef,
  onValidationChange,
}: {
  children: React.ReactNode;
  defaultEmail?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
    passwordConfirm?: string[];
    otp?: string[];
  };
  emailNeeded?: boolean;
  passwordNeeded?: boolean;
  passwordConfirmNeeded?: boolean;
  forgotPasswordNeeded?: boolean;
  showOTPField?: boolean;
  onResendOTP?: () => void;
  onTurnstileSuccess?: (token: string) => void;
  turnstileToken?: string;
  turnstileRef?: RefObject<TurnstileInstance>;
  onValidationChange?: (isValid: boolean) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [storedEmail, setStoredEmail] = useState(defaultEmail);
  const [storedPassword, setStoredPassword] = useState("");
  const [storedPasswordConfirm, setStoredPasswordConfirm] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [otpValue, setOtpValue] = useState("");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoredEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoredPassword(e.target.value);
  };

  const handlePasswordConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoredPasswordConfirm(e.target.value);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtpValue(e.target.value);
  };

  // Validation function
  const isFormValid = () => {
    let isValid = true;

    // Check email if needed
    if (emailNeeded && !showOTPField) {
      isValid = isValid && storedEmail.trim() !== "" && storedEmail.includes("@");
    }

    // Check password if needed
    if (passwordNeeded && !showOTPField) {
      isValid = isValid && storedPassword.trim() !== "" && storedPassword.length >= 6;
    }

    // Check password confirmation if needed
    if (passwordConfirmNeeded && !showOTPField) {
      isValid = isValid && storedPasswordConfirm.trim() !== "" && storedPasswordConfirm === storedPassword;
    }

    // Check OTP if in OTP field
    if (showOTPField) {
      isValid = isValid && otpValue.trim() !== "" && otpValue.length === 6;
    }

    // Check turnstile token - only if Turnstile is being used (when onTurnstileSuccess is provided)
    if (onTurnstileSuccess) {
      isValid = isValid && turnstileToken && turnstileToken !== "" && turnstileToken.length > 10;
    }

    return isValid;
  };

  // Effect to notify parent of validation changes
  useEffect(() => {
    onValidationChange?.(isFormValid());
  }, [storedEmail, storedPassword, storedPasswordConfirm, otpValue, turnstileToken, showOTPField, onValidationChange]);

  const handleResendClick = async () => {
    if (!onResendOTP || isResending) return;
    
    setIsResending(true);
    setResendMessage("Sending new code...");
    
    try {
      await onResendOTP();
      setResendMessage("New code sent successfully!");
    } catch (error) {
      setResendMessage("Failed to send new code. Please try again.");
    } finally {
      setIsResending(false);
      setTimeout(() => setResendMessage(""), 5000);
    }
  };

  const handleTurnstileTokenChange = (token: string) => {
    onTurnstileSuccess?.(token);
  };

  return (
    <div className="flex flex-col gap-6 px-4 sm:px-16">
      {/* Hidden fields to preserve email and password during OTP verification */}
      {showOTPField && (
        <>
          <input type="hidden" name="email" value={storedEmail} />
          <input type="hidden" name="password" value={storedPassword} />
        </>
      )}

      {emailNeeded && !showOTPField && (
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="email"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Email Address
          </Label>
          <Input
            id="email"
            name="email"
            className="bg-muted text-md md:text-sm"
            type="email"
            placeholder="barzakh@sirath.network"
            autoComplete="email"
            required
            autoFocus
            defaultValue={defaultEmail}
            onChange={handleEmailChange}
          />
          {fieldErrors?.email?.map((error, i) => (
            <p key={i} className="text-sm text-red-500 mt-1">
              {error}
            </p>
          ))}
        </div>
      )}

      {passwordNeeded && !showOTPField && (
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="password"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              className="bg-muted text-md md:text-sm pr-10"
              type={showPassword ? "text" : "password"}
              required
              onChange={handlePasswordChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {forgotPasswordNeeded && (
            <div className="flex w-full justify-end">
              <Link
                href="/forgotpassword"
                className="text-xs underline text-black dark:text-white hover:text-blue-600"
              >
                Forgot password?
              </Link>
            </div>
          )}
          {fieldErrors?.password?.map((error, i) => (
            <p key={i} className="text-sm text-red-500 mt-1">
              {error}
            </p>
          ))}
        </div>
      )}

      {passwordConfirmNeeded && !showOTPField && (
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="passwordConfirm"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Confirm Password
          </Label>
          <div className="relative">
            <Input
              id="passwordConfirm"
              name="passwordConfirm"
              className="bg-muted text-md md:text-sm pr-10"
              type={showPasswordConfirm ? "text" : "password"}
              required
              onChange={handlePasswordConfirmChange}
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              tabIndex={-1}
            >
              {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors?.passwordConfirm?.map((error, i) => (
            <p key={i} className="text-sm text-red-500 mt-1">
              {error}
            </p>
          ))}
        </div>
      )}

      {showOTPField && (
        <div className="flex flex-col gap-2">
          <Label
            htmlFor="otp"
            className="text-zinc-600 font-normal dark:text-zinc-400"
          >
            Verification Code
          </Label>
          <div className="relative">
            <Input
              id="otp"
              name="otp"
              className="bg-muted text-md md:text-sm"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              placeholder="Enter 6-digit code"
              onChange={handleOtpChange}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            We&apos;ve sent a code to your email
          </p>
          {onResendOTP && (
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={handleResendClick}
                disabled={isResending}
                className={`text-sm text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 text-left ${
                  isResending ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isResending ? "Sending..." : "Resend code"}
              </button>
              {resendMessage && (
                <p className={`text-xs ${
                  resendMessage.includes("successfully") 
                    ? "text-green-500" 
                    : "text-red-500"
                }`}>
                  {resendMessage}
                </p>
              )}
            </div>
          )}
          {fieldErrors?.otp?.map((error, i) => (
            <p key={i} className="text-sm text-red-500 mt-1">
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Turnstile component - only render when Turnstile is being used */}
      {onTurnstileSuccess && (
        <>
          <div className="flex justify-center items-center w-full">
            <Turnstile ref={turnstileRef} onTokenChange={handleTurnstileTokenChange} />
          </div>
          {/* Hidden input for Turnstile token */}
          <input type="hidden" name="cf-turnstile-response" value={turnstileToken || ""} />
        </>
      )}
      
      {children}
    </div>
  );
}