import { motion } from "framer-motion";
import { useTheme } from "next-themes";

export const Overview = () => {
  const { theme } = useTheme();
  console.log(theme);
  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col items-center gap-2 leading-relaxed text-center max-w-2xl">
        {theme == "dark" ? (
          <img
            alt="Javin.ai"
            src="/images/javin/banner/javin-banner-white.svg"
            className=" w-32 sm:w-48 h-auto"
          />
        ) : (
          theme == "light" && (
            <img
              alt="Javin.ai"
              src="/images/javin/banner/javin-banner-black.svg"
              className=" w-32 sm:w-48 h-auto"
            />
          )
        )}
        <p className="text-lg text-muted-foreground">
          A focused, no-nonsense AI search engine for crypto.
        </p>
      </div>
    </motion.div>
  );
};
