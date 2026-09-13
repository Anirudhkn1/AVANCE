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
 * Sits as the first child in `<body>`, `position: fixed` behind the Navbar
 * and page content: those paint later in the same stacking context so they
 * always render on top without needing an explicit z-index. Left with
 * default (non-none) pointer-events so its click ripples still fire in the
 * empty space around cards/icons — content above it in paint order still
 * captures its own clicks first.
 */
export function AppBackground() {
  return (
    <div className="fixed inset-0" aria-hidden>
      <BackgroundErrorBoundary>
        <PixelBlast
          className=""
          style={undefined}
          variant="square"
          pixelSize={3}
          color="#8b85ff"
          patternScale={3}
          patternDensity={0.91}
          pixelSizeJitter={0.3}
          enableRipples
          rippleSpeed={0.35}
          rippleThickness={0.12}
          rippleIntensityScale={1.2}
          speed={0.6}
          edgeFade={0.1}
          transparent
        />
      </BackgroundErrorBoundary>
    </div>
  );
}
