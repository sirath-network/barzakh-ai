"use client";

import { useState, useEffect } from "react";

export function useFingerprint(): string | null {
  const [fingerprint, setFingerprint] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        if (!cancelled) {
          setFingerprint(result.visitorId);
        }
      } catch (error) {
        console.error("FingerprintJS failed:", error);
        if (!cancelled) {
          let fallback = localStorage.getItem("barzakh_guest_fp");
          if (!fallback) {
            fallback = crypto.randomUUID();
            localStorage.setItem("barzakh_guest_fp", fallback);
          }
          setFingerprint(fallback);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return fingerprint;
}
