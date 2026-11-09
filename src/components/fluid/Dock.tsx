"use client";

import { LayoutGroup, motion } from "framer-motion";
import { useRef, type KeyboardEvent } from "react";
import { PATTERNS, type PatternId } from "@/lib/presets";
import { useFluid } from "./FluidProvider";
import { GlassPanel } from "./GlassPanel";

const TAP = { type: "spring", stiffness: 520, damping: 30 } as const;
const SLIDE = { type: "spring", stiffness: 380, damping: 30, mass: 0.9 } as const;

/** Compact navigation between breathing patterns, with a glass indicator
 *  that flows between items. */
export function Dock({ className = "" }: { className?: string }) {
  const { pattern, setPattern } = useFluid();
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = PATTERNS.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (e.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next === null) return;
    e.preventDefault();
    items.current[next]?.focus();
    setPattern(PATTERNS[next].id as PatternId);
  };

  return (
    <nav aria-label="Breathing pattern" className={`dock-wrap ${className}`}>
      <LayoutGroup id="dock">
        <GlassPanel className="dock" tilt={0}>
          <div role="group" aria-label="Breathing pattern" className="dock-items">
            {PATTERNS.map((p, i) => {
              const active = p.id === pattern.id;
              return (
                <motion.button
                  key={p.id}
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  type="button"
                  className={`dock-item${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  aria-label={`${p.label}, ${p.hint}`}
                  title={p.hint}
                  onClick={() => setPattern(p.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  whileTap={{ scale: 0.94 }}
                  transition={TAP}
                >
                  {active && (
                    <motion.span
                      layoutId="dock-indicator"
                      className="dock-indicator"
                      style={{ borderRadius: 14 }}
                      transition={SLIDE}
                    />
                  )}
                  <span className="dock-label">{p.label}</span>
                </motion.button>
              );
            })}
          </div>
        </GlassPanel>
      </LayoutGroup>
    </nav>
  );
}

/** Full / Lite rendering toggle. Lite drops refraction, tilt and heavy blur. */
export function QualityToggle() {
  const { quality, setQuality } = useFluid();
  const options = [
    { id: "full", label: "Full" },
    { id: "lite", label: "Lite" },
  ] as const;

  return (
    <LayoutGroup id="quality">
      <GlassPanel className="dock dock-sm" tilt={0}>
        <div role="group" aria-label="Rendering quality" className="dock-items">
          {options.map((o) => {
            const active = o.id === quality;
            return (
              <motion.button
                key={o.id}
                type="button"
                className={`dock-item${active ? " is-active" : ""}`}
                aria-pressed={active}
                onClick={() => setQuality(o.id)}
                whileTap={{ scale: 0.94 }}
                transition={TAP}
              >
                {active && (
                  <motion.span
                    layoutId="quality-indicator"
                    className="dock-indicator"
                    style={{ borderRadius: 11 }}
                    transition={SLIDE}
                  />
                )}
                <span className="dock-label">{o.label}</span>
              </motion.button>
            );
          })}
        </div>
      </GlassPanel>
    </LayoutGroup>
  );
}
