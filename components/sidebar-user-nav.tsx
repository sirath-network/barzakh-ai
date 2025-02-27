"use client";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";

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
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";

export const shortenAddress = (address: string): string => {
  if (!address || address.length < 10) return address; // Handle invalid addresses
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export function SidebarUserNav({
  user,
  address,
}: {
  user: User;
  address?: string;
}) {
  const { setTheme, theme } = useTheme();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const { update } = useSession();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {user.email ? (
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
            ) : (
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-10">
                <Image
                  src={`https://avatar.vercel.sh/${address}`}
                  alt={address ?? "User Avatar"}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span className="hidden md:block truncate">
                  {shortenAddress(address!)}
                </span>
                <ChevronDown className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-full" sideOffset={4}>
            <div className="block md:hidden">
              <DropdownMenuItem>
                {user.email ? (
                  <span className="truncate">{user?.email}</span>
                ) : (
                  <span className="truncate">{shortenAddress(address!)}</span>
                )}
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
            {/* <DropdownMenuItem
              className="cursor-pointer"
              onSelect={handleInstallClick}
            >
              <span className="truncate">Install</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator /> */}
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
                onClick={async () => {
                  if (address) {
                    disconnect();
                  } else {
                    signOut({
                      redirectTo: "/",
                    });
                  }
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
