'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export interface PredictiveArcCanvasProps {
  variant?:
    | 'ribbon-field'
    | 'amber-halftone'
    | 'halftone-flow'
    | 'sphere-lines'
    | 'predictive'
    | 'signal-particles';
  speed?: number;
  pointerAmount?: number;
  smoothing?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  opacity?: number;
  className?: string;
  showOverlay?: boolean;
  showFraming?: boolean;
}

export function PredictiveArcCanvas({
  variant = 'ribbon-field',
  speed = 1.0,
  pointerAmount = 1.0,
  smoothing = 0.035,
  hue = 0,
  saturation = 1.0,
  brightness = 1.0,
  opacity = 1.0,
  className = '',
  showOverlay = true,
  showFraming = true,
}: PredictiveArcCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.debug.checkShaderErrors = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x0a0a0a, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.z = 5;

    const updateCameraSize = () => {
      if (!canvas) return;
      const parent = canvas.parentElement || containerRef.current;
      const width = Math.max(
        1,
        (parent && parent.clientWidth) || window.innerWidth,
      );
      const height = Math.max(
        1,
        (parent && parent.clientHeight) || window.innerHeight,
      );

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    updateCameraSize();
    window.addEventListener('resize', updateCameraSize);

    // --- Full-Bleed Seamless Halftone Point Grid ---
    // Generous 72x72 bounds so dots extend far past all edges of the viewport
    const gridX = 72;
    const gridY = 72;
    const spacingX = 0.18;
    const spacingY = 0.18;

    const pointGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const scales: number[] = [];

    for (let x = -gridX; x <= gridX; x++) {
      for (let y = -gridY; y <= gridY; y++) {
        positions.push(x * spacingX, y * spacingY, 0);
        scales.push(1);
      }
    }

    pointGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    pointGeometry.setAttribute(
      'scale',
      new THREE.Float32BufferAttribute(scales, 1),
    );

    const pointMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointer: { value: new THREE.Vector2(0, 0) },
        pointerAmount: { value: pointerAmount },
        color1: { value: new THREE.Color(0xa1a1aa) }, // Zinc-400 (Luminous Zinc)
        color2: { value: new THREE.Color(0xf4f4f5) }, // Zinc-100 (Bright Silver/White)
      },
      vertexShader: `
        attribute float scale;
        varying vec2 vUv;
        varying float vScale;
        uniform float time;
        uniform vec2 pointer;
        uniform float pointerAmount;

        void main() {
          vUv = position.xy;
          vec2 p = position.xy - pointer * 2.0 * pointerAmount;
          float dist = length(p);
          float wave1 = sin(dist * 3.2 - time * 2.0);
          float wave2 = cos((position.x * 1.2 + position.y * 1.4) * 1.8 - time * 1.4);
          float animatedScale = scale * ((wave1 * 0.5 + 0.5) * 0.6 + (wave2 * 0.5 + 0.5) * 0.4 + 0.3);
          vScale = animatedScale;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = animatedScale * (46.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;
        varying float vScale;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          if (length(coord) > 0.5) discard;

          // Smooth luminance across whole height
          vec3 finalColor = mix(color1, color2, clamp((vUv.y + 7.0) * 0.07, 0.0, 1.0));
          // Uniform opacity ensuring no disappearing dots
          gl_FragColor = vec4(finalColor, clamp(vScale * 0.85, 0.35, 0.9));
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const points = new THREE.Points(pointGeometry, pointMaterial);
    scene.add(points);

    // --- Pointer Tracking & Smooth Interpolation ---
    let targetPointerX = 0;
    let targetPointerY = 0;
    let currentPointerX = 0;
    let currentPointerY = 0;

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      targetPointerX = x;
      targetPointerY = y;
    };

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });

    // --- Animation Loop ---
    const clock = new THREE.Clock();
    let animationFrameId: number | null = null;
    let isPaused = false;

    const handleVisibilityChange = () => {
      isPaused = document.visibilityState === 'hidden';
      if (!isPaused && !animationFrameId) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const animate = () => {
      if (isPaused) {
        animationFrameId = null;
        return;
      }

      const elapsed = clock.getElapsedTime() * speed;

      // Smooth pointer lerp
      currentPointerX += (targetPointerX - currentPointerX) * (smoothing * 2.5);
      currentPointerY += (targetPointerY - currentPointerY) * (smoothing * 2.5);

      pointMaterial.uniforms.time.value = elapsed;
      pointMaterial.uniforms.pointer.value.set(
        currentPointerX,
        currentPointerY,
      );

      renderer.render(scene, camera);

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', updateCameraSize);
      window.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      pointGeometry.dispose();
      pointMaterial.dispose();
      renderer.dispose();
    };
  }, [speed, pointerAmount, smoothing, variant]);

  const filterStyle =
    hue !== 0 || saturation !== 1 || brightness !== 1
      ? `hue-rotate(${hue}deg) saturate(${saturation}) brightness(${brightness})`
      : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-[#0a0a0a] ${className}`}
      style={{
        opacity,
        filter: filterStyle,
      }}
    >
      {/* Noise Texture Overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none opacity-[0.18]"
        style={{
          backgroundImage:
            "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')",
          mixBlendMode: 'screen',
        }}
      />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 z-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '2.5rem 2.5rem',
        }}
      />

      {/* Aura Asset Image Overlay with Seamless Bottom Gradient Mask */}
      {showOverlay && (
        <div
          className="absolute inset-0 z-0 opacity-25 mix-blend-screen pointer-events-none bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/724142aa-44a6-48d3-9cf3-761e00d05b78_1600w.jpg')",
            maskImage: 'linear-gradient(to bottom, black 40%, transparent 88%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 40%, transparent 88%)',
          }}
        />
      )}

      {/* Unified Halftone Points Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block z-0 pointer-events-none"
      />

      {/* Structural Framing Lines with Corner Squares */}
      {showFraming && (
        <div className="absolute inset-2.5 sm:inset-6 md:inset-12 border border-white/10 pointer-events-none z-20">
          <div className="absolute -top-1 -left-1 w-2 h-2 border border-white/30 bg-[#0a0a0a]" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border border-white/30 bg-[#0a0a0a]" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border border-white/30 bg-[#0a0a0a]" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border border-white/30 bg-[#0a0a0a]" />
        </div>
      )}
    </div>
  );
}

export default PredictiveArcCanvas;
