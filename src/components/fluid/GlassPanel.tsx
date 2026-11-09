"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useCallback, type ReactNode, type PointerEvent } from "react";
import { useFluid } from "./FluidProvider";

type Props = {
  children: ReactNode;
  className?: string;
  /** Maximum tilt in degrees. 0 disables tilt but keeps the sheen. */
  tilt?: number;
  style?: React.CSSProperties;
};

const TILT_SPRING = { stiffness: 160, damping: 22, mass: 0.8 };
const SHEEN_SPRING = { stiffness: 200, damping: 30 };

/**
 * A slab of optical glass. The pointer moves a specular sheen across the
 * surface (via CSS variables) and tilts the slab a few degrees.
 */
export function GlassPanel({ children, className = "", tilt = 5, style }: Props) {
  const { reducedMotion, quality } = useFluid();
  const tiltEnabled = tilt > 0 && !reducedMotion && quality === "full";

  const rx = useSpring(useMotionValue(0), TILT_SPRING);
  const ry = useSpring(useMotionValue(0), TILT_SPRING);
  const mx = useSpring(useMotionValue(50), SHEEN_SPRING);
  const my = useSpring(useMotionValue(20), SHEEN_SPRING);
  const sheen = useSpring(useMotionValue(0), SHEEN_SPRING);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      mx.set(px * 100);
      my.set(py * 100);
      sheen.set(1);
      if (tiltEnabled) {
        rx.set((0.5 - py) * tilt);
        ry.set((px - 0.5) * tilt);
      }
    },
    [mx, my, sheen, rx, ry, tilt, tiltEnabled],
  );

  const onPointerLeave = useCallback(() => {
    rx.set(0);
    ry.set(0);
    sheen.set(0);
    mx.set(50);
    my.set(20);
  }, [rx, ry, sheen, mx, my]);

  return (
    <motion.div
      className={`glass ${className}`}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        ...style,
        rotateX: rx,
        rotateY: ry,
        transformPerspective: 1400,
        // Consumed by the glass CSS for the moving highlight.
        ["--mx" as string]: mx,
        ["--my" as string]: my,
        ["--sheen" as string]: sheen,
      }}
    >
      {children}
    </motion.div>
  );
}
