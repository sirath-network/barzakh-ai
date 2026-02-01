import type { Message } from 'ai';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';
import { memo, useState } from 'react';
import equal from 'fast-deep-equal';
import { cn } from '@barzakh/shared/lib/utils/utils';

import type { Vote } from '@/lib/db/schema';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

const TooltipProviderAny = TooltipProvider as any;
const TooltipAny = Tooltip as any;
const TooltipTriggerAny = TooltipTrigger as any;
const TooltipContentAny = TooltipContent as any;
const ButtonAny = Button as any;
const CopyIconAny = CopyIcon as any;
const ThumbUpIconAny = ThumbUpIcon as any;
const ThumbDownIconAny = ThumbDownIcon as any;

// Animated checkmark icon
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    height="16"
    width="16"
    viewBox="0 0 16 16"
    style={{ color: 'currentcolor' }}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M13.7803 4.28033L14.3107 3.75L13.25 2.68934L12.7197 3.21967L6 9.93934L3.28033 7.21967L2.75 6.68934L1.68934 7.75L2.21967 8.28033L5.46967 11.5303C5.61032 11.671 5.80109 11.75 6 11.75C6.19891 11.75 6.38968 11.671 6.53033 11.5303L13.7803 4.28033Z"
      fill="currentColor"
    />
  </svg>
);

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
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    // Strip internal image URL metadata before copying
    const cleanContent = message.content
      .replace(/\n*\[ORIGINAL_IMAGE_URLS_FOR_EDITING:[^\]]+\]/g, '')
      .trim();
    await copyToClipboard(cleanContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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

  if (isLoading || message.role === 'user') {
    return null;
  }

  return (
    <TooltipProviderAny delayDuration={100}>
      <div className="flex items-center gap-1">
        <TooltipAny>
          <TooltipTriggerAny asChild>
            {/* */}
            <ButtonAny
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 transition-all duration-200",
                isCopied
                  ? "text-green-500 dark:text-green-400 scale-110"
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              )}
              onClick={handleCopy}
            >
              <div className={cn(
                "transition-all duration-200",
                isCopied ? "scale-110" : "scale-100"
              )}>
                {isCopied ? (
                  <CheckIcon className="h-4 w-4" />
                ) : (
                  <CopyIconAny className="h-4 w-4" />
                )}
              </div>
            </ButtonAny>
          </TooltipTriggerAny>
          <TooltipContentAny>{isCopied ? 'Copied!' : 'Copy'}</TooltipContentAny>
        </TooltipAny>

        <TooltipAny>
          <TooltipTriggerAny asChild>
            <ButtonAny
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-600 transition-colors hover:text-blue-600 dark:text-neutral-400 dark:hover:text-blue-500"
              disabled={vote?.isUpvoted}
              onClick={() => handleVote('up')}
            >
              {/* */}
              <ThumbUpIconAny
                className={cn(
                  'h-4 w-4',
                  vote?.isUpvoted && 'fill-blue-500 text-blue-500',
                )}
              />
            </ButtonAny>
          </TooltipTriggerAny>
          <TooltipContentAny>Like this response</TooltipContentAny>
        </TooltipAny>

        <TooltipAny>
          <TooltipTriggerAny asChild>
            <ButtonAny
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-neutral-600 transition-colors hover:text-red-600 dark:text-neutral-400 dark:hover:text-red-500"
              disabled={vote && !vote.isUpvoted}
              onClick={() => handleVote('down')}
            >
              {/* */}
              <ThumbDownIconAny
                className={cn(
                  'h-4 w-4',
                  vote && !vote.isUpvoted && 'fill-red-500 text-red-500',
                )}
              />
            </ButtonAny>
          </TooltipTriggerAny>
          <TooltipContentAny>Dislike this response</TooltipContentAny>
        </TooltipAny>
      </div>
    </TooltipProviderAny>
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