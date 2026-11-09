"use client";

import { motion, useTransform } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FluidProvider, useFluid } from "./FluidProvider";
import { SoundProvider } from "./SoundProvider";
import { SoundPanel } from "./SoundPanel";
import { Backdrop } from "./LightPools";
import { FilterDefs } from "./FilterDefs";
import { Orb, OrbCaption } from "./Orb";
import { Dock, QualityToggle } from "./Dock";
import { ControlSlider } from "./ControlSlider";
import { GlassPanel } from "./GlassPanel";
import { AtmosIcon, FluidMark, LightIcon, MotionIcon } from "./Icons";

/** Publishes the smoothed settings as CSS variables for the glass styles. */
function SceneVars({ children }: { children: ReactNode }) {
  const { mv, quality } = useFluid();
  const lite = quality === "lite";
  const blur = useTransform(mv.atmos, (a) =>
    lite ? `${(6 + a * 6).toFixed(1)}px` : `${(10 + a * 22).toFixed(1)}px`,
  );
  const sat = useTransform(mv.atmos, (a) => (lite ? 1.2 : 1.25 + a * 0.6).toFixed(3));
  const tintAlpha = useTransform(mv.atmos, (a) => (0.035 + a * 0.095).toFixed(4));
  const light = useTransform(mv.light, (l) => l.toFixed(3));
  const atmos = useTransform(mv.atmos, (a) => a.toFixed(3));
  const breath = useTransform(mv.breath, (b) => b.toFixed(3));
  const sessionAmt = useTransform(mv.sessionAmt, (s) => s.toFixed(3));
  const level = useTransform(mv.level, (l) => l.toFixed(3));

  return (
    <motion.div
      className="scene-root"
      style={{
        ["--light" as string]: light,
        ["--atmos" as string]: atmos,
        ["--glass-blur" as string]: blur,
        ["--glass-sat" as string]: sat,
        ["--glass-tint" as string]: tintAlpha,
        ["--breath" as string]: breath,
        ["--session" as string]: sessionAmt,
        ["--level" as string]: level,
      }}
    >
      {children}
    </motion.div>
  );
}

function Surface() {
  const { session } = useFluid();

  // Touch screens have no hover: a tap anywhere brings the faded interface
  // back for a few seconds during a session.
  const [revealed, setRevealed] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const reveal = useCallback(() => {
    setRevealed(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRevealed(false), 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <main
      className="scene"
      data-session={session}
      data-revealed={session && revealed}
      onPointerDown={session ? reveal : undefined}
    >
      <header className="scene-head chrome">
        <h1 className="brand">
          <FluidMark />
          <span>Fluid</span>
        </h1>
        <QualityToggle />
      </header>

      <GlassPanel className="surface" tilt={0}>
        <section className="surface-orb" aria-label="Orb">
          <Orb />
          <OrbCaption />
          <Dock className="chrome" />
        </section>
        <section className="surface-controls chrome" aria-label="Ambience">
          <ControlSlider
            id="light"
            label="Light"
            settingKey="light"
            icon={<LightIcon />}
            low="Dim"
            high="Bright"
          />
          <ControlSlider
            id="motion"
            label="Motion"
            settingKey="motion"
            icon={<MotionIcon />}
            low="Still"
            high="Fast"
          />
          <ControlSlider
            id="atmos"
            label="Atmosphere"
            settingKey="atmos"
            icon={<AtmosIcon />}
            low="Clear"
            high="Hazy"
          />
        </section>
        <section className="surface-sound chrome" aria-label="Sound">
          <SoundPanel />
        </section>
      </GlassPanel>
    </main>
  );
}

export function FluidScene() {
  return (
    <FluidProvider>
      <SoundProvider>
        <FilterDefs />
        <Backdrop />
        <SceneVars>
          <Surface />
        </SceneVars>
      </SoundProvider>
    </FluidProvider>
  );
}
