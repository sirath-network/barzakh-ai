"use client";

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
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
import { chatModels, type ChatModel } from "@javin/shared/lib/ai/models";
import { cn } from "@javin/shared/lib/utils/utils";
import { Search, SearchX } from "lucide-react";

// --- Konstanta ---
const TAILWIND_MD_BREAKPOINT = 768;

// --- Props ---
interface ModelSelectorProps {
  selectedModelId: string;
  className?: string;
  onModelSelect?: (modelId: string) => void; // Optional callback untuk parent component
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

const ModelOptionList = ({
  selectedModelId,
  onSelect,
  searchQuery = "",
  isDropdown = false,
}: ModelOptionListProps) => {
  const filteredModels = useModelSearch(chatModels, searchQuery);

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
        const commonClasses = cn(
          "flex items-center gap-4 cursor-pointer",
          "transition-colors duration-150",
          "hover:bg-accent hover:text-accent-foreground",
          "focus:bg-accent focus:text-accent-foreground",
          isSelected && "bg-accent/60"
        );

        const content = (
          <>
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
          return (
            <DropdownMenuItem
              key={model.id}
              onSelect={(e) => {
                e.preventDefault(); // Prevent default dropdown behavior
                onSelect(model);
              }}
              className={cn(commonClasses, "p-3 rounded-lg")}
            >
              {content}
            </DropdownMenuItem>
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
            className={cn(commonClasses, "p-4 rounded-lg")}
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
        autoFocus
      />
    </div>
  </div>
);

export function ModelSelector({
  selectedModelId,
  className,
  onModelSelect,
  ...buttonProps
}: ModelSelectorProps & React.ComponentProps<typeof Button>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { width } = useWindowSize();
  const timeoutRef = useRef<NodeJS.Timeout>();

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

  // Optimized select handler dengan debouncing dan error handling
  const handleSelect = useCallback(async (model: ChatModel) => {
    if (isUpdating || model.id === selectedModelId) return;
    
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
  }, [selectedModelId, isUpdating, onModelSelect]);

  // Handle dropdown state changes
  const handleOpenChange = useCallback((open: boolean) => {
    setIsExpanded(open);
    if (!open) {
      // Clear search when closing
      setTimeout(() => setSearchQuery(""), 150);
    }
  }, []);

  // Handle mobile sheet open
  const handleMobileOpen = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDesktop && !isUpdating) {
      setIsExpanded(true);
    }
  }, [isDesktop, isUpdating]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={isDesktop && isExpanded} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <Button
            {...buttonProps}
            variant="outline"
            onClick={handleMobileOpen}
            disabled={isUpdating}
            className={cn(
              "h-10 border-2 rounded-xl transition-all duration-200",
              "bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700",
              "text-neutral-900 dark:text-neutral-200",
              "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isDesktop
                ? "px-4 justify-between min-w-[180px]"
                : "w-10 p-0 justify-center",
              className
            )}
          >
            {isDesktop ? (
              <>
                <span className="font-medium truncate">
                  {isUpdating ? "Updating..." : selectedChatModel?.name}
                </span>
                <ChevronDownIcon
                  className={cn(
                    "size-4 transition-transform duration-200",
                    isExpanded && "rotate-180",
                    isUpdating && "animate-spin"
                  )}
                />
              </>
            ) : (
              <div className="flex items-center justify-center font-semibold text-sm">
                {isUpdating ? (
                  <div className="animate-spin size-4 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  selectedChatModel?.name.charAt(0).toUpperCase()
                )}
              </div>
            )}
          </Button>
        </DropdownMenuTrigger>

        {/* Desktop: Menu Dropdown */}
        <DropdownMenuContent
          align="start"
          className={cn(
            "w-[340px] p-0 bg-background",
            "border-2 shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95"
          )}
          sideOffset={8}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Models"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-md border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/30"
                disabled={isUpdating}
              />
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
            <ModelOptionList
              selectedModelId={selectedModelId}
              onSelect={handleSelect}
              searchQuery={searchQuery}
              isDropdown
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile: Bottom Sheet */}
      {!isDesktop && (
        <BottomSheet
          isOpen={isExpanded}
          onClose={() => handleOpenChange(false)}
          title="Pilih Model"
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
        </BottomSheet>
      )}
    </div>
  );
}