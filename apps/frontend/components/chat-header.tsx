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
import { MessageCirclePlus, ArrowLeft } from 'lucide-react';
import { ArtifactToggle } from "./artifact-toggle";

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
}) {
  const router = useRouter();
  const { open: isSidebarOpen } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const isDesktop = windowWidth >= 768;

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const NewChatButton = () => (
    <Button
      variant="outline"
      className="px-3"
      onClick={() => {
        router.push("/");
        router.refresh();
      }}
    >
      <MessageCirclePlus className="h-5 w-5 md:mr-2" />
      <span className="hidden md:inline">New Chat</span>
    </Button>
  );

  return (
    <div className="flex flex-col sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
      <header className="grid grid-cols-3 items-center w-full h-16 px-2 md:px-4">
        {/* === Left Section === */}
        <div className="flex items-center gap-2 justify-start">
          <SidebarToggle />

          {/* 2. Show back button if onBackClick exists (settings mode) */}
          {onBackClick && (
            <Button variant="ghost" size="icon" onClick={onBackClick} className="md:ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Show "New Chat" button only if NOT in settings mode */}
          {isClient && !onBackClick && (!isSidebarOpen || !isDesktop) && (
            isDesktop ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                     <MessageCirclePlus className="h-5 w-5"/>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>New Chat</TooltipContent>
              </Tooltip>
            ) : (
              <NewChatButton />
            )
          )}
        </div>

        {/* === Center Section (Dynamic Title or Logo) === */}
        <div className="flex justify-center">
          {/* 3. Show title if exists, otherwise show logo/link to home */}
          {title ? (
            <h1 className="text-lg font-semibold truncate px-2">{title}</h1>
          ) : (
            <Link href="/" aria-label="Home">
            {isClient && !isDesktop}
          </Link>
          )}
        </div>

        {/* === Right Section (User Nav / Login) === */}
        <div className="flex items-center justify-end text-sm space-x-2">
          {/* Show artifact toggle if not in settings mode */}
          {!title && <ArtifactToggle />}
          
          {user && user.email ? (
            // User is logged in, show nav only if there's no title
            !title && (
              <div className="scale-90">
                <SidebarUserNav user={user} />
              </div>
            )
          ) : (
            // User is not logged in, show login button
            <Button
              className="px-3 py-1 text-sm h-auto"
              onClick={() => router.push("/login")}
            >
              Login
            </Button>
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
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
  );
});