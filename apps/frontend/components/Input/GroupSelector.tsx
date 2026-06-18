"use client";

import {
  cn,
  type SearchGroup,
  type SearchGroupId,
  searchGroups,
} from "@barzakh/shared/lib/utils/utils";
import {
  startTransition,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useWindowSize } from "usehooks-ts";
import { Search, SearchX, Settings2, X } from "lucide-react";
import Image from "next/image";

import BottomSheet from "../bottom-sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { CheckCircleFillIcon } from "../icons";

// --- Props & Constants ---
interface GroupSelectorProps {
  selectedGroupId: SearchGroupId;
  onGroupSelect: (group: SearchGroup) => void;
  className?: string;
  disabled?: boolean;
}

interface GroupOptionListProps extends GroupSelectorProps {
  onSelect: (group: SearchGroup) => void;
  isDropdown?: boolean;
  searchQuery?: string;
}

const TAILWIND_MD_BREAKPOINT = 768;
const getGroupListIconSize = (groupId: string) => groupId === "sui" ? 20 : 28;
const getSelectedChipIconSize = (groupId: string) => groupId === "sui" ? 14 : 20;

// --- Search functionality ---
const useGroupSearch = (groups: SearchGroup[], query: string) => {
  return useMemo(() => {
    if (!query.trim()) return groups;

    const lowercaseQuery = query.toLowerCase();
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(lowercaseQuery) ||
        group.description.toLowerCase().includes(lowercaseQuery)
    );
  }, [groups, query]);
};

// --- Sub-Component for Group Options (Reusable & Optimized) ---
const GroupOptionList = ({
  selectedGroupId,
  onSelect,
  isDropdown = false,
  searchQuery = "",
}: GroupOptionListProps) => {
  const filteredGroups = useGroupSearch([...searchGroups] as any[], searchQuery);

  if (filteredGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-muted-foreground">
        <SearchX className="size-12 opacity-50" />
        <p className="font-semibold">Tools Not Found</p>
        <p className="text-sm">Try using different keywords.</p>
      </div>
    );
  }

  return (
    <>
      {filteredGroups.map((group) => {
        const IconComponent = group.icon;
        const isSelected = selectedGroupId === group.id;

        const content = (
          <>
            <div className="flex size-7 flex-shrink-0 items-center justify-center">
              {group.img ? (
                typeof group.img === "string" ? (
                  <Image
                    src={group.img}
                    alt={`${group.name} icon`}
                    width={getGroupListIconSize(group.id)}
                    height={getGroupListIconSize(group.id)}
                    className="rounded-full object-contain"
                  />
                ) : (
                  <>
                    <Image
                      src={group.img.light}
                      alt={`${group.name} icon`}
                      width={getGroupListIconSize(group.id)}
                      height={getGroupListIconSize(group.id)}
                      className="rounded-full object-contain dark:hidden"
                    />
                    <Image
                      src={group.img.dark}
                      alt={`${group.name} icon`}
                      width={getGroupListIconSize(group.id)}
                      height={getGroupListIconSize(group.id)}
                      className="rounded-full object-contain hidden dark:block"
                    />
                  </>
                )
              ) : (
                <IconComponent className="size-6" />
              )}
            </div>
            <div className="flex-grow min-w-0 text-left">
              <p className="font-medium truncate">{group.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {group.description}
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
              key={group.id}
              onSelect={() => onSelect(group)}
              className={cn(
                "flex items-center gap-3 cursor-pointer p-3 rounded-lg",
                "transition-colors duration-150",
                "hover:bg-accent hover:text-accent-foreground",
                "focus:bg-accent focus:text-accent-foreground",
                isSelected && "bg-accent/60 ring-1 ring-primary/30"
              )}
            >
              {content}
            </DropdownMenuItemAny>
          );
        }

        return (
          <div
            key={group.id}
            onClick={() => onSelect(group)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg cursor-pointer",
              "transition-all duration-150 active:scale-[0.98]",
              "hover:bg-accent hover:text-accent-foreground",
              "focus:bg-accent focus:text-accent-foreground",
              isSelected && "bg-accent/60 ring-2 ring-primary/30"
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(group);
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

// --- Enhanced Mobile Search Component ---
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
        placeholder="Search Tools"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className={cn(
          "w-full pl-10 pr-4 py-2.5 text-base rounded-xl border",
          "bg-background text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          "transition-colors duration-150"
        )}
      />
    </div>
  </div>
);

// --- Main Component ---
export const GroupSelector = ({
  selectedGroupId,
  onGroupSelect,
  className,
  disabled = false,
}: GroupSelectorProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Client-side hydration fix
  const [isClient, setIsClient] = useState(false);
  const { width } = useWindowSize();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isDesktop = isClient && width >= TAILWIND_MD_BREAKPOINT;

  const selectedGroup = useMemo(
    () => searchGroups.find((group) => group.id === selectedGroupId),
    [selectedGroupId]
  );

  const isDefault = selectedGroupId === 'search';

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    const searchGroup = searchGroups.find(g => g.id === 'search');
    if (searchGroup) {
      onGroupSelect(searchGroup);
    }
  };

  const SelectedIcon = selectedGroup?.icon as any;

  const handleSelect = useCallback(
    (group: SearchGroup) => {
      startTransition(() => {
        onGroupSelect(group);
        setIsExpanded(false);
        setSearchQuery("");
      });
    },
    [onGroupSelect]
  );

  // Fixed mobile button handler - prevent event bubbling and ensure proper state management
  const handleMobileToggle = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    e.preventDefault();
    e.stopPropagation();

    if (!isClient || isDesktop) return;

    setIsExpanded(prev => !prev);
  }, [disabled, isClient, isDesktop]);

  // Handle dropdown open change for desktop
  const handleDropdownOpenChange = useCallback((open: boolean) => {
    if (!isDesktop) return;
    setIsExpanded(open);
  }, [isDesktop]);

  // Clean up search query when closing
  useEffect(() => {
    if (!isExpanded) {
      const timer = setTimeout(() => setSearchQuery(""), 150);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isExpanded]);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    const ButtonAny = Button as any;
    return (
      <div className={cn("relative", className)}>
        <ButtonAny
          variant="outline"
          disabled
          className="h-10 px-2 rounded-xl border-1 bg-background opacity-50"
        >
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
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
    <div className={cn("relative flex items-center gap-1", className)}>
      <DropdownMenuAny
        open={isDesktop && isExpanded}
        onOpenChange={handleDropdownOpenChange}
      >
        <DropdownMenuTriggerAny asChild>
          <ButtonAny
            variant="ghost"
            onClick={handleMobileToggle}
            disabled={disabled}
            className={cn(
              "h-9 rounded-full transition-all duration-200",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              "data-[state=open]:bg-muted/50 data-[state=open]:text-foreground",
              "!outline-none !ring-0 !ring-offset-0 focus:!ring-0 focus-visible:!ring-0 focus-visible:!ring-offset-0",
              disabled && "opacity-50 cursor-not-allowed",
              isDefault ? "px-3 w-auto" : "w-9 px-0 justify-center"
            )}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="size-5" />
              {isDefault && (
                <span className="font-medium truncate text-sm">
                  Tools
                </span>
              )}
            </div>
          </ButtonAny>
        </DropdownMenuTriggerAny>

        <DropdownMenuContentAny
          align="start"
          className={cn(
            "w-[380px] p-0",
            "bg-background",
            "border-2 shadow-xl rounded-xl animate-in fade-in-0 zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
          sideOffset={8}
        >
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Tools"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-9 pr-3 py-2 text-sm rounded-md border-0",
                  "bg-transparent focus:outline-none focus:ring-1 focus:ring-primary/30"
                )}
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto custom-scrollbar p-2">
            <GroupOptionList
              selectedGroupId={selectedGroupId}
              onGroupSelect={onGroupSelect}
              onSelect={handleSelect}
              searchQuery={searchQuery}
              isDropdown
            />
          </div>
        </DropdownMenuContentAny>
      </DropdownMenuAny>

      {!isDefault && selectedGroup && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-full border border-border/50 animate-in fade-in slide-in-from-left-2">
          <div className="flex size-5 flex-shrink-0 items-center justify-center">
            {selectedGroup.img ? (
              typeof selectedGroup.img === "string" ? (
                <Image
                  src={selectedGroup.img}
                  alt="Selected group icon"
                  width={getSelectedChipIconSize(selectedGroup.id)}
                  height={getSelectedChipIconSize(selectedGroup.id)}
                  className="rounded-full object-contain"
                />
              ) : (
                <>
                  <Image
                    src={selectedGroup.img.light}
                    alt="Selected group icon"
                    width={getSelectedChipIconSize(selectedGroup.id)}
                    height={getSelectedChipIconSize(selectedGroup.id)}
                    className="rounded-full object-contain dark:hidden"
                  />
                  <Image
                    src={selectedGroup.img.dark}
                    alt="Selected group icon"
                    width={getSelectedChipIconSize(selectedGroup.id)}
                    height={getSelectedChipIconSize(selectedGroup.id)}
                    className="rounded-full object-contain hidden dark:block"
                  />
                </>
              )
            ) : (
              SelectedIcon && <SelectedIcon className="size-4" />
            )}
          </div>
          <span className="text-sm font-medium max-w-[100px] truncate">{selectedGroup.name}</span>
          <button
            type="button"
            onClick={handleReset}
            className="ml-1 p-0.5 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      {!isDesktop && (
        <BottomSheetAny
          isOpen={isExpanded}
          onClose={() => setIsExpanded(false)}
          title="Select Tools"
          className="max-h-[85vh]"
        >
          <div className="flex flex-1 flex-col min-h-0">
            <MobileSearchHeader
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2 p-4 pb-8">
                <GroupOptionList
                  selectedGroupId={selectedGroupId}
                  onGroupSelect={onGroupSelect}
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
};