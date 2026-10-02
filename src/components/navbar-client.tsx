"use client";

// The interactive pieces of the navbar (see navbar.tsx for the server shell
// that composes them). Styles live in navbar.css.
//
// The signature motion is the "inchworm" indicator: when the active item
// changes, the pill's leading edge sets off first and the trailing edge
// follows a beat later, so it stretches toward the destination and snaps
// back — Avance, advance. It's two independently transitioned insets
// (`left`/`right`) whose delays swap with the direction of travel; no JS
// animation loop, just one measurement per change.
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { logoutAction } from "@/actions/auth";
import {
  BellIcon,
  BookIcon,
  ChevronDownIcon,
  HomeIcon,
  SignOutIcon,
  SmileIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/nav-icons";

type NavItem = { href: string; label: string; icon: typeof HomeIcon; match: string[] };

// Organisations/Habits/To-Do/Focus/Study are reached via the tiles on the
// /dashboard itself, so they stay out of the nav — but they light up "Home",
// since that's where you opened them from.
const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Home",
    icon: HomeIcon,
    match: ["/dashboard", "/habits", "/todos", "/focus", "/study", "/how-to-use", "/organisations"],
  },
  { href: "/leaderboard", label: "Leaderboard", icon: TrophyIcon, match: ["/leaderboard"] },
  { href: "/profile", label: "Profile", icon: UserIcon, match: ["/profile"] },
];

// Inside the School section the same three slots point at that profile's
// own pages: a kid's (URL carries the kid id) or the staff side.
function getNavItems(pathname: string): NavItem[] {
  const kid = pathname.match(/^\/school\/kid\/([^/]+)/);
  if (kid) {
    const base = `/school/kid/${kid[1]}`;
    return [
      { href: base, label: "Home", icon: HomeIcon, match: [base] },
      { href: `${base}/leaderboard`, label: "Leaderboard", icon: TrophyIcon, match: [`${base}/leaderboard`] },
      { href: `${base}/profile`, label: "Profile", icon: UserIcon, match: [`${base}/profile`] },
    ];
  }
  if (pathname.startsWith("/school/staff")) {
    return [
      { href: "/school/staff", label: "Home", icon: HomeIcon, match: ["/school/staff"] },
      { href: "/school/staff/leaderboard", label: "Leaderboard", icon: TrophyIcon, match: ["/school/staff/leaderboard"] },
      { href: "/profile", label: "Profile", icon: UserIcon, match: ["/profile"] },
    ];
  }
  return NAV_ITEMS;
}

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Longest matching prefix wins, so /school/kid/x/leaderboard lights
// "Leaderboard" rather than the kid's "Home".
function findActiveIndex(items: NavItem[], pathname: string) {
  let best = -1;
  let bestLength = -1;
  items.forEach((item, index) => {
    for (const prefix of item.match) {
      if (isUnder(pathname, prefix) && prefix.length > bestLength) {
        best = index;
        bestLength = prefix.length;
      }
    }
  });
  return best;
}

// Plain left click only — a cmd/ctrl/shift click opens a new tab, and the
// current page's indicator shouldn't move for that.
function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

/**
 * The active item, derived from the route — plus an optimistic override the
 * moment an item is clicked, so the indicator sets off immediately instead
 * of waiting for the next page's server render. The override is dropped as
 * soon as the pathname changes (adjusting state during render, not in an
 * effect: https://react.dev/learn/you-might-not-need-an-effect).
 */
function useActiveIndex(items: NavItem[]) {
  const pathname = usePathname();
  const [pending, setPending] = useState<number | null>(null);
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setPending(null);
  }
  return [pending ?? findActiveIndex(items, pathname), setPending] as const;
}

type Travel = "snap" | "forward" | "back";

function navItems(track: HTMLElement) {
  return track.querySelectorAll<HTMLElement>("[data-nav-item]");
}

// Moves a pill (absolutely positioned inside `track`) over `target`. "snap"
// jumps there with transitions suppressed; "forward"/"back" let the CSS
// transitions run with the inchworm delay for that direction.
function moveBlob(blob: HTMLElement, track: HTMLElement, target: HTMLElement, travel: Travel) {
  const left = target.offsetLeft;
  const right = track.clientWidth - left - target.offsetWidth;
  if (travel === "snap") {
    blob.style.transition = "none";
    blob.style.left = `${left}px`;
    blob.style.right = `${right}px`;
    void blob.offsetWidth; // commit the jump before transitions come back
    blob.style.transition = "";
    delete blob.dataset.travel;
  } else {
    blob.dataset.travel = travel;
    blob.style.left = `${left}px`;
    blob.style.right = `${right}px`;
  }
  blob.style.opacity = "1";
}

// Keeps the active pill over the active item: animates on changes, snaps on
// first paint and whenever the track resizes (web fonts landing, crossing
// a breakpoint, the capsule narrowing on scroll).
function useIndicator(active: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<HTMLSpanElement>(null);
  const shownRef = useRef<number | null>(null);

  const sync = useCallback(
    (animate: boolean) => {
      const track = trackRef.current;
      const blob = blobRef.current;
      if (!track || !blob) return;
      const target = active >= 0 ? navItems(track)[active] : undefined;
      if (!target) {
        blob.style.opacity = "0";
        shownRef.current = null;
        return;
      }
      const shown = shownRef.current;
      moveBlob(blob, track, target, !animate || shown === null ? "snap" : active > shown ? "forward" : "back");
      shownRef.current = active;
    },
    [active]
  );

  const syncRef = useRef(sync);
  useLayoutEffect(() => {
    syncRef.current = sync;
    sync(true);
  }, [sync]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(() => syncRef.current(false));
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  return { trackRef, blobRef };
}

/**
 * The sticky header wrapper. Adds `data-scrolled` once the page moves (the
 * capsule narrows and lifts) and `data-hidden` while scrolling down past the
 * first screenful (it slides away, and comes back on any scroll up). It
 * never hides while the account menu is open or keyboard focus is inside it.
 */
export function NavShell({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      header.toggleAttribute("data-scrolled", y > 8);
      const dy = y - lastY;
      if (Math.abs(dy) < 6) return;
      const pinned = header.querySelector(".nav-account[data-open], :focus-visible");
      header.toggleAttribute("data-hidden", dy > 0 && y > 160 && !pinned);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // A new page always starts with the header in view.
  useEffect(() => {
    headerRef.current?.removeAttribute("data-hidden");
  }, [pathname]);

  return (
    <header ref={headerRef} className="nav-header">
      {children}
    </header>
  );
}

/** Desktop links: inchworm active pill, plus a soft ghost pill that follows the pointer. */
export function NavLinks() {
  const items = getNavItems(usePathname());
  const [active, setActive] = useActiveIndex(items);
  const { trackRef, blobRef } = useIndicator(active);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const ghostIndexRef = useRef(-1);

  const showGhost = (index: number) => {
    const track = trackRef.current;
    const ghost = ghostRef.current;
    const target = track && navItems(track)[index];
    if (!track || !ghost || !target) return;
    const from = ghostIndexRef.current;
    moveBlob(ghost, track, target, from < 0 ? "snap" : index > from ? "forward" : "back");
    ghostIndexRef.current = index;
  };

  const hideGhost = () => {
    if (ghostRef.current) ghostRef.current.style.opacity = "0";
    ghostIndexRef.current = -1;
  };

  return (
    <nav aria-label="Primary" className="nav-links">
      <div ref={trackRef} className="nav-links__track" onPointerLeave={hideGhost}>
        <span ref={ghostRef} className="nav-blob nav-blob--ghost" aria-hidden />
        <span ref={blobRef} className="nav-blob nav-blob--active" aria-hidden />
        {items.map((item, index) => {
          const isActive = index === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-nav-item
              data-active={isActive || undefined}
              aria-current={isActive ? "page" : undefined}
              className="nav-links__item nav-enter"
              style={{ "--d": index } as CSSProperties}
              onPointerEnter={() => showGhost(index)}
              onClick={(e) => isPlainClick(e) && setActive(index)}
            >
              <item.icon className="nav-links__icon" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Mobile: a floating dock at the bottom of the screen, within thumb reach. */
export function MobileDock() {
  const items = getNavItems(usePathname());
  const [active, setActive] = useActiveIndex(items);
  const { trackRef, blobRef } = useIndicator(active);

  return (
    <nav aria-label="Primary" className="nav-dock">
      <div ref={trackRef} className="nav-dock__track">
        <span ref={blobRef} className="nav-blob nav-blob--active" aria-hidden />
        {items.map((item, index) => {
          const isActive = index === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-nav-item
              data-active={isActive || undefined}
              aria-current={isActive ? "page" : undefined}
              className="nav-dock__item"
              onClick={(e) => isPlainClick(e) && setActive(index)}
            >
              <item.icon className="nav-dock__icon" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Avatar button that opens a small account panel (a disclosure, not an ARIA
 * menu — it's a handful of links and one button, reachable with Tab). Closes
 * on outside press, Escape, or navigation. Sign out lives here now rather
 * than as a bare button in the bar.
 */
export function AccountMenu({ name, avatar }: { name: string | null; avatar: ReactNode }) {
  const pathname = usePathname();
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (pathname !== seenPathname) {
    setSeenPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const links = [
    { href: "/profiles", label: "Switch profile", icon: UserIcon },
    { href: "/profile", label: "Your profile", icon: UserIcon },
    { href: "/profile/avatar", label: "Customize avatar", icon: SmileIcon },
    { href: "/notifications", label: "Notifications", icon: BellIcon },
    { href: "/how-to-use", label: "How to use", icon: BookIcon },
  ];

  return (
    <div ref={rootRef} className="nav-account nav-enter" style={{ "--d": 1 } as CSSProperties} data-open={open || undefined}>
      <button
        ref={buttonRef}
        type="button"
        className="nav-account__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Account"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nav-account__avatar">{avatar}</span>
        {name && <span className="nav-account__name">{name}</span>}
        <ChevronDownIcon className="nav-account__chevron" />
      </button>

      <div id={panelId} className="nav-menu">
        <div className="nav-menu__head">
          <span className="nav-account__avatar">{avatar}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name ?? "Your account"}</p>
            <p className="text-xs text-muted">Signed in</p>
          </div>
        </div>
        {links.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className="nav-menu__item"
            style={{ "--i": i } as CSSProperties}
            onClick={() => setOpen(false)}
          >
            <link.icon className="nav-menu__icon" />
            {link.label}
          </Link>
        ))}
        <div className="nav-menu__divider" />
        <form action={logoutAction}>
          <button
            type="submit"
            className="nav-menu__item nav-menu__item--danger"
            style={{ "--i": links.length } as CSSProperties}
          >
            <SignOutIcon className="nav-menu__icon" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
