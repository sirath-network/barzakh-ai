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
// Impor ikon yang diperlukan
import { MessageCirclePlus, ArrowLeft } from 'lucide-react';

// 1. Perbarui interface props untuk menyertakan props opsional baru
// dan membuat props spesifik chat menjadi opsional.
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
  // Props spesifik chat, sekarang opsional
  selectedModelId?: string;
  selectedVisibilityType?: VisibilityType;
  // Props baru untuk mode pengaturan
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

          {/* 2. Tampilkan tombol kembali jika onBackClick ada (mode pengaturan) */}
          {onBackClick && (
            <Button variant="ghost" size="icon" onClick={onBackClick} className="md:ml-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Tampilkan tombol "New Chat" hanya jika BUKAN mode pengaturan */}
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

        {/* === Center Section (Judul Dinamis atau Logo) === */}
        <div className="flex justify-center">
          {/* 3. Tampilkan judul jika ada, jika tidak, tampilkan logo/link ke home */}
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

      {/* 4. Tampilkan TextStrip hanya jika BUKAN mode pengaturan */}
      {!title && <TextStrip />}
    </div>
  );
}

// 5. Perbarui perbandingan memo untuk menyertakan semua props yang relevan
export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  // Jika judul ada, kita anggap ini adalah tampilan pengaturan dan tidak perlu
  // membandingkan props spesifik chat yang mungkin tidak ada.
  if (nextProps.title) {
    return prevProps.title === nextProps.title && prevProps.user === nextProps.user;
  }

  // Perbandingan untuk tampilan chat
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.user === nextProps.user &&
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
  );
});