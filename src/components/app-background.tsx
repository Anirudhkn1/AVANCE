"use client";

import { Component, type ReactNode } from "react";
import PixelBlast from "@/components/PixelBlast";

// PixelBlast has no built-in onError (unlike AeroShards) — WebGL/postprocessing
// setup runs synchronously inside its effect, so a class boundary is what
// actually catches a failure there. On failure this renders nothing, leaving
// the plain theme background visible instead of a broken canvas.
class BackgroundErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("App background unavailable, falling back to the plain background:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Decorative WebGL pixel-field rendered behind the whole signed-in app shell
 * (mounted once from the root layout, gated on `user`) — so it's visible on
 * the dashboard's icon grid and every page reached by opening one of those
 * icons, without re-creating the WebGL context on every navigation.
 *
 * Sits as the first child in `<body>`, `position: fixed` with an explicit
 * `-z-10` — verified via the browser's own `elementFromPoint` hit-testing
 * (not just visual inspection, which is misleading here) that ordinary page
 * text always wins the stacking order above this, negative z-index or not,
 * so it never truly covers/replaces text. What reads as "overlapping the
 * text" (e.g. on the Profile page, or the plain sections below the landing
 * page's Hero) is the pattern legitimately showing through the *gaps*
 * around and between letters — correct stacking, but visually noisy right
 * next to small plain text with no card behind it. `opacity-[0.025]`
 * (45 -> 25 -> cut a further 90% on request, down to 2.5) softens the
 * "on" cells so that noise recedes instead of visually competing with
 * foreground content, while staying visible in open space. The *actual*
 * text-covering bug this was mistaken for was the
 * sticky Navbar's `bg-surface/80 backdrop-blur` letting this pattern bleed
 * through as a blurred wash behind the nav links on every page — fixed by
 * making the navbar's background opaque (see navbar.tsx) instead of tuning
 * this component further. Left with default (non-none) pointer-events so
 * its click ripples still fire in the empty space around cards/icons —
 * content above it in paint order still captures its own clicks first.
 */
export function AppBackground() {
  return (
    <div className="fixed inset-0 -z-10 opacity-[0.025]" aria-hidden>
      <BackgroundErrorBoundary>
        <PixelBlast
          className=""
          style={undefined}
          variant="square"
          pixelSize={3}
          color="#8b85ff"
          patternScale={3}
          patternDensity={0.637}
          pixelSizeJitter={0.3}
          enableRipples
          rippleSpeed={0.35}
          rippleThickness={0.12}
          rippleIntensityScale={1.2}
          speed={0.6}
          edgeFade={0.1}
          transparent
          // MSAA is a real per-frame GPU cost that buys nothing at 2.5%
          // opacity — nobody can see the jaggies it would otherwise smooth.
          antialias={false}
        />
      </BackgroundErrorBoundary>
    </div>
  );
}
