"use client";

import React, { useEffect, useRef } from "react";

export interface LaserCollectionProps {
  speed?: number;
  size?: number;
  length?: number;
  density?: number;
  opacity?: number;
  hue?: number;
  saturation?: number;
  brightness?: number;
  className?: string;
  showOverlay?: boolean;
  showFraming?: boolean;
}

const vsSource = `
  attribute vec4 aVertexPosition;
  void main() {
    gl_Position = aVertexPosition;
  }
`;

const fsSource = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform vec2 u_mouse;
  uniform float u_mouseActive;

  float hash(float n) { return fract(sin(n)*753.5453123); }
  float noise(float x) {
    float i = floor(x);
    float f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(hash(i), hash(i+1.0), f);
  }

  vec2 sdLine(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return vec2(length(pa - ba * h), h);
  }

  float lightning(vec2 uv, vec2 a, vec2 b, float t) {
    vec2 ab = b - a;
    float len = length(ab);
    if(len < 0.01) return 0.0;
    vec2 dir = ab / len;
    
    vec2 pa = uv - a;
    float h = clamp(dot(pa, dir) / len, 0.0, 1.0);
    float dist = length(pa - dir * (h * len));
    
    float env = sin(h * 3.1415);
    
    float offset = (noise(h * 25.0 - t * 35.0) - 0.5) * 0.08 * env;
    offset += (noise(h * 70.0 + t * 50.0) - 0.5) * 0.02 * env;
    
    float d = abs(dist + offset);
    
    return (0.0002 / (d + 0.0002) + 0.00001 / (d*d + 0.00001)) * env;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv = uv * 2.0 - 1.0;
    uv.x *= u_resolution.x / u_resolution.y;

    vec2 mouseUV = u_mouse / u_resolution.xy;
    mouseUV = mouseUV * 2.0 - 1.0;
    mouseUV.x *= u_resolution.x / u_resolution.y;

    vec2 center = vec2(-0.8, -0.2);
    center.x += sin(u_time * 0.4) * 0.03;
    center.y += cos(u_time * 0.3) * 0.03;

    vec2 dirUp = normalize(vec2(0.15, 1.0));
    vec2 dirRight = normalize(vec2(1.0, -0.25));
    vec2 dirDownLeft = normalize(vec2(-0.8, -0.6));

    vec2 l1 = sdLine(uv, center, center + dirUp * 5.0);
    vec2 l2 = sdLine(uv, center, center + dirRight * 5.0);
    vec2 l3 = sdLine(uv, center, center + dirDownLeft * 5.0);

    float intensity = 0.006;
    float glow = intensity / (l1.x + 0.001) +
                 intensity / (l2.x + 0.001) +
                 (intensity * 0.4) / (l3.x + 0.001);

    float pulse1 = smoothstep(0.1, 0.0, abs(l1.y - fract(u_time * 0.4))) * 0.03 / (l1.x + 0.001);
    float pulse2 = smoothstep(0.1, 0.0, abs(l2.y - fract(u_time * 0.5 + 0.3))) * 0.03 / (l2.x + 0.001);
    float pulse3 = smoothstep(0.1, 0.0, abs(l3.y - fract(u_time * 0.3 + 0.7))) * 0.015 / (l3.x + 0.001);
    glow += pulse1 + pulse2 + pulse3;

    vec2 p1 = center + dirUp * clamp(dot(mouseUV - center, dirUp), 0.0, 5.0);
    vec2 p2 = center + dirRight * clamp(dot(mouseUV - center, dirRight), 0.0, 5.0);
    vec2 p3 = center + dirDownLeft * clamp(dot(mouseUV - center, dirDownLeft), 0.0, 5.0);
    
    float lgt1 = lightning(uv, p1, mouseUV, u_time);
    float lgt2 = lightning(uv, p2, mouseUV, u_time + 10.0);
    float lgt3 = lightning(uv, p3, mouseUV, u_time + 20.0);
    
    float flicker = step(0.1, noise(u_time * 60.0)) * (noise(u_time * 150.0) * 0.8 + 0.2);
    
    float d1 = length(mouseUV - p1);
    float d2 = length(mouseUV - p2);
    float d3 = length(mouseUV - p3);
    
    glow += lgt1 * smoothstep(2.0, 0.0, d1) * u_mouseActive * flicker;
    glow += lgt2 * smoothstep(2.0, 0.0, d2) * u_mouseActive * flicker;
    glow += lgt3 * smoothstep(2.0, 0.0, d3) * u_mouseActive * flicker;

    float distToCenter = length(uv - center);
    glow += 0.04 / (distToCenter + 0.01);

    vec3 baseColor = vec3(0.6, 0.75, 1.0);
    vec3 finalColor = baseColor * glow;

    finalColor *= 0.85 + 0.15 * sin(u_time * 2.0 - distToCenter * 8.0);

    float vignette = 1.0 - smoothstep(0.4, 2.0, length(uv));
    finalColor *= vignette;

    float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
    finalColor += n * 0.02;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function LaserCollection({
  speed = 1.0,
  size = 1.0,
  length = 1.0,
  density = 1.0,
  opacity = 1.0,
  hue = 0,
  saturation = 1.0,
  brightness = 1.0,
  className = "",
  showOverlay = true,
  showFraming = true,
}: LaserCollectionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) return;

    const vertShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertShader || !fragShader) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    const programInfo = {
      program,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(program, "aVertexPosition"),
      },
      uniformLocations: {
        resolution: gl.getUniformLocation(program, "u_resolution"),
        time: gl.getUniformLocation(program, "u_time"),
        mouse: gl.getUniformLocation(program, "u_mouse"),
        mouseActive: gl.getUniformLocation(program, "u_mouseActive"),
      },
    };

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0]),
      gl.STATIC_DRAW
    );

    let mouseX = -1000;
    let mouseY = -1000;
    let lastMouseMove = 0;
    let currentMouseActive = 0.0;

    const handlePointerMove = (e: MouseEvent | PointerEvent) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      mouseX = (e.clientX - rect.left) * dpr;
      mouseY = (rect.height - (e.clientY - rect.top)) * dpr;
      lastMouseMove = performance.now();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    let animationFrameId: number | null = null;
    const startTime = performance.now();
    let isPaused = false;

    const handleVisibilityChange = () => {
      isPaused = document.visibilityState === "hidden";
      if (!isPaused && !animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const render = () => {
      if (isPaused) {
        animationFrameId = null;
        return;
      }

      if (!canvas || !gl) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displayWidth = Math.round(canvas.clientWidth * dpr);
      const displayHeight = Math.round(canvas.clientHeight * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.useProgram(programInfo.program);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        2,
        gl.FLOAT,
        false,
        0,
        0
      );
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

      const now = performance.now();
      const timeSinceMove = now - lastMouseMove;
      const targetActive = timeSinceMove < 200 ? 1.0 : Math.max(0.0, 1.0 - (timeSinceMove - 200) / 400.0);
      currentMouseActive += (targetActive - currentMouseActive) * 0.15;

      const elapsed = (now - startTime) * 0.001 * speed;

      gl.uniform2f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height);
      gl.uniform1f(programInfo.uniformLocations.time, elapsed);
      gl.uniform2f(programInfo.uniformLocations.mouse, mouseX, mouseY);
      gl.uniform1f(programInfo.uniformLocations.mouseActive, currentMouseActive);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (gl) {
        gl.deleteBuffer(positionBuffer);
        gl.deleteProgram(program);
        gl.deleteShader(vertShader);
        gl.deleteShader(fragShader);
      }
    };
  }, [speed]);

  const filterStyle =
    hue !== 0 || saturation !== 1 || brightness !== 1
      ? `hue-rotate(${hue}deg) saturate(${saturation}) brightness(${brightness})`
      : undefined;

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#050505] ${className}`}
      style={{
        opacity,
        filter: filterStyle,
      }}
    >
      {/* WebGL Laser Background Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {/* Aura Asset Image Overlay (Mix Blend Texture) */}
      {showOverlay && (
        <div
          className="absolute inset-0 z-10 opacity-30 mix-blend-screen pointer-events-none bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/fa51902b-c2a4-4c33-a96e-a8f1ef67edc6_1600w.jpg')",
          }}
        />
      )}

      {/* Structural Framing Lines with Corner Squares */}
      {showFraming && (
        <div className="absolute inset-6 md:inset-12 border border-white/10 pointer-events-none z-20">
          <div className="absolute -top-1 -left-1 w-2 h-2 border border-white/30 bg-[#050505]" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border border-white/30 bg-[#050505]" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border border-white/30 bg-[#050505]" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border border-white/30 bg-[#050505]" />
        </div>
      )}
    </div>
  );
}

export default LaserCollection;
