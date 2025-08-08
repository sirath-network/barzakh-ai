"use client";

import type { User } from "next-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCirclePlus } from 'lucide-react';

import { SidebarHistory } from "@/components/sidebar-history";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { SidebarUserNav } from "@/components/sidebar-user-nav";

// Main Sidebar Component
export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();

  const handleNewChat = () => {
    setOpenMobile(false);
    router.push("/");
    router.refresh();
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 custom-scrollbar bg-gradient-to-b from-background via-background/95 to-background/90 backdrop-blur-sm border-r border-border/50">
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-border/30">
        <SidebarMenu className="custom-scrollbar">
          <div className="flex items-center justify-between gap-2">
            {/* History Link */}
            <Link
              href="/"
              onClick={() => setOpenMobile(false)}
              className="flex items-center gap-3"
            >
              <span className="text-md font-bold px-3 py-2 rounded-lg bg-muted/60 bg-gradient-to-r from-primary/10 to-primary/5 text-foreground cursor-pointer">
                History
              </span>
            </Link>

            {/* New Chat Button with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  // Kelas animasi telah dihapus dari baris ini
                  className="p-2.5 h-auto rounded-lg border border-border/20 shadow-sm hover:border-primary/30 hover:shadow-md hover:bg-primary/10 hover:text-primary"
                  onClick={handleNewChat}
                >
                  <MessageCirclePlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                align="end"
                className="font-medium hidden sm:block"
              >
                New Chat
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Content */}
      <SidebarContent className="px-2 py-4">
        <SidebarHistory user={user} />
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-4 border-t border-border/30">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}