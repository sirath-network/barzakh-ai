"use client";

import type { User } from "next-auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { SquarePen, ArrowLeft, PanelLeftClose, Sun, Moon, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from "@/lib/framer-motion"; // 1. Import framer-motion
import { useTheme } from "next-themes";

import { SidebarHistory } from "@/components/sidebar-history";
import { SettingsMenu } from "@/components/settings-menu";
import { SearchChatsDialog } from "@/components/search-chats-dialog";
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
import { useView } from "@/context/view-context";

import { useState, useEffect } from "react";

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile, sidebarView, setSidebarView, toggleSidebar } = useSidebar();
  const { setView } = useView();
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by waiting for mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const SidebarAny = Sidebar as any;
  const SidebarHeaderAny = SidebarHeader as any;
  const SidebarMenuAny = SidebarMenu as any;
  const SidebarContentAny = SidebarContent as any;
  const SidebarFooterAny = SidebarFooter as any;
  const TooltipAny = Tooltip as any;
  const TooltipTriggerAny = TooltipTrigger as any;
  const TooltipContentAny = TooltipContent as any;
  const ButtonAny = Button as any;
  const SquarePenAny = SquarePen as any;
  const ArrowLeftAny = ArrowLeft as any;
  const PanelLeftCloseAny = PanelLeftClose as any;
  const SunAny = Sun as any;
  const MoonAny = Moon as any;
  const MonitorAny = Monitor as any;

  const handleNewChat = () => {
    // Close mobile sidebar and reset sidebar view
    setOpenMobile(false);
    if (setSidebarView) {
      setSidebarView('history');
    }
    setView('chat');

    // Use client-side navigation with refresh to ensure proper re-render
    // This fixes the issue where old chat content persists after first click
    router.push('/');
    router.refresh();
  };

  // 2. Define animation variants
  const viewAnimation = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.2, ease: "easeInOut" } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2, ease: "easeInOut" } },
  };

  const headerAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.15 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  return (
    <>
      <SidebarAny className="group-data-[side=left]:border-r-0 custom-scrollbar bg-gradient-to-b from-background via-background/95 to-background/90 backdrop-blur-sm border-r border-border/50">
        <SidebarHeaderAny className="p-3 border-b border-border/30 overflow-hidden">
          <SidebarMenuAny className="custom-scrollbar">
            {/* 3. Use AnimatePresence for header */}
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={sidebarView} // Animation key based on view
                initial="initial"
                animate="animate"
                exit="exit"
                variants={headerAnimation}
              >
                {sidebarView === 'history' ? (
                  <div className="flex flex-col gap-1">
                    {/* Top row: Logo and Toggle Sidebar */}
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href="/"
                        onClick={() => {
                          setOpenMobile(false);
                          setView('chat');
                        }}
                        className="flex items-center"
                      >
                        {/* Use CSS to toggle logos to avoid hydration mismatch */}
                        <Image
                          src="/images/barzakh/logo-dark.svg"
                          alt="Barzakh"
                          width={18}
                          height={18}
                          className="w-[18px] h-[18px] dark:hidden"
                        />
                        <Image
                          src="/images/barzakh/logo-white.svg"
                          alt="Barzakh"
                          width={18}
                          height={18}
                          className="w-[18px] h-[18px] hidden dark:block"
                        />
                      </Link>
                      <TooltipAny>
                        <TooltipTriggerAny asChild>
                          <ButtonAny
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-neutral-600 dark:text-neutral-400 hover:text-foreground hover:bg-transparent transition-colors"
                            onClick={toggleSidebar}
                          >
                            <PanelLeftCloseAny className="h-4 w-4" />
                          </ButtonAny>
                        </TooltipTriggerAny>
                        <TooltipContentAny align="end" className="font-medium hidden sm:block">
                          Close sidebar
                        </TooltipContentAny>
                      </TooltipAny>
                    </div>

                    {/* New Chat button - full width */}
                    <ButtonAny
                      variant="ghost"
                      className="w-full justify-start gap-3 px-3 py-2 h-auto text-neutral-600 dark:text-neutral-400 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                      onClick={handleNewChat}
                    >
                      <SquarePenAny className="h-4 w-4" />
                      <span className="text-sm font-medium">New chat</span>
                    </ButtonAny>

                    {/* Search chats button - only for logged-in users */}
                    {user && (
                      <ButtonAny
                        variant="ghost"
                        className="w-full justify-start gap-3 px-3 py-2 h-auto text-neutral-600 dark:text-neutral-400 hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                        onClick={() => setIsSearchOpen(true)}
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <span className="text-sm font-medium">Search chats</span>
                      </ButtonAny>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 w-full">
                    <TooltipAny>
                      <TooltipTriggerAny asChild>
                        <ButtonAny
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() => setSidebarView && setSidebarView('history')}
                        >
                          <ArrowLeftAny className="h-4 w-4" />
                        </ButtonAny>
                      </TooltipTriggerAny>
                      {/* ✅ Add 'hidden sm:block' to hide on mobile */}
                      <TooltipContentAny
                        align="start"
                        className="font-medium hidden sm:block"
                      >
                        Back to History
                      </TooltipContentAny>
                    </TooltipAny>
                    <span className="text-md font-bold text-foreground">
                      Settings
                    </span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </SidebarMenuAny>
        </SidebarHeaderAny>

        <SidebarContentAny className="px-2 py-4 overflow-hidden">
          {/* 4. Use AnimatePresence for content */}
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
        </SidebarContentAny>

        <SidebarFooterAny className="p-4 border-t border-border/30">
          {user ? (
            <SidebarUserNav user={user} />
          ) : (
            <div className="flex gap-1 w-full">
              <ButtonAny
                variant={mounted && theme === 'light' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-neutral-600 dark:text-neutral-400"
              >
                <SunAny className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Light</span>
              </ButtonAny>
              <ButtonAny
                variant={mounted && theme === 'dark' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-neutral-600 dark:text-neutral-400"
              >
                <MoonAny className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">Dark</span>
              </ButtonAny>
              <ButtonAny
                variant={mounted && theme === 'system' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-neutral-600 dark:text-neutral-400"
              >
                <MonitorAny className="h-3.5 w-3.5" />
                <span className="text-[11px] font-medium">System</span>
              </ButtonAny>
            </div>
          )}
        </SidebarFooterAny>
      </SidebarAny>

      {/* Search Chats Dialog */}
      <SearchChatsDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}
