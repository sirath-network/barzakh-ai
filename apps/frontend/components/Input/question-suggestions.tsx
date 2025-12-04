"use client";

import { ChatRequestOptions, CreateMessage, Message } from "ai";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useWindowSize } from "usehooks-ts";
import { User } from "next-auth";
import { cn } from "@barzakh/shared/lib/utils/utils";
import { motion } from "framer-motion";
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

  const [totalSuggestions, setTotalSuggestions] = useState(6);

  useEffect(() => {
    if (width < 640) {
      setTotalSuggestions(2);
    } else if (width < 1400) {
      // Tablet/iPad/Small Laptop view - show 3 suggestions
      setTotalSuggestions(3);
    } else if (height < 800) {
      setTotalSuggestions(3);
    } else {
      setTotalSuggestions(6);
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
      iconColor: 'text-purple-500 dark:text-purple-400',
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

  const isMobile = width < 768;

  if (isLoadingSuggestions && (!history || history.length === 0)) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 w-full">
        <div className={cn("flex gap-2", isMobile ? "flex-col w-full" : "flex-wrap justify-center")}>
          {Array.from({ length: isMobile ? 3 : 4 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "bg-muted/30 animate-pulse",
                isMobile ? "h-14 w-full rounded-2xl" : "h-10 w-32 rounded-full border border-border/20"
              )} 
            />
          ))}
        </div>
      </motion.div>
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
      <div className={cn("flex gap-2", isMobile ? "flex-col w-full" : "flex-wrap justify-center")}>
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
                isMobile 
                  ? "w-full p-4 rounded-2xl bg-secondary/40 hover:bg-secondary/60 text-left border border-transparent" 
                  : "px-4 py-2 rounded-full border bg-muted/40 hover:bg-muted/80 border-border/40 hover:border-border/60 hover:shadow-sm active:scale-95"
              )}
            >
              <IconComponent className={cn("shrink-0", isMobile ? "h-5 w-5 opacity-70" : "h-4 w-4", suggestion.iconColor)} />
              <span className={cn("font-medium text-foreground/90", isMobile ? "text-sm truncate flex-1 min-w-0" : "text-sm truncate max-w-[200px]")}>
                {suggestion.title}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};
