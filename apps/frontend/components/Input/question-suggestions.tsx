"use client";

import { ChatRequestOptions, CreateMessage, Message } from "ai";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useWindowSize } from "usehooks-ts";
import { User } from "next-auth";
import { cn } from "@barzakh/shared/lib/utils/utils";
import { motion } from "@/lib/framer-motion";
import { MessageCircleMore, Sparkles } from "lucide-react";
import type { Chat as ChatHistory } from "@/lib/db/schema";

interface EnhancedSuggestion {
  title: string;
  subtitle: string;
  category: 'frequent' | 'recent' | 'trending' | 'followup' | 'predefined';
  confidence: number;
  context?: string;
  relatedTopics?: string[];
  lastUsed?: Date;
  frequency?: number;
}

const BLOCKCHAIN_SUGGESTIONS: EnhancedSuggestion[] = [
  {
    title: 'Explain how blockchain works',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.85,
  },
  {
    title: 'What is the difference between Bitcoin and Ethereum?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.85,
  },
  {
    title: 'What are smart contracts?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.85,
  },
  {
    title: 'How do I create my own cryptocurrency?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.8,
  },
  {
    title: 'What is DeFi (Decentralized Finance)?',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.8,
  },
  {
    title: 'Explain the concept of NFTs',
    subtitle: 'Crypto & Web3',
    category: 'predefined',
    confidence: 0.8,
  },
];

export const QuestionSuggestions = ({
  append,
  history,
  user,
}: {
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
  history: ChatHistory[] | undefined;
  user: User | undefined;
}) => {
  const [aiSuggestions, setAiSuggestions] = useState<EnhancedSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const { width, height } = useWindowSize();

  const [totalSuggestions, setTotalSuggestions] = useState(3);

  useEffect(() => {
    if (width < 640) {
      setTotalSuggestions(2);
    } else if (width < 1024) {
      setTotalSuggestions(4);
    } else {
      setTotalSuggestions(3);
    }
  }, [width, height]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsLoadingSuggestions(true);
      try {
        const randomBlockchainSuggestions = BLOCKCHAIN_SUGGESTIONS.sort(() => 0.5 - Math.random());
        setAiSuggestions(randomBlockchainSuggestions);
      } catch (error) {
        console.error("Failed to fetch suggestions:", error);
        setAiSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, []);

  const suggestions = useMemo(() => {
    const sortedHistory = [...(history || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const historyItems = sortedHistory.slice(0, totalSuggestions).map(chat => ({
      key: chat.id,
      title: chat.title,
      subtitle: undefined,
      isHistory: true,
      icon: MessageCircleMore,
      iconColor: 'text-gray-500 dark:text-gray-400',
    }));

    const neededAiItems = totalSuggestions - historyItems.length;

    if (neededAiItems <= 0) {
      return historyItems;
    }

    const aiItems = aiSuggestions.slice(0, neededAiItems).map((s, i) => ({
      key: `ai-${i}`,
      title: s.title,
      subtitle: s.subtitle,
      isHistory: false,
      icon: Sparkles,
      iconColor: 'text-primary',
    }));

    return [...historyItems, ...aiItems];
  }, [history, aiSuggestions, totalSuggestions]);

  const handleSuggestionClick = (suggestion: { key: string; title: string; isHistory: boolean; }) => {
    if (!user) {
      toast.error("Please log in to start a conversation.", {
        position: "top-center",
        duration: 3000,
      });
      return;
    }

    const chatRequestOptions: ChatRequestOptions = {};

    if (suggestion.isHistory) {
      chatRequestOptions.body = {
        history_for_context_id: suggestion.key
      };
    }

    append(
      {
        content: suggestion.title,
        role: "user",
      },
      chatRequestOptions
    );
  };

  // Loading logic:
  // - Guest users: Show skeleton only while AI suggestions load (very fast)
  // - Logged-in users: Show skeleton until history loads (or is confirmed empty)
  const isGuestWaiting = !user && isLoadingSuggestions;
  const isUserWaitingForHistory = user && history === undefined;

  if (isGuestWaiting || isUserWaitingForHistory) {
    return (
      <div className="mb-6 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
          {Array.from({ length: totalSuggestions }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40 animate-pulse"
            >
              {/* Icon placeholder */}
              <div className="shrink-0 h-4 w-4 rounded bg-muted-foreground/30" />
              {/* Text placeholder */}
              <div className="flex-1 h-4 rounded bg-muted-foreground/30" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="mb-6 w-full"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
        {suggestions.map((suggestion, index) => {
          const IconComponent = suggestion.icon as any;
          return (
            <motion.button
              key={suggestion.key}
              type="button"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "group flex items-center gap-3 cursor-pointer transition-all duration-200",
                "w-full p-3 rounded-xl border text-left",
                "bg-muted/40 hover:bg-muted/80 border-border/40 hover:border-border/60",
                "hover:shadow-sm active:scale-95"
              )}
            >
              <IconComponent className={cn("shrink-0 h-4 w-4", suggestion.iconColor)} />
              <span className="font-medium text-foreground/90 text-sm truncate flex-1 min-w-0">
                {suggestion.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
