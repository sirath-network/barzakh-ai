import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "@/lib/framer-motion";
import { X, Share, Plus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getWithExpiry, setWithExpiry } from "@barzakh/shared/lib/utils/utils";

const CardAny = Card as any;
const ButtonAny = Button as any;
const XAny = X as any;
const ShareAny = Share as any;
const PlusAny = Plus as any;
const DownloadAny = Download as any;

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [platform, setPlatform] = useState<
    "ios" | "android" | "chrome" | "other"
  >("other");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  useEffect(() => {
    const isDismissed = getWithExpiry("installPromptDismissed");
    if (isDismissed) return;

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /ipad|iphone|ipod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /android/.test(userAgent);
    const isChrome =
      /chrome/.test(userAgent) &&
      /google inc/.test(navigator.vendor.toLowerCase());

    if (isIOSDevice) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else if (isChrome) setPlatform("chrome");

    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Handle PWA install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    });

    // Show prompt for iOS after delay
    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    const time = 24 * 60 * 60 * 1000; // 24 hour
    // const time = 10 * 1000 // 10 seconds
    setWithExpiry("installPromptDismissed", "true", time);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === "accepted") {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error("Install prompt error:", error);
    }
  };

  const getInstructions = () => {
    switch (platform) {
      case "ios":
        return (
          <p className="text-neutral-600 dark:text-neutral-400">
            Tap <ShareAny className="inline h-4 w-4 mx-1" /> and then{" "}
            <span className="whitespace-nowrap">
              &ldquo;Add to Home Screen&rdquo;{" "}
              <PlusAny className="inline h-4 w-4 ml-1" />
            </span>
          </p>
        );
      case "android":
        return (
          <p className="text-neutral-600 dark:text-neutral-400">
            Tap the menu <span className="font-bold">⋮</span> and select
            &ldquo;Install app&rdquo;
          </p>
        );
      default:
        return (
          <p className="text-neutral-600 dark:text-neutral-400">
            Install our app for a better experience{" "}
            <DownloadAny className="inline h-4 w-4 ml-1" />
          </p>
        );
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed md:hidden top-4 left-4 right-4 z-[100] md:left-auto md:right-4 md:w-96"
        >
                    <CardAny className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h3 className="font-medium text-xl text-neutral-900 dark:text-neutral-100">
                  Install Barzakh AI
                </h3>
                {getInstructions()}
              </div>
              <ButtonAny
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
              >
                <XAny className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </ButtonAny>
            </div>

            {platform !== "ios" && (
              <div className="mt-4 flex justify-end gap-2">
                <ButtonAny variant="secondary" size="sm" onClick={handleDismiss}>
                  Maybe later
                </ButtonAny>
                <ButtonAny size="sm" onClick={handleInstall}>
                  Install
                </ButtonAny>
              </div>
            )}
          </CardAny>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
