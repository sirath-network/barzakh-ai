"use client";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import Modal from "react-modal";

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
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function SidebarUserNav({ user }: { user: User }) {
  const [isIOS, setIsIOS] = useState(false);
  const [iosModal, setIosModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const { setTheme, theme } = useTheme();

  const handleInstallClick = async () => {
    console.log("installing");
    if (isStandalone) {
      toast.info("Already installed", { position: "bottom-center" });
      return;
    }
    if (isIOS) {
      setIosModal(true);
      return;
    }
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    setDeferredPrompt(null);
  };

  useEffect(() => {
    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    );
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    window.addEventListener("beforeinstallprompt", (e) => {
      setDeferredPrompt(e);
    });
  }, []);

  useEffect(() => {
    // Set the app element once the component is mounted (client-side only)
    Modal.setAppElement("#rootElement");
  }, []);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
              <Image
                src={`https://avatar.vercel.sh/${user.email}`}
                alt={user.email ?? "User Avatar"}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="hidden md:block truncate">{user?.email}</span>
              <ChevronDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-full" sideOffset={4}>
            <div className="block md:hidden">
              <DropdownMenuItem>
                <span className="truncate">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={handleInstallClick}
            >
              <span className="truncate">Install</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() =>
                toast.error("Comming soon.", { position: "bottom-center" })
              }
            >
              <span className="truncate">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
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
      {/* {iosModal && isIOS && ( */}
      <Modal
        isOpen={iosModal && isIOS}
        onRequestClose={() => setIosModal(false)}
        className="bg-neutral-800 p-6 rounded-lg max-w-sm w-full mx-auto"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
      >
        <h2 className="text-xl font-bold mb-4">Install Instructions</h2>
        <p className="mb-6">
          To install this app on your iOS device, tap the &quot;Share&quot;
          button and then &quot;Add to Home Screen&quot;
        </p>
        <button
          className="w-full bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-md transition-colors"
          onClick={() => setIosModal(false)}
        >
          Close
        </button>
      </Modal>
    </SidebarMenu>
  );
}
