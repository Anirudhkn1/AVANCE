"use client";

import { useEffect, useRef, type CSSProperties, type PointerEvent } from "react";
import Image from "next/image";
import "./character-stage.css";
import { startStageFx } from "@/components/character-stage-fx";
import type { Character } from "@/lib/voyage";

// A Voyage hero on their own stage: the artwork, breathing, with a set of
// effects chosen to fit what's behind the character —
//   Shanks  — teal storm: Conqueror's Haki shockwaves, red-black lightning
//   Sanji   — blue flames, a glowing eye, the cigarette ember and its smoke
//   Nami    — sky and wind: hair in the breeze, drifting cloud, a Clima-Tact
//             thunderbolt, glinting Beli
//   Luffy   — sunrise: turning light rays, a golden aura, a shimmer across
//             the straw hat, drum-beat rings
// Layers are positioned in percentages of the artwork (the frame has the
// artwork's exact aspect ratio), so they stay put at any size. The pointer
// nudges the layers for a little depth. Students only — no staff page renders it.

export function CharacterStage({ character, className = "" }: { character: Character; className?: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return startStageFx(canvas, character.theme);
  }, [character.theme]);

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", String(((e.clientX - r.left) / r.width) * 2 - 1));
    el.style.setProperty("--py", String(((e.clientY - r.top) / r.height) * 2 - 1));
  };
  const settle = () => {
    frameRef.current?.style.setProperty("--px", "0");
    frameRef.current?.style.setProperty("--py", "0");
  };

  const style = {
    "--ar": character.width / character.height,
    "--cs-accent": character.accent,
  } as CSSProperties;

  return (
    <figure className={`cstage cstage--${character.theme} ${className}`} style={style}>
      <div ref={frameRef} className="cstage__frame" onPointerMove={tilt} onPointerLeave={settle}>
        <div className="cstage__art">
          <div className="cstage__stack">
            <Image
              src={character.image}
              alt={`${character.name}, animated`}
              fill
              priority
              sizes="(min-width: 768px) 360px, 90vw"
              className="cstage__img"
            />
            {character.theme === "storm" && (
              <div className="cs-hair" aria-hidden>
                <Image src={character.image} alt="" fill sizes="(min-width: 768px) 360px, 90vw" className="cstage__img" />
              </div>
            )}
          </div>
        </div>

        <div className="cstage__fx" aria-hidden>
          {character.theme === "haki" && <HakiLayers />}
          {character.theme === "blueflame" && <BlueFlameLayers />}
          {character.theme === "storm" && <StormLayers />}
          {character.theme === "sunrise" && <SunriseLayers />}
        </div>
        <canvas ref={canvasRef} className="cstage__canvas" aria-hidden />
      </div>

      <figcaption className="cstage__cap">
        <span className="cstage__name">{character.name}</span>
        <span className="cstage__epithet">{character.epithet}</span>
      </figcaption>
    </figure>
  );
}

// Jagged bolts radiating from the head, drawn in a 100×100 box over the square art.
const HAKI_BOLTS = [
  "31,32 23,27 26,21 15,15 18,6",
  "69,32 77,26 74,20 86,14 83,4",
  "42,13 36,9 40,4 34,0",
  "20,64 12,59 16,53 6,46",
  "82,66 90,60 86,54 96,47",
];

function HakiLayers() {
  return (
    <>
      <div className="cs-haki-clouds" />
      <div className="cs-haki-vignette" />
      <svg className="cs-haki-bolts" viewBox="0 0 100 100" preserveAspectRatio="none">
        {HAKI_BOLTS.map((pts, i) => (
          <g key={pts} style={{ animationDelay: `${i * 0.07}s` }}>
            <polyline points={pts} className="cs-haki-bolt-glow" />
            <polyline points={pts} className="cs-haki-bolt-core" />
          </g>
        ))}
      </svg>
      <span className="cs-haki-ring" />
      <span className="cs-haki-ring" style={{ animationDelay: "0.18s" }} />
      <span className="cs-haki-ring" style={{ animationDelay: "0.36s" }} />
      <div className="cs-haki-flash" />
    </>
  );
}

function BlueFlameLayers() {
  return (
    <>
      <div className="cs-blue-edge" />
      <div className="cs-blue-surge" />
      <span className="cs-blue-eye" />
      <span className="cs-blue-ember" />
    </>
  );
}

function StormLayers() {
  return (
    <>
      <span className="cs-cloud cs-cloud--a" />
      <span className="cs-cloud cs-cloud--b" />
      <span className="cs-cloud cs-cloud--c" />
      <span className="cs-wind" style={{ top: "3%", animationDelay: "0s" }} />
      <span className="cs-wind" style={{ top: "28%", animationDelay: "1.4s" }} />
      <span className="cs-wind" style={{ top: "47%", animationDelay: "2.6s" }} />
      <span className="cs-wind" style={{ top: "68%", animationDelay: "0.8s" }} />
      <div className="cs-storm-cloud" />
      <svg className="cs-storm-bolt" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="76,8 69,24 75,26 62,48 68,50 58,68" className="cs-storm-bolt-glow" />
        <polyline points="76,8 69,24 75,26 62,48 68,50 58,68" className="cs-storm-bolt-core" />
      </svg>
      <div className="cs-storm-flash" />
      <span className="cs-glint" />
    </>
  );
}

function SunriseLayers() {
  return (
    <>
      <div className="cs-rays" />
      <div className="cs-aura" />
      <div className="cs-shine" />
      <span className="cs-drum" />
      <span className="cs-drum" style={{ animationDelay: "0.3s" }} />
    </>
  );
}
