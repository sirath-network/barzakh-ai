import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export const Overview = () => {
  const { resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const username = session?.user?.username || session?.user?.name || "there";

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto mb-4"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col items-center gap-2 leading-relaxed text-center max-w-2xl">
        {isMounted && (
          <h1
            className="text-3xl font-semibold text-red-500 font-gramatika"
            style={{ color: "rgb(244, 63, 94)" }}
          >
            Hello, {username}
          </h1>
        )}
      </div>
    </motion.div>
  );
};
