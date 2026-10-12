"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import {
  ClipboardIcon,
  FlaskIcon,
  HomeIcon,
  MegaphoneIcon,
  TrophyIcon,
  UserIcon,
} from "@/components/nav-icons";

export function isSchoolsPath(pathname: string) {
  return pathname === "/school" || pathname.startsWith("/school/");
}

/** Main-app chrome (navbar, purple background) that steps aside inside Avance Schools. */
export function OutsideSchools({ children }: { children: ReactNode }) {
  return isSchoolsPath(usePathname()) ? null : children;
}

/**
 * Picks the backdrop scene for the page: a student's pages and a teacher's
 * classroom pages sit in the classroom; everything else looks out over the
 * campus. Both scenes are rendered on the server and passed in.
 */
export function SceneSwitch({ campus, classroom }: { campus: ReactNode; classroom: ReactNode }) {
  const pathname = usePathname();
  const inClass = pathname.startsWith("/school/kid/") || pathname.startsWith("/school/staff/classrooms/");
  return inClass ? classroom : campus;
}

type NavItem = {
  href: string;
  label: string;
  /** Shorter label for the phone dock, where six items share the width. */
  short?: string;
  icon: ComponentType<{ className?: string }>;
  match: string[];
};

/**
 * The section nav for the current page: a student's own pages (the URL carries
 * the kid id) or the staff side. null on the hero, the Who-are-you picker and
 * the student picker, which sit above any one profile.
 */
function navItemsFor(pathname: string): NavItem[] | null {
  const kid = pathname.match(/^\/school\/kid\/([^/]+)/);
  if (kid) {
    const base = `/school/kid/${kid[1]}`;
    return [
      { href: base, label: "Home", icon: HomeIcon, match: [base] },
      { href: `${base}/homework`, label: "Homework", short: "Work", icon: ClipboardIcon, match: [`${base}/homework`] },
      { href: `${base}/announcements`, label: "Announcements", short: "Notices", icon: MegaphoneIcon, match: [`${base}/announcements`] },
      { href: `${base}/elixir`, label: "Elixir", icon: FlaskIcon, match: [`${base}/elixir`] },
      { href: `${base}/leaderboard`, label: "Leaderboard", short: "Ranks", icon: TrophyIcon, match: [`${base}/leaderboard`] },
      { href: `${base}/profile`, label: "Profile", icon: UserIcon, match: [`${base}/profile`] },
    ];
  }
  if (pathname.startsWith("/school/staff")) {
    return [
      {
        href: "/school/staff",
        label: "Home",
        icon: HomeIcon,
        match: ["/school/staff", "/school/staff/classrooms", "/school/staff/admin"],
      },
      { href: "/school/staff/announcements", label: "Announcements", short: "Notices", icon: MegaphoneIcon, match: ["/school/staff/announcements"] },
      { href: "/school/staff/elixir", label: "Elixir", icon: FlaskIcon, match: ["/school/staff/elixir"] },
      { href: "/school/staff/leaderboard", label: "Leaderboard", short: "Ranks", icon: TrophyIcon, match: ["/school/staff/leaderboard"] },
      { href: "/school/staff/profile", label: "Profile", icon: UserIcon, match: ["/school/staff/profile"] },
    ];
  }
  return null;
}

function isUnder(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** Longest matching prefix wins, so /school/kid/x/elixir lights Elixir rather than the kid's Home. */
function activeHref(items: NavItem[], pathname: string) {
  let best: string | null = null;
  let bestLength = -1;
  for (const item of items) {
    for (const prefix of item.match) {
      if (isUnder(pathname, prefix) && prefix.length > bestLength) {
        best = item.href;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/** Section tabs in the top bar (wide screens). */
export function SchoolsTabs() {
  const pathname = usePathname();
  const items = navItemsFor(pathname);
  if (!items) return <span className="flex-1" />;
  const active = activeHref(items, pathname);
  return (
    <nav className="schools-tabs" aria-label="Avance Schools sections">
      {items.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} className="schools-tab" aria-current={href === active ? "page" : undefined}>
          <Icon className="schools-tab__icon" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** The same sections as a dock along the bottom of a phone screen. */
export function SchoolsDock() {
  const pathname = usePathname();
  const items = navItemsFor(pathname);
  if (!items) return null;
  const active = activeHref(items, pathname);
  return (
    <nav className="schools-dock" aria-label="Avance Schools sections" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map(({ href, label, short, icon: Icon }) => (
        <Link key={href} href={href} className="schools-dock__item" aria-current={href === active ? "page" : undefined} aria-label={label}>
          <Icon className="schools-dock__icon" />
          <span>{short ?? label}</span>
        </Link>
      ))}
    </nav>
  );
}

/** Each navigation turns a notebook page — remounting on the path replays the animation. */
export function PageTurn({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className={`schools-page ${navItemsFor(pathname) ? "schools-page--docked" : ""}`}>
      {children}
    </div>
  );
}

/** Student section only: a paper plane or two drifting behind the page. Staff pages stay calm. */
export function ClassroomDoodles() {
  const pathname = usePathname();
  if (pathname !== "/school/kids" && !pathname.startsWith("/school/kid/")) return null;
  return (
    <>
      <PaperPlane className="schools-doodle-plane" />
      <PaperPlane className="schools-doodle-plane schools-doodle-plane--late" />
    </>
  );
}

export function PaperPlane({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 48 32" className={className} style={style} aria-hidden fill="none">
      <path d="M2 15 46 2 30 30 22 19Z" fill="#fffdf7" stroke="#23180c" strokeWidth="2" strokeLinejoin="round" />
      <path d="M46 2 22 19l-2 10 6-7" fill="#e9dfc6" stroke="#23180c" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
