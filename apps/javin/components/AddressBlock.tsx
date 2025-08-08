// components/address-block.tsx
'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AddressBlockProps {
  address: string;
}

export function AddressBlock({ address }: AddressBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000); // Reset ikon setelah 2 detik
    } catch (err) {
      toast.error('Failed to copy address.');
      console.error('Failed to copy: ', err);
    }
  };

  return (
    <div className="relative group not-prose flex items-center justify-between dark:bg-zinc-800 bg-zinc-100 border dark:border-zinc-700 border-zinc-200 rounded-md px-3 py-1.5 font-mono text-sm">
      <span className="font-semibold break-all">{address}</span>
      <button
        onClick={handleCopy}
        className="absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded-md text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors"
        aria-label="Copy address"
      >
        {isCopied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
      </button>
    </div>
  );
}