'use client';

import React from 'react';
import {
  PredictiveArcCanvas,
  type PredictiveArcCanvasProps,
} from './effects/predictive-arc/PredictiveArcCanvas';
import './effects/predictive-arc/styles.css';

export interface PredictiveArcBackgroundProps extends PredictiveArcCanvasProps {
  darkOverlay?: boolean;
}

export function PredictiveArcBackground({
  variant = 'ribbon-field',
  speed = 1.0,
  pointerAmount = 1.0,
  smoothing = 0.035,
  hue = 0,
  saturation = 1.0,
  brightness = 1.0,
  opacity = 1.0,
  darkOverlay = true,
  className = '',
  showOverlay = true,
  showFraming = true,
}: PredictiveArcBackgroundProps) {
  return (
    <div
      className={`fixed inset-0 -z-10 overflow-hidden bg-[#0a0a0a] ${className}`}
    >
      <PredictiveArcCanvas
        variant={variant}
        speed={speed}
        pointerAmount={pointerAmount}
        smoothing={smoothing}
        hue={hue}
        saturation={saturation}
        brightness={brightness}
        opacity={opacity}
        showOverlay={showOverlay}
        showFraming={showFraming}
      />
      {darkOverlay && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-10" />
      )}
    </div>
  );
}

export function Scene() {
  return (
    <div className="shader-frame">
      <PredictiveArcCanvas
        variant="ribbon-field"
        speed={1.0}
        pointerAmount={1.0}
        smoothing={0.035}
        hue={0}
        saturation={1.0}
        brightness={1.0}
        opacity={1.0}
      />
    </div>
  );
}

// Aliases for compatibility
export { PredictiveArcCanvas };
export { PredictiveArcBackground as LaserBackground };
export default PredictiveArcBackground;
