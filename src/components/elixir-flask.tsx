import { useId } from "react";
import "./elixir.css";

// The Elixir flask: a round-bottom glass flask with a glowing pink-violet
// potion that rises as drops are earned. Pure SVG + CSS (see elixir.css) — no
// "use client", so the shelf and the kid's page render it on the server, and
// the brew session re-renders it with a new `fill`/`bump`.

const BODY =
  "M78 18H122V86C168 96 188 136 188 176C188 226 150 252 100 252C50 252 12 226 12 176C12 136 32 96 78 86Z";

// A long sine-ish strip; sliding it 100px sideways loops seamlessly.
const WAVE = (() => {
  let d = "M-300 0Q-275 -8 -250 0";
  for (let x = -200; x <= 500; x += 50) d += `T${x} 0`;
  return `${d}V320H-300Z`;
})();

const BUBBLES = [
  { x: 52, r: 5, t: 4.2, d: 0 },
  { x: 88, r: 3.5, t: 3.1, d: 1.2 },
  { x: 118, r: 6, t: 4.8, d: 0.6 },
  { x: 146, r: 4, t: 3.6, d: 2.1 },
  { x: 74, r: 3, t: 2.8, d: 2.6 },
  { x: 132, r: 3, t: 3.3, d: 0.3 },
];

const STARS = [
  { x: 24, y: 70, s: 0.9, d: 0 },
  { x: 176, y: 110, s: 0.7, d: 0.8 },
  { x: 150, y: 40, s: 1, d: 1.6 },
];

export function ElixirFlask({
  fill,
  bump = 0,
  variant = "full",
  className = "",
}: {
  /** 0–1: how full the flask is. */
  fill: number;
  /** Change this number to play a splash + falling drop (one per earned review). */
  bump?: number;
  variant?: "full" | "mini";
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const f = Math.max(0, Math.min(1, fill));
  const level = f === 0 ? 0 : Math.max(f, 0.07); // a sliver is still visible
  const top = 262 - level * 210;
  const mini = variant === "mini";

  return (
    <svg
      viewBox="0 0 200 260"
      className={`elixir-flask ${mini ? "elixir-flask--mini" : ""} ${f >= 1 ? "is-full" : ""} ${className}`}
      role="img"
      aria-label={`Elixir flask, ${Math.round(f * 100)}% full`}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={BODY} />
        </clipPath>
        <linearGradient id={`${id}-liquid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff9af2" />
          <stop offset="0.45" stopColor="#c04dff" />
          <stop offset="1" stopColor="#5a1fd1" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor="#ff7be8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff7be8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {level > 0 && !mini && <circle className="elixir-flask__glow" cx="100" cy="170" r="125" fill={`url(#${id}-glow)`} />}

      <path d={BODY} fill="rgba(255,255,255,0.2)" />

      <g clipPath={`url(#${id}-clip)`}>
        <g className="elixir-flask__liquid" style={{ transform: `translateY(${top}px)` }}>
          {/* The CSS wave animation owns `transform`, so the offset lives on a wrapper. */}
          <g transform="translate(0 -3)">
            <path className="elixir-flask__wave-b" d={WAVE} fill="#e87bff" opacity="0.55" />
          </g>
          <path className="elixir-flask__wave-a" d={WAVE} fill={`url(#${id}-liquid)`} />
          {!mini &&
            BUBBLES.map((b, i) => (
              <circle
                key={i}
                className="elixir-flask__bubble"
                cx={b.x}
                cy={150}
                r={b.r}
                style={{ "--t": `${b.t}s`, "--d": `${b.d}s` } as React.CSSProperties}
              />
            ))}
          {bump > 0 && <ellipse key={bump} className="elixir-flask__splash" cx="100" cy="2" rx="38" ry="7" fill="#fff" />}
        </g>
      </g>

      {bump > 0 && !mini && (
        <path
          key={`drop-${bump}`}
          className="elixir-flask__drop"
          d="M100 -18C106 -8 109 -2 109 3A9 9 0 0 1 91 3C91 -2 94 -8 100 -18Z"
          fill="#ff7be8"
          style={{ "--fall": `${top + 8}px` } as React.CSSProperties}
        />
      )}

      {/* Glass: curved highlights, rim and cork sit over the liquid. */}
      <path d="M34 156C36 134 48 116 68 106" stroke="#fff" strokeOpacity="0.75" strokeWidth="7" strokeLinecap="round" fill="none" />
      <circle cx="30" cy="176" r="3.5" fill="#fff" fillOpacity="0.75" />
      <path d={BODY} fill="none" stroke="var(--ink, #1d2f52)" strokeWidth="6" strokeLinejoin="round" />
      <rect x="70" y="12" width="60" height="11" rx="5.5" fill="rgba(255,255,255,0.55)" stroke="var(--ink, #1d2f52)" strokeWidth="5" />
      <path d="M84 3H116L112 20H88Z" fill="#c68a4b" stroke="var(--ink, #1d2f52)" strokeWidth="5" strokeLinejoin="round" />

      {!mini &&
        level > 0 &&
        STARS.map((s, i) => (
          <path
            key={i}
            className="elixir-flask__star"
            d="M0-9L2.6-2.6L9 0L2.6 2.6L0 9L-2.6 2.6L-9 0L-2.6-2.6Z"
            transform={`translate(${s.x} ${s.y}) scale(${s.s})`}
            fill="#fff6a8"
            style={{ "--d": `${s.d}s` } as React.CSSProperties}
          />
        ))}
    </svg>
  );
}

/** Flasks already brewed, lined up on a shelf. Shows up to `max` and a +N for the rest. */
export function FlaskShelf({ count, max = 8 }: { count: number; max?: number }) {
  if (count <= 0) return <p className="text-sm opacity-80">No flasks yet — fill the one above to start your shelf.</p>;
  const shown = Math.min(count, max);
  return (
    <div className="elixir-shelf" aria-label={`${count} flask${count === 1 ? "" : "s"} brewed`}>
      {Array.from({ length: shown }, (_, i) => (
        <ElixirFlask key={i} fill={1} variant="mini" className="elixir-shelf__flask" />
      ))}
      {count > shown && <span className="elixir-shelf__more">+{count - shown}</span>}
    </div>
  );
}
