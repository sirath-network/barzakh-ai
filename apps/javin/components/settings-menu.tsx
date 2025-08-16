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
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useView, type SettingsPageType } from "@/context/view-context";
// Pastikan useSidebar sudah diimpor
import { useSidebar } from "./ui/sidebar";

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
    <ChevronRight className="w-4 h-4 text-muted-foreground" />
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
  const { setOpenMobile, setSidebarView } = useSidebar();

  const handleMenuClick = (page: SettingsPageType) => {
    setView(page); // Tetap ubah tampilan konten utama
    setOpenMobile(false); // Tutup sidebar di mobile
    // ✅ 2. Kembalikan tampilan sidebar ke 'history'
    if (setSidebarView) {
      setSidebarView('history');
    }
  };

  return (
    <div className="flex flex-col h-full p-1 space-y-1">
      <div className="flex items-center p-3 mb-2 space-x-4">
        {user?.image && (
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
            <img
              src={user.image}
              alt={user.name ?? "User Avatar"}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-lg uppercase tracking-wider text-foreground truncate">
            {user?.name ?? 'Guest'}
          </p>
          <p className="text-sm text-muted-foreground truncate">
            {user?.username ? `@${user.username}` : ''}
          </p>
        </div>
      </div>
      <hr className="border-border/20 mx-2 mb-2" />

      {/* Bagian Akun */}
      <div className="px-3 py-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Account
      </div>
      <div className="flex flex-col space-y-1 px-2">
        <SettingsMenuItem 
          icon={<UserCog size={18} />}
          onClick={() => handleMenuClick('account')}
        >
          Edit Account
        </SettingsMenuItem>
      </div>

      {/* Bagian Keamanan */}
      <div className="px-3 pt-4 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Security
      </div>
      <div className="flex flex-col space-y-1 px-2">
        <SettingsMenuItem 
          icon={<KeyRound size={18} />}
          onClick={() => handleMenuClick('password')}
        >
          Change Password
        </SettingsMenuItem>
        <SettingsMenuItem 
          icon={<Mail size={18} />}
          onClick={() => handleMenuClick('email')}
        >
          Email Address
        </SettingsMenuItem>
        <SettingsMenuItem 
          icon={<CreditCard size={18} />}
          onClick={() => handleMenuClick('billing')}
        >
          Billing Address
        </SettingsMenuItem>
      </div>

      {/* Bagian Tampilan (Appearance) */}
      <div className="px-3 pt-4 pb-2 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">
        Appearance
      </div>
      <div className="p-2 space-y-2">
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTheme('light')}
              className="w-full flex items-center gap-2"
            >
              <SunIcon className="w-4 h-4" />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="w-full flex items-center gap-2"
            >
              <MoonIcon className="w-4 h-4" />
              Dark
            </Button>
          </div>
      </div>
    </div>
  );
}