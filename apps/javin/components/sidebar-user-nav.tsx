"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface SidebarUserNavProps {
  user: User;
}

export function SidebarUserNav({ user }: SidebarUserNavProps) {
  const { setTheme, theme } = useTheme();
  // 1. Ambil semua state yang relevan dari context useSidebar
  const { 
    setSidebarView, 
    state, 
    toggleSidebar, 
    isMobile, 
    openMobile 
  } = useSidebar();

  // 2. Perbarui fungsi handleSettingsClick dengan logika untuk mobile
  const handleSettingsClick = () => {
    // Selalu ganti tampilan ke 'settings'
    if (setSidebarView) {
      setSidebarView('settings');
    }

    // Cek apakah sidebar perlu dibuka
    const isDesktopCollapsed = !isMobile && state === 'collapsed';
    const isMobileClosed = isMobile && !openMobile;

    // Panggil toggleSidebar jika salah satu kondisi terpenuhi
    if ((isDesktopCollapsed || isMobileClosed) && toggleSidebar) {
        toggleSidebar();
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background/80 data-[state=open]:text-sidebar-accent-foreground h-12 hover:bg-muted/60 transition-all duration-200 rounded-xl border border-border/30 shadow-sm hover:shadow-md">
              <div className="flex w-full items-center justify-center md:justify-start md:gap-3">
                {user?.image ? (
                  <Image
                    src={user.image}
                    alt="User Avatar"
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-border/30 shadow-sm"
                  />
                ) : (
                  <Image
                    src={`https://avatar.vercel.sh/${user.email}`}
                    alt={user.email ?? "User Avatar"}
                    width={32}
                    height={32}
                    className="rounded-full border-2 border-border/30 shadow-sm"
                  />
                )}
                <div className="hidden flex-1 text-left min-w-0 md:block">
                  <div className="text-sm font-medium text-foreground truncate">
                    {user?.name || "User"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </div>
                </div>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 md:block" />
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent 
            side="top" 
            className="w-full min-w-[240px] shadow-xl border-border/50 bg-background/95 backdrop-blur-sm rounded-xl" 
            sideOffset={8}
          >
            <div className="block md:hidden">
              <DropdownMenuItem className="focus:bg-muted/60 rounded-lg mx-1">
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{user?.name || "User"}</span>
                  <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="mx-1" />
            </div>

            <DropdownMenuItem
              className="cursor-pointer focus:bg-muted/60 rounded-lg mx-1 transition-colors duration-200"
              onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-yellow-500' : 'bg-blue-500'}`} />
                <span className="font-medium">{`Switch to ${theme === "light" ? "dark" : "light"} mode`}</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-1" />

            <DropdownMenuItem
              className="cursor-pointer focus:bg-muted/60 rounded-lg mx-1 transition-colors duration-200"
              onSelect={handleSettingsClick} // Panggil fungsi yang sudah diperbarui
            >
              <span className="font-medium">Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="mx-1" />

            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer focus:bg-destructive/10 focus:text-destructive rounded-lg mx-1 transition-colors duration-200 font-medium"
                onClick={() => {
                  signOut({
                    redirectTo: "/",
                  });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
