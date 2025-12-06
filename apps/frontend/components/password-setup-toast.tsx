"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { useView } from "@/context/view-context";
import { useSidebar } from "@/components/ui/sidebar";

export function PasswordSetupToast() {
  const { data: session, status } = useSession();
  const { setView } = useView();
  const { setOpen, setOpenMobile, isMobile } = useSidebar();
  const hasShownToast = useRef(false);

  useEffect(() => {
    const isWeb3User = !!(session?.user as any)?.walletAddress;
    const needsPassword = !session?.user?.hasPassword;
    const needsEmail = isWeb3User && !session?.user?.email;

    // Show toast if user needs password OR needs email (for Web3 users)
    if (
      status === "authenticated" &&
      session?.user && 
      (needsPassword || needsEmail) && 
      !hasShownToast.current
    ) {
      hasShownToast.current = true;
      
      if (needsEmail) {
        // Web3 users without email (prioritize email setup)
        toast.warning("Complete Profile!", {
          description: "Set up your email to secure your account.",
          duration: 10000,
          action: {
            label: "Set Email",
            onClick: () => {
              setView("email");
              setOpen(false);
              if (isMobile) {
                setOpenMobile(false);
              }
            },
          },
          icon: <Shield className="w-4 h-4" />,
        });
      } else {
        // Users with email but no password (Google OAuth or Web3 users who set email)
        toast.info("Complete Profile!", {
          description: "Set up a password to secure your account.",
          duration: 8000,
          action: {
            label: "Set Password",
            onClick: () => {
              setView("password");
              setOpen(false);
              if (isMobile) {
                setOpenMobile(false);
              }
            },
          },
          icon: <Shield className="w-4 h-4" />,
        });
      }
    }
  }, [status, session?.user?.hasPassword, session?.user?.email, (session?.user as any)?.walletAddress, setView, setOpen, setOpenMobile, isMobile]); // Use status and specific property instead of entire user object

  return null; // This component doesn't render anything
}
