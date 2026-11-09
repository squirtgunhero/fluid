# Fluid

A calming liquid-glass orb built with Next.js, Tailwind CSS and Framer Motion.

Near-black space, slowly drifting pools of cobalt, violet and icy light, and
panels of thick optical glass floating above them. A glass orb forms an
inverted, minified image of the light behind it, wobbles with the scene clock
and leans after the pointer. Press it and it breathes with you: it swells and
settles on a guided rhythm, the light brightens and dims in time, slow ripples
cross the glass and its inner image turns, while the rest of the interface
steps back.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Controls

- **Orb**: press to begin or end a breathing session. Escape also ends it.
  Arrow keys nudge the orb.
- **Dock** picks the breathing pattern: Settle (4 in, 6 out), Box
  (4 · 4 · 4 · 4), Deep (4 · 7 · 8) or Free (unguided). The glass indicator
  flows between items. Arrow keys move between patterns.
- **Light** sets the exposure of the pools and the brightness of every glass
  highlight.
- **Motion** sets the drift speed, the orb's liquid deformation and the
  refraction wobble. Zero is perfectly still.
- **Atmosphere** sets the haze: blur depth, glass tint and how far the light
  diffuses.
- **Full / Lite** toggles the heavier effects (SVG refraction, tilt, deep
  blur). Lite is chosen automatically on constrained devices.

`prefers-reduced-motion` freezes the drift, morph, sway and ripples and keeps
the breathing swell very small; the ring, the light and the words still carry
the cue.

## iOS

The native project lives in `ios/` (Capacitor 8, Swift Package Manager, iOS 15+),
with the app icon, a launch screen rendered from the orb, portrait-only
orientation, dark appearance and native haptics through `@capacitor/haptics`.
The web app is a static export (`out/`) that `cap sync` copies into the shell.

To run it on a simulator or your phone from a Mac:

```bash
npm install
```

```bash
npm run build && npx cap sync ios
```

```bash
npx cap open ios
```

In Xcode, select the App target, set your team under Signing & Capabilities,
pick a device and press Run. The bundle identifier is `com.fluid.breathe`
(change it in `capacitor.config.json` and the Xcode target together).

Without a Mac, the GitHub Actions workflow in `.github/workflows/ios.yml`
builds the app for the iOS Simulator on every push and uploads `App.app` as
an artifact, so the native build is checked continuously.

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

