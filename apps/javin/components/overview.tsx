import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { TypeAnimation } from "react-type-animation";

export const Overview = () => {
  const [isMounted, setIsMounted] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fullName = session?.user?.name || "There!"; // Full Name
  const username = session?.user?.username || session?.user?.name || "There!"; // Username

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto mb-4"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col items-center gap-2 leading-relaxed text-center max-w-2xl h-12">
        {isMounted && (
          <TypeAnimation
            // Kunci (key) ini penting untuk me-render ulang animasi saat nama pengguna dimuat
            key={fullName}
            sequence={[
              `Hello, ${fullName}`, // Teks yang akan diketik
              2000, // Jeda setelah selesai mengetik
            ]}
            wrapper="h1" // Teks akan di-render sebagai elemen <h1>
            cursor={false} // Menampilkan kursor mengetik
            speed={50} // Kecepatan mengetik (semakin kecil, semakin cepat)
            repeat={0} // Animasi tidak akan diulang
            className="text-3xl font-semibold text-red-500 font-gramatika"
            style={{
              background: "linear-gradient(90deg, rgb(255, 80, 120), rgba(235, 50, 50, 1))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}
          />
        )}
      </div>
    </motion.div>
  );
};