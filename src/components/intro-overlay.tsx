"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import {
  BRAND_TAGLINE,
  INTRO_DONE_EVENT,
  INTRO_STORAGE_KEY,
  MARK_FRAME_PATHS,
  MARK_PATHS,
  MARK_VIEWBOX,
} from "@/lib/brand";

// The 5s landing intro. Only runs when the pre-paint gate script in
// layout.tsx flagged <html data-intro="play"> (first load of "/" in a tab);
// otherwise it unmounts on hydration and costs nothing.
//
//   0.0–0.6  a point of light on black
//   0.6–1.7  the A's frame traces itself in light, feet → legs → apex
//   1.7–2.4  the › arrow snaps in as the crossbar; horizontal flash
//   2.4–3.3  ink fills in, mark settles, "Avance" types out, tagline
//   3.3–4.0  one shine sweep
//   4.0–5.0  handoff: the lockup glides onto the hero's identical lockup
//            ([data-hero-mark]) while the cover fades and the hero's › field
//            launches underneath, then crossfades into it. Without a hero
//            lockup on the page it dissolves into dust instead (onto
//            window.__avanceHeroParticles, if a hero publishes them).
//
// Any click / key / wheel skips straight to the handoff. Reduced motion gets a
// ~0.8s fade of the finished lockup instead.

type HeroParticles = {
  glowColor: string | null;
  glowBlur: number;
  particles: { x: number; y: number; size: number; color: string }[];
};

declare global {
  interface Window {
    __avanceHeroParticles?: HeroParticles;
  }
}

const NAME = "Avance";
const HANDOFF_AT = 4.0;
const FLIGHT = 1.0;
const SPARK_RGB = [214, 211, 255] as const;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const parseRgb = (css: string): [number, number, number] => {
  const m = css.match(/\d+/g);
  return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : [255, 255, 255];
};

export function IntroOverlay() {
  const [active, setActive] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    const root = rootRef.current;
    if (html.getAttribute("data-intro") !== "play" || !root) {
      setActive(false);
      return;
    }
    try {
      sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
    } catch {}

    const $ = gsap.utils.selector(root);
    const one = <T extends Element>(name: string) => root.querySelector(`[data-el="${name}"]`) as T;
    const cover = one<HTMLElement>("cover");
    const vignette = one<HTMLElement>("vignette");
    const group = one<HTMLElement>("group");
    const markWrap = one<HTMLElement>("mark-wrap");
    const markSvg = one<SVGSVGElement>("mark");
    const dot = one<HTMLElement>("dot");
    const glow = one<HTMLElement>("glow");
    const flash = one<HTMLElement>("flash");
    const words = one<HTMLElement>("words");
    const nameEl = one<HTMLElement>("name");
    const tagline = one<HTMLElement>("tagline");
    const shineText = one<HTMLElement>("shine-text");
    const shineRect = one<SVGRectElement>("shine-rect");
    const frameFill = one<SVGGElement>("frame-fill");
    const frameLines = one<SVGGElement>("frame-lines");
    const arrow = one<SVGGElement>("arrow");
    const arrowBright = one<SVGPathElement>("arrow-bright");
    const canvas = one<HTMLCanvasElement>("particles");
    const letters = $('[data-el="letter"]');
    const lines = (kind: string) => $(`[data-line="${kind}"]`);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let handoffStarted = false;
    let finished = false;
    let raf = 0;
    let tl: gsap.core.Timeline | null = null;

    const finish = (gather: boolean) => {
      if (finished) return;
      finished = true;
      html.removeAttribute("data-intro");
      window.dispatchEvent(new CustomEvent(INTRO_DONE_EVENT, { detail: { gather } }));
      setActive(false);
    };

    // Mark starts centred on screen; the group slides left as the name types in.
    const centreOffset = () => (words.offsetWidth + parseFloat(getComputedStyle(group).columnGap || "0")) / 2;
    gsap.set(group, { x: centreOffset() });

    const finalState = () => {
      gsap.set(group, { x: 0 });
      gsap.set([dot], { opacity: 0 });
      gsap.set(glow, { opacity: 0.6, scale: 1 });
      gsap.set(vignette, { opacity: 1 });
      gsap.set(frameLines, { opacity: 0 });
      gsap.set(frameFill, { opacity: 1 });
      gsap.set(arrow, { x: 0, opacity: 1 });
      gsap.set(arrowBright, { opacity: 0 });
      gsap.set(letters, { opacity: 1, y: 0 });
      gsap.set(tagline, { opacity: 1, y: 0 });
    };

    // --- Handoff: rasterise the lockup into points, fly them to the hero. ---
    const sampleLockup = () => {
      const mr = markSvg.getBoundingClientRect();
      const nr = nameEl.getBoundingClientRect();
      const left = Math.floor(Math.min(mr.left, nr.left) - 4);
      const top = Math.floor(Math.min(mr.top, nr.top) - 4);
      const w = Math.ceil(Math.max(mr.right, nr.right) - left + 8);
      const h = Math.ceil(Math.max(mr.bottom, nr.bottom) - top + 8);
      const off = document.createElement("canvas");
      off.width = Math.max(1, w);
      off.height = Math.max(1, h);
      const c = off.getContext("2d", { willReadFrequently: true });
      if (!c) return { points: [], box: { left, top, w, h } };

      c.fillStyle = "#fff";
      c.save();
      c.translate(mr.left - left, mr.top - top);
      c.scale(mr.width / 64, mr.height / 64);
      for (const d of Object.values(MARK_PATHS)) c.fill(new Path2D(d));
      c.restore();

      const cs = getComputedStyle(nameEl);
      c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      c.textBaseline = "middle";
      for (const el of letters) {
        const r = el.getBoundingClientRect();
        c.fillText(el.textContent ?? "", r.left - left, r.top - top + r.height / 2);
      }

      const data = c.getImageData(0, 0, off.width, off.height).data;
      const points: { x: number; y: number }[] = [];
      const step = 3;
      for (let y = 0; y < off.height; y += step) {
        for (let x = 0; x < off.width; x += step) {
          if (data[(y * off.width + x) * 4 + 3] > 110) points.push({ x: left + x, y: top + y });
        }
      }
      return { points, box: { left, top, w, h } };
    };

    const makeGlowSprite = (color: string) => {
      const s = document.createElement("canvas");
      s.width = s.height = 32;
      const c = s.getContext("2d")!;
      const g = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      const [r, gg, b] = color.startsWith("#")
        ? [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)]
        : parseRgb(color);
      g.addColorStop(0, `rgba(${r},${gg},${b},0.55)`);
      g.addColorStop(1, `rgba(${r},${gg},${b},0)`);
      c.fillStyle = g;
      c.fillRect(0, 0, 32, 32);
      return s;
    };

    const runParticles = (hero: HeroParticles | undefined) => {
      const { points, box } = sampleLockup();
      const ctx = canvas.getContext("2d");
      if (!ctx || points.length === 0) {
        finish(true);
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.width = Math.floor(vw * dpr);
      canvas.height = Math.floor(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sprite = makeGlowSprite(hero?.glowColor ?? "#8b85ff");
      const cx = box.left + box.w / 2;
      const cy = box.top + box.h / 2;

      // Dust: a share of the lockup's own pixels that just drift apart and fade,
      // so the logo visibly disintegrates rather than simply relocating.
      const dustCount = Math.min(hero ? 900 : 2600, points.length);
      const dust = Array.from({ length: dustCount }, (_, i) => {
        const p = points[Math.floor(hash(i + 1) * points.length)];
        const ang = Math.atan2(p.y - cy, p.x - cx) + (hash(i + 7) - 0.5) * 1.2;
        const dist = 30 + hash(i + 13) * 140;
        return { x: p.x, y: p.y, vx: Math.cos(ang) * dist, vy: Math.sin(ang) * dist - 20, life: 0.55 + hash(i + 3) * 0.4 };
      });

      const flight = (hero?.particles ?? []).map((t, i) => {
        const s = points[Math.floor(hash(i * 3 + 5) * points.length)];
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        const bend = (hash(i + 17) - 0.5) * dist * 0.55;
        const delay = clamp01((s.x - box.left) / box.w) * 0.2 + hash(i + 23) * 0.06;
        return {
          sx: s.x + (hash(i + 29) - 0.5) * 2,
          sy: s.y + (hash(i + 31) - 0.5) * 2,
          qx: (s.x + t.x) / 2 + (-dy / dist) * bend,
          qy: (s.y + t.y) / 2 + (dx / dist) * bend - dist * 0.12,
          tx: t.x,
          ty: t.y,
          delay,
          dur: FLIGHT - 0.02 - delay,
          size: t.size,
          rgb: parseRgb(t.color),
        };
      });

      const start = performance.now();
      const frame = (now: number) => {
        if (cancelled) return;
        const t = (now - start) / 1000;
        ctx.clearRect(0, 0, vw, vh);

        for (const d of dust) {
          const p = clamp01(t / d.life);
          if (p >= 1) continue;
          const e = easeOutCubic(p);
          ctx.globalAlpha = Math.pow(1 - p, 1.4) * 0.9;
          ctx.fillStyle = "rgb(200,196,255)";
          ctx.fillRect(d.x + d.vx * e - 0.8, d.y + d.vy * e - 0.8, 1.6, 1.6);
        }

        for (const f of flight) {
          const p = easeInOutCubic(clamp01((t - f.delay) / f.dur));
          const u = 1 - p;
          const x = u * u * f.sx + 2 * u * p * f.qx + p * p * f.tx;
          const y = u * u * f.sy + 2 * u * p * f.qy + p * p * f.ty;
          const size = 1.6 + (f.size - 1.6) * p;
          const r = Math.round(SPARK_RGB[0] + (f.rgb[0] - SPARK_RGB[0]) * p);
          const g = Math.round(SPARK_RGB[1] + (f.rgb[1] - SPARK_RGB[1]) * p);
          const b = Math.round(SPARK_RGB[2] + (f.rgb[2] - SPARK_RGB[2]) * p);
          ctx.globalAlpha = 0.5;
          ctx.drawImage(sprite, x - size * 2.5, y - size * 2.5, size * 5, size * 5);
          ctx.globalAlpha = 1;
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          if (size <= 2.1) {
            ctx.fillRect(x - size / 2, y - size / 2, size, size);
          } else {
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1;

        if (t >= FLIGHT) {
          // No hero to land on (page still streaming): let it gather itself.
          finish(flight.length === 0);
          return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };

    // The hero shows the same lockup: glide this one onto it (matching the
    // mark's position and size) while the cover fades, then crossfade.
    const glideToHero = () => {
      const heroMark = document.querySelector("[data-hero-mark]");
      const to = heroMark?.getBoundingClientRect();
      if (!to || to.width === 0) return false;
      const from = markSvg.getBoundingClientRect();
      const gr = group.getBoundingClientRect();
      gsap.set(group, {
        transformOrigin: `${from.left - gr.left + from.width / 2}px ${from.top - gr.top + from.height / 2}px`,
      });
      gsap.to(group, {
        x: to.left + to.width / 2 - (from.left + from.width / 2),
        y: to.top + to.height / 2 - (from.top + from.height / 2),
        scale: to.width / from.width,
        duration: 1,
        ease: "power3.inOut",
        onComplete: () => {
          // "settle" keeps the overlay mounted but reveals the hero's lockup
          // underneath (globals.css), so the swap is a crossfade, not a cut.
          html.setAttribute("data-intro", "settle");
          gsap.to(root, { opacity: 0, duration: 0.35, ease: "power1.out", onComplete: () => finish(false) });
        },
      });
      gsap.to(glow, { opacity: 0, duration: 0.6, ease: "power2.out" });
      gsap.to([cover, vignette], { opacity: 0, duration: 0.9, delay: 0.15, ease: "power2.inOut" });
      return true;
    };

    const startHandoff = () => {
      if (handoffStarted || cancelled) return;
      handoffStarted = true;
      tl?.kill();
      finalState();
      html.setAttribute("data-intro", "handoff");
      if (glideToHero()) return;
      const hero = window.__avanceHeroParticles;
      runParticles(hero);
      gsap.set([markWrap, nameEl], { opacity: 0 });
      gsap.to(tagline, { opacity: 0, y: 6, duration: 0.35, ease: "power2.in" });
      gsap.to([cover, vignette], { opacity: 0, duration: 0.85, delay: 0.1, ease: "power2.inOut" });
    };

    const skip = () => {
      if (!handoffStarted) startHandoff();
    };

    const play = () => {
      if (cancelled) return;
      if (reduced) {
        finalState();
        gsap.fromTo(group, { opacity: 0 }, { opacity: 1, duration: 0.25 });
        gsap.to(root, {
          opacity: 0,
          duration: 0.3,
          delay: 0.5,
          onStart: () => html.setAttribute("data-intro", "handoff"),
          onComplete: () => finish(false),
        });
        return;
      }

      gsap.set(group, { x: centreOffset() });
      tl = gsap.timeline({ defaults: { ease: "power3.out" } })
        // 0.0–0.6 — point of light
        .fromTo(vignette, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "sine.out" }, 0)
        .fromTo(dot, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "expo.out" }, 0.05)
        .to(dot, { scale: 0.3, opacity: 0, duration: 0.55, ease: "power2.in" }, 0.6)
        .fromTo(glow, { scale: 0.2, opacity: 0 }, { scale: 1, opacity: 0.55, duration: 1.2, ease: "sine.out" }, 0.5)
        // 0.6–1.7 — the frame traces itself, bottom to top
        .to(lines("foot"), { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut", stagger: 0.07 }, 0.6)
        .to(lines("leg"), { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.09 }, 0.78)
        .to(lines("apex"), { strokeDashoffset: 0, duration: 0.4, ease: "power2.inOut" }, 1.3)
        // 1.7–2.4 — the arrow snaps in; flash on impact
        .fromTo(arrow, { x: -70, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "back.out(2.4)" }, 1.7)
        .fromTo(flash, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: 0.35, ease: "expo.out" }, 1.88)
        .to(flash, { opacity: 0, duration: 0.5, ease: "power2.out" }, 2.0)
        .to(markSvg, { scale: 1.05, duration: 0.12, ease: "power2.out", transformOrigin: "50% 50%" }, 1.88)
        .to(glow, { opacity: 0.95, scale: 1.18, duration: 0.2 }, 1.88)
        // 2.4–3.3 — ink fills, mark settles, name types, tagline
        .to(frameFill, { opacity: 1, duration: 0.55, ease: "sine.inOut" }, 2.35)
        .to(frameLines, { opacity: 0, duration: 0.5, ease: "sine.inOut" }, 2.5)
        .to(arrowBright, { opacity: 0, duration: 0.6, ease: "sine.inOut" }, 2.4)
        .to(markSvg, { scale: 1, duration: 0.9 }, 2.4)
        .to(glow, { opacity: 0.6, scale: 1, duration: 0.9 }, 2.4)
        .to(group, { x: 0, duration: 0.75, ease: "power3.inOut" }, 2.4)
        .fromTo(letters, { opacity: 0, y: -5 }, { opacity: 1, y: 0, duration: 0.06, ease: "none", stagger: 0.075 }, 2.62)
        .fromTo(tagline, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 2.98)
        // 3.3–4.0 — shine sweep across mark, then name
        .fromTo(shineRect, { x: -40 }, { x: 80, duration: 0.65, ease: "power2.inOut" }, 3.3)
        .fromTo(
          shineText,
          { backgroundPosition: "140% 0" },
          { backgroundPosition: "-40% 0", duration: 0.65, ease: "power2.inOut" },
          3.42,
        )
        // 4.0–5.0 — handoff
        .call(startHandoff, [], HANDOFF_AT);
    };

    const skipEvents = ["pointerdown", "keydown", "wheel"] as const;
    skipEvents.forEach((e) => window.addEventListener(e, skip, { passive: true }));

    // Start once the typewriter face is in, so the name never swaps fonts
    // mid-animation — but never hold the black screen for long.
    const fontsReady = document.fonts
      ? document.fonts.load(`40px ${getComputedStyle(nameEl).fontFamily}`).then(() => document.fonts.ready)
      : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1200))]).then(play);

    return () => {
      cancelled = true;
      skipEvents.forEach((e) => window.removeEventListener(e, skip));
      tl?.kill();
      cancelAnimationFrame(raf);
      gsap.killTweensOf([root, cover, vignette, tagline, group]);
    };
  }, []);

  if (!active) return null;

  const hidden = { opacity: 0 };

  return (
    <div ref={rootRef} className="intro-overlay fixed inset-0 z-[1000] overflow-hidden" aria-hidden="true">
      <div data-el="cover" className="absolute inset-0 bg-[#0a0b10]" />
      <div
        data-el="vignette"
        className="absolute inset-0"
        style={{
          ...hidden,
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(88,80,236,0.10) 0%, rgba(10,11,16,0) 60%), radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div data-el="group" className="flex items-center gap-[clamp(14px,2.6vmin,30px)]">
          <div data-el="mark-wrap" className="relative shrink-0 w-[clamp(72px,17vmin,176px)] aspect-square">
            <div
              data-el="glow"
              className="pointer-events-none absolute -inset-[70%] rounded-full"
              style={{
                ...hidden,
                background: "radial-gradient(circle, rgba(139,133,255,0.38) 0%, rgba(88,80,236,0.14) 35%, rgba(88,80,236,0) 65%)",
              }}
            />
            <div
              data-el="flash"
              className="pointer-events-none absolute left-1/2 top-[56%] h-px w-[200vw]"
              style={{
                ...hidden,
                transform: "translateX(-50%) scaleX(0)",
                background:
                  "linear-gradient(90deg, rgba(201,198,255,0) 0%, rgba(201,198,255,0.55) 35%, #ffffff 50%, rgba(201,198,255,0.55) 65%, rgba(201,198,255,0) 100%)",
                boxShadow: "0 0 12px 1px rgba(139,133,255,0.8)",
              }}
            />
            <div
              data-el="dot"
              className="absolute left-1/2 top-1/2 -ml-[3px] -mt-[3px] h-[6px] w-[6px] rounded-full bg-white"
              style={{ ...hidden, boxShadow: "0 0 18px 6px rgba(139,133,255,0.9), 0 0 60px 18px rgba(88,80,236,0.5)" }}
            />
            <svg
              data-el="mark"
              viewBox={MARK_VIEWBOX}
              className="relative h-full w-full overflow-visible"
              style={{ filter: "drop-shadow(0 0 10px rgba(139,133,255,0.45))" }}
            >
              <defs>
                <linearGradient id="intro-ink" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#a9a4ff" />
                  <stop offset="1" stopColor="#5850ec" />
                </linearGradient>
                <linearGradient id="intro-shine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#fff" stopOpacity="0" />
                  <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <filter id="intro-worn" x="-10%" y="-10%" width="120%" height="120%">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="1" />
                </filter>
                <mask id="intro-mark-mask">
                  {Object.values(MARK_PATHS).map((d) => (
                    <path key={d} d={d} fill="#fff" />
                  ))}
                </mask>
              </defs>

              <g data-el="frame-fill" fill="url(#intro-ink)" filter="url(#intro-worn)" style={hidden}>
                {MARK_FRAME_PATHS.map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>

              <g data-el="frame-lines" fill="none" stroke="#dcd9ff" strokeWidth={1.1} strokeLinejoin="round">
                <path d={MARK_PATHS.leftFoot} data-line="foot" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                <path d={MARK_PATHS.rightFoot} data-line="foot" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                <path d={MARK_PATHS.leftLeg} data-line="leg" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                <path d={MARK_PATHS.rightLeg} data-line="leg" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                <path d={MARK_PATHS.apex} data-line="apex" pathLength={1} style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
              </g>

              <g data-el="arrow" style={hidden}>
                <path d={MARK_PATHS.arrow} fill="url(#intro-ink)" filter="url(#intro-worn)" />
                <path data-el="arrow-bright" d={MARK_PATHS.arrow} fill="#eceaff" />
              </g>

              <g mask="url(#intro-mark-mask)">
                <rect data-el="shine-rect" x="-40" y="-10" width="18" height="84" fill="url(#intro-shine)" transform="skewX(-18)" />
              </g>
            </svg>
          </div>

          <div data-el="words" className="flex flex-col items-start">
            <div
              data-el="name"
              className="relative font-typewriter leading-none text-[#dedbf7] text-[clamp(44px,11.5vmin,128px)]"
              style={{ textShadow: "0 0 24px rgba(139,133,255,0.35)" }}
            >
              {NAME.split("").map((ch, i) => (
                <span key={i} data-el="letter" className="inline-block" style={hidden}>
                  {ch}
                </span>
              ))}
              <span
                data-el="shine-text"
                className="pointer-events-none absolute inset-0 text-transparent"
                style={{
                  textShadow: "none",
                  backgroundImage: "linear-gradient(100deg, rgba(255,255,255,0) 40%, #ffffff 50%, rgba(255,255,255,0) 60%)",
                  backgroundSize: "250% 100%",
                  backgroundPosition: "140% 0",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                }}
              >
                {NAME.split("").map((ch, i) => (
                  <span key={i} className="inline-block">
                    {ch}
                  </span>
                ))}
              </span>
            </div>
            <div
              data-el="tagline"
              className="mt-[0.6em] whitespace-nowrap text-[clamp(10px,2vmin,19px)] tracking-[0.16em] sm:tracking-[0.28em] text-[#edeef3]/60"
              style={hidden}
            >
              {BRAND_TAGLINE}
            </div>
          </div>
        </div>
      </div>

      <canvas data-el="particles" className="pointer-events-none absolute inset-0 h-full w-full" />
    </div>
  );
}
