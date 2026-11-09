"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { useFluid } from "./FluidProvider";

type PoolSpec = {
  /** Rest position as viewport fractions. */
  cx: number;
  cy: number;
  /** Drift amplitude as viewport fractions. */
  ax: number;
  ay: number;
  /** Angular frequencies and phases of the Lissajous drift. */
  fx: number;
  fy: number;
  px: number;
  py: number;
  /** Diameter in vmax. */
  size: number;
  rgb: string;
  /** Opacity at full light. */
  alpha: number;
  /** How strongly this pool responds to the light setting (1 = linear). */
  lightCurve: number;
};

/** Cobalt, violet and icy white light, plus a deep cobalt floor. */
const POOLS: PoolSpec[] = [
  { cx: 0.3, cy: 0.42, ax: 0.14, ay: 0.1, fx: 0.21, fy: 0.17, px: 0.0, py: 1.2, size: 78, rgb: "34 78 236", alpha: 0.78, lightCurve: 0.9 },
  { cx: 0.72, cy: 0.58, ax: 0.12, ay: 0.12, fx: 0.16, fy: 0.23, px: 2.1, py: 0.4, size: 66, rgb: "126 76 236", alpha: 0.66, lightCurve: 1 },
  { cx: 0.56, cy: 0.22, ax: 0.1, ay: 0.08, fx: 0.27, fy: 0.19, px: 4.0, py: 2.6, size: 44, rgb: "214 230 255", alpha: 0.46, lightCurve: 1.6 },
  { cx: 0.5, cy: 0.98, ax: 0.18, ay: 0.05, fx: 0.11, fy: 0.14, px: 1.0, py: 3.3, size: 92, rgb: "12 34 140", alpha: 0.7, lightCurve: 0.6 },
];

export const POOL_COUNT = POOLS.length;

function Pool({ spec, time, vw, vh, light, atmos, breath, sessionAmt, level }: {
  spec: PoolSpec;
  time: MotionValue<number>;
  vw: MotionValue<number>;
  vh: MotionValue<number>;
  light: MotionValue<number>;
  atmos: MotionValue<number>;
  breath: MotionValue<number>;
  sessionAmt: MotionValue<number>;
  level: MotionValue<number>;
}) {
  const x = useTransform([time, vw], ([t, w]: number[]) =>
    (spec.cx - 0.5 + spec.ax * Math.sin(t * spec.fx + spec.px)) * w,
  );
  const y = useTransform([time, vh], ([t, h]: number[]) =>
    (spec.cy - 0.5 + spec.ay * Math.cos(t * spec.fy + spec.py)) * h,
  );
  // Haze spreads the light: pools grow and soften as atmosphere rises.
  const scale = useTransform(atmos, (a) => 1 + a * 0.5);
  // In a session the light swells and dims with the breath.
  const opacity = useTransform(
    [light, breath, sessionAmt, level],
    ([l, b, s, lv]: number[]) =>
      Math.min(
        1,
        spec.alpha * (0.3 + 0.9 * Math.pow(l, spec.lightCurve)) * (1 + (b - 0.5) * 0.5 * s) * (1 + lv * 0.22),
      ),
  );

  return (
    <motion.div
      className="pool"
      style={{
        x,
        y,
        scale,
        opacity,
        width: `${spec.size}vmax`,
        height: `${spec.size}vmax`,
        background: `radial-gradient(closest-side, rgb(${spec.rgb} / 1) 0%, rgb(${spec.rgb} / 0.55) 28%, rgb(${spec.rgb} / 0.18) 58%, rgb(${spec.rgb} / 0) 100%)`,
      }}
    />
  );
}

/**
 * The drifting light. Rendered once behind everything as the scene, and a
 * second time inside the orb, inverted and minified, as the image a glass
 * sphere forms of what lies behind it.
 */
export function LightPools() {
  const { mv } = useFluid();
  return (
    <>
      {POOLS.map((spec, i) => (
        <Pool
          key={i}
          spec={spec}
          time={mv.time}
          vw={mv.vw}
          vh={mv.vh}
          light={mv.light}
          atmos={mv.atmos}
          breath={mv.breath}
          sessionAmt={mv.sessionAmt}
          level={mv.level}
        />
      ))}
    </>
  );
}

/** Full-screen background: pools, haze, grain and vignette. */
export function Backdrop() {
  const { mv } = useFluid();
  const hazeOpacity = useTransform(mv.atmos, (a) => 0.15 + a * 0.6);
  const floorOpacity = useTransform(mv.light, (l) => 0.5 + l * 0.5);

  return (
    <div className="backdrop" aria-hidden="true">
      <motion.div className="backdrop-floor" style={{ opacity: floorOpacity }} />
      <div className="pools">
        <LightPools />
      </div>
      <motion.div className="haze" style={{ opacity: hazeOpacity }} />
      <div className="grain" />
      <div className="vignette" />
    </div>
  );
}
