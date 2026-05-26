"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./ui/sidebar";
import { memo, useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import type { VisibilityType } from "./visibility-selector";
import type { User } from "next-auth";
import { SidebarUserNav } from "./sidebar-user-nav";
import type { Message } from "ai";
import TextStrip from "./text-strip";
// Import required icons
import { ArrowLeft, ChevronLeft, PenSquare, Ghost } from 'lucide-react';
import { ArtifactToggle } from "./artifact-toggle";

import { ChatHeaderMenu } from "./chat-header-menu";

// 1. Update interface props to include new optional props
// and make chat-specific props optional.
function PureChatHeader({
  user,
  messages,
  chatId,
  isReadonly,
  selectedModelId,
  selectedVisibilityType,
  title,
  onBackClick,
  chatTitle,
  chatVisibility,
  isArchived,
  onUnarchive,
  isIncognito,
  setIsIncognito,
}: {
  chatId: string;
  isReadonly: boolean;
  messages: Message[];
  user?: User;
  // Chat-specific props, now optional
  selectedModelId?: string;
  selectedVisibilityType?: VisibilityType;
  // New props for settings mode
  title?: string;
  onBackClick?: () => void;
  // New props for Chat Menu
  chatTitle?: string;
  chatVisibility?: VisibilityType;
  isArchived?: boolean;
  onUnarchive?: () => void;
  isIncognito?: boolean;
  setIsIncognito?: (val: boolean) => void;
}) {
  const router = useRouter();
  const { open: isSidebarOpen, openMobile: isSidebarOpenMobile, isMobile } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const isDesktop = windowWidth >= 768;

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const ButtonAny = Button as any;
  const TooltipAny = Tooltip as any;
  const TooltipTriggerAny = TooltipTrigger as any;
  const TooltipContentAny = TooltipContent as any;
  const ArrowLeftAny = ArrowLeft as any;
  const ChevronLeftAny = ChevronLeft as any;

  return (
    <div className={`flex flex-col sticky top-0 z-10 backdrop-blur-sm bg-white/95 dark:bg-zinc-900/95`}>
      <header className="flex md:grid md:grid-cols-3 items-center w-full h-16 px-2 md:px-4 relative justify-between">
        {/* === Left Section === */}
        <div className="flex items-center gap-2 justify-start min-w-0 z-20">
          {/* Sidebar toggle - only show when sidebar is closed on desktop or always on mobile */}
          {isClient && (!isSidebarOpen || !isDesktop) && <SidebarToggle />}

          {/* New Chat button - visible when sidebar is hidden on desktop or always on mobile */}
          {isClient && (!isSidebarOpen || !isDesktop) && !title && (
            <TooltipAny>
              <TooltipTriggerAny asChild>
                <ButtonAny
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 hover:bg-transparent transition-all duration-200"
                  onClick={() => {
                    router.push('/');
                    router.refresh();
                  }}
                  aria-label="New Chat"
                >
                  <span className="text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors duration-200">
                    <PenSquare size={16} />
                  </span>
                </ButtonAny>
              </TooltipTriggerAny>
              <TooltipContentAny side="bottom" className="font-medium">New Chat</TooltipContentAny>
            </TooltipAny>
          )}

          {/* 2. Show back button if onBackClick exists (settings mode) */}
          {onBackClick ? (
            <div className="flex items-center">
              <div className="hidden md:block w-px h-4 bg-border mx-2" />
              <ButtonAny
                variant="ghost"
                size="sm"
                className="gap-1 md:gap-2 text-muted-foreground px-2 md:px-3"
                onClick={onBackClick}
              >
                <ChevronLeftAny className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </ButtonAny>
            </div>
          ) : null}
        </div>

        {/* === Center Section (Dynamic Title or Logo) === */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 flex items-center justify-center pointer-events-none md:static md:translate-x-0 md:pointer-events-auto min-w-0 max-w-[50%] md:max-w-none">
          <div className="pointer-events-auto flex justify-center max-w-full md:max-w-none">

            {/* 3. Show title if exists, otherwise show ChatHeaderMenu or logo */}
            {title ? (
              <h1 className="text-lg font-semibold truncate px-2">{title}</h1>
            ) : chatTitle ? (
              <ChatHeaderMenu
                chatId={chatId}
                currentTitle={chatTitle}
                visibility={chatVisibility || "private"}
                isArchived={isArchived}
                onUnarchive={onUnarchive}
              />
            ) : (
              <Link href="/" aria-label="Home">
                {isClient && !isDesktop}
              </Link>
            )}
          </div>
        </div>

        {/* === Right Section === */}
        <div className="flex items-center justify-end gap-2 z-20">
          {/* Incognito Mode Toggle - only show on new chats (before first message) */}
          {!title && user && messages.length === 0 && (
            <TooltipAny>
              <TooltipTriggerAny asChild>
                <ButtonAny
                  variant="ghost"
                  className={`h-10 px-3 rounded-full hover:bg-transparent transition-all duration-300 ${isIncognito
                      ? "relative"
                      : ""
                    }`}
                  onClick={() => setIsIncognito?.(!isIncognito)}
                  aria-label="Incognito Mode"
                >
                  <span className={`flex items-center gap-2 transition-all duration-300 ${isIncognito
                      ? "text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-primary"
                    }`}>
                    <Ghost className={`flex-shrink-0 w-5 h-5 md:w-5 md:h-5 ${isIncognito ? "animate-pulse" : ""}`} />
                    {isClient && isSidebarOpen && isDesktop && (
                      <span className="text-sm font-medium">Private</span>
                    )}
                  </span>

                </ButtonAny>
              </TooltipTriggerAny>
              <TooltipContentAny side="bottom" className="font-medium">
                {isIncognito ? "Disable Incognito" : "Incognito Mode"}
              </TooltipContentAny>
            </TooltipAny>
          )}
          {/* Show artifact toggle if not in settings mode */}
          {!title && <ArtifactToggle />}

          {user ? (
            // Hide user nav when sidebar is open to reduce clutter
            // Hide user nav when sidebar is open to reduce clutter
            // On desktop: if sidebar is expanded, hide using md:hidden.
            // On mobile: if mobile sheet is open, hide using hidden.
            // This works on server too because isSidebarOpen is stable from cookies.
            <div className={`${isSidebarOpen ? "md:hidden" : ""} ${isSidebarOpenMobile ? "hidden" : ""}`}>
              <SidebarUserNav user={user} compact={true} />
            </div>
          ) : (
            <ButtonAny
              className="px-3 py-1 text-sm h-auto"
              onClick={() => router.push("/login")}
            >
              Login
            </ButtonAny>
          )}
        </div>
      </header>

      {/* 4. Show TextStrip only if NOT in settings mode */}
      {!title && <TextStrip />}
    </div>
  );
}

// 5. Update memo comparison to include all relevant props
export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  // If title exists, we assume this is settings view and don't need
  // to compare chat-specific props that may not exist.
  if (nextProps.title) {
    return prevProps.title === nextProps.title && prevProps.user === nextProps.user;
  }

  // Comparison for chat view
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.user === nextProps.user &&
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.chatTitle === nextProps.chatTitle &&
    prevProps.chatVisibility === nextProps.chatVisibility &&
    prevProps.isIncognito === nextProps.isIncognito
  );
});