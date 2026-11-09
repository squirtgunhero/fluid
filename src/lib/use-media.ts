"use client";

import { useSyncExternalStore } from "react";

/**
 * Hydration-safe media query hook. The server snapshot is always `false`,
 * so the first client render matches the server and the real value is
 * applied right after hydration.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

let constrainedSnapshot: boolean | null = null;

/**
 * True on devices where the heavier effects are not worth their cost: few
 * cores, little memory, data saver on, or no backdrop-filter support.
 * Computed once on the client; the server snapshot is `false`.
 */
export function useConstrainedDevice(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => {
      if (constrainedSnapshot === null) {
        const nav = navigator as Navigator & {
          connection?: { saveData?: boolean };
          deviceMemory?: number;
        };
        constrainedSnapshot =
          (nav.hardwareConcurrency ?? 8) <= 4 ||
          (nav.deviceMemory ?? 8) <= 4 ||
          nav.connection?.saveData === true ||
          !CSS.supports("backdrop-filter", "blur(1px)");
      }
      return constrainedSnapshot;
    },
    () => false,
  );
}
