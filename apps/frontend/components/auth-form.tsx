"use client";

import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { OTPInput } from "./ui/otp-input";
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
  emailLabel = "Email or Username",
  onResendOTP,
  onTurnstileSuccess,
  turnstileToken,
  turnstileRef,
  onValidationChange,
  onPasswordVisibilityChange,
  compact = false,
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
  emailLabel?: string;
  onResendOTP?: () => void;
  onTurnstileSuccess?: (token: string) => void;
  turnstileToken?: string;
  turnstileRef?: RefObject<TurnstileInstance>;
  onValidationChange?: (isValid: boolean) => void;
  onPasswordVisibilityChange?: (isVisible: boolean) => void;
  compact?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [storedEmail, setStoredEmail] = useState(defaultEmail);
  const [storedPassword, setStoredPassword] = useState("");
  const [storedPasswordConfirm, setStoredPasswordConfirm] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const LabelAny = Label as any;
  const InputAny = Input as any;
  const OTPInputAny = OTPInput as any;
  const EyeAny = Eye as any;
  const EyeOffAny = EyeOff as any;
  const TurnstileAny = Turnstile as any;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoredEmail(e.target.value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoredPassword(e.target.value);
  };

  const handlePasswordConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoredPasswordConfirm(e.target.value);
  };

  const handleOtpChange = (value: string) => {
    setOtpValue(value);
    // Reset auto-submit flag when OTP is modified
    if (value.length < 6) {
      setHasAutoSubmitted(false);
    }
  };

  const handleOTPComplete = () => {
    // Auto-submit when OTP is complete (only once per complete entry)
    if (otpValue.length === 6 && isFormValid() && !hasAutoSubmitted) {
      setHasAutoSubmitted(true);
      // Small delay to ensure the last character is properly set
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.requestSubmit();
        }
      }, 150);
    }
  };

  // Validation function
  const isFormValid = () => {
    let isValid = true;

    // Check email if needed
    if (emailNeeded && !showOTPField) {
      // Accept either email or username (non-empty)
      isValid = isValid && storedEmail.trim() !== "";
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
      const tokenStr = typeof turnstileToken === "string" ? turnstileToken : "";
      isValid = isValid && !!tokenStr && tokenStr.length > 10;
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
    <div className={`flex flex-col ${compact ? 'gap-3' : 'gap-6'} px-0`}>
      {/* Hidden fields to preserve email and password during OTP verification */}
      {showOTPField && (
        <>
          <input type="hidden" name="email" value={storedEmail} />
          <input type="hidden" name="password" value={storedPassword} />
        </>
      )}

      {emailNeeded && !showOTPField && (
        <div className="flex flex-col gap-2">
          {!compact && (
            <LabelAny
              htmlFor="email"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              {emailLabel}
            </LabelAny>
          )}
          <InputAny
            id="email"
            name="email"
            className={`${compact ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 h-10' : 'bg-muted text-md md:text-sm'}`}
            type="text"
            autoComplete="email"
            required
            placeholder={compact ? "Email or Username" : ""}
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
          {!compact && (
            <LabelAny
              htmlFor="password"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              Password
            </LabelAny>
          )}
          <div className="relative">
            <InputAny
              id="password"
              name="password"
              className={`${compact ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 h-10' : 'bg-muted text-md md:text-sm'} pr-10`}
              type={showPassword ? "text" : "password"}
              required
              placeholder={compact ? "Password" : ""}
              onChange={handlePasswordChange}
            />
            <button
              type="button"
              onClick={() => {
                const newValue = !showPassword;
                setShowPassword(newValue);
                onPasswordVisibilityChange?.(newValue);
              }}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              tabIndex={-1}
            >
              {showPassword ? <EyeOffAny size={16} /> : <EyeAny size={16} />}
            </button>
          </div>
          {forgotPasswordNeeded && (
            <div className="flex w-full justify-end">
              <Link
                href="/forgotpassword"
                className="text-xs text-zinc-400 hover:text-white"
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
          {!compact && (
            <LabelAny
              htmlFor="passwordConfirm"
              className="text-zinc-600 font-normal dark:text-zinc-400"
            >
              Confirm Password
            </LabelAny>
          )}
          <div className="relative">
            <InputAny
              id="passwordConfirm"
              name="passwordConfirm"
              className={`${compact ? 'bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 h-10' : 'bg-muted text-md md:text-sm'} pr-10`}
              type={showPasswordConfirm ? "text" : "password"}
              required
              placeholder={compact ? "Confirm Password" : ""}
              onChange={handlePasswordConfirmChange}
            />
            <button
              type="button"
              onClick={() => {
                const newValue = !showPasswordConfirm;
                setShowPasswordConfirm(newValue);
                onPasswordVisibilityChange?.(newValue);
              }}
              className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              tabIndex={-1}
            >
              {showPasswordConfirm ? <EyeOffAny size={16} /> : <EyeAny size={16} />}
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
        <>
          {/* Hidden input to submit OTP value with the form */}
          <input type="hidden" name="otp" value={otpValue} />

          <div className="flex flex-col gap-2">
            {!compact && (
              <LabelAny
                htmlFor="otp"
                className="text-zinc-600 font-normal dark:text-zinc-400 text-center"
              >
                Verification Code
              </LabelAny>
            )}
            <div className={`flex justify-center ${compact ? 'mt-2' : ''}`}>
              <OTPInputAny
                length={6}
                value={otpValue}
                onChange={handleOtpChange}
                onComplete={handleOTPComplete}
              />
            </div>
            {onResendOTP && (
              <div className="flex flex-col gap-1 items-center">
                <button
                  type="button"
                  onClick={handleResendClick}
                  disabled={isResending}
                  className={`text-sm text-zinc-500 hover:text-white transition-colors ${isResending ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                >
                  {isResending ? "Sending..." : "Resend code"}
                </button>
                {resendMessage && (
                  <p className={`text-xs ${resendMessage.includes("successfully")
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
        </>
      )}

      {/* Turnstile component - invisible mode (requires Cloudflare dashboard set to Invisible) */}
      {onTurnstileSuccess && (
        <>
          <TurnstileAny
            ref={turnstileRef}
            onTokenChange={handleTurnstileTokenChange}
            options={{ size: "invisible" }}
          />
          {/* Hidden input for Turnstile token */}
          <input type="hidden" name="cf-turnstile-response" value={turnstileToken || ""} />
        </>
      )}

      {children}
    </div>
  );
}