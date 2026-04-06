"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "barzakh_guest_fp";

export function useFingerprint(): string | null {
    const [fingerprint, setFingerprint] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    if (!cancelled) setFingerprint(stored);
                    return;
                }

                const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
                const fp = await FingerprintJS.load();
                const result = await fp.get();
                if (!cancelled) {
                    localStorage.setItem(STORAGE_KEY, result.visitorId);
                    setFingerprint(result.visitorId);
                }
            } catch (error) {
                console.error("FingerprintJS failed:", error);
                if (!cancelled) {
                    let fallback = localStorage.getItem(STORAGE_KEY);
                    if (!fallback) {
                        fallback = crypto.randomUUID();
                        localStorage.setItem(STORAGE_KEY, fallback);
                    }
                    setFingerprint(fallback);
                }
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    return fingerprint;
}
