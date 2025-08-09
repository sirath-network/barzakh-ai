"use client";

import type { User } from "next-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCirclePlus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion'; // 1. Import framer-motion

import { SidebarHistory } from "@/components/sidebar-history";
import { SettingsMenu } from "@/components/settings-menu";
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

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, sidebarView, setSidebarView } = useSidebar();

  const handleNewChat = () => {
    setOpenMobile(false);
    if (setSidebarView) {
      setSidebarView('history'); 
    }
    router.push("/");
    router.refresh();
  };

  // 2. Definisikan varian animasi
  const viewAnimation = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.2, ease: "easeInOut" },
  };
  
  const headerAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 },
  };

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 custom-scrollbar bg-gradient-to-b from-background via-background/95 to-background/90 backdrop-blur-sm border-r border-border/50">
      <SidebarHeader className="p-4 border-b border-border/30 overflow-hidden">
        <SidebarMenu className="custom-scrollbar">
          {/* 3. Gunakan AnimatePresence untuk header */}
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={sidebarView} // Kunci animasi berdasarkan tampilan
              initial="initial"
              animate="animate"
              exit="exit"
              variants={headerAnimation}
            >
              {sidebarView === 'history' ? (
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href="/"
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center gap-3"
                  >
                    <span className="text-md font-bold px-3 py-2 rounded-lg bg-muted/60 bg-gradient-to-r from-primary/10 to-primary/5 text-foreground cursor-pointer">
                      History
                    </span>
                  </Link>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-2.5 h-auto rounded-lg border border-border/20 shadow-sm hover:border-primary/30 hover:shadow-md hover:bg-primary/10 hover:text-primary"
                        onClick={handleNewChat}
                      >
                        <MessageCirclePlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent align="end" className="font-medium hidden sm:block">
                      New Chat
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <div className="flex items-center gap-3 w-full">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setSidebarView && setSidebarView('history')}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    {/* ✅ Tambahkan 'hidden sm:block' untuk menyembunyikan di mobile */}
                    <TooltipContent 
                      align="start" 
                      className="font-medium hidden sm:block"
                    >
                       Back to History
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-md font-bold text-foreground">
                    Settings
                  </span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4 overflow-hidden">
        {/* 4. Gunakan AnimatePresence untuk konten */}
        <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={sidebarView}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={viewAnimation}
              className="h-full"
            >
              {sidebarView === 'history' ? (
                <SidebarHistory user={user} />
              ) : (
                <SettingsMenu user={user} />
              )}
            </motion.div>
        </AnimatePresence>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/30">
        {user && <SidebarUserNav user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
