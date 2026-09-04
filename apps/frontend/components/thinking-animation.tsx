'use client';

import { motion, AnimatePresence } from '@/lib/framer-motion';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@barzakh/shared/lib/utils/utils';
import { ThinkingOrb } from 'thinking-orbs';

interface ThinkingAnimationProps {
  statusText?: string;
  className?: string;
  orbSize?: number;
}

export const ThinkingAnimation = ({
  statusText,
  className,
  orbSize = 24,
}: ThinkingAnimationProps) => {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;

  // Keep track of the last non-empty status
  const [lastValidStatus, setLastValidStatus] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (statusText) {
      setLastValidStatus(statusText);
    }
  }, [statusText]);

  const rawText = statusText || lastValidStatus || 'Thinking';
  const displayText = rawText.endsWith('...') ? rawText : `${rawText}...`;

  const getOrbState = (
    text: string,
  ):
    | 'working'
    | 'searching'
    | 'solving'
    | 'listening'
    | 'connecting'
    | 'weaving'
    | 'composing'
    | 'breathing'
    | 'shaping' => {
    const lower = text.toLowerCase();
    if (
      lower.includes('search') ||
      lower.includes('find') ||
      lower.includes('scan')
    )
      return 'searching';
    if (
      lower.includes('calculat') ||
      lower.includes('analyz') ||
      lower.includes('decod') ||
      lower.includes('resolv') ||
      lower.includes('valu')
    )
      return 'solving';
    if (
      lower.includes('ask') ||
      lower.includes('listen') ||
      lower.includes('read')
    )
      return 'listening';
    if (
      lower.includes('fetch') ||
      lower.includes('connect') ||
      lower.includes('query') ||
      lower.includes('get') ||
      lower.includes('retriev') ||
      lower.includes('check')
    )
      return 'connecting';
    if (
      lower.includes('bridge') ||
      lower.includes('cross') ||
      lower.includes('route')
    )
      return 'weaving';
    if (
      lower.includes('render') ||
      lower.includes('draw') ||
      lower.includes('paint') ||
      lower.includes('creat') ||
      lower.includes('mix') ||
      lower.includes('compos')
    )
      return 'composing';
    if (
      lower.includes('sculpt') ||
      lower.includes('shap') ||
      lower.includes('masterpiece')
    )
      return 'shaping';
    if (
      lower.includes('wait') ||
      lower.includes('breath') ||
      lower.includes('dream')
    )
      return 'shaping';
    return 'shaping';
  };

  return (
    <div className={cn('flex items-center py-0.5', className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 3 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -3 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className={cn(
          'inline-flex items-center gap-2.5 pl-1.5 pr-4 py-1 rounded-full select-none',
          // Compact, sleek pill container with adaptive light/dark theme
          'bg-neutral-100/90 dark:bg-[#131416]/95',
          'border border-neutral-200/90 dark:border-white/[0.08]',
          'shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)]',
          'backdrop-blur-md',
        )}
      >
        {/* Dotted thought-orb loading indicator */}
        <ThinkingOrb
          state={getOrbState(rawText)}
          size={64}
          theme={mounted ? (isDark ? 'dark' : 'light') : 'auto'}
          style={{ width: orbSize, height: orbSize }}
        />

        {/* Animated status text with two-layer continuous shimmering light sweep */}
        <AnimatePresence mode="wait">
          <motion.div
            key={displayText}
            initial={{ opacity: 0, x: 2 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -2 }}
            transition={{ duration: 0.15 }}
            className="relative inline-flex items-center whitespace-nowrap overflow-hidden"
          >
            {/* Base text layer */}
            <span className="text-[13.5px] font-medium tracking-tight text-neutral-600 dark:text-[#9ca3af]">
              {displayText}
            </span>

            {/* Sweeping shimmer highlight beam layer (Left to Right) */}
            <motion.span
              className="absolute inset-0 text-[13.5px] font-medium tracking-tight pointer-events-none select-none"
              style={{
                backgroundImage: isDark
                  ? 'linear-gradient(110deg, transparent 0%, transparent 32%, rgba(255,255,255,0.95) 50%, transparent 68%, transparent 100%)'
                  : 'linear-gradient(110deg, transparent 0%, transparent 32%, rgba(15,23,42,0.95) 50%, transparent 68%, transparent 100%)',
                backgroundSize: '250% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
              }}
              animate={{
                backgroundPosition: ['200% 0', '-200% 0'],
              }}
              transition={{
                repeat: Infinity,
                duration: 2.2,
                ease: 'easeInOut',
              }}
            >
              {displayText}
            </motion.span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
