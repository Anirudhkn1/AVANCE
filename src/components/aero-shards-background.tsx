"use client";

import { useCallback, useState } from "react";
import AeroShards from "@/components/AeroShards";

/**
 * App-specific wrapper around the React Bits AeroShards background.
 * WebGPU support is still inconsistent (notably iOS Safari and older
 * Android/desktop browsers), so on any init/render failure this falls back
 * to a plain colored panel instead of a broken or blank canvas. Purely
 * decorative — aria-hidden and pointer-events:none all the way down, so it
 * never blocks the hero content sitting on top of it.
 */
export function AeroShardsBackground({
  backgroundColor = "#0a0b10",
  shardColor = "#8b85ff",
  accentColor = "#5850ec",
}: {
  backgroundColor?: string;
  shardColor?: string;
  accentColor?: string;
}) {
  const [failed, setFailed] = useState(false);

  const handleError = useCallback((error: Error) => {
    console.warn("AeroShards background unavailable, falling back to a static panel:", error);
    setFailed(true);
  }, []);

  if (failed) {
    return <div className="absolute inset-0" style={{ backgroundColor }} aria-hidden />;
  }

  return (
    <div className="absolute inset-0">
      <AeroShards
        backgroundColor={backgroundColor}
        shardColor={shardColor}
        accentColor={accentColor}
        placement="full"
        flow="stream"
        material="pearl"
        detail="balanced"
        interaction="repel"
        density={1.3}
        shardSize={1}
        glow={1}
        bloom={0.45}
        grain={0.04}
        holdToGather
        onError={handleError}
      />
    </div>
  );
}
