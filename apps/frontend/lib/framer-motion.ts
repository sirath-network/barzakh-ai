/**
 * Re-exports framer-motion components with proper React 18 typing.
 * This fixes compatibility issues between framer-motion v11 and @types/react@18.
 */
import {
  motion as framerMotion,
  AnimatePresence as FramerAnimatePresence,
  type MotionProps,
  type Variants,
  type Transition,
  type Target,
  type TargetAndTransition,
  type AnimationControls,
  useAnimation,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
  type PanInfo,
} from "framer-motion";

// Re-export motion as-is (types work fine for motion components)
export const motion = framerMotion;

// Fix AnimatePresence type compatibility with React 18 by using `any`
// This is a workaround for the React 18/19 type mismatch in framer-motion v11
export const AnimatePresence: any = FramerAnimatePresence;

// Re-export types and hooks
export type {
  MotionProps,
  Variants,
  Transition,
  Target,
  TargetAndTransition,
  AnimationControls,
  PanInfo,
};

export {
  useAnimation,
  useInView,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useMotionValueEvent,
};
