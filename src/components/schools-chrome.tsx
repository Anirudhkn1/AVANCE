"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function isSchoolsPath(pathname: string) {
  return pathname === "/school" || pathname.startsWith("/school/");
}

/** Main-app chrome (navbar, purple background) that steps aside inside Avance Schools. */
export function OutsideSchools({ children }: { children: ReactNode }) {
  return isSchoolsPath(usePathname()) ? null : children;
}

/** Each navigation turns a notebook page — remounting on the path replays the animation. */
export function PageTurn({ children }: { children: ReactNode }) {
  return (
    <div key={usePathname()} className="schools-page">
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
