"use client";

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useWindowSize } from "usehooks-ts";
import { CheckCircleFillIcon, ChevronDownIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import BottomSheet from "../bottom-sheet";
import { saveChatModelAsCookie } from "@/app/(chat)/actions";
import { chatModels } from "@barzakh/shared/lib/ai/models";
import { cn } from "@barzakh/shared/lib/utils/utils";
import { Search, SearchX } from "lucide-react";

// --- Konstanta ---
const TAILWIND_MD_BREAKPOINT = 768;

// --- Types & Props ---
type ChatModel = (typeof chatModels)[number];

// --- Props ---
interface ModelSelectorProps {
  selectedModelId: string;
  className?: string;
  onModelSelect?: (modelId: string) => void; // Optional callback untuk parent component
  disabled?: boolean; // Add disabled prop
}

interface ModelOptionListProps {
  selectedModelId: string;
  onSelect: (model: ChatModel) => void;
  searchQuery?: string;
  isDropdown?: boolean;
}

const useModelSearch = (models: ChatModel[], query: string) => {
  return useMemo(() => {
    if (!query.trim()) return models;
    const lowercaseQuery = query.toLowerCase();
    return models.filter(
      (model) =>
        model.name.toLowerCase().includes(lowercaseQuery) ||
        model.description.toLowerCase().includes(lowercaseQuery)
    );
  }, [models, query]);
};

const getModelIconBaseName = (model?: ChatModel | null): string | null => {
  if (!model) return null;

  const source = (model.name || model.id || "").toLowerCase();

  if (source.includes("claude")) return "Claude";
  if (source.includes("gpt") || source.includes("openai")) return "GPT";
  if (source.includes("grok")) return "Grok";
  if (source.includes("glm")) return "GLM";

  return null;
};

const ModelOptionList = ({
  selectedModelId,
  onSelect,
  searchQuery = "",
  isDropdown = false,
}: ModelOptionListProps) => {
  const filteredModels = useModelSearch(chatModels, searchQuery);
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";

  if (filteredModels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
        <SearchX className="size-12 opacity-50" />
        <p className="font-semibold">Models Not Found</p>
        <p className="text-sm">Try using different keywords.</p>
      </div>
    );
  }

  return (
    <>
      {filteredModels.map((model) => {
        const isSelected = selectedModelId === model.id;
        const baseName = getModelIconBaseName(model);
        const themeSuffix = resolvedTheme === "dark" ? "Dark" : "Light";
        const iconSrc = baseName
          ? `/images/models-icon/${baseName}-${themeSuffix}.png`
          : null;

        const commonClasses = cn(
          "flex items-center gap-4 cursor-pointer rounded-xl border border-transparent",
          "transition-all duration-150",
          isDarkTheme
            ? "text-neutral-100/90 hover:bg-neutral-800/80 focus:bg-neutral-800/80"
            : "text-neutral-900 hover:bg-neutral-50 focus:bg-neutral-50",
          isSelected &&
            (isDarkTheme
              ? "bg-neutral-800 text-foreground"
              : "bg-white text-neutral-900 ring-1 ring-neutral-200 shadow-[0_12px_30px_rgba(15,23,42,0.08)]")
        );

        const content = (
          <>
            {iconSrc && (
              <Image
                src={iconSrc}
                alt={model.name}
                width={20}
                height={20}
                className="rounded-md flex-shrink-0"
              />
            )}
            <div className="flex-grow min-w-0 text-left">
              <p className="font-medium truncate">{model.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {model.description}
              </p>
            </div>
            {isSelected && (
              <CheckCircleFillIcon className="text-primary size-5 flex-shrink-0" />
            )}
          </>
        );

        if (isDropdown) {
          const DropdownMenuItemAny = DropdownMenuItem as any;
          return (
            <DropdownMenuItemAny
              key={model.id}
              onSelect={(e: any) => {
                e.preventDefault(); // Prevent default dropdown behavior
                onSelect(model);
              }}
              className={cn(commonClasses, "px-3 py-3.5 rounded-xl")}
            >
              {content}
            </DropdownMenuItemAny>
          );
        }

        return (
          <div
            key={model.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelect(model);
            }}
            className={cn(commonClasses, "px-4 py-3.5 rounded-xl")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(model);
              }
            }}
          >
            {content}
          </div>
        );
      })}
    </>
  );
};

const MobileSearchHeader = ({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}) => (
  <div className="sticky top-0 bg-background border-b p-4">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search Models"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className={cn(
          "w-full pl-10 pr-4 py-2.5 text-base rounded-xl border-2",
          "bg-background text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "transition-colors duration-150"
        )}
      />
    </div>
  </div>
);

export function ModelSelector({
  selectedModelId,
  className,
  onModelSelect,
  disabled = false,
  ...buttonProps
}: ModelSelectorProps & React.ComponentProps<any>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { width } = useWindowSize();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === "dark";

  // Client-side hydration fix
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isDesktop = isClient && width >= TAILWIND_MD_BREAKPOINT;

  const selectedChatModel = useMemo(
    () => chatModels.find((model) => model.id === selectedModelId),
    [selectedModelId]
  );

  const selectedModelIconSrc = useMemo(() => {
    const baseName = getModelIconBaseName(selectedChatModel);
    if (!baseName) return null;

    const themeSuffix =
      resolvedTheme === "dark" ? "Dark" : "Light";

    return `/images/models-icon/${baseName}-${themeSuffix}.png`;
  }, [selectedChatModel, resolvedTheme]);

  // Optimized select handler dengan debouncing dan error handling
  const handleSelect = useCallback(async (model: ChatModel) => {
    if (disabled || isUpdating || model.id === selectedModelId) return;
    
    try {
      setIsUpdating(true);
      
      // Close UI immediately for better UX
      setIsExpanded(false);
      
      // Clear search with delay
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setSearchQuery("");
      }, 100);

      // Call parent callback first (if exists) for immediate UI update
      if (onModelSelect) {
        onModelSelect(model.id);
      }

      // Save to cookie asynchronously without blocking UI
      await saveChatModelAsCookie(model.id);
      
    } catch (error) {
      console.error("Failed to save model selection:", error);
      // Optionally show error toast here
    } finally {
      setIsUpdating(false);
    }
  }, [disabled, selectedModelId, isUpdating, onModelSelect]);

  // Handle dropdown state changes - separated for desktop/mobile
  const handleDropdownOpenChange = useCallback((open: boolean) => {
    if (!isDesktop || disabled) return;
    setIsExpanded(open);
    
    if (!open) {
      // Clear search when closing
      setTimeout(() => setSearchQuery(""), 150);
    }
  }, [isDesktop, disabled]);

  // Fixed mobile button handler - prevent conflicts with dropdown trigger
  const handleMobileToggle = useCallback((e: React.MouseEvent) => {
    if (disabled || buttonProps.disabled || isUpdating) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Only handle mobile interactions
    if (!isClient || isDesktop) return;
    
    setIsExpanded(prev => !prev);
  }, [disabled, isClient, isDesktop, isUpdating]);

  // Clean up search query when closing
  useEffect(() => {
    if (!isExpanded) {
      const timer = setTimeout(() => setSearchQuery(""), 150);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    const ButtonAny = Button as any;
    return (
      <div className={cn("relative", className)}>
        <ButtonAny
          variant="outline"
          disabled
          className="h-10 border-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 opacity-50"
        >
          <div className="w-4 h-4 bg-muted rounded animate-pulse" />
        </ButtonAny>
      </div>
    );
  }

  const ButtonAny = Button as any;
  const DropdownMenuAny = DropdownMenu as any;
  const DropdownMenuTriggerAny = DropdownMenuTrigger as any;
  const DropdownMenuContentAny = DropdownMenuContent as any;
  const BottomSheetAny = BottomSheet as any;

  return (
    <div className={cn("relative mr-0 sm:mr-1 mt-1", className)}>
      <DropdownMenuAny 
        open={isDesktop && isExpanded} 
        onOpenChange={handleDropdownOpenChange}
      >
        <DropdownMenuTriggerAny asChild>
          <ButtonAny
            {...buttonProps}
            variant="outline"
            onClick={handleMobileToggle}
            disabled={disabled || isUpdating}
            className={cn(
              "h-10 w-10 p-0 border-2 rounded-xl transition-all duration-200",
              "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700",
              "text-neutral-900 dark:text-neutral-200",
              "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )}
            title={selectedChatModel?.name}
          >
            <div className="flex items-center justify-center">
              {isUpdating ? (
                <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
              ) : selectedModelIconSrc ? (
                <Image
                  src={selectedModelIconSrc}
                  alt={selectedChatModel?.name || "Model icon"}
                  width={20}
                  height={20}
                  className="rounded-md"
                />
              ) : (
                <span className="font-semibold text-sm">
                  {selectedChatModel?.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </ButtonAny>
        </DropdownMenuTriggerAny>

        {/* Desktop: Menu Dropdown */}
        <DropdownMenuContentAny
          align="end"
          className={cn(
            "w-[360px] p-0 rounded-2xl animate-in fade-in-0 zoom-in-95",
            "mt-2 mr-1 sm:mr-2 backdrop-blur-md",
            isDarkTheme
              ? "bg-neutral-950/95 border border-neutral-800 shadow-2xl shadow-black/40"
              : "bg-white/95 border border-neutral-200 shadow-[0_25px_65px_rgba(15,23,42,0.18)]"
          )}
          sideOffset={10}
        >
          <div
            className={cn(
              "p-4 pb-2 border-b",
              isDarkTheme ? "border-neutral-800" : "border-neutral-200/80"
            )}
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Models"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border",
                  "focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors duration-150",
                  isDarkTheme
                    ? "border-neutral-800 bg-neutral-900/80 text-neutral-100 placeholder:text-neutral-400"
                    : "border-neutral-200 bg-white text-neutral-900 placeholder:text-neutral-500 shadow-[0_1px_2px_rgba(15,23,42,0.08)] focus:border-primary/50"
                )}
                disabled={isUpdating}
              />
            </div>
          </div>
          <div
            className={cn(
              "max-h-80 overflow-y-auto custom-scrollbar px-3 pb-4 pt-2",
              !isDarkTheme &&
                "bg-gradient-to-b from-white/75 via-white/30 to-transparent"
            )}
          >
            <ModelOptionList
              selectedModelId={selectedModelId}
              onSelect={handleSelect}
              searchQuery={searchQuery}
              isDropdown
            />
          </div>
        </DropdownMenuContentAny>
      </DropdownMenuAny>

      {/* Mobile: Bottom Sheet */}
      {!isDesktop && (
        <BottomSheetAny
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
          title="Choose Models"
          className="max-h-[85vh]"
        >
          <div className="flex flex-1 flex-col min-h-0">
            <MobileSearchHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2 p-4 pb-8">
                <ModelOptionList
                  selectedModelId={selectedModelId}
                  onSelect={handleSelect}
                  searchQuery={searchQuery}
                />
              </div>
            </div>
          </div>
        </BottomSheetAny>
      )}
    </div>
  );
}