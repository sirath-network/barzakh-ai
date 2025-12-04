"use client";

import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { UserCircle } from "lucide-react";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.2,
      when: "beforeChildren",
      staggerChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

// Assume session.user type has 'username' property
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null; // Add username property
}

export const Overview = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session, update } = useSession();
  const user: ExtendedUser | undefined = session?.user;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Force session update when component mounts to ensure fresh data (only once)
  useEffect(() => {
    if (isMounted && !user?.name && !user?.username) {
      // Only update once when component first mounts and user data is missing
      const timeoutId = setTimeout(() => {
        update();
      }, 100); // Small delay to prevent immediate re-renders
      
      return () => clearTimeout(timeoutId);
    }
  }, [isMounted]); // Remove user dependencies to prevent continuous updates

  const greeting = getGreeting();
  
  // MODIFIED: Logic to determine the name to display
  const displayName = user?.username 
    ? user.username // 1. Prioritize username if exists
    : user?.name 
    ? user.name     // 2. If name exists, use name
    : session 
    ? "User"         // 3. If logged in but no username/name, show "User"
    : "Guest";       // 4. If not logged in, show "Guest"

  const userImage = user?.image;
  
  // MODIFIED: Condition to show avatar
  // Show avatar if user is logged in AND has set up username or name
  const showAvatar = !!(user?.username || user?.name);

  if (!isMounted) {
    return <div className="h-40 sm:h-28" />;
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
              {userImage ? (
                <Image
                  src={userImage}
                  alt={displayName}
                  width={64}
                  height={64}
                  className="rounded-full object-cover ring-2 ring-neutral-300 dark:ring-red-500/60"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 ring-2 ring-neutral-300 dark:bg-red-500/20 dark:ring-red-500/60">
                  <UserCircle className="h-10 w-10 text-neutral-400 dark:text-red-400" />
                </div>
              )}
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