"use client";

// A spider web strung across the top-right corner of the screen with a
// garden spider living on it — shown only in the School's student section.
// The simulation is in corner-spider-scene.ts.
//
// Two full-screen canvases paint the same scene: one behind the page
// content (the web shows through the empty space around cards; the spider
// drops down the screen behind them) and one above the nav, clipped to the
// nav's band, so the web still drapes over the menu. Neither takes pointer
// events; touching the spider sends it running off the top of the screen
// for 10 seconds.
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createCornerSpider } from "@/components/corner-spider-scene";
import "./corner-spider.css";

function isStudentSection(pathname: string) {
  return pathname === "/school/kids" || pathname.startsWith("/school/kid/");
}

export function CornerSpider() {
  return isStudentSection(usePathname()) ? <SpiderWeb /> : null;
}

// How far down the screen the nav reaches right now — 0 once it has slid
// away, so nothing is left painted over the page where it was.
function navBand() {
  const header = document.querySelector(".nav-header");
  const capsule = header?.querySelector(".nav-capsule");
  if (!header || !capsule || header.hasAttribute("data-hidden")) return 0;
  return Math.max(0, capsule.getBoundingClientRect().bottom);
}

function SpiderWeb() {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const hitRef = useRef<HTMLSpanElement>(null);
  const shooRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!backRef.current || !frontRef.current || !hitRef.current) return;
    const scene = createCornerSpider(backRef.current, frontRef.current, hitRef.current, navBand);
    shooRef.current = scene.shoo;
    return scene.destroy;
  }, []);

  return (
    <>
      <canvas ref={backRef} className="corner-spider corner-spider--back" aria-hidden />
      <div className="corner-spider corner-spider--front" aria-hidden>
        <canvas ref={frontRef} className="corner-spider__canvas" />
        <span
          ref={hitRef}
          className="corner-spider__hit"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            shooRef.current();
          }}
        />
      </div>
    </>
  );
}
