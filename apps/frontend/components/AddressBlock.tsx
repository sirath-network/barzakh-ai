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

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy address.');
      console.error('Failed to copy: ', err);
    }
  };

  // Truncate logic: 0x1234...5678
  const truncateAddress = (addr: string) => {
    if (addr.length < 15) return addr;
    
    // For EVM/Aptos
    if (addr.startsWith('0x')) {
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
    
    // For Solana/Sei/etc
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const truncatedAddress = truncateAddress(address);

  return (
    <span 
      className="group relative inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 font-mono text-sm tracking-tight text-zinc-900/90 dark:text-zinc-100/90 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-md hover:bg-zinc-200/80 dark:hover:bg-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600/50 transition-all duration-200 align-middle cursor-pointer shadow-sm active:scale-[0.98]"
      title={address}
      onClick={handleCopy}
    >
      <span className="font-medium select-all hidden sm:inline">{address}</span>
      <span className="font-medium select-all sm:hidden">{truncatedAddress}</span>
      <span className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 transition-colors shrink-0">
        {isCopied ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : (
          <Copy className="size-3.5" strokeWidth={2.5} />
        )}
      </span>
    </span>
  );
}