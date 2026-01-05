"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SmoothVideoBackgroundProps {
    src: string;
    className?: string;
    crossfadeDuration?: number;
}

export function SmoothVideoBackground({
    src,
    className,
    crossfadeDuration = 3.5,
}: SmoothVideoBackgroundProps) {
    const video1Ref = useRef<HTMLVideoElement>(null);
    const video2Ref = useRef<HTMLVideoElement>(null);

    // Track active video index (1 or 2) using ref to avoid re-renders during loop
    const activeRef = useRef<1 | 2>(1);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const v1 = video1Ref.current;
        const v2 = video2Ref.current;
        if (!v1 || !v2) return;

        // Initialize state
        v1.style.opacity = "1";
        v2.style.opacity = "0";
        v1.play().catch(() => { });
        v2.currentTime = 0;
        v2.pause();

        const loop = () => {
            const active = activeRef.current === 1 ? v1 : v2;
            const next = activeRef.current === 1 ? v2 : v1;

            if (active.duration) {
                const timeLeft = active.duration - active.currentTime;

                if (timeLeft <= crossfadeDuration) {
                    // Ensure next video is playing so it's moving when we fade to it
                    if (next.paused) {
                        next.play().catch(() => { });
                    }

                    // Calculate seamless opacity
                    // timeleft goes from 3.0 -> 0.0
                    // fadeProgress goes from 0.0 -> 1.0
                    const fadeProgress = 1 - (timeLeft / crossfadeDuration);
                    const opacity = Math.max(0, Math.min(1, fadeProgress));

                    next.style.opacity = opacity.toString();
                }
            }

            rafRef.current = requestAnimationFrame(loop);
        };

        // Start the RAF loop
        rafRef.current = requestAnimationFrame(loop);

        // Handle end of video to reset state
        const onEnded = (e: Event) => {
            const target = e.target as HTMLVideoElement;
            const isV1 = target === v1;

            // Only act if the ended video was the active one
            if ((isV1 && activeRef.current === 1) || (!isV1 && activeRef.current === 2)) {
                // Swap active reference
                const newActive = isV1 ? 2 : 1;
                activeRef.current = newActive;

                // Reset the finished video
                target.style.opacity = "0";
                target.pause();
                target.currentTime = 0;

                // Ensure new active is fully visible and playing
                const newActiveVideo = isV1 ? v2 : v1;
                newActiveVideo.style.opacity = "1";
                newActiveVideo.play().catch(() => { });
            }
        };

        v1.addEventListener('ended', onEnded);
        v2.addEventListener('ended', onEnded);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            v1.removeEventListener('ended', onEnded);
            v2.removeEventListener('ended', onEnded);
        };
    }, [src, crossfadeDuration]);

    return (
        <div className={cn("relative w-full h-full overflow-hidden", className)}>
            <video
                ref={video1Ref}
                src={src}
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover transition-none will-change-opacity"
            />
            <video
                ref={video2Ref}
                src={src}
                muted
                playsInline
                preload="auto"
                className="absolute inset-0 w-full h-full object-cover transition-none will-change-opacity"
            />
        </div>
    );
}
