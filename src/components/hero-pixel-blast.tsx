"use client";

import { Component, type ReactNode } from "react";
import PixelBlast from "@/components/PixelBlast";

// Same failure mode as AppBackground (see its header comment for why a class
// boundary is what's needed here) — PixelBlast's WebGL/postprocessing setup
// runs synchronously inside its effect. On failure this renders nothing,
// leaving AeroShards' own panel as the hero background instead of a broken
// canvas stacked on top of it.
class HeroPixelBlastErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Hero pixel-blast overlay unavailable:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * A second, hero-only pixel-field layer stacked on top of AeroShardsBackground
 * (see page.tsx) — `transparent` so it never occludes AeroShards' own panel,
 * just adds a faint texture over it. At this opacity it reads as grain, not
 * a competing pattern; deliberately much lower than AppBackground's already-
 * low 0.025 (see avance-purple-background memory / app-background.tsx) since
 * this sits on the hero's dark panel where a pattern is more noticeable than
 * on the app's plain light/dark background elsewhere.
 *
 * Independent of AppBackground: that one stays gated to signed-in users
 * sitewide (per the same memory — "never on signed-out pages"); this one is
 * part of the hero itself and shows regardless of auth state, same as
 * AeroShardsBackground.
 */
export function HeroPixelBlast() {
  return (
    <div className="absolute inset-0 opacity-[0.012]" aria-hidden>
      <HeroPixelBlastErrorBoundary>
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
          // MSAA is a real per-frame GPU cost that buys nothing at 1.2%
          // opacity — nobody can see the jaggies it would otherwise smooth.
          antialias={false}
        />
      </HeroPixelBlastErrorBoundary>
    </div>
  );
}
