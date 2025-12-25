"use client";

import { useEffect } from "react";

export function ChunkErrorHandler() {
    useEffect(() => {
        // Handler for script loading errors (e.g. 404 on chunks)
        // We use the capturing phase (third argument = true) to catch resource loading errors
        function handleScriptError(event: Event) {
            const target = event.target as HTMLElement | null;
            if (target && target.tagName === "SCRIPT" && target instanceof HTMLScriptElement) {
                // Check if the script src targets our own domain/origin logic if strictly needed,
                // but generally any script failure on a Next.js app is critical or indicates version skew.

                // We can check if it looks like a webpack chunk
                if (target.src.includes("/_next/static/") || target.src.includes(".js")) {
                    console.warn("Chunk load error detected, reloading page to recover from version skew...", target.src);
                    // Use replace to avoid adding the broken state to history
                    window.location.reload();
                }
            }
        }

        window.addEventListener("error", handleScriptError, true);

        return () => {
            window.removeEventListener("error", handleScriptError, true);
        };
    }, []);

    return null;
}
