export type Settings = {
  /** Exposure of the light pools and glass highlights, 0–1. */
  light: number;
  /** Drift speed of the light and liquid deformation, 0–1. */
  motion: number;
  /** Haze: blur depth, tint and diffusion of the glass, 0–1. */
  atmos: number;
};

export type SettingKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = { light: 0.56, motion: 0.32, atmos: 0.56 };

export type PhaseKey = "in" | "hold" | "out" | "rest";

export type Phase = { key: PhaseKey; dur: number };

export const PHASE_LABEL: Record<PhaseKey, string> = {
  in: "Breathe in",
  hold: "Hold",
  out: "Breathe out",
  rest: "Rest",
};

/** Breathing patterns. Durations in seconds. An empty list is unguided. */
export const PATTERNS = [
  {
    id: "settle",
    label: "Settle",
    hint: "4 in · 6 out",
    phases: [
      { key: "in", dur: 4 },
      { key: "out", dur: 6 },
    ] as Phase[],
  },
  {
    id: "box",
    label: "Box",
    hint: "4 · 4 · 4 · 4",
    phases: [
      { key: "in", dur: 4 },
      { key: "hold", dur: 4 },
      { key: "out", dur: 4 },
      { key: "rest", dur: 4 },
    ] as Phase[],
  },
  {
    id: "deep",
    label: "Deep",
    hint: "4 in · 7 hold · 8 out",
    phases: [
      { key: "in", dur: 4 },
      { key: "hold", dur: 7 },
      { key: "out", dur: 8 },
    ] as Phase[],
  },
  {
    id: "free",
    label: "Free",
    hint: "No guide, just the orb",
    phases: [] as Phase[],
  },
] as const;

export type PatternId = (typeof PATTERNS)[number]["id"];
export type Pattern = (typeof PATTERNS)[number];

export const DEFAULT_PATTERN: PatternId = "settle";

export const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothstep: gentle start and end, like a real breath. */
export const ease = (p: number) => {
  const t = clamp(p);
  return t * t * (3 - 2 * t);
};

export const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};
