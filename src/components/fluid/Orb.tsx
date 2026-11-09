"use client";

import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
  useVelocity,
} from "framer-motion";
import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { PHASE_LABEL, clamp, formatTime, lerp } from "@/lib/presets";
import { useFluid } from "./FluidProvider";
import { LightPools } from "./LightPools";
import { LENS_FILTER_ID } from "./FilterDefs";

/** Minification of the scene inside the sphere. */
const LENS_K = 0.72;
const FOLLOW_SPRING = { stiffness: 46, damping: 15, mass: 1.5 };
const SPEC_SPRING = { stiffness: 120, damping: 24 };
const TAP_SPRING = { type: "spring", stiffness: 480, damping: 28 } as const;
/** Seconds for one ripple to cross the orb. */
const RIPPLE_PERIOD = 7;
const RIPPLES = [0, 1 / 3, 2 / 3];

/**
 * The liquid orb. A sphere of glass that forms an inverted, minified image of
 * the light behind it, wobbles with the scene clock, leans after the pointer
 * and squashes with its own velocity. Pressing it begins a session: it swells
 * and settles with the breath, sways, slowly turns its inner image, and
 * sends out ripples to rest the eye on.
 */
export function Orb() {
  const { mv, reducedMotion, richEffects, session, pattern, toggleSession } = useFluid();
  const ref = useRef<HTMLButtonElement>(null);

  // Layout centre and diameter, in viewport pixels, excluding the follow offset.
  const cx = useMotionValue(0);
  const cy = useMotionValue(0);
  const size = useMotionValue(300);

  // Pointer following. In a session the pull is gentler.
  const tx = useMotionValue(0);
  const ty = useMotionValue(0);
  const x = useSpring(tx, FOLLOW_SPRING);
  const y = useSpring(ty, FOLLOW_SPRING);

  // Specular highlight position, in percent of the orb.
  const sxTarget = useMotionValue(38);
  const syTarget = useMotionValue(24);
  const sx = useSpring(sxTarget, SPEC_SPRING);
  const sy = useSpring(syTarget, SPEC_SPRING);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      cx.set(r.left + r.width / 2 - x.get());
      cy.set(r.top + r.height / 2 - y.get());
      size.set(el.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(document.documentElement);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure);
    };
  }, [cx, cy, size, x, y]);

  const follow = useCallback(() => {
    const d = size.get();
    const dx = mv.pointerX.get() - cx.get();
    const dy = mv.pointerY.get() - cy.get();
    // Soft saturation: the orb leans toward the pointer but never leaves home.
    const range = d * lerp(0.13, 0.06, mv.sessionAmt.get());
    const k = 0.09;
    if (!reducedMotion) {
      tx.set(range * Math.tanh((dx * k) / range));
      ty.set(range * Math.tanh((dy * k) / range));
    }
    sxTarget.set(38 + clamp(dx / d, -1, 1) * 22);
    syTarget.set(24 + clamp(dy / d, -1, 1) * 18);
  }, [mv.pointerX, mv.pointerY, mv.sessionAmt, cx, cy, size, tx, ty, sxTarget, syTarget, reducedMotion]);

  useMotionValueEvent(mv.pointerX, "change", follow);
  useMotionValueEvent(mv.pointerY, "change", follow);

  // During a session the highlight drifts in a slow orbit, like a light
  // circling the sphere, so the pointer is not the only thing that moves it.
  useAnimationFrame(() => {
    const s = mv.sessionAmt.get();
    if (s < 0.01 || reducedMotion) return;
    const c = mv.calm.get();
    sxTarget.set(38 + Math.cos(c * 0.35) * 10 * s);
    syTarget.set(26 + Math.sin(c * 0.35) * 7 * s);
  });

  // Squash and stretch from the follow velocity.
  const vx = useVelocity(x);
  const vy = useVelocity(y);
  const scaleX = useTransform([vx, vy], ([a, b]: number[]) =>
    1 + clamp(Math.abs(a) * 4e-4, 0, 0.06) - clamp(Math.abs(b) * 3e-4, 0, 0.04),
  );
  const scaleY = useTransform([vx, vy], ([a, b]: number[]) =>
    1 + clamp(Math.abs(b) * 4e-4, 0, 0.06) - clamp(Math.abs(a) * 3e-4, 0, 0.04),
  );

  // Breathing: the whole orb swells and settles. Small under reduced motion,
  // where the ring, the light and the words carry the cue.
  const breathAmp = reducedMotion ? 0.03 : 0.2;
  const breathScale = useTransform([mv.breath, mv.sessionAmt], ([b, s]: number[]) =>
    lerp(0.975 + b * 0.05, 1 - breathAmp / 2 + b * breathAmp, s),
  );
  // Sway: a slow pendulum while in session.
  const sway = useTransform([mv.calm, mv.sessionAmt], ([c, s]: number[]) => Math.sin(c * 0.5) * 8 * s);

  // Liquid outline: eight radii breathing out of phase. Calmer in a session.
  const borderRadius = useTransform(
    [mv.time, mv.motion, mv.sessionAmt],
    ([t, m, s]: number[]) => {
      if (reducedMotion) return "50%";
      const amp = (2.4 + m * 5.6) * lerp(1, 0.45, s);
      const r = (p: number, f: number) => (50 + amp * Math.sin(t * f + p)).toFixed(2);
      return `${r(0, 0.9)}% ${r(1.7, 1.1)}% ${r(3.1, 0.8)}% ${r(4.6, 1.25)}% / ${r(2.3, 1.05)}% ${r(0.6, 0.85)}% ${r(5.2, 1.15)}% ${r(3.9, 0.95)}%`;
    },
  );

  // The lens: a viewport-sized copy of the scene, positioned so the point
  // behind the orb's centre lands on its centre, then inverted and minified
  // around that point. In a session it also turns, very slowly.
  const lensX = useTransform([size, cx, x], ([s, c, o]: number[]) => s / 2 - c + LENS_K * o);
  const lensY = useTransform([size, cy, y], ([s, c, o]: number[]) => s / 2 - c + LENS_K * o);
  const lensRotate = useTransform(mv.spin, (deg) => 180 + deg);
  const lensOrigin = useMotionTemplate`${cx}px ${cy}px`;

  const ringOpacity = useTransform(mv.sessionAmt, (s) => s * (pattern.phases.length ? 0.75 : 0.3));
  const rippleOpacity = useTransform(mv.sessionAmt, (s) => (reducedMotion ? 0 : s));

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const nudge = 26;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [-nudge, 0],
      ArrowRight: [nudge, 0],
      ArrowUp: [0, -nudge],
      ArrowDown: [0, nudge],
    };
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    tx.set(d[0]);
    ty.set(d[1]);
    window.setTimeout(() => {
      tx.set(0);
      ty.set(0);
    }, 260);
  };

  return (
    <div className="orb-wrap">
      {/* Phase progress ring */}
      <motion.svg
        className="orb-ring"
        viewBox="0 0 100 100"
        aria-hidden="true"
        style={{ opacity: ringOpacity }}
      >
        <circle cx="50" cy="50" r="48" className="orb-ring-track" />
        <motion.circle
          cx="50"
          cy="50"
          r="48"
          className="orb-ring-fill"
          style={{ pathLength: mv.phaseProgress }}
        />
      </motion.svg>

      <motion.div className="orb-breath" style={{ scale: breathScale, x: sway }}>
        <motion.button
          ref={ref}
          type="button"
          className="orb"
          data-session={session}
          aria-pressed={session}
          aria-label={
            session
              ? "End the breathing session"
              : `Begin a ${pattern.label} breathing session. Arrow keys nudge the orb.`
          }
          onClick={toggleSession}
          onKeyDown={onKeyDown}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.96 }}
          transition={TAP_SPRING}
          style={{ x, y, scaleX, scaleY, borderRadius }}
        >
          <div
            className="orb-refract"
            style={{ filter: richEffects ? `url(#${LENS_FILTER_ID})` : undefined }}
          >
            <motion.div
              className="orb-lens"
              style={{
                width: mv.vw,
                height: mv.vh,
                x: lensX,
                y: lensY,
                rotate: lensRotate,
                scale: LENS_K,
                transformOrigin: lensOrigin,
              }}
            >
              <LightPools />
            </motion.div>
          </div>
          <motion.div className="orb-ripples" style={{ opacity: rippleOpacity }}>
            {RIPPLES.map((offset) => (
              <Ripple key={offset} offset={offset} />
            ))}
          </motion.div>
          <div className="orb-core" />
          <div className="orb-shade" />
          <motion.div
            className="orb-spec"
            style={{ ["--sx" as string]: sx, ["--sy" as string]: sy }}
          />
        </motion.button>
      </motion.div>
    </div>
  );
}

/** One concentric ripple, expanding from the centre and fading at the rim. */
function Ripple({ offset }: { offset: number }) {
  const { mv } = useFluid();
  const u = useTransform(mv.calm, (c) => (c / RIPPLE_PERIOD + offset) % 1);
  const scale = useTransform(u, (v) => 0.18 + v * 0.9);
  const opacity = useTransform(u, (v) => Math.sin(v * Math.PI) * 0.42);
  return <motion.div className="ripple" style={{ scale, opacity }} />;
}

/** The words under the orb: an invitation when idle, the breath when live. */
export function OrbCaption() {
  const { session, pattern, phaseIndex, cycles, elapsed } = useFluid();
  const guided = pattern.phases.length > 0;
  const phase = guided && phaseIndex >= 0 ? pattern.phases[phaseIndex] : null;

  let lead: string;
  if (!session) lead = "Press the orb to begin";
  else if (phase) lead = PHASE_LABEL[phase.key];
  else lead = "Let your eyes rest on the orb";

  const detail = session
    ? `${cycles} ${cycles === 1 ? "breath" : "breaths"} · ${formatTime(elapsed)}`
    : `${pattern.label} · ${pattern.hint}`;

  return (
    <div className="orb-caption">
      <div className="orb-cue" aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={lead}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {lead}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="orb-detail">{detail}</p>
    </div>
  );
}
