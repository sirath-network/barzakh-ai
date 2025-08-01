'use client';

import { useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { LoaderIcon } from '@/components/icons';
import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
  className,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type={pending ? 'button' : 'submit'}
      aria-disabled={pending || isSuccessful}
      disabled={pending || isSuccessful}
      className={`relative ${className}`}
    >
      {children}

      <AnimatePresence>
        {(pending || isSuccessful) && (
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute right-4"
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
        )}
      </AnimatePresence>

      <output aria-live="polite" className="sr-only">
        {pending || isSuccessful ? 'Loading' : 'Submit form'}
      </output>
    </Button>
  );
}