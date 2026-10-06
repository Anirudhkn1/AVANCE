import type { CSSProperties, ReactNode } from "react";
import "./schools-backdrop.css";

// What sits behind every Avance Schools page after the hero: a sky-blue sky
// with anime cumulus clouds drifting across, and in front of it either the
// school campus (picking who you are, staff pages) or a sunlit classroom
// (a student's pages, a teacher's classroom pages). The classroom's window
// panes are holes in the wall, so the same moving sky shows through them.
//
// Both scenes are 1600×900 and fill the screen from the bottom up (slice),
// so the building or the windows stay in view on any shape of screen.
// Original art, painted in the soft cel-shaded look of the references.

// ---------- Helpers ----------

/** Deterministic noise so the server and every visit draw the same trees. */
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Blob = [number, number, number];

/** n leaf clumps scattered inside an ellipse. */
function cluster(cx: number, cy: number, rx: number, ry: number, n: number, r0: number, r1: number, seed: number): Blob[] {
  const rand = rng(seed);
  return Array.from({ length: n }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand());
    const round = (v: number) => Math.round(v * 10) / 10;
    return [round(cx + Math.cos(a) * rx * d), round(cy + Math.sin(a) * ry * d), round(r0 + (r1 - r0) * rand())];
  });
}

type Leaves = { dark: string; mid: string; light: string; hi: string };

const SUNLIT: Leaves = { dark: "#22512c", mid: "#3d8638", light: "#79ba45", hi: "#c4e46a" };
const BRIGHT: Leaves = { dark: "#3c7a3a", mid: "#66a844", light: "#a3d45a", hi: "#e0f08c" };
const INDOOR: Leaves = { dark: "#2f5530", mid: "#4f8040", light: "#86b552", hi: "#c3df7a" };

/** A clump outline with a scalloped, leafy edge instead of a perfect circle. */
function leafy(cx: number, cy: number, r: number, bumps: number, twist: number) {
  const pt = (a: number, rr: number) => `${Math.round((cx + Math.cos(a) * rr) * 10) / 10} ${Math.round((cy + Math.sin(a) * rr) * 10) / 10}`;
  let d = `M${pt(twist, r * 0.86)}`;
  for (let k = 0; k < bumps; k++) {
    const a0 = twist + (k / bumps) * Math.PI * 2;
    const a1 = twist + ((k + 1) / bumps) * Math.PI * 2;
    d += `Q${pt((a0 + a1) / 2, r * 1.16)} ${pt(a1, r * 0.86)}`;
  }
  return `${d}Z`;
}

/**
 * Anime foliage: each clump is painted whole — shadowed underside, body, sunlit
 * top — from the top of the tree down, so every lower clump overlaps the dark
 * underside of the ones above it and the canopy reads as layered masses.
 */
function Foliage({ blobs, leaves }: { blobs: Blob[]; leaves: Leaves }) {
  const ordered = [...blobs].sort((a, b) => a[1] - b[1]);
  return (
    <>
      {ordered.map(([x, y, r], i) => {
        const bumps = 7 + (i % 4);
        const twist = (i * 0.9) % Math.PI;
        return (
          <g key={i}>
            <path d={leafy(x, y + r * 0.1, r, bumps, twist)} fill={leaves.dark} />
            <path d={leafy(x - r * 0.06, y - r * 0.08, r * 0.86, bumps, twist + 0.3)} fill={leaves.mid} />
            <path d={leafy(x - r * 0.2, y - r * 0.34, r * 0.5, bumps - 2, twist + 0.6)} fill={leaves.light} />
            {i % 3 === 0 && <path d={leafy(x - r * 0.32, y - r * 0.5, r * 0.2, 5, twist)} fill={leaves.hi} />}
          </g>
        );
      })}
    </>
  );
}

/** A group that sways about one point — a trunk's base, a pot. */
function Sway({ x, y, dur, delay = 0, children }: { x: number; y: number; dur: number; delay?: number; children: ReactNode }) {
  return (
    <g className="sb-sway" style={{ transformOrigin: `${x}px ${y}px`, "--dur": `${dur}s`, "--delay": `${delay}s` } as CSSProperties}>
      {children}
    </g>
  );
}

// ---------- The sky ----------

// Each cloud: horizontal position comes from the drift animation; y and
// width are in viewport units. Delays are negative so the sky starts full.
const CLOUDS = [
  { shape: 0, y: 4, w: 30, dur: 170, delay: -20 },
  { shape: 1, y: 14, w: 18, dur: 120, delay: -70 },
  { shape: 2, y: 2, w: 46, dur: 260, delay: -190 },
  { shape: 1, y: 26, w: 14, dur: 95, delay: -40 },
  { shape: 0, y: 20, w: 24, dur: 150, delay: -110 },
  { shape: 2, y: 34, w: 20, dur: 135, delay: -15 },
  { shape: 1, y: 8, w: 12, dur: 80, delay: -55 },
];

// Cumulus as stacked puffs: shadowed puffs peek out under the white ones,
// and the base is cut flat, the way anime skies paint them.
const CLOUD_SHAPES: Blob[][] = [
  [[60, 92, 34], [105, 70, 46], [160, 58, 54], [215, 74, 42], [250, 94, 28], [130, 98, 36], [190, 100, 34]],
  [[50, 90, 28], [90, 70, 38], [140, 64, 44], [185, 80, 32], [215, 96, 22], [120, 96, 30]],
  [[40, 100, 30], [85, 80, 42], [140, 52, 58], [200, 40, 62], [255, 62, 50], [300, 88, 36], [170, 96, 40], [235, 100, 36]],
];

function Cloud({ shape }: { shape: number }) {
  const puffs = CLOUD_SHAPES[shape];
  return (
    // The viewBox stops at y 118, which cuts every cloud's base flat.
    <svg viewBox="0 -10 340 128" className="sb-cloud__art">
      <g>
        {puffs.map(([x, y, r], i) => (
          <circle key={`s${i}`} cx={x + 6} cy={y + 10} r={r} className="sb-cloud__shade" />
        ))}
        {puffs.map(([x, y, r], i) => (
          <circle key={`b${i}`} cx={x} cy={y} r={r * 0.94} className="sb-cloud__body" />
        ))}
        {puffs.map(([x, y, r], i) => (
          <circle key={`g${i}`} cx={x - r * 0.25} cy={y - r * 0.3} r={r * 0.45} className="sb-cloud__glow" />
        ))}
      </g>
    </svg>
  );
}

const STARS = [
  [6, 8], [14, 22], [22, 5], [31, 17], [39, 30], [47, 9], [55, 24], [63, 4], [70, 15], [78, 28], [86, 7], [93, 19], [11, 36], [58, 38], [82, 40],
];

export function SchoolsSky() {
  return (
    <div className="sb-sky">
      {STARS.map(([x, y], i) => (
        <span key={i} className="sb-star" style={{ left: `${x}%`, top: `${y}%`, "--delay": `${-i * 0.7}s` } as CSSProperties} />
      ))}
      {CLOUDS.map((c, i) => (
        <div
          key={i}
          className="sb-cloud"
          style={{ top: `${c.y}vh`, width: `${c.w}vw`, "--dur": `${c.dur}s`, "--delay": `${c.delay}s` } as CSSProperties}
        >
          <Cloud shape={c.shape} />
        </div>
      ))}
      <svg viewBox="0 0 60 20" className="sb-birds" aria-hidden>
        <path d="M2 8q5-6 10 0q5-6 10 0M30 14q4-5 8 0q4-5 8 0M44 4q3-4 6 0q3-4 6 0" />
      </svg>
    </div>
  );
}

// ---------- The campus ----------

const BRICK_DARK = "#8a3727";
const BRICK_LIGHT = "#cf6a4d";
const STONE = "#f2e8d0";
const STONE_SHADE = "#d3c19c";
const FRAME = "#5b2c22";

function Balustrade({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const posts = Array.from({ length: Math.floor((x1 - x0 - 8) / 16) }, (_, i) => x0 + 8 + i * 16);
  return (
    <g>
      <rect x={x0} y={y} width={x1 - x0} height={6} fill={STONE} />
      {posts.map((x) => (
        <rect key={x} x={x} y={y + 6} width={7} height={16} rx={3} fill={STONE_SHADE} />
      ))}
      <rect x={x0} y={y + 22} width={x1 - x0} height={4} fill={STONE_SHADE} />
    </g>
  );
}

function Cornice({ x0, x1, y }: { x0: number; x1: number; y: number }) {
  const dentils = Array.from({ length: Math.floor((x1 - x0) / 14) }, (_, i) => x0 + 4 + i * 14);
  return (
    <g>
      <rect x={x0 - 10} y={y} width={x1 - x0 + 20} height={10} fill={STONE} />
      <rect x={x0 - 4} y={y + 10} width={x1 - x0 + 8} height={8} fill={STONE_SHADE} />
      {dentils.map((x) => (
        <rect key={x} x={x} y={y + 10} width={7} height={8} fill={STONE} />
      ))}
    </g>
  );
}

function Window({ x, y, w, h, awning }: { x: number; y: number; w: number; h: number; awning?: boolean }) {
  return (
    <g>
      {awning ? (
        <g>
          <path d={`M${x - 4} ${y - 36}H${x + w + 4}L${x + w + 13} ${y - 9}H${x - 13}Z`} fill="#cdb084" />
          <path d={`M${x + w * 0.25} ${y - 36}l-3 27M${x + w * 0.5} ${y - 36}v27M${x + w * 0.75} ${y - 36}l3 27`} stroke="#b0905f" strokeWidth={3} />
          <path d={`M${x - 13} ${y - 9}H${x + w + 13}V${y - 2}H${x - 13}Z`} fill="#a88655" />
        </g>
      ) : (
        <rect x={x - 6} y={y - 12} width={w + 12} height={10} fill={STONE} />
      )}
      <rect x={x} y={y} width={w} height={h} fill="url(#sb-glass)" stroke={FRAME} strokeWidth={3} />
      {awning && <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={18} fill="#1b2a44" opacity={0.25} />}
      <path d={`M${x + w / 2} ${y}V${y + h}M${x} ${y + h * 0.38}H${x + w}`} stroke={STONE} strokeWidth={4} />
      <path d={`M${x + 8} ${y + h * 0.8}L${x + w * 0.45} ${y + 8}`} stroke="#ffffff" strokeOpacity={0.4} strokeWidth={7} />
      <rect x={x - 8} y={y + h} width={w + 16} height={8} fill={STONE} />
      <rect x={x - 8} y={y + h + 8} width={w + 16} height={3} fill={STONE_SHADE} />
    </g>
  );
}

function Pilaster({ x, y0, y1 }: { x: number; y0: number; y1: number }) {
  return (
    <g>
      <rect x={x} y={y0} width={24} height={y1 - y0} fill={BRICK_LIGHT} />
      <rect x={x + 18} y={y0} width={6} height={y1 - y0} fill={BRICK_DARK} />
    </g>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 15} y={640} width={30} height={52} fill={STONE} />
      <rect x={x - 15} y={640} width={30} height={6} fill={STONE_SHADE} />
      <rect x={x - 4} y={604} width={8} height={36} fill="#3b3a46" />
      <circle cx={x} cy={594} r={30} fill="#fffbe6" className="sb-lamp-glow" />
      <circle cx={x} cy={594} r={15} fill="url(#sb-globe)" />
    </g>
  );
}

function SideBlock({ x, w, top, flip }: { x: number; w: number; top: number; flip?: boolean }) {
  const cols = Math.floor(w / 62);
  return (
    <g>
      <rect x={x} y={top} width={w} height={690 - top} fill="#c56a50" />
      <rect x={flip ? x : x + w - 16} y={top} width={16} height={690 - top} fill={BRICK_DARK} opacity={0.5} />
      <rect x={x - 6} y={top - 12} width={w + 12} height={14} fill={STONE} />
      {[0, 1, 2].map((row) =>
        Array.from({ length: cols }, (_, c) => (
          <rect key={`${row}-${c}`} x={x + 18 + c * 62} y={top + 30 + row * 95} width={34} height={58} fill="url(#sb-glass)" stroke={FRAME} strokeWidth={2} />
        ))
      )}
    </g>
  );
}

/** A student seen from behind, walking (legs and arms swing; the path is CSS). */
function Walker({ shirt, bottom, bag, hair, path }: { shirt: string; bottom: string; bag: string; hair: string; path: Record<string, string> }) {
  const limb = (x: number, y: number, len: number, w: number, color: string, phase: number, className = "sb-leg") => (
    <g transform={`translate(${x} ${y})`}>
      <g className={className} style={{ "--delay": `${phase}s` } as CSSProperties}>
        <path d={`M0 0V${len}`} stroke={color} strokeWidth={w} strokeLinecap="round" />
      </g>
    </g>
  );
  return (
    <g className="sb-walker" style={path as CSSProperties}>
      <ellipse cx={0} cy={0} rx={22} ry={5} fill="#1b2a44" opacity={0.25} />
      {limb(-7, -48, 46, 9, "#f0c8a4", 0)}
      {limb(7, -48, 46, 9, "#f0c8a4", -0.55)}
      {limb(-17, -88, 34, 7, shirt, -0.55, "sb-arm")}
      {limb(17, -88, 34, 7, shirt, 0, "sb-arm")}
      <path d="M-16 -56H16L19 -40H-19Z" fill={bottom} />
      <path d="M-15 -94Q0 -100 15 -94L16 -54H-16Z" fill={shirt} />
      <rect x={-13} y={-92} width={26} height={30} rx={7} fill={bag} />
      <rect x={-13} y={-74} width={26} height={5} fill="#000" opacity={0.15} />
      <circle cx={0} cy={-108} r={14} fill={hair} />
    </g>
  );
}

const LEFT_CANOPY = cluster(190, 330, 210, 190, 46, 30, 66, 1);
const LEFT_OVERHANG = cluster(200, -10, 380, 80, 34, 30, 62, 2);
const RIGHT_CANOPY = cluster(1420, 340, 210, 200, 46, 30, 66, 3);
const RIGHT_OVERHANG = cluster(1400, -20, 380, 90, 34, 30, 62, 4);
const LEFT_SMALL = cluster(330, 545, 80, 100, 18, 22, 42, 5);
const RIGHT_SMALL = cluster(1270, 525, 85, 110, 18, 22, 42, 6);
const HEDGE_LEFT = cluster(480, 680, 190, 16, 22, 12, 22, 7);
const HEDGE_RIGHT = cluster(1120, 680, 190, 16, 22, 12, 22, 8);

export function SchoolCampusScene() {
  const vp = { x: 800, y: 600 };
  const paving = Array.from({ length: 17 }, (_, i) => -1200 + i * 250);
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="sb-scene">
      <defs>
        <linearGradient id="sb-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sb-glass-top" />
          <stop offset="1" className="sb-glass-bottom" />
        </linearGradient>
        <linearGradient id="sb-brick" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#c9603f" />
          <stop offset="1" stopColor="#a5452f" />
        </linearGradient>
        <pattern id="sb-courses" width="40" height="11" patternUnits="userSpaceOnUse">
          <path d="M0 10.5H40M20 0V5.5M0 5.5H40M5 5.5V11" stroke="#7d2f22" strokeOpacity={0.28} strokeWidth={1} />
        </pattern>
        <radialGradient id="sb-globe">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f3e7c4" />
        </radialGradient>
        <linearGradient id="sb-paving" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe5cc" />
          <stop offset="1" stopColor="#dccaa4" />
        </linearGradient>
        <linearGradient id="sb-lawn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb94a" />
          <stop offset="1" stopColor="#4f8d34" />
        </linearGradient>
        <clipPath id="sb-arch">
          <path d="M690 455V380A110 110 0 0 1 910 380V455Z" />
        </clipPath>
        <clipPath id="sb-door">
          <path d="M718 690V600A82 82 0 0 1 882 600V690Z" />
        </clipPath>
        <clipPath id="sb-plaza">
          <path d="M560 738H1040L1600 860V900H0V860Z" />
        </clipPath>
      </defs>

      {/* Neighbouring blocks, half hidden by the trees */}
      <SideBlock x={150} w={250} top={400} />
      <SideBlock x={1200} w={250} top={380} flip />

      {/* Main building: two wings and a taller centre bay */}
      <rect x={380} y={300} width={840} height={390} fill="url(#sb-brick)" />
      <rect x={640} y={232} width={320} height={460} fill="url(#sb-brick)" />
      <rect x={380} y={300} width={840} height={390} fill="url(#sb-courses)" />
      <rect x={640} y={232} width={320} height={68} fill="url(#sb-courses)" />
      <Balustrade x0={380} x1={640} y={262} />
      <Balustrade x0={960} x1={1220} y={262} />
      <Cornice x0={380} x1={640} y={284} />
      <Cornice x0={960} x1={1220} y={284} />
      <Balustrade x0={640} x1={960} y={192} />
      <Cornice x0={640} x1={960} y={214} />

      {/* Attic with the school clock, and a flag */}
      <path d="M720 192V164Q800 112 880 164V192Z" fill={STONE} />
      <path d="M720 186H880V192H720Z" fill={STONE_SHADE} />
      <circle cx={800} cy={162} r={22} fill="#fffdf6" stroke="#24345a" strokeWidth={4} />
      <path d="M800 162V147M800 162l10 5" stroke="#24345a" strokeWidth={3} strokeLinecap="round" />
      <path d="M800 126V58" stroke="#3b3a46" strokeWidth={4} />
      <g className="sb-flag">
        <path d="M802 60Q830 52 858 62V94Q830 84 802 92Z" fill="#4aa8e8" />
        <path d="M802 76Q830 68 858 78" stroke="#f5a915" strokeWidth={6} fill="none" />
      </g>

      <Pilaster x={380} y0={300} y1={690} />
      <Pilaster x={500} y0={300} y1={690} />
      <Pilaster x={616} y0={232} y1={690} />
      <Pilaster x={960} y0={232} y1={690} />
      <Pilaster x={1076} y0={300} y1={690} />
      <Pilaster x={1196} y0={300} y1={690} />

      {/* Upper floor */}
      {[417, 535, 995, 1113].map((x) => (
        <Window key={x} x={x} y={330} w={70} h={110} />
      ))}
      <path d="M672 380A128 128 0 0 1 928 380H910A110 110 0 0 0 690 380Z" fill={BRICK_LIGHT} />
      <path d="M788 252H812L808 276H792Z" fill={STONE} />
      <path d="M690 455V380A110 110 0 0 1 910 380V455Z" fill="url(#sb-glass)" stroke={FRAME} strokeWidth={4} />
      <g clipPath="url(#sb-arch)" stroke={STONE} strokeWidth={4}>
        <path d="M734 270V455M778 270V455M822 270V455M866 270V455M690 380H910M690 418H910" />
        <path d="M720 300L910 455M760 270L910 395" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={10} />
      </g>
      <rect x={684} y={455} width={232} height={9} fill={STONE} />

      {/* Floor band and name plate */}
      <rect x={376} y={470} width={848} height={14} fill={STONE} />
      <rect x={376} y={484} width={848} height={3} fill={STONE_SHADE} />
      <rect x={720} y={490} width={160} height={22} rx={3} fill={STONE} stroke={STONE_SHADE} strokeWidth={2} />
      <text x={800} y={506} textAnchor="middle" fontSize={13} fontWeight={800} letterSpacing={2.5} fill="#24345a" fontFamily="var(--font-schools-heading), sans-serif">
        AVANCE SCHOOL
      </text>

      {/* Ground floor */}
      {[417, 535, 995, 1113].map((x) => (
        <Window key={x} x={x} y={545} w={70} h={92} awning />
      ))}
      <rect x={376} y={652} width={848} height={38} fill={STONE_SHADE} />
      <rect x={376} y={652} width={848} height={5} fill={STONE} />

      {/* Entrance */}
      <path d="M700 690V600A100 100 0 0 1 900 600V690Z" fill={STONE} />
      <path d="M718 690V600A82 82 0 0 1 882 600V690Z" fill="#2c4a68" />
      <g clipPath="url(#sb-door)">
        <rect x={718} y={518} width={164} height={172} fill="url(#sb-glass)" opacity={0.75} />
        <g stroke={STONE} strokeWidth={4}>
          <path d="M718 600H882M800 600V690M759 600V690M841 600V690" />
          <path d="M800 600L740 540M800 600V518M800 600L860 540" />
        </g>
        <rect x={718} y={640} width={164} height={50} fill="#1b2a44" opacity={0.25} />
      </g>
      <Lamp x={672} />
      <Lamp x={928} />

      {/* Lawn, hedges, steps and the paved yard */}
      <rect x={0} y={688} width={1600} height={212} fill="url(#sb-lawn)" />
      <Foliage blobs={HEDGE_LEFT} leaves={SUNLIT} />
      <Foliage blobs={HEDGE_RIGHT} leaves={SUNLIT} />
      <path d="M560 738H1040L1600 860V900H0V860Z" fill="url(#sb-paving)" />
      <g clipPath="url(#sb-plaza)" stroke="#c7b48c" strokeWidth={2}>
        {paving.map((x) => (
          <path key={x} d={`M${vp.x + (x - vp.x) * 0.3} 738L${x} 900`} />
        ))}
        <path d="M0 770H1600M0 808H1600M0 852H1600" />
      </g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={650 - i * 22} y={690 + i * 12} width={300 + i * 44} height={12} fill={STONE} />
          <rect x={650 - i * 22} y={699 + i * 12} width={300 + i * 44} height={3} fill={STONE_SHADE} />
        </g>
      ))}

      {/* Dappled shade from the trees */}
      <g className="sb-dapple" fill="#2c3d63">
        <ellipse cx={180} cy={800} rx={240} ry={44} opacity={0.22} />
        <ellipse cx={420} cy={860} rx={150} ry={30} opacity={0.16} />
        <ellipse cx={1420} cy={810} rx={250} ry={46} opacity={0.22} />
        <ellipse cx={1150} cy={875} rx={170} ry={28} opacity={0.15} />
        <ellipse cx={330} cy={300} rx={70} ry={120} opacity={0.12} />
        <ellipse cx={1270} cy={330} rx={70} ry={130} opacity={0.12} />
      </g>

      {/* Students heading in */}
      <Walker shirt="#fdfcf6" bottom="#24345a" bag="#e2574c" hair="#2a1d14" path={{ "--x0": "1180px", "--y0": "905px", "--s0": "1.05", "--x1": "880px", "--y1": "700px", "--s1": "0.5", "--dur": "28s", "--delay": "-6s" }} />
      <Walker shirt="#fdfcf6" bottom="#5b6d93" bag="#2f7d4f" hair="#4a2f1d" path={{ "--x0": "1240px", "--y0": "915px", "--s0": "1.1", "--x1": "910px", "--y1": "702px", "--s1": "0.5", "--dur": "28s", "--delay": "-5s" }} />
      <Walker shirt="#e9f3fb" bottom="#24345a" bag="#f5a915" hair="#1c1410" path={{ "--x0": "300px", "--y0": "910px", "--s0": "1.1", "--x1": "740px", "--y1": "702px", "--s1": "0.5", "--dur": "34s", "--delay": "-20s" }} />

      {/* Bench and bicycle */}
      <g>
        <rect x={1150} y={780} width={180} height={10} rx={3} fill="#6b4a32" />
        <rect x={1150} y={794} width={180} height={10} rx={3} fill="#7d5a3e" />
        <rect x={1146} y={752} width={188} height={9} rx={3} fill="#6b4a32" />
        <rect x={1146} y={765} width={188} height={9} rx={3} fill="#7d5a3e" />
        <path d="M1162 760V840M1318 760V840M1150 806l-8 34M1330 806l8 34" stroke="#2d2d36" strokeWidth={6} strokeLinecap="round" />
      </g>
      <g fill="none" stroke="#2d2d36" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
        <circle cx={70} cy={852} r={62} />
        <circle cx={250} cy={852} r={62} />
        <path d="M70 852L130 760H220L250 852M130 760L160 852H70M160 852L220 760M120 744H150M220 760L214 732H238" />
      </g>

      {/* Trees framing the yard */}
      <path d="M318 690C322 640 326 600 330 560" stroke="#4a3022" strokeWidth={14} strokeLinecap="round" />
      <path d="M1268 690C1266 640 1268 600 1272 560" stroke="#4a3022" strokeWidth={14} strokeLinecap="round" />
      <Sway x={330} y={690} dur={9}>
        <Foliage blobs={LEFT_SMALL} leaves={SUNLIT} />
      </Sway>
      <Sway x={1270} y={690} dur={10} delay={-3}>
        <Foliage blobs={RIGHT_SMALL} leaves={SUNLIT} />
      </Sway>

      <path d="M120 900C150 760 190 620 205 450L250 450C238 620 236 760 270 900Z" fill="#5a3826" />
      <path d="M232 450C226 620 228 760 262 900H270C236 760 238 620 250 450Z" fill="#3c2418" />
      <path d="M215 520L330 400M222 470L120 360M238 560L380 520" stroke="#5a3826" strokeWidth={16} strokeLinecap="round" />
      <path d="M1480 900C1450 760 1410 620 1395 450L1350 450C1362 620 1364 760 1330 900Z" fill="#5a3826" />
      <path d="M1368 450C1374 620 1372 760 1338 900H1330C1364 760 1362 620 1350 450Z" fill="#3c2418" />
      <path d="M1385 520L1270 400M1378 470L1480 360M1362 560L1220 520" stroke="#5a3826" strokeWidth={16} strokeLinecap="round" />

      <Sway x={225} y={900} dur={8}>
        <Foliage blobs={LEFT_CANOPY} leaves={SUNLIT} />
        <Foliage blobs={LEFT_OVERHANG} leaves={SUNLIT} />
      </Sway>
      <Sway x={1375} y={900} dur={9} delay={-4}>
        <Foliage blobs={RIGHT_CANOPY} leaves={SUNLIT} />
        <Foliage blobs={RIGHT_OVERHANG} leaves={SUNLIT} />
      </Sway>
    </svg>
  );
}

// ---------- The classroom ----------

const CEIL = 140;
const FLOOR = 590;
const ROOM_VP = { x: 800, y: 380 };
const WINDOWS = [
  { x0: 90, x1: 520, blind: 48 },
  { x0: 610, x1: 990, blind: 72 },
  { x0: 1080, x1: 1510, blind: 40 },
];
const WIN_TOP = 200;
const WIN_BOTTOM = 470;

/** Where a point on the back wall's base lands k times closer to the viewer. */
const toward = (x: number, k: number) => Math.round(ROOM_VP.x + (x - ROOM_VP.x) * k);

const WOOD = "#c47c44";
const WOOD_DARK = "#8f5328";
const WOOD_LIGHT = "#dc9a5e";
const METAL = "#4b3a2f";

function Chair({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-18 -46V0M18 -46V0M-14 -46L-16 -6M14 -46L16 -6" stroke={METAL} strokeWidth={4} strokeLinecap="round" />
      <path d="M-24 -50H24L20 -42H-20Z" fill={WOOD_DARK} />
      <path d="M-18 -50V-62M18 -50V-62" stroke={METAL} strokeWidth={4} />
      <rect x={-24} y={-100} width={48} height={38} rx={8} fill={WOOD} />
      <rect x={-24} y={-100} width={48} height={8} rx={4} fill={WOOD_LIGHT} />
      <rect x={-24} y={-70} width={48} height={8} rx={4} fill={WOOD_DARK} opacity={0.6} />
    </g>
  );
}

/** A long table seen from in front: the back edge is a little narrower and nearer the vanishing point. */
function Table({ cx, front, w, depth, legs }: { cx: number; front: number; w: number; depth: number; legs: number }) {
  const back = front - depth;
  const bw = w * 0.88;
  const bcx = cx + (ROOM_VP.x - cx) * 0.08;
  return (
    <g>
      <path
        d={`M${bcx - bw / 2 + 12} ${back}v${legs * 0.8}M${bcx + bw / 2 - 12} ${back}v${legs * 0.8}`}
        stroke={METAL}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path d={`M${bcx - bw / 2} ${back}H${bcx + bw / 2}L${cx + w / 2} ${front}H${cx - w / 2}Z`} fill={WOOD_LIGHT} />
      <path d={`M${bcx - bw / 2} ${back}H${bcx + bw / 2}L${bcx + bw / 2 + 4} ${back + 6}H${bcx - bw / 2 - 4}Z`} fill="#ffffff" opacity={0.25} />
      <rect x={cx - w / 2} y={front} width={w} height={14} fill={WOOD_DARK} />
      <path d={`M${cx - w / 2 + 16} ${front + 14}v${legs}M${cx + w / 2 - 16} ${front + 14}v${legs}`} stroke={METAL} strokeWidth={10} strokeLinecap="round" />
    </g>
  );
}

const OUTSIDE_TREES = cluster(800, 445, 900, 45, 70, 22, 46, 11);
const OUTSIDE_TALL = cluster(1310, 335, 160, 105, 28, 24, 48, 12);
const OUTSIDE_LEFT = cluster(470, 365, 100, 85, 18, 22, 42, 13);
const PLANT = cluster(565, 372, 52, 74, 20, 14, 28, 14);

const MOTES = [
  [260, 520, 0], [340, 600, -3], [420, 470, -6], [760, 540, -2], [830, 450, -8], [880, 620, -4], [1230, 520, -1], [1330, 610, -5], [1420, 470, -7],
];

export function ClassroomBackdrop() {
  const wallHoles = WINDOWS.map((w) => `M${w.x0} ${WIN_TOP}V${WIN_BOTTOM}H${w.x1}V${WIN_TOP}Z`).join("");
  const tiles = Array.from({ length: 15 }, (_, i) => -600 + i * 200);
  const planks = Array.from({ length: 40 }, (_, i) => -1200 + i * 100);
  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" className="sb-scene">
      <defs>
        <linearGradient id="sb-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6ead0" />
          <stop offset="1" stopColor="#e6d0a4" />
        </linearGradient>
        <linearGradient id="sb-ceiling" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e3d6b8" />
          <stop offset="1" stopColor="#f4ecd8" />
        </linearGradient>
        <linearGradient id="sb-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8763f" />
          <stop offset="1" stopColor="#8e5428" />
        </linearGradient>
        <linearGradient id="sb-shaft" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffbe8" stopOpacity={0.32} />
          <stop offset="1" stopColor="#fffbe8" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="sb-corner" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a2410" stopOpacity={0.22} />
          <stop offset="1" stopColor="#3a2410" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Outside, seen through the panes (the sky itself is the page's sky) */}
      <g>
        <rect x={130} y={350} width={260} height={130} fill="#c56a50" />
        <rect x={124} y={340} width={272} height={12} fill={STONE} />
        {[0, 1, 2, 3].map((c) => (
          <rect key={c} x={148 + c * 62} y={372} width={34} height={50} fill="#9fd3ee" stroke={FRAME} strokeWidth={2} />
        ))}
        <Sway x={1310} y={520} dur={11}>
          <Foliage blobs={OUTSIDE_TALL} leaves={BRIGHT} />
        </Sway>
        <Sway x={470} y={480} dur={9} delay={-2}>
          <Foliage blobs={OUTSIDE_LEFT} leaves={BRIGHT} />
        </Sway>
        <Foliage blobs={OUTSIDE_TREES} leaves={BRIGHT} />
      </g>

      {/* Ceiling tiles and lights */}
      <rect x={0} y={0} width={1600} height={CEIL} fill="url(#sb-ceiling)" />
      <g stroke="#cbbb98" strokeWidth={2}>
        <path d="M0 36H1600M0 70H1600M0 100H1600M0 122H1600" />
        {tiles.map((x) => (
          <path key={x} d={`M${x} ${CEIL}L${ROOM_VP.x + (x - ROOM_VP.x) * 1.58} 0`} />
        ))}
      </g>
      <path d="M520 52H760L752 78H508Z" fill="#fffdf2" stroke="#cbbb98" strokeWidth={2} />
      <path d="M840 52H1080L1092 78H848Z" fill="#fffdf2" stroke="#cbbb98" strokeWidth={2} />

      {/* The window wall, panes cut out */}
      <path d={`M0 ${CEIL}H1600V${FLOOR}H0Z${wallHoles}`} fill="url(#sb-wall)" fillRule="evenodd" />
      <rect x={0} y={CEIL} width={90} height={FLOOR - CEIL} fill="url(#sb-corner)" />
      <rect x={1510} y={CEIL} width={90} height={FLOOR - CEIL} fill="url(#sb-corner)" transform="matrix(-1 0 0 1 3110 0)" />
      <rect x={0} y={CEIL} width={1600} height={8} fill="#d8c69f" />
      <rect x={0} y={515} width={1600} height={FLOOR - 515} fill="#c38c58" />
      <rect x={0} y={508} width={1600} height={9} fill="#a26c3b" />
      <rect x={0} y={FLOOR - 10} width={1600} height={10} fill="#7a4e2c" />

      {WINDOWS.map((w) => {
        const third = (w.x1 - w.x0) / 3;
        const slats = Array.from({ length: Math.floor(w.blind / 8) }, (_, i) => WIN_TOP + 8 + i * 8);
        return (
          <g key={w.x0}>
            <path d={`M${w.x0 + third} ${WIN_TOP}V${WIN_BOTTOM}M${w.x0 + 2 * third} ${WIN_TOP}V${WIN_BOTTOM}`} stroke="#5d7f74" strokeWidth={10} />
            <path d={`M${w.x0} 330H${w.x1}`} stroke="#5d7f74" strokeWidth={8} />
            <rect x={w.x0} y={WIN_TOP} width={w.x1 - w.x0} height={WIN_BOTTOM - WIN_TOP} fill="none" stroke="#5d7f74" strokeWidth={16} />
            <path d={`M${w.x0 + 20} 455L${w.x0 + third - 10} 250`} stroke="#ffffff" strokeOpacity={0.18} strokeWidth={14} />
            <rect x={w.x0} y={WIN_TOP} width={w.x1 - w.x0} height={w.blind} fill="#dca45e" />
            {slats.map((y) => (
              <path key={y} d={`M${w.x0} ${y}H${w.x1}`} stroke="#b9803f" strokeWidth={1.5} />
            ))}
            <rect x={w.x0} y={WIN_TOP + w.blind} width={w.x1 - w.x0} height={7} fill="#a8722f" />
            <path d={`M${w.x1 - 40} ${WIN_TOP + w.blind + 7}v46`} stroke="#8a5a26" strokeWidth={2} />
            <circle cx={w.x1 - 40} cy={WIN_TOP + w.blind + 56} r={4} fill="#8a5a26" />
            <rect x={w.x0 - 16} y={WIN_BOTTOM} width={w.x1 - w.x0 + 32} height={14} fill="#f1e6cc" />
            <rect x={w.x0 - 12} y={WIN_BOTTOM + 14} width={w.x1 - w.x0 + 24} height={6} fill="#c9b48a" />
          </g>
        );
      })}

      {/* Clock over the middle window */}
      <circle cx={800} cy={172} r={20} fill="#fffdf6" stroke="#5d7f74" strokeWidth={4} />
      <path d="M800 172V160M800 172l9 4" stroke="#24345a" strokeWidth={3} strokeLinecap="round" />

      {/* Floor */}
      <rect x={0} y={FLOOR} width={1600} height={900 - FLOOR} fill="url(#sb-floor)" />
      <g stroke="#7a4520" strokeOpacity={0.45} strokeWidth={2}>
        {planks.map((x) => (
          <path key={x} d={`M${x} ${FLOOR}L${toward(x, 2.48)} 900`} />
        ))}
        <path d="M0 640H1600M0 712H1600M0 806H1600" strokeOpacity={0.25} />
      </g>

      {/* Sunlight: shafts through the air and bright panes on the floor */}
      <g className="sb-sun">
        {WINDOWS.map((w) => {
          const near = 1.15;
          const far = 1.95;
          return (
            <g key={w.x0}>
              <path d={`M${w.x0} ${WIN_TOP + w.blind}H${w.x1}L${toward(w.x1, far)} 800H${toward(w.x0, far)}Z`} fill="url(#sb-shaft)" />
              <path
                d={`M${toward(w.x0, near)} 612H${toward(w.x1, near)}L${toward(w.x1, far)} 800H${toward(w.x0, far)}Z`}
                className="sb-sun__patch"
              />
            </g>
          );
        })}
      </g>
      {/* The window frames' shadows across the bright patches */}
      <g stroke="#8e5428" strokeOpacity={0.55} strokeWidth={10} className="sb-sun-bars">
        {WINDOWS.map((w) => {
          const third = (w.x1 - w.x0) / 3;
          const bar = (x: number) => `M${toward(x, 1.15)} 612L${toward(x, 1.95)} 800`;
          const mid = 700;
          const k = 1.15 + ((mid - 612) / (800 - 612)) * (1.95 - 1.15);
          return <path key={w.x0} d={`${bar(w.x0 + third)}${bar(w.x0 + 2 * third)}M${toward(w.x0, k)} ${mid}H${toward(w.x1, k)}`} />;
        })}
      </g>

      {/* Potted tree between the windows */}
      <path d="M565 590V420" stroke="#5a3826" strokeWidth={8} />
      <Sway x={565} y={590} dur={12}>
        <Foliage blobs={PLANT} leaves={INDOOR} />
      </Sway>
      <path d="M535 548H595L588 600H542Z" fill="#c4683f" />
      <rect x={530} y={542} width={70} height={10} rx={3} fill="#a85532" />

      {/* Cupboard with books and a globe */}
      <g>
        <rect x={1330} y={492} width={250} height={150} fill={WOOD} />
        <rect x={1330} y={492} width={250} height={10} fill={WOOD_LIGHT} />
        <path d="M1455 506V636M1340 512H1445V630H1340ZM1465 512H1570V630H1465Z" stroke={WOOD_DARK} strokeWidth={4} fill="none" />
        <circle cx={1445} cy={572} r={5} fill="#3b2a1d" />
        <circle cx={1465} cy={572} r={5} fill="#3b2a1d" />
        {[
          [1350, 22, "#2f6f9f"], [1374, 18, "#d6453d"], [1394, 24, "#f5a915"], [1420, 16, "#2f7d4f"],
        ].map(([x, w, c], i) => (
          <rect key={i} x={x as number} y={442 - i * 2} width={w as number} height={50 + i * 2} rx={2} fill={c as string} />
        ))}
        <path d="M1514 492V476M1500 492H1528" stroke={METAL} strokeWidth={4} />
        <circle cx={1514} cy={452} r={24} fill="#6fb6e0" />
        <path d="M1500 440q10 6 8 16q10 -4 18 6M1494 460q8 -2 12 6" stroke="#5c9a4a" strokeWidth={6} fill="none" strokeLinecap="round" />
        <path d="M1490 452A24 24 0 0 0 1538 452" stroke={METAL} strokeWidth={3} fill="none" />
      </g>

      {/* Desks and chairs, far to near */}
      {[700, 800, 900].map((x) => (
        <Chair key={x} x={x} y={610} s={0.62} />
      ))}
      <Table cx={800} front={650} w={360} depth={36} legs={66} />
      {[190, 330, 470].map((x) => (
        <Chair key={x} x={x} y={672} s={0.82} />
      ))}
      {[1130, 1270, 1410].map((x) => (
        <Chair key={x} x={x} y={676} s={0.82} />
      ))}
      <Table cx={330} front={720} w={520} depth={56} legs={104} />
      <Table cx={1270} front={730} w={520} depth={56} legs={104} />

      {/* Dust turning in the light */}
      {MOTES.map(([x, y, d], i) => (
        <circle key={i} cx={x} cy={y} r={2.6} className="sb-mote" style={{ "--delay": `${d}s` } as CSSProperties} />
      ))}
    </svg>
  );
}
