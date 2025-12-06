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
        {user?.image && (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            <img
              src={user.image}
              alt={user.name ?? "User Avatar"}
              className="w-full h-full object-cover"
            />
          </div>
        )}
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
          Archived
        </SettingsMenuItem>
      </div>

      {/* Security Section */}
      <div className="px-3 pt-4 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Security
      </div>
      <div className="flex flex-col space-y-1 px-2">
        <SettingsMenuItem 
          icon={<KeyRoundAny size={18} />}
          onClick={() => handleMenuClick('password')}
        >
          Password Settings
        </SettingsMenuItem>
        <SettingsMenuItem 
          icon={<WalletAny size={18} />}
          onClick={() => handleMenuClick('wallet')}
        >
          Wallet Connection
        </SettingsMenuItem>
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
          icon={<CreditCardAny size={18} />}
          onClick={() => handleMenuClick('billing')}
        >
          Billing Settings
        </SettingsMenuItem>
        <SettingsMenuItem 
          icon={<BadgeDollarSignAny size={18} />}
          onClick={() => handleMenuClick('plans')}
        >
          Plans & Pricing
        </SettingsMenuItem>
      </div>

      {/* Appearance Section */}
      <div className="px-3 pt-4 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Appearance
      </div>
      <div className="p-2 space-y-2">
          <div className="flex gap-2">
            <ButtonAny
              variant={theme === 'light' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTheme('light')}
              className="w-full flex items-center gap-2"
            >
              <SunIconAny className="w-4 h-4" />
              Light
            </ButtonAny>
            <ButtonAny
              variant={theme === 'dark' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="w-full flex items-center gap-2"
            >
              <MoonIconAny className="w-4 h-4" />
              Dark
            </ButtonAny>
          </div>
      </div>
    </div>
  );
}