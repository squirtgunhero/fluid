"use client";

import type { ReactNode } from "react";
import type { SettingKey } from "@/lib/presets";
import { useFluid } from "./FluidProvider";
import { GlassPanel } from "./GlassPanel";

type Props = {
  id: string;
  label: string;
  settingKey: SettingKey;
  icon: ReactNode;
  /** Endpoint words, shown under the track. */
  low: string;
  high: string;
};

export function ControlSlider({ id, label, settingKey, icon, low, high }: Props) {
  const { settings, setSetting } = useFluid();
  const value = Math.round(settings[settingKey] * 100);
  const position = value < 34 ? low : value > 66 ? high : "balanced";

  return (
    <GlassPanel className="control" tilt={4}>
      <div className="control-head">
        <label htmlFor={id} className="control-label">
          {icon}
          <span>{label}</span>
        </label>
        <output htmlFor={id} className="control-value">
          {value}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => setSetting(settingKey, Number(e.target.value) / 100)}
        className="fluid-range"
        style={{ ["--val" as string]: value }}
        aria-valuetext={`${value} percent, ${position}`}
      />
      <div className="control-scale" aria-hidden="true">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </GlassPanel>
  );
}
