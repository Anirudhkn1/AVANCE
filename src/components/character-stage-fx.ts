// Canvas particle effects for the character stage (character-stage.tsx). The
// CSS layers do the big set pieces (lightning, shockwaves, glows); this adds
// the living texture on top — embers, blue flames, drifting smoke, falling
// Beli, sun motes — per theme. Small on purpose: a few hundred particles at
// most, additive blending where it glows, paused automatically with the tab.

import type { StageTheme } from "@/lib/voyage";

type Kind = "flame" | "ember" | "smoke" | "spark" | "coin" | "puff" | "mote" | "dust" | "fleck";

type Particle = {
  kind: Kind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  seed: number;
  color: string;
  /** Per-second velocity retention for bursts (1 = no drag). */
  drag: number;
};

type Emitter = { rate: number; make: (w: number, h: number) => Partial<Particle> & { kind: Kind } };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const MAX_PARTICLES = 320;

const EMITTERS: Record<StageTheme, Emitter[]> = {
  // Shanks — Conqueror's Haki: crimson embers rising through a teal storm.
  haki: [
    { rate: 16, make: (w, h) => ({ kind: "ember", x: rand(0, w), y: h * rand(0.85, 1.02), vx: rand(-8, 8), vy: -h * rand(0.05, 0.12), life: rand(3, 5.5), size: rand(1.5, 3.5), color: "255,77,77" }) },
    { rate: 5, make: (w, h) => ({ kind: "spark", x: w * rand(0.25, 0.75), y: h * rand(0.05, 0.6), vx: rand(-40, 40), vy: rand(-40, 20), life: rand(0.5, 1.1), size: rand(1, 2.2), color: "255,154,139" }) },
    { rate: 6, make: (w, h) => ({ kind: "dust", x: rand(-10, w), y: rand(0, h), vx: rand(10, 26), vy: rand(-4, 4), life: rand(5, 8), size: rand(1, 2.2), color: "127,255,229" }) },
  ],
  // Sanji — Diable Jambe: blue flames, cyan embers, cigarette smoke.
  blueflame: [
    { rate: 70, make: (w, h) => ({ kind: "flame", x: rand(-0.05 * w, 1.05 * w), y: h * rand(0.96, 1.06), vx: rand(-12, 12), vy: -h * rand(0.06, 0.15), life: rand(1.1, 2.2), size: w * rand(0.045, 0.1), color: "80,170,255" }) },
    { rate: 10, make: (w, h) => ({ kind: "ember", x: rand(0, w), y: h * rand(0.8, 1), vx: rand(-14, 14), vy: -h * rand(0.04, 0.1), life: rand(2, 4), size: rand(1.2, 3), color: "125,211,252" }) },
    { rate: 7, make: (w, h) => ({ kind: "smoke", x: w * 0.28, y: h * 0.667, vx: rand(5, 13), vy: -rand(16, 30), life: rand(3, 4.5), size: rand(4, 7), color: "205,215,230" }) },
  ],
  // Nami — Clima-Tact weather: glints in the sky and a little Beli falling.
  storm: [
    { rate: 9, make: (w, h) => ({ kind: "spark", x: rand(0, w), y: rand(0, h * 0.92), vx: 0, vy: 0, life: rand(0.8, 1.6), size: rand(2, 5), color: "255,243,176" }) },
    { rate: 1.2, make: (w) => ({ kind: "coin", x: rand(0.05 * w, 0.95 * w), y: -12, vx: rand(-6, 6), vy: rand(30, 55), life: 12, size: rand(4.5, 7), color: "255,196,40" }) },
  ],
  // Luffy — sunrise on the Grand Line: gold motes, rising cloud puffs, straw on the wind.
  sunrise: [
    { rate: 14, make: (w, h) => ({ kind: "mote", x: rand(0, w), y: h * rand(0.5, 1.02), vx: rand(-6, 10), vy: -h * rand(0.03, 0.08), life: rand(2.5, 4.5), size: rand(1.5, 3.5), color: "255,214,102" }) },
    { rate: 1.6, make: (w, h) => ({ kind: "puff", x: rand(0, w), y: h * 1.05, vx: rand(2, 8), vy: -h * rand(0.02, 0.045), life: rand(5, 8), size: w * rand(0.06, 0.12), color: "255,255,255" }) },
    { rate: 4, make: (w, h) => ({ kind: "fleck", x: -8, y: rand(0, h), vx: rand(40, 90), vy: rand(-12, 12), life: rand(3, 5), size: rand(3, 6), color: "231,194,125" }) },
  ],
};

// Timed bursts that line up with the CSS set pieces (cycle lengths match
// character-stage.css: haki 7s, surge 6s).
const BURSTS: Partial<Record<StageTheme, { every: number; at: number; make: (w: number, h: number) => Particle[] }>> = {
  haki: {
    every: 7,
    at: 0.1,
    make: (w, h) =>
      Array.from({ length: 40 }, (_, i) => {
        // from a ring round the head, flying outward
        const a = (i / 40) * Math.PI * 2 + rand(-0.1, 0.1);
        const s = rand(120, 330);
        return base({ kind: "spark", x: w * 0.5 + Math.cos(a) * w * 0.2, y: h * 0.3 + Math.sin(a) * w * 0.2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.7, 1.4), size: rand(1.4, 2.8), color: i % 3 ? "255,70,80" : "255,255,255", drag: 0.12 });
      }),
  },
  blueflame: {
    every: 6,
    at: 0.2,
    make: (w, h) =>
      Array.from({ length: 36 }, () =>
        base({ kind: "flame", x: rand(0, w), y: h * 1.02, vx: rand(-20, 20), vy: -h * rand(0.18, 0.32), life: rand(1.2, 2), size: w * rand(0.06, 0.12), color: "80,170,255", drag: 0.6 }),
      ),
  },
};

function base(p: Partial<Particle> & { kind: Kind }): Particle {
  return { x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 2, seed: Math.random() * 1000, color: "255,255,255", drag: 1, ...p };
}

function draw(ctx: CanvasRenderingContext2D, p: Particle) {
  const t = p.age / p.life;
  const fade = Math.min(1, t / 0.15) * (1 - Math.max(0, (t - 0.6) / 0.4));
  if (fade <= 0) return;

  switch (p.kind) {
    case "flame": {
      const r = p.size * (1 - t * 0.55);
      const x = p.x + Math.sin(p.age * 5 + p.seed) * r * 0.35;
      const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, r);
      g.addColorStop(0, `rgba(205,245,255,${fade * 0.85})`);
      g.addColorStop(0.4, `rgba(${p.color},${fade * 0.5})`);
      g.addColorStop(1, `rgba(${p.color},0)`);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.fillRect(x - r, p.y - r, r * 2, r * 2);
      break;
    }
    case "smoke": {
      const r = p.size * (1 + t * 3.5);
      const x = p.x + Math.sin(p.age * 2 + p.seed) * 4;
      const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, r);
      g.addColorStop(0, `rgba(${p.color},${fade * 0.32})`);
      g.addColorStop(1, `rgba(${p.color},0)`);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = g;
      ctx.fillRect(x - r, p.y - r, r * 2, r * 2);
      break;
    }
    case "puff": {
      const r = p.size * (1 + t * 0.6);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(${p.color},${fade * 0.42})`);
      g.addColorStop(1, `rgba(${p.color},0)`);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = g;
      ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
      break;
    }
    case "coin": {
      const squash = Math.abs(Math.cos(p.age * 3 + p.seed));
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.min(1, fade * 1.4);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.max(0.8, p.size * squash), p.size, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${p.color})`;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgb(176,112,0)";
      ctx.stroke();
      ctx.globalAlpha = 1;
      break;
    }
    case "fleck": {
      ctx.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.age * 4 + p.seed);
      ctx.fillStyle = `rgba(${p.color},${fade * 0.9})`;
      ctx.fillRect(-p.size / 2, -0.7, p.size, 1.4);
      ctx.restore();
      break;
    }
    case "spark": {
      // Twinkles: brightness wobbles quickly so each one flickers.
      const a = fade * (0.55 + 0.45 * Math.sin(p.age * 30 + p.seed));
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = `rgba(${p.color},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    default: {
      // ember / mote / dust — a soft dot with a halo.
      const halo = p.size * 3.2;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, halo);
      g.addColorStop(0, `rgba(${p.color},${fade * 0.9})`);
      g.addColorStop(0.35, `rgba(${p.color},${fade * 0.25})`);
      g.addColorStop(1, `rgba(${p.color},0)`);
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = g;
      ctx.fillRect(p.x - halo, p.y - halo, halo * 2, halo * 2);
    }
  }
}

/** Starts the theme's particle effects on `canvas`; returns a stop function. */
export function startStageFx(canvas: HTMLCanvasElement, theme: StageTheme): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  let w = 0;
  let h = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const emitters = EMITTERS[theme];
  const burst = BURSTS[theme];
  const particles: Particle[] = [];
  const carry = emitters.map(() => 0);
  let elapsed = 0;
  let nextBurst = burst ? burst.at : Infinity;
  let last = performance.now();
  let raf = 0;

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    elapsed += dt;

    if (w > 0 && h > 0) {
      emitters.forEach((e, i) => {
        carry[i] += e.rate * dt;
        while (carry[i] >= 1 && particles.length < MAX_PARTICLES) {
          carry[i] -= 1;
          particles.push(base(e.make(w, h)));
        }
        if (carry[i] > 4) carry[i] = 0;
      });
      if (burst && elapsed >= nextBurst) {
        nextBurst += burst.every;
        for (const p of burst.make(w, h)) if (particles.length < MAX_PARTICLES) particles.push(p);
      }
    }

    ctx.clearRect(0, 0, w, h);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles.splice(i, 1);
        continue;
      }
      if (p.drag !== 1) {
        const k = Math.pow(p.drag, dt);
        p.vx *= k;
        p.vy *= k;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      draw(ctx, p);
    }
    ctx.globalCompositeOperation = "source-over";
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
  };
}
