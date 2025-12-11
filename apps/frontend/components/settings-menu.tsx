"use client";

import type { User } from "next-auth";
import { useTheme } from "next-themes";
import {
  SunIcon,
  MoonIcon,
  UserCog,
  ChevronRight,
  KeyRound,
  Mail,
  CreditCard,
  ArchiveIcon,
  Shield,
  BadgeDollarSign,
  Wallet,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useView, type SettingsPageType } from "@/context/view-context";
// Pastikan useSidebar sudah diimpor
import { useSidebar } from "./ui/sidebar";

const ButtonAny = Button as any;
const SunIconAny = SunIcon as any;
const MoonIconAny = MoonIcon as any;
const UserCogAny = UserCog as any;
const ChevronRightAny = ChevronRight as any;
const KeyRoundAny = KeyRound as any;
const MailAny = Mail as any;
const CreditCardAny = CreditCard as any;
const ArchiveIconAny = ArchiveIcon as any;
const ShieldAny = Shield as any;
const BadgeDollarSignAny = BadgeDollarSign as any;
const WalletAny = Wallet as any;
const MonitorAny = Monitor as any;

const SettingsMenuItem = ({
  icon,
  children,
  onClick
}: {
  icon: React.ReactNode,
  children: React.ReactNode,
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center text-left p-2 rounded-md hover:bg-muted transition-colors duration-200 text-sm font-medium text-foreground"
  >
    <div className="w-6 mr-3 text-muted-foreground">{icon}</div>
    <span className="flex-1">{children}</span>
    <ChevronRightAny className="w-4 h-4 text-muted-foreground" />
  </button>
);

export function SettingsMenu({
  user
}: {
  user: User & { username?: string | null } | undefined
}) {
  const { theme, setTheme } = useTheme();
  const { setView } = useView();
  // ✅ 1. Ambil setSidebarView dari useSidebar
  const { setOpenMobile, setSidebarView, setOpen } = useSidebar();

  const handleMenuClick = (page: SettingsPageType) => {
    setView(page);
    // Close the sidebar on both mobile and desktop for a cleaner settings view
    setOpen(false);
    setOpenMobile(false);
    if (setSidebarView) {
      setSidebarView('history');
    }
  };

  return (
    <div className="flex flex-col h-full p-1 space-y-1">
      <div className="flex items-center p-3 mb-2 space-x-3 sm:space-x-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary/30 to-primary/60 flex-shrink-0 flex items-center justify-center">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name ?? "User Avatar"}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide broken image and show fallback initial
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <span className={`text-2xl font-bold text-white ${user?.image ? 'hidden' : ''}`}>
            {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-base sm:text-lg uppercase tracking-wider text-foreground truncate">
            {user?.name ?? 'Guest'}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {user?.username ? `@${user.username}` : ''}
          </p>
        </div>
      </div>
      <hr className="border-border/20 mx-2 mb-2" />

      {/* Account Section */}
      <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Account
      </div>
      <div className="flex flex-col space-y-1 px-2">
        <SettingsMenuItem
          icon={<UserCogAny size={18} />}
          onClick={() => handleMenuClick('account')}
        >
          Profile Settings
        </SettingsMenuItem>
        <SettingsMenuItem
          icon={<ArchiveIconAny size={18} />}
          onClick={() => handleMenuClick('archived')}
        >
          Archived Settings
        </SettingsMenuItem>
      </div>

      {/* Security Section */}
      <div className="px-3 pt-4 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Security
      </div>
      <div className="flex flex-col space-y-1 px-2">
        <SettingsMenuItem
          icon={<ShieldAny size={18} />}
          onClick={() => handleMenuClick('2fa')}
        >
          2FA Settings
        </SettingsMenuItem>
        <SettingsMenuItem
          icon={<MailAny size={18} />}
          onClick={() => handleMenuClick('email')}
        >
          Email Settings
        </SettingsMenuItem>
        <SettingsMenuItem
          icon={<WalletAny size={18} />}
          onClick={() => handleMenuClick('wallet')}
        >
          Wallet Settings
        </SettingsMenuItem>
        <SettingsMenuItem
          icon={<KeyRoundAny size={18} />}
          onClick={() => handleMenuClick('password')}
        >
          Password Settings
        </SettingsMenuItem>
      </div>

      {/* Subscription Section */}
      <div className="px-3 pt-4 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Subscription
      </div>
      <div className="flex flex-col space-y-1 px-2">
        <SettingsMenuItem
          icon={<BadgeDollarSignAny size={18} />}
          onClick={() => handleMenuClick('plans')}
        >
          Plans & Pricing
        </SettingsMenuItem>
        <SettingsMenuItem
          icon={<CreditCardAny size={18} />}
          onClick={() => handleMenuClick('billing')}
        >
          Billing Settings
        </SettingsMenuItem>
      </div>

      {/* Appearance Section */}
      <div className="px-3 pt-4 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Appearance
      </div>
      <div className="p-2 space-y-2">
        <div className="flex gap-1">
          <ButtonAny
            variant={theme === 'light' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTheme('light')}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5"
          >
            <SunIconAny className="w-3.5 h-3.5" />
            <span className="text-[11px]">Light</span>
          </ButtonAny>
          <ButtonAny
            variant={theme === 'dark' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTheme('dark')}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5"
          >
            <MoonIconAny className="w-3.5 h-3.5" />
            <span className="text-[11px]">Dark</span>
          </ButtonAny>
          <ButtonAny
            variant={theme === 'system' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTheme('system')}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5"
          >
            <MonitorAny className="w-3.5 h-3.5" />
            <span className="text-[11px]">System</span>
          </ButtonAny>
        </div>
      </div>
    </div>
  );
}