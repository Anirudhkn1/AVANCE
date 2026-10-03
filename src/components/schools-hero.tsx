import Link from "next/link";
import type { CSSProperties } from "react";
import { ClassroomScene } from "@/components/classroom-scene";
import { PaperPlane } from "@/components/schools-chrome";

// The Avance Schools hero: the classroom scene (ClassroomScene) with a few
// loose layers on top — window light tinted by the time of day, chalk dust
// off the board, paper planes in flight. Positions are percentages of the
// 16:9 scene, so they stay pinned to the right spots however the stage is
// cropped or panned (see .schools-hero__stage).

// Chalk dust lifting off the board's tray.
const DUST = [
  { x: 6, y: 44, dx: "1.5vw", dur: "7s", delay: "0s" },
  { x: 9, y: 41, dx: "-1vw", dur: "9s", delay: "-3s" },
  { x: 12, y: 45, dx: "2vw", dur: "8s", delay: "-5s" },
  { x: 15, y: 42, dx: "0.5vw", dur: "10s", delay: "-1s" },
  { x: 18, y: 40, dx: "-1.5vw", dur: "8.5s", delay: "-6s" },
  { x: 21, y: 44, dx: "1vw", dur: "9.5s", delay: "-2s" },
  { x: 10, y: 38, dx: "1.2vw", dur: "11s", delay: "-7s" },
  { x: 14, y: 46, dx: "-0.8vw", dur: "7.5s", delay: "-4s" },
];

// Paper planes thrown across the room, slowly.
const PLANES = [
  { x: 10, y: 66, dur: "18s", delay: "-2s" },
  { x: 44, y: 58, dur: "23s", delay: "-12s" },
];

export function SchoolsHero({ exitHref }: { exitHref: string }) {
  return (
    <section className="schools-hero">
      <div className="schools-hero__stage">
        <ClassroomScene className="schools-hero__media" />
        <div className="schools-hero__light" aria-hidden />
        {DUST.map((d, i) => (
          <span
            key={i}
            aria-hidden
            className="schools-hero__dust"
            style={{ left: `${d.x}%`, top: `${d.y}%`, "--dx": d.dx, "--dur": d.dur, "--delay": d.delay } as CSSProperties}
          />
        ))}
        {PLANES.map((p, i) => (
          <PaperPlane
            key={i}
            className="schools-hero__plane"
            style={{ left: `${p.x}%`, top: `${p.y}%`, "--dur": p.dur, "--delay": p.delay } as CSSProperties}
          />
        ))}
      </div>
      <div className="schools-hero__vignette" aria-hidden />

      <Link href={exitHref} className="schools-hero__exit">
        ← Back to Avance
      </Link>

      <div className="schools-hero__copy">
        <div>
          <h1 className="schools-title schools-hero__title">Avance Schools</h1>
          <p className="schools-hero__tagline">Every class, an adventure.</p>
        </div>
        <Link href="/school/enter" className="schools-hero__enter">
          Enter school <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}
