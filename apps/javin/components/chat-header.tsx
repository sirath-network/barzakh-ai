// chat-header.tsx

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./ui/sidebar";
import { memo, useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { VisibilityType } from "./visibility-selector";
import { User } from "next-auth";
import { SidebarUserNav } from "./sidebar-user-nav";
import { Message } from "ai";
import TextStrip from "./text-strip";
import { MessageCirclePlus } from 'lucide-react';

function PureChatHeader({
  user,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  messages: Message[];
  user?: User;
}) {
  const router = useRouter();
  const { open: isSidebarOpen } = useSidebar();
  const { width: windowWidth } = useWindowSize();
  const isDesktop = windowWidth >= 768;

  // State to prevent hydration mismatch on client-side renders
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
      <MessageCirclePlus />
      <span className="md:hidden">New</span>
      <span className="hidden md:inline">New Chat</span>
    </Button>
  );

  return (
    <div className="flex flex-col sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
      {/* Use CSS Grid for a true three-column layout, ensuring perfect centering */}
      <header className="grid grid-cols-3 items-center w-full h-16 px-2 md:px-4">
        {/* === Left Section === */}
        <div className="flex items-center gap-2 justify-start">
          <SidebarToggle />
          {isClient && (!isSidebarOpen || !isDesktop) && (
            isDesktop ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <MessageCirclePlus />
                </TooltipTrigger>
                <TooltipContent>New Chat</TooltipContent>
              </Tooltip>
            ) : (
              <NewChatButton />
            )
          )}
        </div>

        {/* === Center Section (Logo) === */}
        <div className="flex justify-center">
          <Link href="/" aria-label="Home">
            {isClient && !isDesktop}
          </Link>
        </div>

        {/* === Right Section (User Nav / Login) === */}
        <div className="flex items-center justify-end text-sm space-x-2">
  {user && user.email ? (
    <div className="scale-90">
      <SidebarUserNav user={user} />
    </div>
  ) : (
    <Button
      className="px-3 py-1 text-sm h-auto"
      onClick={() => router.push("/login")}
    >
      Login
    </Button>
  )}
</div>

      </header>
      <TextStrip />
    </div>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.messages === nextProps.messages &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
  );
});