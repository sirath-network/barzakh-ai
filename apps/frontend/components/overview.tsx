"use client";

import { useEffect, useState } from "react";
import type { User } from "next-auth";
import { useSignedR2Url } from "@/hooks/use-signed-r2-url";
import { Skeleton } from "./ui/skeleton";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

// Extended user type with username property
type ExtendedUser = User & {
  username?: string | null;
};

interface OverviewProps {
  user?: ExtendedUser;
}

export const Overview = ({ user }: OverviewProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const greeting = getGreeting();

  // Logic to determine the name to display
  const displayName = user?.username
    ? user.username // 1. Prioritize username if exists
    : user?.name
      ? user.name     // 2. If name exists, use name
      : user
        ? "User"         // 3. If logged in but no username/name, show "User"
        : "Guest";       // 4. If not logged in, show "Guest"

  const userImage = user?.image;

  // Use signed URL for R2 storage avatars
  const { url: signedAvatarUrl, isLoading: isLoadingAvatar } = useSignedR2Url(userImage);

  // Show avatar if user is logged in AND has set up username or name
  const showAvatar = !!(user?.username || user?.name);

  if (!isMounted) {
    // Skeleton matching the actual UI layout
    return (
      <div className="max-w-3xl mx-auto mb-6">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-left animate-pulse">
            {/* Avatar skeleton - only show if user exists */}
            {user && (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-primary/60 shrink-0" />
            )}
            {/* Text content skeleton */}
            <div className="flex flex-col gap-2 items-center sm:items-start">
              {/* Greeting line - matches h1 text-2xl sm:text-3xl */}
              <div className="h-7 sm:h-9 w-56 sm:w-72 rounded-lg bg-muted-foreground/30" />
              {/* Subtitle line - matches p text-sm sm:text-base */}
              <div className="h-4 sm:h-5 w-72 sm:w-80 rounded bg-muted-foreground/20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto mb-6">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-left">
          {/* Avatar only appears if user is logged in and has username */}
          {showAvatar && (
            <div>
              <div className="relative">
                {userImage ? (
                  isLoadingAvatar ? (
                    <Skeleton className="w-16 h-16 rounded-full" />
                  ) : (
                    <img
                      src={signedAvatarUrl || userImage}
                      alt={displayName}
                      width={64}
                      height={64}
                      className="w-16 h-16 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  )
                ) : null}
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/60 ${userImage ? 'hidden' : ''}`}>
                  <span className="text-2xl font-bold text-white">
                    {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Text Content */}
          <div className="flex flex-col">
            <h1
              className="text-2xl font-semibold font-gramatika sm:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-zinc-200 dark:via-zinc-300 dark:to-zinc-400"
            >
              {greeting}, {displayName}!
            </h1>
            <p
              className="mt-1 text-sm text-gray-400 sm:text-base"
            >
              Welcome back! Let's make today productive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};