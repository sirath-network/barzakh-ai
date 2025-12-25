"use client";

import { motion } from "@/lib/framer-motion";
import { useEffect, useState } from "react";
import type { User } from "next-auth";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
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
              <div className="h-4 sm:h-5 w-48 sm:w-64 rounded bg-muted-foreground/25" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto mb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-5 sm:text-left">
          {/* Avatar only appears if user is logged in and has username */}
          {showAvatar && (
            <motion.div variants={itemVariants}>
              <div className="relative">
                {userImage ? (
                  <img
                    src={userImage}
                    alt={displayName}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/60 ${userImage ? 'hidden' : ''}`}>
                  <span className="text-2xl font-bold text-white">
                    {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Text Content */}
          <div className="flex flex-col">
            <motion.h1
              variants={itemVariants}
              className="text-2xl font-semibold font-gramatika sm:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-rose-400 dark:via-red-500 dark:to-rose-500"
            >
              {greeting}, {displayName}!
            </motion.h1>
            <motion.p
              variants={itemVariants}
              className="mt-1 text-sm text-gray-400 sm:text-base"
            >
              Welcome back! Let's make today productive.
            </motion.p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};