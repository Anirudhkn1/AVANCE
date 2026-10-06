"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Horizontally scrollable map that opens centred on the ship. */
export function VoyageScroll({ focusPct, children }: { focusPct: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth * focusPct) / 100 - el.clientWidth / 2;
  }, [focusPct]);
  return (
    <div ref={ref} className="voyage__scroll">
      {children}
    </div>
  );
}
