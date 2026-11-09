"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MotionConfig,
  useAnimationFrame,
  useMotionValue,
  useSpring,
  type MotionValue,
} from "framer-motion";
import {
  DEFAULT_PATTERN,
  DEFAULT_SETTINGS,
  PATTERNS,
  clamp,
  ease,
  type Pattern,
  type PatternId,
  type SettingKey,
  type Settings,
} from "@/lib/presets";
import { useConstrainedDevice, usePrefersReducedMotion } from "@/lib/use-media";
import { haptic } from "@/lib/haptics";

export type Quality = "full" | "lite";

type MotionValues = {
  /** Smoothed copies of the three settings, 0–1. */
  light: MotionValue<number>;
  motion: MotionValue<number>;
  atmos: MotionValue<number>;
  /** Scene time in seconds, integrating the motion setting so speed changes
   *  never cause a jump. Frozen under reduced motion. */
  time: MotionValue<number>;
  /** Real elapsed seconds for the slow, steady hypnotic rhythms. Frozen
   *  under reduced motion. */
  calm: MotionValue<number>;
  /** Accumulated lens rotation in degrees; only turns during a session. */
  spin: MotionValue<number>;
  /** Lung fullness, 0 empty to 1 full. Idles near the middle. */
  breath: MotionValue<number>;
  /** Progress through the current breathing phase, 0–1. */
  phaseProgress: MotionValue<number>;
  /** 0 outside a session, 1 inside, springing between. */
  sessionAmt: MotionValue<number>;
  /** Loudness of the playing music, 0–1, smoothed. Written by the sound
   *  engine; the orb and the light listen to it. */
  level: MotionValue<number>;
  /** Pointer position in viewport pixels. */
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  /** Viewport size in pixels. */
  vw: MotionValue<number>;
  vh: MotionValue<number>;
};

type FluidContextValue = {
  settings: Settings;
  setSetting: (key: SettingKey, value: number) => void;
  pattern: Pattern;
  setPattern: (id: PatternId) => void;
  session: boolean;
  toggleSession: () => void;
  /** Index into pattern.phases, or -1 when unguided or idle. */
  phaseIndex: number;
  /** Completed breath cycles this session. */
  cycles: number;
  /** Seconds since the session began. */
  elapsed: number;
  quality: Quality;
  setQuality: (q: Quality) => void;
  /** User prefers reduced motion. Drift, morph, sway and tilt are off. */
  reducedMotion: boolean;
  /** Full quality and no reduced-motion preference. */
  richEffects: boolean;
  mv: MotionValues;
};

const FluidContext = createContext<FluidContextValue | null>(null);

const findPattern = (id: PatternId): Pattern =>
  PATTERNS.find((p) => p.id === id) ?? PATTERNS[0];

/** Motion 0 is perfectly still; the curve keeps the low end gentle. */
export const driftSpeed = (motion: number) => Math.pow(motion, 1.35) * 1.6;

const SETTING_SPRING = { stiffness: 110, damping: 26, mass: 0.9 };
const SESSION_SPRING = { stiffness: 40, damping: 18, mass: 1.2 };
/** Period of the unguided breath, seconds. */
const FREE_PERIOD = 10;

export function FluidProvider({ children }: { children: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  const constrained = useConstrainedDevice();

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [patternId, setPatternId] = useState<PatternId>(DEFAULT_PATTERN);
  const [session, setSession] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(-1);
  const [cycles, setCycles] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [qualityChoice, setQualityChoice] = useState<Quality | null>(null);
  const quality: Quality = qualityChoice ?? (constrained ? "lite" : "full");

  const pattern = useMemo(() => findPattern(patternId), [patternId]);

  // Raw targets written by the UI; springs smooth them for the scene.
  const lightRaw = useMotionValue(settings.light);
  const motionRaw = useMotionValue(settings.motion);
  const atmosRaw = useMotionValue(settings.atmos);
  const light = useSpring(lightRaw, SETTING_SPRING);
  const motion = useSpring(motionRaw, SETTING_SPRING);
  const atmos = useSpring(atmosRaw, SETTING_SPRING);

  const time = useMotionValue(0);
  const calm = useMotionValue(0);
  const spin = useMotionValue(0);
  const breath = useMotionValue(0.5);
  const phaseProgress = useMotionValue(0);
  const sessionRaw = useMotionValue(0);
  const sessionAmt = useSpring(sessionRaw, SESSION_SPRING);
  const level = useMotionValue(0);
  const pointerX = useMotionValue(-1000);
  const pointerY = useMotionValue(-1000);
  const vw = useMotionValue(1280);
  const vh = useMotionValue(800);

  useEffect(() => {
    lightRaw.set(settings.light);
    motionRaw.set(settings.motion);
    atmosRaw.set(settings.atmos);
  }, [settings, lightRaw, motionRaw, atmosRaw]);

  useEffect(() => {
    sessionRaw.set(session ? 1 : 0);
  }, [session, sessionRaw]);

  // Viewport and pointer tracking, shared by every scene layer.
  useEffect(() => {
    const measure = () => {
      vw.set(window.innerWidth);
      vh.set(window.innerHeight);
    };
    const onPointer = (e: PointerEvent) => {
      pointerX.set(e.clientX);
      pointerY.set(e.clientY);
    };
    const onLeave = () => {
      pointerX.set(window.innerWidth / 2);
      pointerY.set(window.innerHeight / 2);
    };
    measure();
    onLeave();
    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [vw, vh, pointerX, pointerY]);

  // Escape ends a session from anywhere.
  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSession(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session]);

  // Session clock for the readout.
  useEffect(() => {
    if (!session) return;
    const started = performance.now();
    const id = window.setInterval(
      () => setElapsed(Math.floor((performance.now() - started) / 1000)),
      500,
    );
    return () => window.clearInterval(id);
  }, [session]);

  // Mutable state for the frame loop, so it never reads a stale closure.
  // Written only from effects and event handlers.
  const loop = useRef({
    session: false,
    pattern: findPattern(DEFAULT_PATTERN),
    reducedMotion: false,
    breathClock: 0,
    phase: -1,
    cycle: 0,
  });

  useEffect(() => {
    loop.current.session = session;
  }, [session]);

  useEffect(() => {
    loop.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);

  useAnimationFrame((_, delta) => {
    // Cap delta so a backgrounded tab does not leap forward on return.
    const dt = Math.min(delta, 64) / 1000;
    const s = loop.current;

    if (!s.reducedMotion) {
      calm.set(calm.get() + dt);
      const speed = driftSpeed(motion.get());
      if (speed > 0) time.set(time.get() + dt * speed);
      if (s.session) spin.set(spin.get() + dt * 1.1);
    }

    if (!s.session) {
      // Idle: a faint, slow swell so the orb reads as alive.
      const idle = s.reducedMotion ? 0.5 : 0.5 + 0.06 * Math.sin(calm.get() * 0.45);
      breath.set(breath.get() + (idle - breath.get()) * Math.min(1, dt * 2));
      return;
    }

    s.breathClock += dt;
    const phases = s.pattern.phases;

    if (phases.length === 0) {
      // Unguided: a long, even sine.
      const u = s.breathClock / FREE_PERIOD;
      breath.set(0.5 - 0.5 * Math.cos(u * Math.PI * 2));
      phaseProgress.set(u % 1);
      const cycle = Math.floor(u);
      if (cycle !== s.cycle) {
        s.cycle = cycle;
        setCycles(cycle);
      }
      return;
    }

    const total = phases.reduce((sum, p) => sum + p.dur, 0);
    const cycle = Math.floor(s.breathClock / total);
    let t = s.breathClock - cycle * total;
    let index = 0;
    while (index < phases.length - 1 && t >= phases[index].dur) {
      t -= phases[index].dur;
      index++;
    }
    const phase = phases[index];
    const p = clamp(t / phase.dur);
    const target =
      phase.key === "in" ? ease(p) : phase.key === "out" ? 1 - ease(p) : phase.key === "hold" ? 1 : 0;
    breath.set(target);
    phaseProgress.set(p);

    if (index !== s.phase) {
      s.phase = index;
      setPhaseIndex(index);
      haptic("light");
    }
    if (cycle !== s.cycle) {
      s.cycle = cycle;
      setCycles(cycle);
    }
  });

  const setSetting = useCallback((key: SettingKey, value: number) => {
    setSettings((prev) => ({ ...prev, [key]: clamp(value) }));
  }, []);

  const setPattern = useCallback((id: PatternId) => {
    const s = loop.current;
    s.pattern = findPattern(id);
    s.breathClock = 0;
    s.phase = -1;
    s.cycle = 0;
    setPatternId(id);
    setPhaseIndex(-1);
    setCycles(0);
  }, []);

  const toggleSession = useCallback(() => {
    const s = loop.current;
    s.breathClock = 0;
    s.phase = -1;
    s.cycle = 0;
    setPhaseIndex(-1);
    setCycles(0);
    setElapsed(0);
    haptic("medium");
    setSession((on) => !on);
  }, []);

  const setQuality = useCallback((q: Quality) => setQualityChoice(q), []);

  const mv = useMemo<MotionValues>(
    () => ({
      light,
      motion,
      atmos,
      time,
      calm,
      spin,
      breath,
      phaseProgress,
      sessionAmt,
      level,
      pointerX,
      pointerY,
      vw,
      vh,
    }),
    [light, motion, atmos, time, calm, spin, breath, phaseProgress, sessionAmt, level, pointerX, pointerY, vw, vh],
  );

  const value = useMemo<FluidContextValue>(
    () => ({
      settings,
      setSetting,
      pattern,
      setPattern,
      session,
      toggleSession,
      phaseIndex,
      cycles,
      elapsed,
      quality,
      setQuality,
      reducedMotion,
      richEffects: quality === "full" && !reducedMotion,
      mv,
    }),
    [
      settings,
      setSetting,
      pattern,
      setPattern,
      session,
      toggleSession,
      phaseIndex,
      cycles,
      elapsed,
      quality,
      setQuality,
      reducedMotion,
      mv,
    ],
  );

  return (
    <FluidContext.Provider value={value}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </FluidContext.Provider>
  );
}

export function useFluid(): FluidContextValue {
  const ctx = useContext(FluidContext);
  if (!ctx) throw new Error("useFluid must be used inside <FluidProvider>");
  return ctx;
}
