"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";

// How long a navigation can sit "pending" before the bar gives up and clears
// itself — covers a click whose navigation was cancelled by app code, so the
// bar can never hang at the top of the page forever.
const GIVE_UP_AFTER_MS = 15000;

type Phase = "idle" | "start" | "loading" | "done";

/**
 * A thin accent bar across the top of the viewport from the moment a link is
 * clicked until the new route commits.
 *
 * loading.tsx alone can't cover this gap: its fallback only appears once the
 * router has the destination's response, and that response can take seconds
 * to arrive whenever the route isn't prefetched — always the case under
 * `next dev`, which never prefetches and compiles each route on its first
 * visit (see node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md,
 * "Prefetching is only enabled in production"). Without this, the click
 * looks like it did nothing. In production most routes are prefetched and
 * commit almost instantly; the bar's fade-in delay keeps those from flashing.
 *
 * One document-level click listener instead of useLinkStatus, which would
 * need a child component inside every <Link> in the app.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("idle");
  const giveUp = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The destination committed: run the bar out to the end and fade it.
  // Tracked during render rather than in an effect (react.dev, "Adjusting
  // some state when a prop changes").
  const url = `${pathname}?${searchParams}`;
  const [committedUrl, setCommittedUrl] = useState(url);
  if (url !== committedUrl) {
    setCommittedUrl(url);
    if (phase !== "idle") setPhase("done");
  }

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // No defaultPrevented check: <Link> itself calls preventDefault to take
      // over the navigation, so every client-side link click looks prevented.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.hasAttribute("download")) return;
      if (a.target && a.target !== "_self") return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
      // Same page (or only the #hash differs): nothing will load.
      if (url.pathname === location.pathname && url.search === location.search) return;

      setPhase("start");
      clearTimeout(giveUp.current);
      giveUp.current = setTimeout(() => setPhase((p) => (p === "idle" ? p : "done")), GIVE_UP_AFTER_MS);
    };
    // Capture phase, so a handler that stops propagation can't hide the click.
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("click", onClick, true);
      clearTimeout(giveUp.current);
    };
  }, []);

  // "start" pins the bar at 0 with no transition for one frame; "loading"
  // then lets it creep toward 90% — two separate renders so the browser sees
  // a starting value to transition from.
  useEffect(() => {
    if (phase !== "start") return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setPhase("loading")));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("idle"), 450);
    return () => clearTimeout(t);
  }, [phase]);

  const style: CSSProperties =
    phase === "loading"
      ? {
          transform: "scaleX(0.9)",
          opacity: 1,
          // Fast at first, then an ever-slower crawl — reads as "working"
          // without ever claiming to be finished. The short opacity delay
          // hides it entirely on navigations that commit almost instantly.
          transition: "transform 10s cubic-bezier(0.05, 0.75, 0.15, 1), opacity 150ms ease 120ms",
        }
      : phase === "done"
        ? { transform: "scaleX(1)", opacity: 0, transition: "transform 200ms ease-out, opacity 250ms ease 200ms" }
        : { transform: "scaleX(0)", opacity: 0, transition: "none" };

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[1001] h-[3px] origin-left bg-accent shadow-[0_0_8px_var(--accent)]"
      style={style}
    />
  );
}
