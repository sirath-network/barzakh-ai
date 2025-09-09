import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { TypeAnimation } from "react-type-animation";
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

// Asumsikan tipe session.user memiliki properti 'username'
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null; // Tambahkan properti username
}

export const Overview = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();
  const user: ExtendedUser | undefined = session?.user;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const greeting = getGreeting();
  
  // MODIFIKASI: Logika untuk menentukan nama yang akan ditampilkan
  const displayName = user?.username 
    ? user.username // 1. Prioritaskan username jika ada
    : session 
    ? "User"         // 2. Jika login tapi tidak ada username, tampilkan "User"
    : "Guest";       // 3. Jika tidak login, tampilkan "Guest"

  const userImage = user?.image;
  
  // MODIFIKASI: Kondisi untuk menampilkan avatar
  // Tampilkan avatar hanya jika pengguna login DAN sudah setup username
  const showAvatar = !!user?.username;

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
          {/* Avatar hanya muncul jika pengguna sudah login dan punya username */}
          {showAvatar && (
            <motion.div variants={itemVariants}>
              {userImage ? (
                <Image
                  src={userImage}
                  alt={displayName}
                  width={64}
                  height={64}
                  className="rounded-full object-cover ring-2 ring-red-500/50"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20 ring-2 ring-red-500/50">
                  <UserCircle className="h-10 w-10 text-red-400" />
                </div>
              )}
            </motion.div>
          )}

          {/* Konten Teks */}
          <div className="flex flex-col">
            <TypeAnimation
              key={displayName} // Gunakan displayName sebagai key
              sequence={[`${greeting}, ${displayName}!`, 3000]}
              wrapper="h1"
              cursor={true}
              speed={50}
              repeat={0}
              className="text-2xl font-semibold font-gramatika sm:text-3xl"
              style={{
                background: "linear-gradient(90deg, rgb(255, 80, 120), rgba(235, 50, 50, 1))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}
            />
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