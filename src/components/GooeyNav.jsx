"use client";

// Rebuilt from scratch — see the header comment in GooeyNav.css for why
// (the original vendored React Bits' blend-mode "gooey" trick, which
// turned out fragile in this layout and was still rendering multi-hue
// particles from the demo's default palette).
//
// This version is intentionally simple: a pill that slides to the active
// item (matching its size/position via getBoundingClientRect, animated
// with a CSS transform transition) and a small burst of dots on click.
// No blur/contrast filters, no mix-blend-mode, nothing that composites
// against anything outside this component — so there's nowhere for an
// off-brand color, or a stray smear, to come from. Every dot and the pill
// itself use `var(--accent)` and nothing else.
//
// Active state is derived from the route via usePathname() (not just
// clicks), so browser back/forward and other links keep it in sync.
import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./GooeyNav.css";

function findActiveIndex(items, pathname) {
  const idx = items.findIndex((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return idx === -1 ? 0 : idx;
}

export default function GooeyNav({ items, particleCount = 10, animationTime = 500 }) {
  const pathname = usePathname();
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const pillRef = useRef(null);
  const burstLayerRef = useRef(null);
  const hasPositionedRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(() => findActiveIndex(items, pathname));
  // Re-derive the active item from the route itself (not just from clicks —
  // also covers browser back/forward, or navigating via some other link)
  // without the extra render an effect-based sync would cost. See
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [syncedPathname, setSyncedPathname] = useState(pathname);
  if (pathname !== syncedPathname) {
    setSyncedPathname(pathname);
    setActiveIndex(findActiveIndex(items, pathname));
  }

  const positionPill = useCallback(() => {
    const container = containerRef.current;
    const list = listRef.current;
    const pill = pillRef.current;
    if (!container || !list || !pill) return;

    const activeLi = list.querySelectorAll("li")[activeIndex];
    if (!activeLi) return;

    const containerRect = container.getBoundingClientRect();
    const liRect = activeLi.getBoundingClientRect();

    if (!hasPositionedRef.current) {
      // Snap into place on first paint instead of animating in from a
      // zero-size pill in the corner.
      pill.style.transition = "none";
      hasPositionedRef.current = true;
      requestAnimationFrame(() => {
        pill.style.transition = "";
      });
    }

    pill.style.width = `${liRect.width}px`;
    pill.style.height = `${liRect.height}px`;
    pill.style.transform = `translate(${liRect.left - containerRect.left}px, ${liRect.top - containerRect.top}px)`;
  }, [activeIndex]);

  useEffect(() => {
    positionPill();

    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(positionPill);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [positionPill]);

  const spawnBurst = useCallback(
    (clientX, clientY) => {
      const container = containerRef.current;
      const layer = burstLayerRef.current;
      if (!container || !layer) return;

      const rect = container.getBoundingClientRect();
      const originX = clientX - rect.left;
      const originY = clientY - rect.top;

      for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.6;
        const distance = 24 + Math.random() * 40;
        const duration = animationTime + Math.random() * 200;

        const dot = document.createElement("span");
        dot.className = "gooey-nav-burst__dot";
        dot.style.left = `${originX}px`;
        dot.style.top = `${originY}px`;
        dot.style.setProperty("--dot-x", `${Math.cos(angle) * distance}px`);
        dot.style.setProperty("--dot-y", `${Math.sin(angle) * distance}px`);
        dot.style.setProperty("--dot-size", `${4 + Math.random() * 4}px`);
        dot.style.setProperty("--dot-opacity", `${0.5 + Math.random() * 0.4}`);
        dot.style.setProperty("--dot-time", `${duration}ms`);

        layer.appendChild(dot);
        setTimeout(() => dot.remove(), duration + 50);
      }
    },
    [animationTime, particleCount]
  );

  const handleClick = (e, index) => {
    const rect = e.currentTarget.getBoundingClientRect();
    spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (activeIndex !== index) setActiveIndex(index);
  };

  return (
    <div className="gooey-nav-container" ref={containerRef}>
      <span className="gooey-nav-pill" ref={pillRef} />
      <nav>
        <ul ref={listRef}>
          {items.map((item, index) => (
            <li key={item.href} className={activeIndex === index ? "active" : ""}>
              <Link href={item.href} onClick={(e) => handleClick(e, index)}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <span className="gooey-nav-burst" ref={burstLayerRef} />
    </div>
  );
}
