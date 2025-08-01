"use client";

import {
  cn,
  SearchGroup,
  SearchGroupId,
  searchGroups,
} from "@javin/shared/lib/utils/utils";
import {
  ForwardRefExoticComponent,
  RefAttributes,
  startTransition,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useWindowSize } from "usehooks-ts";
import { LucideProps, ChevronDown, Search, SearchX } from "lucide-react";
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
  const filteredGroups = useGroupSearch(searchGroups, searchQuery);

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
            <div className="flex-shrink-0">
              {group.img ? (
                <Image
                  src={group.img}
                  alt={`${group.name} icon`}
                  width={28}
                  height={28}
                  className="bg-white rounded-full object-contain"
                />
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
          return (
            <DropdownMenuItem
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
            </DropdownMenuItem>
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
        autoFocus
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
  
  const [isDesktop, setIsDesktop] = useState(false);
  const { width } = useWindowSize();

  useEffect(() => {
    setIsDesktop(width >= TAILWIND_MD_BREAKPOINT);
  }, [width]);

  const selectedGroup = useMemo(
    () => searchGroups.find((group) => group.id === selectedGroupId),
    [selectedGroupId]
  );

  const SelectedIcon = selectedGroup?.icon as ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;

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

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsExpanded((prev) => !prev);
  }, [disabled]);

  useEffect(() => {
    if (!isExpanded) {
      setTimeout(() => setSearchQuery(""), 150);
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        setIsExpanded(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isExpanded]);

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={isDesktop && isExpanded} onOpenChange={setIsExpanded}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            onClick={() => !isDesktop && handleToggle()}
            disabled={disabled}
            className={cn(
              "h-10 px-2 rounded-xl border-1 transition-all duration-200",
              "bg-background hover:bg-accent hover:text-accent-foreground",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
              "data-[state=open]:ring-2 data-[state=open]:ring-primary/20",
              disabled && "opacity-50 cursor-not-allowed",
              isDesktop
                ? "min-w-[200px] justify-between"
                : "w-12 p-0 justify-center"
            )}
          >
            <div className="flex items-center gap-2.5">
              <div className="flex-shrink-0">
                {selectedGroup?.img ? (
                  <Image
                    src={selectedGroup.img}
                    alt="Selected group icon"
                    width={24}
                    height={24}
                    className="bg-white rounded-full object-contain"
                  />
                ) : (
                  SelectedIcon && <SelectedIcon className="size-6" />
                )}
              </div>
              {isDesktop && (
                <span className="font-medium truncate">
                  {selectedGroup?.name}
                </span>
              )}
            </div>
            {isDesktop && (
              <ChevronDown
                className={cn(
                  "size-4 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
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
        </DropdownMenuContent>
      </DropdownMenu>

      {!isDesktop && (
        <BottomSheet
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
        </BottomSheet>
      )}
    </div>
  );
};