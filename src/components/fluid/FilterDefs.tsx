"use client";

import { useEffect, useRef } from "react";
import { useAnimationFrame } from "framer-motion";
import { useFluid } from "./FluidProvider";

export const LENS_FILTER_ID = "fluid-lens";

/**
 * SVG filter that gives the orb its liquid refraction: low-frequency noise
 * displaces the inverted scene inside the lens. The noise breathes with the
 * scene clock, and the displacement strength follows the motion setting.
 */
export function FilterDefs() {
  const { mv, richEffects } = useFluid();
  const turbulence = useRef<SVGFETurbulenceElement>(null);
  const displacement = useRef<SVGFEDisplacementMapElement>(null);
  const lastFrame = useRef(0);

  useEffect(() => {
    if (!richEffects) displacement.current?.setAttribute("scale", "0");
  }, [richEffects]);

  useAnimationFrame((now) => {
    if (!richEffects) return;
    // Noise regeneration is the costly part; 30 updates a second is plenty.
    if (now - lastFrame.current < 33) return;
    lastFrame.current = now;
    const t = mv.time.get();
    const m = mv.motion.get();
    const fx = 0.0062 + 0.0016 * Math.sin(t * 0.7);
    const fy = 0.0088 + 0.0016 * Math.cos(t * 0.53 + 1.3);
    turbulence.current?.setAttribute("baseFrequency", `${fx.toFixed(5)} ${fy.toFixed(5)}`);
    displacement.current?.setAttribute("scale", (18 + m * 34).toFixed(1));
  });

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <filter
          id={LENS_FILTER_ID}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            ref={turbulence}
            type="fractalNoise"
            baseFrequency="0.0062 0.0088"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feDisplacementMap
            ref={displacement}
            in="SourceGraphic"
            in2="noise"
            scale="30"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
