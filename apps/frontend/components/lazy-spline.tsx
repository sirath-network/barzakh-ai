"use client";

import { useEffect, useRef, useState, Suspense, lazy, ComponentType } from "react";
import type { Application } from "@splinetool/runtime";

// Lazy load Spline to improve initial page load performance
// The Spline library is ~2.5MB and shouldn't block the page render
const SplineLazy = lazy(() =>
    import("@splinetool/react-spline").then((mod) => ({
        default: mod.default as ComponentType<any>,
    }))
);

interface LazySplineProps {
    scene: string;
    className?: string;
    style?: React.CSSProperties;
}

export function LazySpline({ scene, className, style }: LazySplineProps) {
    const spline = useRef<Application | null>(null);
    const [splineVisible, setSplineVisible] = useState(false);
    const [mouseHasMoved, setMouseHasMoved] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    // Only render on client side
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Handle mouse movement to enable Spline scene
    useEffect(() => {
        const handleMouseMove = () => {
            setTimeout(() => {
                if (!mouseHasMoved) {
                    setMouseHasMoved(true);
                }
            }, 50);
        };

        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, [mouseHasMoved]);

    // Load Spline scene - this makes it interactive
    const onLoad = (splineApp: Application) => {
        if (splineApp) {
            spline.current = splineApp;

            // Reset hexagons to inactive state on initial load
            setTimeout(() => {
                try {
                    const internalScene = (splineApp as any)._scene;

                    if (internalScene) {
                        internalScene.traverse((object: any) => {
                            if (object.isMesh && object.material) {
                                const materials = Array.isArray(object.material)
                                    ? object.material
                                    : [object.material];

                                materials.forEach((mat: any) => {
                                    if (mat) {
                                        if (mat.emissive) {
                                            mat.emissive.setHex(0x000000);
                                            mat.emissiveIntensity = 0;
                                        }
                                        if (mat.emissiveMap) {
                                            mat.emissiveMap = null;
                                            mat.needsUpdate = true;
                                        }
                                        mat.needsUpdate = true;
                                    }
                                });
                            }

                            if (object.isPointLight) {
                                object.intensity = 0;
                                object.visible = false;
                            }

                            if (object.type === "AmbientLight") {
                                object.intensity = 0;
                            }
                        });

                        setSplineVisible(true);
                    }
                } catch {
                    setSplineVisible(true);
                }
            }, 800);
        }
    };

    // Don't render on server
    if (!isMounted) {
        return null;
    }

    return (
        <>
            <div
                className={className}
                style={{
                    pointerEvents: mouseHasMoved ? "auto" : "none",
                    ...style,
                }}
            >
                <Suspense fallback={null}>
                    <SplineLazy
                        scene={scene}
                        onLoad={onLoad}
                        style={{
                            width: "100%",
                            height: "100%",
                            opacity: splineVisible ? 1 : 0,
                            transition: "opacity 0.5s ease-in",
                        }}
                    />
                </Suspense>
            </div>

            {/* Overlay to block ALL pointer events until mouse moves */}
            {!mouseHasMoved && (
                <div
                    className="absolute inset-0 z-[50] bg-black/0"
                    style={{
                        pointerEvents: "auto",
                        cursor: "default",
                    }}
                />
            )}
        </>
    );
}
