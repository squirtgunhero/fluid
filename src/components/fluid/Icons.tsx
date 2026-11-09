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

export function SoundIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v4h3l4 3.5v-11L7 10H4z" />
      <path d="M15 9.5a3.5 3.5 0 0 1 0 5" />
      <path d="M17.5 7a7 7 0 0 1 0 10" opacity="0.6" />
    </svg>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <path d="M8 5.5v13a.6.6 0 0 0 .9.5l10-6.5a.6.6 0 0 0 0-1l-10-6.5a.6.6 0 0 0-.9.5z" />
    </svg>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} fill="currentColor" stroke="none" {...props}>
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </svg>
  );
}

export function SkipIcon({ back = false, ...props }: SVGProps<SVGSVGElement> & { back?: boolean }) {
  return (
    <svg {...base} fill="currentColor" stroke="none" style={back ? { transform: "scaleX(-1)" } : undefined} {...props}>
      <path d="M6 6.2v11.6a.6.6 0 0 0 .9.5l8.2-5.8a.6.6 0 0 0 0-1L6.9 5.7a.6.6 0 0 0-.9.5z" />
      <rect x="16.5" y="5.5" width="2.2" height="13" rx="1" />
    </svg>
  );
}

export function PlusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ImportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4v10M8.5 10.5 12 14l3.5-3.5" />
      <path d="M5 15v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
    </svg>
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}

export function NoteIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </svg>
  );
}
