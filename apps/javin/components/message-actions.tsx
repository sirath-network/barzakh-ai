import type { Message } from 'ai';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';
import { memo } from 'react';
import equal from 'fast-deep-equal';
import { cn } from '@javin/shared/lib/utils/utils'; // Pastikan cn diimpor

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
}: {
  chatId: string;
  message: Message;
  vote: Vote | undefined;
  isLoading: boolean;
}) {
  const { mutate } = useSWRConfig();
  const [_, copyToClipboard] = useCopyToClipboard();

  const handleVote = async (type: 'up' | 'down') => {
    const isUpvote = type === 'up';

    const promise = fetch('/api/vote', {
      method: 'PATCH',
      body: JSON.stringify({
        chatId,
        messageId: message.id,
        type,
      }),
    });

    toast.promise(promise, {
      loading: `${isUpvote ? 'Upvoting' : 'Downvoting'} response...`,
      success: () => {
        mutate<Array<Vote>>(
          `/api/vote?chatId=${chatId}`,
          (currentVotes = []) => {
            const otherVotes = currentVotes.filter(
              (v) => v.messageId !== message.id,
            );
            return [
              ...otherVotes,
              { chatId, messageId: message.id, isUpvoted: isUpvote },
            ];
          },
          { revalidate: false },
        );
        return `Response ${isUpvote ? 'upvoted' : 'downvoted'}!`;
      },
      error: `Failed to ${type}vote response.`,
    });
  };

  if (isLoading || message.role === 'user' || (message.toolInvocations && message.toolInvocations.length > 0)) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            {/* */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              onClick={async () => {
                await copyToClipboard(message.content);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500 transition-colors hover:text-blue-500 dark:text-neutral-400 dark:hover:text-blue-500"
              disabled={vote?.isUpvoted}
              onClick={() => handleVote('up')}
            >
              {/* NEW: Ikon berubah warna saat vote aktif */}
              <ThumbUpIcon
                className={cn(
                  'h-4 w-4',
                  vote?.isUpvoted && 'fill-blue-500 text-blue-500',
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Like this response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-500 transition-colors hover:text-red-500 dark:text-neutral-400 dark:hover:text-red-500"
              disabled={vote && !vote.isUpvoted}
              onClick={() => handleVote('down')}
            >
              {/* NEW: Ikon berubah warna saat vote aktif */}
              <ThumbDownIcon
                className={cn(
                  'h-4 w-4',
                  vote && !vote.isUpvoted && 'fill-red-500 text-red-500',
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Dislike this response</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    return true;
  },
);