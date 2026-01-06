'use client';

// @ts-ignore
import { useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from "@/lib/framer-motion";

import { LoaderIcon } from '@/components/icons';
import { Button } from './ui/button';

const ButtonAny = Button as any;

export function SubmitButton({
  children,
  isSuccessful,
  className,
  disabled,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isLoading = pending || isSuccessful;

  return (
    <ButtonAny
      type={pending ? 'button' : 'submit'}
      aria-disabled={isLoading || disabled}
      disabled={isLoading || disabled}
      className={`relative ${className}`}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                repeat: Infinity,
                duration: 1,
                ease: "linear",
              }}
            >
              <LoaderIcon />
            </motion.div>
          </motion.span>
        ) : (
          <motion.span
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>

      <output aria-live="polite" className="sr-only">
        {isLoading ? 'Loading' : 'Submit form'}
      </output>
    </ButtonAny>
  );
}