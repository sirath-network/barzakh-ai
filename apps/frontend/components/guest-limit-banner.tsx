"use client";

import { Lock } from "lucide-react";

export function GuestLimitBanner() {
  return (
    <div className="flex items-center justify-center gap-2 py-3 px-4 text-sm text-muted-foreground">
      <Lock size={14} className="shrink-0" />
      <span>You&apos;ve used your 5 free messages. Sign in to keep chatting.</span>
    </div>
  );
}
