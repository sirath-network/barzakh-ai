"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

export function GuestLimitBanner() {
    return (
        <div className="flex flex-col sm:flex-row items-center sm:justify-center gap-3 md:gap-4 py-3 px-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Lock size={16} className="text-primary shrink-0" />
            <p className="leading-relaxed text-center sm:text-left max-w-[280px] sm:max-w-none">
                You&apos;ve used all your free messages.{" "}
                <Link 
                    href="/login" 
                    className="underline font-semibold text-primary hover:text-primary/80 underline-offset-4 decoration-primary/30 hover:decoration-primary transition-all"
                >
                    Sign in
                </Link>{" "}
                to keep chatting.
            </p>
        </div>
    );
}