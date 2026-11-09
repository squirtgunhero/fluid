import type { SVGProps } from "react";

const base: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  focusable: false,
};

export function LightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </svg>
  );
}

export function MotionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M3 9c2.2 0 2.2-2 4.5-2S9.8 9 12 9s2.3-2 4.5-2S18.8 9 21 9" />
      <path d="M3 15c2.2 0 2.2-2 4.5-2s2.3 2 4.5 2 2.3-2 4.5-2 2.3 2 4.5 2" />
    </svg>
  );
}

export function AtmosIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h16" />
      <path d="M7 12h13" opacity="0.7" />
      <path d="M4 16h10" opacity="0.45" />
    </svg>
  );
}

/** The Fluid mark: a lens with an offset inner refraction. */
export function FluidMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} width={18} height={18} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="13.5" cy="10.5" r="3.5" opacity="0.6" />
    </svg>
  );
}
