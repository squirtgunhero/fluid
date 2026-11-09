import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * A light tap of haptic feedback. In the iOS shell this reaches the Taptic
 * Engine through Capacitor's Haptics plugin. In a plain browser it falls
 * back to the Vibration API where one exists, and is otherwise silent.
 */
export function haptic(strength: "light" | "medium" = "light") {
  try {
    if (Capacitor.isNativePlatform()) {
      void Haptics.impact({
        style: strength === "light" ? ImpactStyle.Light : ImpactStyle.Medium,
      }).catch(() => undefined);
      return;
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(strength === "light" ? 6 : 12);
    }
  } catch {
    // Feedback is a nicety, never an error.
  }
}
