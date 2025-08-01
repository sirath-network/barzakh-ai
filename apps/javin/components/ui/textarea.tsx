import * as React from 'react';
import { cn } from "@javin/shared/lib/utils/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // === Base Layout & Sizing ===
        'flex w-full resize-none rounded-xl text-base leading-relaxed',
        'min-h-[52px]',

        // === Padding ===
        'px-4 py-3',

        // === Colors & Background ===
        'bg-neutral-100 dark:bg-neutral-800',
        'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',

        // === Border & Focus State ===
        'border border-neutral-200 dark:border-neutral-700',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
        
        // === Transitions ===
        'transition-colors duration-200',
        
        // === Scrollbar & Disabled State ===
        'overflow-y-auto custom-scrollbar',
        'disabled:cursor-not-allowed disabled:opacity-50',
        
        // === ClassName from props (untuk override) ===
        className, 
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = 'Textarea';

export { Textarea };