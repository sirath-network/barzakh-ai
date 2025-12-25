"use client";

import { useState } from "react";
import {
  ChevronDown,
  CreditCard,
  LogOut,
  Settings,
  BadgeDollarSign,
  Sun,
  Moon,
  Monitor,
  Check,
} from "lucide-react";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import useSWR from "swr";
import { fetcher } from "@barzakh/shared/lib/utils/utils";
import { handleLogout } from "@/lib/auth-utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useRouter } from "next/navigation";
import { useView } from "@/context/view-context";

interface SidebarUserNavProps {
  user: User & { tier?: string };
  compact?: boolean;
}

interface SubscriptionResponse {
  subscription?: {
    status: string;
    metadata?: {
      tier?: string;
    };
  } | null;
}

export function SidebarUserNav({ user, compact = false }: SidebarUserNavProps) {
  const { setTheme, theme } = useTheme();
  const router = useRouter();
  const { setView } = useView();

  // Fetch subscription status in real-time for immediate updates after subscription
  const { data: subscriptionData } = useSWR<SubscriptionResponse>(
    user ? "/api/billing/subscription" : null,
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  // Determine if user has active paid subscription (real-time check)
  const subscriptionTier = subscriptionData?.subscription?.metadata?.tier?.toLowerCase();
  const isActiveSubscription = subscriptionData?.subscription &&
    ['active', 'trialing'].includes(subscriptionData.subscription.status);
  const hasPaidTier = isActiveSubscription &&
    (subscriptionTier === 'pro' || subscriptionTier === 'ultimate');

  // Use either session tier OR live subscription data
  const isPaidUser = hasPaidTier ||
    (user.tier && ['pro', 'ultimate'].includes(user.tier.toLowerCase()));

  // 1. Get all relevant state from useSidebar context
  const {
    setSidebarView,
    state,
    toggleSidebar,
    isMobile,
    openMobile,
    setOpen,
    setOpenMobile
  } = useSidebar();

  // Define Any types for components to resolve TS errors
  const DropdownMenuAny = DropdownMenu as any;
  const DropdownMenuContentAny = DropdownMenuContent as any;
  const DropdownMenuTriggerAny = DropdownMenuTrigger as any;
  const DropdownMenuLabelAny = DropdownMenuLabel as any;
  const DropdownMenuSeparatorAny = DropdownMenuSeparator as any;
  const DropdownMenuGroupAny = DropdownMenuGroup as any;
  const DropdownMenuItemAny = DropdownMenuItem as any;

  const SidebarMenuAny = SidebarMenu as any;
  const SidebarMenuItemAny = SidebarMenuItem as any;
  const SidebarMenuButtonAny = SidebarMenuButton as any;


  // 2. Update handleSettingsClick function with mobile logic
  const handleSettingsClick = () => {
    // Always switch view to 'settings'
    if (setSidebarView) {
      setSidebarView('settings');
    }

    // Check if sidebar needs to be opened
    const isDesktopCollapsed = !isMobile && state === 'collapsed';
    const isMobileClosed = isMobile && !openMobile;

    // Call toggleSidebar if one of the conditions is met
    if ((isDesktopCollapsed || isMobileClosed) && toggleSidebar) {
      toggleSidebar();
    }
  };

  const handleLogoutClick = async () => {
    await handleLogout();
  };

  // Track dropdown open state for compact mode
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const content = (
    <DropdownMenuAny open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTriggerAny asChild>
        <SidebarMenuButtonAny
          className={`data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all duration-200 rounded-xl focus:outline-none focus-visible:ring-0 ${compact
            ? `w-auto h-auto p-0 bg-transparent border-0 shadow-none hover:bg-transparent ${isDropdownOpen ? 'invisible' : 'visible'}`
            : "h-12 w-full px-4 bg-background/80 border border-border/30 shadow-sm hover:shadow-md hover:bg-muted/60"
            }`}
        >
          <div className="flex w-full items-center justify-start gap-3">
            {user?.image ? (
              <img
                src={user.image}
                alt="User Avatar"
                width={32}
                height={32}
                className={`rounded-full shadow-sm object-cover transition-all duration-200 ${compact
                  ? 'w-8 h-8 cursor-pointer'
                  : 'w-8 h-8'
                  }`}
                onError={(e: any) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`rounded-full shadow-sm bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center transition-all duration-200 ${user?.image ? 'hidden' : ''} ${compact
              ? 'w-8 h-8 cursor-pointer'
              : 'w-8 h-8 border-2 border-border/30'
              }`}>
              <span className="text-xs font-bold text-white">
                {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
              </span>
            </div>
            <div className={`${compact ? "hidden" : "block"} flex-1 text-left min-w-0`}>
              <div className="text-sm font-medium text-foreground truncate">
                {user?.name || "User"}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.email}
              </div>
            </div>
            <ChevronDown className={`${compact ? "hidden" : "block"} h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180`} />
          </div>
        </SidebarMenuButtonAny>
      </DropdownMenuTriggerAny>
      <DropdownMenuContentAny
        className={`${compact ? "min-w-56" : "w-[var(--radix-dropdown-menu-trigger-width)] min-w-56"} rounded-xl border-border/30 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200`}
        side={compact ? "bottom" : "top"}
        align="end"
        sideOffset={compact ? -36 : 8}
      >
        <DropdownMenuLabelAny className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                width={32}
                height={32}
                className="rounded-full w-8 h-8 object-cover"
                onError={(e: any) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`rounded-full w-8 h-8 bg-gradient-to-br from-primary/30 to-primary/60 flex items-center justify-center border border-border/30 ${user.image ? 'hidden' : ''}`}>
              <span className="text-xs font-bold text-white">
                {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
              </span>
            </div>
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </DropdownMenuLabelAny>
        <DropdownMenuSeparatorAny />
        {/* Only show Upgrade Plan if user is not already on pro or ultimate tier (real-time check) */}
        {!isPaidUser && (
          <>
            <DropdownMenuGroupAny>
              <DropdownMenuItemAny onClick={() => {
                // Navigate to Plans & Pricing page
                setView('plans');
                // Close sidebar for cleaner settings view
                setOpen(false);
                setOpenMobile(false);
                if (setSidebarView) {
                  setSidebarView('history');
                }
              }}>
                <BadgeDollarSign className="mr-2 h-4 w-4" />
                Upgrade Plan
              </DropdownMenuItemAny>
            </DropdownMenuGroupAny>
            <DropdownMenuSeparatorAny />
          </>
        )}
        <DropdownMenuGroupAny>
          <DropdownMenuItemAny onClick={() => setTheme('light')}>
            <Sun className="mr-2 h-4 w-4" />
            Light
            {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItemAny>
          <DropdownMenuItemAny onClick={() => setTheme('dark')}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
            {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItemAny>
          <DropdownMenuItemAny onClick={() => setTheme('system')}>
            <Monitor className="mr-2 h-4 w-4" />
            System
            {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItemAny>
        </DropdownMenuGroupAny>
        <DropdownMenuSeparatorAny />
        <DropdownMenuGroupAny>
          <DropdownMenuItemAny onClick={() => {
            // Set view to billing to open billing settings panel
            setView('billing');
            // Close sidebar for cleaner settings view
            setOpen(false);
            setOpenMobile(false);
            if (setSidebarView) {
              setSidebarView('history');
            }
          }}>
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </DropdownMenuItemAny>
          <DropdownMenuItemAny onClick={() => {
            if (setSidebarView) setSidebarView('settings');
            // Ensure sidebar logic handles view switch
            const isDesktopCollapsed = !isMobile && state === 'collapsed';
            const isMobileClosed = isMobile && !openMobile;
            if ((isDesktopCollapsed || isMobileClosed) && toggleSidebar) {
              toggleSidebar();
            }
          }}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItemAny>
        </DropdownMenuGroupAny>
        <DropdownMenuSeparatorAny />
        <DropdownMenuItemAny onClick={handleLogoutClick}>
          <LogOut className="mr-2 h-4 w-4 text-red-500" />
          Log out
        </DropdownMenuItemAny>
      </DropdownMenuContentAny>
    </DropdownMenuAny>
  );

  if (compact) {
    return content;
  }

  return (
    <SidebarMenuAny>
      <SidebarMenuItemAny>
        {content}
      </SidebarMenuItemAny>
    </SidebarMenuAny>
  );
}
