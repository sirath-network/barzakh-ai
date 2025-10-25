"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Shield } from "lucide-react";
import { useView } from "@/context/view-context";

export function PasswordSetupToast() {
  const { data: session } = useSession();
  const { setView } = useView();
  const hasShownToast = useRef(false);

  useEffect(() => {
    // Only show toast for authenticated users without password
    if (
      session?.user && 
      !session.user.hasPassword && 
      !hasShownToast.current
    ) {
      hasShownToast.current = true;
      
      toast.info("Set up a password for your account", {
        description: "You're currently signed in with Google. Set up a password to enable email/password login as an alternative.",
        duration: 8000,
        action: {
          label: "Set Password",
          onClick: () => {
            // Navigate to password settings using the view context
            setView("password");
          },
        },
        icon: <Shield className="w-4 h-4" />,
      });
    }
  }, [session?.user, setView]);

  return null; // This component doesn't render anything
}
