// /components/tweet-card.tsx
import React from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Heart, Repeat2, BadgeCheck, MessageCircle, Share, Eye } from "lucide-react";

// Custom X Icon Component
const XIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-label="X"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

type Tweet = {
  id: string;
  text: string;
  author: {
    name: string;
    username: string;
    profile_image_url?: string;
    verified?: boolean;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
      listed_count: number;
    };
  };
  createdAt: string;
  publicMetrics: {
    retweet_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number;
  };
};

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });

  if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second');
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return rtf.format(-diffInMinutes, 'minute');
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return rtf.format(-diffInHours, 'hour');
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return rtf.format(-diffInDays, 'day');
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
};

const TweetText = ({ text }: { text: string }) => {
  const parts = text.split(/(\s+)/);
  const renderPart = (part: string, index: number) => {
    const urlRegex = /^(https?:\/\/[^\s]+)/;
    const mentionRegex = /^@(\w{1,15})/;
    const hashtagRegex = /^#(\w+)/;
    
    if (urlRegex.test(part)) {
      return (
        <a 
          key={index} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-500 hover:text-blue-600 hover:underline transition-colors"
        >
          {part}
        </a>
      );
    }
    if (mentionRegex.test(part)) {
      const username = part.substring(1);
      return (
        <a 
          key={index} 
          href={`https://x.com/${username}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-500 hover:text-blue-600 hover:underline transition-colors font-medium"
        >
          {part}
        </a>
      );
    }
    if (hashtagRegex.test(part)) {
      const tag = part.substring(1);
      return (
        <a 
          key={index} 
          href={`https://x.com/hashtag/${tag}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-500 hover:text-blue-600 hover:underline transition-colors font-medium"
        >
          {part}
        </a>
      );
    }
    return part;
  };
  return <>{parts.map((part, index) => renderPart(part, index))}</>;
};

export const TweetCard = ({ tweet }: { tweet: Tweet }) => {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
  };

  const TRUNCATE_LENGTH = 200;
  const tweetUrl = `https://x.com/${tweet.author.username}/status/${tweet.id}`;
  const isTextTooLong = tweet.text.length > TRUNCATE_LENGTH;

  let displayText = tweet.text;
  if (isTextTooLong) {
    const truncated = tweet.text.substring(0, TRUNCATE_LENGTH);
    displayText = truncated.substring(0, Math.min(truncated.length, truncated.lastIndexOf(" ")));
  }

  return (
    <Card className="w-full h-full bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col group">
      {/* Header with author info */}
      <CardHeader className="flex flex-row items-start gap-3 p-4 pb-3">
        <div className="relative">
          <img
            src={tweet.author.profile_image_url ?? `https://unavatar.io/twitter/${tweet.author.username}`}
            alt={`${tweet.author.name}'s avatar`}
            className="w-12 h-12 rounded-full flex-shrink-0 bg-neutral-200 dark:bg-neutral-700 object-cover ring-2 ring-transparent hover:ring-blue-200 dark:hover:ring-blue-800 transition-all"
            onError={(e) => {
              e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${tweet.author.name}&backgroundColor=3b82f6&textColor=ffffff`;
            }}
          />
          {tweet.author.verified && (
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-neutral-900 rounded-full p-0.5">
              <BadgeCheck className="h-4 w-4 text-blue-500" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 truncate text-sm">
              {tweet.author.name}
            </span>
            <span className="text-neutral-500 dark:text-neutral-400 text-sm truncate">
              @{tweet.author.username}
            </span>
          </div>
          <time 
            className="text-xs text-neutral-500 dark:text-neutral-400" 
            dateTime={tweet.createdAt} 
            title={new Date(tweet.createdAt).toLocaleString('en-US')}
          >
            {formatRelativeTime(tweet.createdAt)}
          </time>
        </div>

        <a 
          href={tweetUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex-shrink-0 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title="View on X"
        >
          <XIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
        </a>
      </CardHeader>
      
      {/* Tweet content */}
      <CardContent className="px-4 pb-3 flex-grow">
        <div className="text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 break-words whitespace-pre-wrap">
          <TweetText text={displayText} />
          {isTextTooLong && (
            <>
              <span className="text-neutral-500">... </span>
              <a 
                href={tweetUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-500 hover:text-blue-600 hover:underline font-medium transition-colors"
              >
                Show more
              </a>
            </>
          )}
        </div>
      </CardContent>

      {/* Engagement metrics footer */}
      <CardFooter className="px-4 py-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center justify-between w-full text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 hover:text-blue-500 transition-colors cursor-pointer">
              <MessageCircle className="h-4 w-4" />
              <span className="font-medium">{formatNumber(tweet.publicMetrics.quote_count)}</span>
            </div>
            
            <div className="flex items-center gap-1.5 hover:text-green-500 transition-colors cursor-pointer">
              <Repeat2 className="h-4 w-4" />
              <span className="font-medium">{formatNumber(tweet.publicMetrics.retweet_count)}</span>
            </div>
            
            <div className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-pointer">
              <Heart className="h-4 w-4" />
              <span className="font-medium">{formatNumber(tweet.publicMetrics.like_count)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {tweet.publicMetrics.impression_count > 0 && (
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Eye className="h-4 w-4" />
                <span className="text-xs">{formatNumber(tweet.publicMetrics.impression_count)}</span>
              </div>
            )}
            
            <button 
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Share"
            >
              <Share className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};