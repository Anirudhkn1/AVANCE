"use client";

import { Component, type ReactNode } from "react";
import PixelBlast from "@/components/PixelBlast";

// PixelBlast has no built-in onError (unlike AeroShards) — WebGL/postprocessing
// setup runs synchronously inside its effect, so a class boundary is what
// actually catches a failure there. On failure this renders nothing, leaving
// the dashboard's own background token visible instead of a broken canvas.
class BackgroundErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Dashboard background unavailable, falling back to the plain background:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Decorative WebGL pixel-field behind the dashboard icon grid. Left with
 * default (non-none) pointer-events so its click ripples still fire in the
 * empty space around the icons — the icon tiles themselves sit in their own
 * stacking context above it, so clicks on them are unaffected.
 */
export function DashboardBackground() {
  return (
    <div className="absolute inset-0">
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
