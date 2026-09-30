"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { BRAND_TAGLINE, MARK_FRAME_PATHS, MARK_PATHS, MARK_VIEWBOX } from "@/lib/brand";
import {
  CHECKPOINTS,
  GATE_AT,
  clamp01,
  easeOutCubic,
  lerp,
  pathY,
  smoothstep,
  type Stage,
} from "./forward-field-scene";

/**
 * The landing hero: a pinned stage (the section is ~2.8 screens tall, the
 * stage sticks for the whole run) with one three.js canvas behind the copy.
 *
 *   top      the Avance lockup over a calm field of › chevrons — the logo's
 *            own arrow — streaming through faint checkpoint gates. A few lag
 *            behind in amber; the cursor pulls them back into the flow.
 *   scroll   the lockup's arrow shoots forward and the letters scatter; the
 *            field speeds up with scroll velocity while its lanes fold into a
 *            single path; the gates become five checkpoint nodes that burst
 *            (+XP) as a progress front lights them, ending in "Quest complete".
 *
 * One rAF loop reads the scroll position and drives both the WebGL scene
 * (forward-field-scene.ts) and the DOM — styles are written only when they
 * change, React never re-renders while scrolling, and the loop sleeps while
 * the hero is off-screen. three.js loads lazily after first paint; without
 * WebGL the stage keeps its CSS panel and the scroll-driven copy still works.
 * Reduced motion gets a still field that only redraws on scroll.
 */

const STAGE_BG = [
  "radial-gradient(120% 70% at 50% 118%, rgba(88,80,236,0.22) 0%, rgba(88,80,236,0) 60%)",
  "radial-gradient(55% 45% at 88% 12%, rgba(139,133,255,0.07) 0%, rgba(139,133,255,0) 70%)",
  "#0a0b10",
].join(", ");

const NAME = "Avance";
const PATH_HEADLINE = ["Always", "know", "what's", "next."];
const XP = [50, 50, 50, 50, 120];
const EASE_OUT = "cubic-bezier(.2,.7,.2,1)";

// Scroll-phase timings (c = 0 → 1 across the pinned run).
const heroTextVisibility = (c: number) => 1 - smoothstep(0.02, 0.2, c);
const pathCopyVisibility = (c: number) => smoothstep(0.46, 0.62, c);
const questProgress = (c: number) => clamp01((c - 0.64) / 0.28);

export function ForwardFieldHero({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stageEl = stageRef.current;
    const host = hostRef.current;
    if (!section || !stageEl || !host) return;

    const one = <T extends Element = HTMLElement>(name: string) => stageEl.querySelector(`[data-el="${name}"]`) as T;
    const all = <T extends Element = HTMLElement>(name: string) =>
      Array.from(stageEl.querySelectorAll(`[data-el="${name}"]`)) as T[];
    const scrim = one("scrim");
    const content = one("content");
    const lockupWrap = one("lockup-wrap");
    const lockup = one("lockup");
    const markFrame = one<SVGGElement>("mark-frame");
    const markArrow = one<SVGGElement>("mark-arrow");
    const letters = all("letter");
    const tagline = one("tagline");
    const copy = one("copy");
    const pathCopy = one("path-copy");
    const eyebrow = one("path-eyebrow");
    const words = all("path-word");
    const pathSub = one("path-sub");
    const nodes = all("node");
    const xps = all("xp");
    const labels = all("label");
    const chip = one("chip");
    const chipBox = one("chip-box");
    const chipText = one("chip-text");
    const dots = all("dot");
    const cue = one("cue");

    // Style writes are cached so an unchanged value never touches the DOM.
    const written = new WeakMap<Element, Map<string, string>>();
    const css = (el: HTMLElement | SVGElement, prop: string, value: string) => {
      let m = written.get(el);
      if (!m) written.set(el, (m = new Map()));
      if (m.get(prop) === value) return;
      m.set(prop, value);
      el.style.setProperty(prop, value);
    };
    const n3 = (v: number) => v.toFixed(3);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stage: Stage = { w: 1, h: 1, cy: 0, spread: 0, pathMid: 0, pathAmp: 0, gateX: [] };
    const mask = { x: 0, y: 0, rx: 1, ry: 1 };
    const pointer = { x: -9999, y: -9999, target: 0, hover: 0 };
    const tilt = { x: 0, y: 0 };

    let disposed = false;
    let raf = 0;
    let inView = true;
    let last = performance.now();
    let t = 0;
    let c = 0;
    let warp = 0;
    let lastScrollY = window.scrollY;
    let launchedAt = -1; // wall-clock seconds
    let chipIndex = -1;
    const popped = CHECKPOINTS.map(() => false);
    // Adaptive quality: a running average of frame time; while it stays slow
    // the scene steps down (resolution, then chevron count, then 30fps).
    let frameMs = 16.7;
    let qualityLevel = 0;
    let qualityCheckedAt = 0;
    let glReadyAt = -1;
    let skipFrame = false;
    // Paused while a navigation is starting, so the next page gets the main
    // thread instead of competing with this loop (see onNavigate).
    let suspended = false;
    let resumeTimer = 0;
    let gl: ReturnType<typeof import("./forward-field-scene").createForwardField> | null = null;

    const layout = () => {
      stage.w = Math.max(1, stageEl.clientWidth);
      stage.h = Math.max(1, stageEl.clientHeight);
      stage.cy = stage.h * 0.52;
      stage.spread = stage.h * 0.34;
      stage.pathMid = stage.h * 0.58;
      stage.pathAmp = stage.h * 0.055;
      stage.gateX = GATE_AT.map((f) => f * stage.w);

      const sr = stageEl.getBoundingClientRect();
      const cr = content.getBoundingClientRect();
      mask.x = cr.left - sr.left + cr.width / 2;
      mask.y = cr.top - sr.top + cr.height / 2;
      mask.rx = Math.max(120, cr.width * 0.62);
      mask.ry = Math.max(80, cr.height * 0.7);

      nodes.forEach((el, i) => {
        const x = stage.gateX[i];
        el.style.left = `${x}px`;
        el.style.top = `${pathY(stage, x)}px`;
      });
      gl?.layout();
    };

    const completeCheckpoint = (i: number) => {
      if (reduced) return;
      gl?.burst(i, i === CHECKPOINTS.length - 1);
      xps[i]?.animate(
        [
          { opacity: 0, transform: "translateY(8px) scale(0.8)" },
          { opacity: 1, transform: "translateY(-4px) scale(1.05)", offset: 0.22 },
          { opacity: 1, transform: "translateY(-10px) scale(1)", offset: 0.7 },
          { opacity: 0, transform: "translateY(-28px) scale(1)" },
        ],
        { duration: 1500, easing: EASE_OUT },
      );
      labels[i]?.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.16)", offset: 0.35 }, { transform: "scale(1)" }],
        { duration: 550, easing: EASE_OUT },
      );
    };

    const frame = (now: number) => {
      raf = 0;
      if (disposed || suspended) return;
      // Lowest quality level: draw every other frame.
      if (qualityLevel >= 3 && !reduced && (skipFrame = !skipFrame)) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const rawMs = Math.min(100, now - last);
      const dt = Math.min(0.05, rawMs / 1000);
      last = now;
      const wall = now / 1000;
      if (!reduced) t += dt;

      if (gl && !reduced && glReadyAt >= 0 && wall - glReadyAt > 1.5 && qualityLevel < 3) {
        frameMs += (rawMs - frameMs) * 0.08;
        if (frameMs > 24 && wall - qualityCheckedAt > 2) {
          qualityCheckedAt = wall;
          qualityLevel++;
          if (qualityLevel < 3) gl.setQuality(qualityLevel);
          frameMs = 16.7;
        }
      }

      // Scroll position and velocity.
      const rect = section.getBoundingClientRect();
      const run = rect.height - window.innerHeight;
      const target = run > 0 ? clamp01(-rect.top / run) : 0;
      c = reduced ? target : c + (target - c) * (1 - Math.exp(-dt * 7));
      const sy = window.scrollY;
      const velocity = Math.abs(sy - lastScrollY) / Math.max(dt, 1 / 240);
      lastScrollY = sy;
      const warpTarget = reduced ? 0 : clamp01(velocity / 2200);
      warp += (warpTarget - warp) * (1 - Math.exp(-dt * (warpTarget > warp ? 10 : 2.5)));
      pointer.hover += (pointer.target - pointer.hover) * (1 - Math.exp(-dt * 5));

      const since = launchedAt < 0 ? -1 : wall - launchedAt;
      const fade = reduced ? (since < 0 ? 0 : 1) : since < 0 ? 0 : easeOutCubic(clamp01(since / 1.6));
      const launchBoost = reduced || since < 0 ? 1 : 1 + 2.4 * (1 - easeOutCubic(clamp01(since / 2.4)));

      // --- Hero lockup + copy: exit choreography ---
      const textVis = heroTextVisibility(c);
      const s1 = smoothstep(0, 0.22, c);
      css(content, "visibility", textVis < 0.01 ? "hidden" : "visible");
      css(scrim, "opacity", n3(textVis));

      const tiltAmt = pointer.hover * (1 - s1);
      tilt.x += ((pointer.y / stage.h - 0.5) * -8 * tiltAmt - tilt.x) * (1 - Math.exp(-dt * 6));
      tilt.y += ((pointer.x / stage.w - 0.5) * 12 * tiltAmt - tilt.y) * (1 - Math.exp(-dt * 6));
      css(lockupWrap, "transform", `translate3d(0, ${(-60 * s1).toFixed(1)}px, 0) scale(${n3(1 - 0.1 * s1)})`);
      css(lockup, "transform", `rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`);
      letters.forEach((el, i) => {
        const out = smoothstep(0.03 + i * 0.016, 0.15 + i * 0.016, c);
        css(el, "opacity", n3(1 - out));
        css(el, "transform", `translate3d(0, ${(-out * (24 + i * 12)).toFixed(1)}px, 0) rotate(${((i - 2.5) * out * 8).toFixed(2)}deg)`);
      });
      // Avance → advance: the arrow leaves the mark first.
      const fly = smoothstep(0.015, 0.14, c);
      css(markArrow, "transform", `translate(${(fly * fly * 140).toFixed(1)}px, 0px)`);
      css(markArrow, "opacity", n3(1 - smoothstep(0.08, 0.14, c)));
      css(markFrame, "opacity", n3(1 - smoothstep(0.1, 0.2, c)));
      css(tagline, "opacity", n3(1 - smoothstep(0.02, 0.1, c)));
      css(copy, "opacity", n3(1 - smoothstep(0.02, 0.12, c)));
      css(copy, "transform", `translate3d(0, ${(-100 * s1).toFixed(1)}px, 0)`);

      const cueIn = since < 0 ? 0 : reduced ? 1 : smoothstep(1.1, 1.8, since);
      const cueVis = cueIn * (1 - smoothstep(0, 0.035, c));
      css(cue, "opacity", n3(cueVis));
      // Until the stage pins, the navbar above pushes its bottom edge below
      // the fold — lift the cue by that much so it's always on screen.
      const hiddenBelow = Math.max(0, Math.max(rect.top, 0) + stage.h - window.innerHeight);
      css(cue, "transform", `translate3d(0, ${(-hiddenBelow).toFixed(1)}px, 0)`);
      css(cue, "pointer-events", cueVis > 0.2 ? "auto" : "none");

      // --- Path phase copy: scroll-scrubbed word reveal ---
      const copyVis = pathCopyVisibility(c);
      css(pathCopy, "visibility", c < 0.4 ? "hidden" : "visible");
      css(eyebrow, "opacity", n3(smoothstep(0.42, 0.5, c)));
      words.forEach((el, i) => {
        const v = smoothstep(0.44 + i * 0.025, 0.54 + i * 0.025, c);
        css(el, "opacity", n3(v));
        css(el, "transform", `translate3d(0, ${((1 - v) * 28).toFixed(1)}px, 0)`);
      });
      css(pathSub, "opacity", n3(smoothstep(0.54, 0.62, c)));

      // --- Checkpoints ---
      const p = questProgress(c);
      const gx = stage.gateX;
      const progressX = lerp(gx[0] - 70, gx[gx.length - 1] + 70, p);
      const fills = gx.map((x) => smoothstep(x - 36, x + 6, progressX));
      let current = fills.findIndex((f) => f < 0.5);
      if (current === -1) current = CHECKPOINTS.length;

      fills.forEach((f, i) => {
        if (f >= 0.5 && !popped[i]) {
          popped[i] = true;
          completeCheckpoint(i);
        } else if (f < 0.25) {
          popped[i] = false;
        }
      });
      nodes.forEach((el, i) => {
        const lit = Math.max(fills[i], i === current ? 0.6 : 0);
        css(el, "opacity", n3(copyVis * lerp(0.4, 1, lit)));
      });
      css(chip, "opacity", n3(copyVis));
      if (current !== chipIndex) {
        chipIndex = current;
        const done = current >= CHECKPOINTS.length;
        chipText.textContent = done
          ? `Quest complete · +${XP.reduce((a, b) => a + b, 0)} XP`
          : `Next up · ${CHECKPOINTS[current]}`;
        chipBox.dataset.done = String(done);
        dots.forEach((d, i) => {
          d.dataset.state = done ? "done" : i < current ? "lit" : i === current ? "current" : "todo";
        });
      }

      gl?.render({
        t,
        dt,
        c,
        fade,
        speedMul: launchBoost * (1 + warp * 4),
        warp,
        textVis,
        progressX,
        fills,
        current,
        pointer,
        mask,
        reduced,
      });

      if (!reduced && inView && !suspended) raf = requestAnimationFrame(frame);
    };

    const requestFrame = () => {
      if (!raf && !disposed && !suspended) raf = requestAnimationFrame(frame);
    };

    // A same-site link click (the navbar, the hero buttons) or a form submit
    // (Sign out) means we're about to leave: stop drawing so the navigation
    // isn't starved of main-thread time. If we're still here a few seconds
    // later (navigation cancelled or failed), carry on.
    const suspend = () => {
      suspended = true;
      cancelAnimationFrame(raf);
      raf = 0;
      window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        suspended = false;
        last = performance.now();
        requestFrame();
      }, 4000);
    };
    const onNavigate = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.origin !== location.origin) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      suspend();
    };
    document.addEventListener("click", onNavigate, true);
    document.addEventListener("submit", suspend, true);

    // --- Listeners ---
    const onPointer = (e: PointerEvent) => {
      const r = stageEl.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      const inside = pointer.x >= 0 && pointer.y >= 0 && pointer.x <= r.width && pointer.y <= r.height;
      pointer.target = inside && !reduced ? 1 : 0;
    };
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") pointer.target = 0;
    };
    const onLeave = () => (pointer.target = 0);
    const onScroll = () => reduced && requestFrame();

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerup", onPointerEnd, { passive: true });
    window.addEventListener("pointercancel", onPointerEnd, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });

    const cueButton = cue.querySelector("button");
    const onCue = () => {
      const run = section.offsetHeight - window.innerHeight;
      const top = section.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + run * 0.97, behavior: reduced ? "auto" : "smooth" });
    };
    cueButton?.addEventListener("click", onCue);

    const resizeObserver = new ResizeObserver(() => {
      layout();
      requestFrame();
    });
    resizeObserver.observe(stageEl);

    const viewObserver = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) {
        last = performance.now();
        requestFrame();
      }
    });
    viewObserver.observe(section);

    // Entrance for loads where the intro didn't play (when it does, the
    // intro's lockup glides onto this one instead — see IntroOverlay).
    const entrance = () => {
      if (reduced) return;
      const opts = (delay: number, duration = 520, easing = EASE_OUT): KeyframeAnimationOptions => ({
        delay,
        duration,
        easing,
        fill: "backwards",
      });
      markFrame.animate([{ opacity: 0, transform: "scale(0.9)" }, { opacity: 1, transform: "none" }], opts(100, 700));
      markArrow.animate(
        [{ opacity: 0, transform: "translate(-36px, 0px)" }, { opacity: 1, transform: "translate(0px, 0px)" }],
        opts(420, 650, "cubic-bezier(.34,1.56,.64,1)"),
      );
      letters.forEach((el, i) =>
        el.animate([{ opacity: 0, transform: "translateY(-10px)" }, { opacity: 1, transform: "none" }], opts(300 + i * 70, 420)),
      );
      tagline.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], opts(800, 600));
      copy.animate([{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }], opts(950, 750));
    };

    // The field launches as the intro hands off (or straight away when the
    // intro isn't playing this load).
    const html = document.documentElement;
    const launch = (withEntrance: boolean) => {
      if (launchedAt >= 0) return;
      launchedAt = performance.now() / 1000;
      if (withEntrance) entrance();
      requestFrame();
    };
    let introObserver: MutationObserver | null = null;
    if (html.getAttribute("data-intro") === "play") {
      introObserver = new MutationObserver(() => {
        if (html.getAttribute("data-intro") !== "play") {
          introObserver?.disconnect();
          launch(false);
        }
      });
      introObserver.observe(html, { attributes: true, attributeFilter: ["data-intro"] });
    } else {
      launch(true);
    }

    layout();
    requestFrame();

    import("./forward-field-scene")
      .then(async (scene) => {
        const THREE = await import("three");
        if (disposed) return;
        try {
          gl = scene.createForwardField(THREE, host, stage);
          glReadyAt = performance.now() / 1000;
          layout();
          requestFrame();
        } catch (error) {
          console.warn("Hero field unavailable, keeping the static panel:", error);
        }
      })
      .catch((error) => console.warn("Hero field failed to load:", error));

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      cueButton?.removeEventListener("click", onCue);
      document.removeEventListener("click", onNavigate, true);
      document.removeEventListener("submit", suspend, true);
      window.clearTimeout(resumeTimer);
      resizeObserver.disconnect();
      viewObserver.disconnect();
      introObserver?.disconnect();
      gl?.dispose();
      gl = null;
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[280vh] bg-[#0a0b10]">
      <div ref={stageRef} className="sticky top-0 isolate h-[100svh] overflow-hidden" style={{ background: STAGE_BG }}>
        <div ref={hostRef} className="pointer-events-none absolute inset-0" aria-hidden />
        <div
          data-el="scrim"
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 46% 36% at 50% 52%, rgba(10,11,16,0.72) 0%, rgba(10,11,16,0) 100%)",
          }}
          aria-hidden
        />

        {/* Hero: the lockup (same proportions as the intro's, so the intro
            can glide onto it) over the page's copy. */}
        <div className="relative z-10 flex h-full items-center justify-center px-4 pt-14">
          <div data-el="content" className="mx-auto max-w-5xl text-center">
            <div
              data-el="lockup-wrap"
              className="mb-7 flex justify-center sm:mb-9 [perspective:900px]"
              style={{ "--m": "clamp(64px, 12vmin, 120px)" } as CSSProperties}
            >
              <h1
                data-el="lockup"
                data-hero-lockup
                className="flex items-center [transform-style:preserve-3d]"
                style={{ gap: "calc(var(--m) * 0.153)" }}
              >
                <svg
                  data-hero-mark
                  viewBox={MARK_VIEWBOX}
                  className="shrink-0 overflow-visible"
                  style={{
                    width: "var(--m)",
                    height: "var(--m)",
                    filter: "drop-shadow(0 0 12px rgba(139,133,255,0.45))",
                  }}
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="hero-ink" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#a9a4ff" />
                      <stop offset="1" stopColor="#5850ec" />
                    </linearGradient>
                  </defs>
                  <g data-el="mark-frame" fill="url(#hero-ink)" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                    {MARK_FRAME_PATHS.map((d) => (
                      <path key={d} d={d} />
                    ))}
                  </g>
                  <g data-el="mark-arrow">
                    <g className="hero-arrow-idle">
                      <path d={MARK_PATHS.arrow} fill="#c9c6ff" />
                    </g>
                  </g>
                </svg>
                <span className="flex flex-col items-start">
                  <span
                    className="relative font-typewriter leading-none text-[#dedbf7]"
                    style={{ fontSize: "calc(var(--m) * 0.676)", textShadow: "0 0 24px rgba(139,133,255,0.35)" }}
                  >
                    <span className="sr-only">{NAME}</span>
                    <span aria-hidden>
                      {NAME.split("").map((ch, i) => (
                        <span key={i} data-el="letter" className="inline-block">
                          {ch}
                        </span>
                      ))}
                    </span>
                    <span aria-hidden className="hero-shine pointer-events-none absolute inset-0 text-transparent">
                      {NAME.split("").map((ch, i) => (
                        <span key={i} className="inline-block">
                          {ch}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span
                    data-el="tagline"
                    className="mt-[0.6em] whitespace-nowrap font-sans tracking-[0.16em] text-[#edeef3]/60 sm:tracking-[0.28em]"
                    style={{ fontSize: "max(10px, calc(var(--m) * 0.112))" }}
                  >
                    {BRAND_TAGLINE}
                  </span>
                </span>
              </h1>
            </div>
            <div data-el="copy">{children}</div>
          </div>
        </div>

        {/* Path phase copy. */}
        <div
          data-el="path-copy"
          className="pointer-events-none absolute inset-x-0 top-[16%] z-10 px-4 text-center"
          style={{ visibility: "hidden" }}
        >
          <p data-el="path-eyebrow" className="text-xs tracking-[0.28em] text-[#b9b5ff]/80" style={{ opacity: 0 }}>
            Your quest, in checkpoints
          </p>
          <h2 className="mt-3 text-3xl leading-[1.1] text-white sm:text-5xl">
            {PATH_HEADLINE.map((word, i) => (
              <span key={word} data-el="path-word" className="inline-block" style={{ opacity: 0 }}>
                {word}
                {i < PATH_HEADLINE.length - 1 && " "}
              </span>
            ))}
          </h2>
          <p
            data-el="path-sub"
            className="mx-auto mt-4 max-w-xl text-base text-white/65 sm:text-lg"
            style={{ opacity: 0 }}
          >
            Every assignment becomes a path of checkpoints. Each one lights up as you finish it.
          </p>
        </div>

        {/* Checkpoint anchors, positioned on the path nodes. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
          {CHECKPOINTS.map((name, i) => (
            <div key={name} data-el="node" className="absolute" style={{ opacity: 0 }}>
              <span
                data-el="xp"
                className="absolute bottom-[26px] left-0 -translate-x-1/2 whitespace-nowrap font-mono text-xs font-bold text-[#d6d3ff] opacity-0"
                style={{ textShadow: "0 0 12px rgba(139,133,255,0.9)" }}
              >
                +{XP[i]} XP
              </span>
              <span
                data-el="label"
                className="absolute left-0 top-[18px] hidden -translate-x-1/2 whitespace-nowrap text-sm tracking-wide text-white sm:block"
              >
                {name}
              </span>
            </div>
          ))}
        </div>

        <div
          data-el="chip"
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[13%] z-10 flex justify-center"
          style={{ opacity: 0 }}
        >
          <div
            data-el="chip-box"
            className="flex items-center gap-3 rounded-full border border-white/15 bg-[#12141c]/85 px-4 py-2 transition-colors duration-500 data-[done=true]:border-[#34d399]/60"
          >
            <span className="flex gap-1.5">
              {CHECKPOINTS.map((name) => (
                <span
                  key={name}
                  data-el="dot"
                  data-state="todo"
                  className="h-1.5 w-4 rounded-full bg-white/15 transition-colors duration-300 data-[state=current]:bg-[#8b85ff]/45 data-[state=done]:bg-[#34d399] data-[state=lit]:bg-[#8b85ff]"
                />
              ))}
            </span>
            <span data-el="chip-text" className="font-mono text-xs tracking-wide text-white/85">
              Next up · {CHECKPOINTS[0]}
            </span>
          </div>
        </div>

        {/* Scroll cue — also a button that plays the whole quest. */}
        <div
          data-el="cue"
          className="absolute inset-x-0 bottom-6 z-20 flex justify-center sm:bottom-9"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          <button type="button" className="group flex flex-col items-center gap-2 text-white/85 outline-none">
            <span className="rounded-full border border-[#8b85ff]/40 bg-[#8b85ff]/10 px-4 py-1.5 text-xs tracking-[0.18em] shadow-[0_0_24px_rgba(139,133,255,0.25)] transition-colors group-hover:border-[#8b85ff]/70 group-hover:text-white group-focus-visible:ring-2 group-focus-visible:ring-[#8b85ff] sm:text-sm">
              Scroll to begin your quest
            </span>
            <span className="flex flex-col items-center" aria-hidden>
              {[0, 1, 2].map((i) => (
                <svg
                  key={i}
                  viewBox="13 24 38 25"
                  className="hero-cue-arrow -my-1 h-5 w-7 rotate-90 text-[#c9c6ff]"
                  style={{ animationDelay: `${i * 0.16}s`, filter: "drop-shadow(0 0 6px rgba(139,133,255,0.8))" }}
                >
                  <path d={MARK_PATHS.arrow} fill="currentColor" />
                </svg>
              ))}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
