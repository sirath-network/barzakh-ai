"use client";

import { useRouter } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GuestLimitBanner() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 p-6 mx-auto max-w-md text-center">
      <div className="p-3 rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <UserPlus size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-foreground">
          You&apos;ve used your free messages
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Create a free account to continue chatting, save your history, and unlock more features.
        </p>
      </div>
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push("/login")}
          className="gap-2"
        >
          <LogIn size={16} />
          Sign In
        </Button>
        <Button
          onClick={() => router.push("/register")}
          className="gap-2"
        >
          <UserPlus size={16} />
          Create Account
        </Button>
      </div>
    </div>
  );
}
