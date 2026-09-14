import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Geist,
  Bricolage_Grotesque,
  Space_Mono,
  Special_Elite,
  Courier_Prime,
  Cutive_Mono,
  VT323,
} from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Navbar, NavbarFallback } from "@/components/navbar";
import SplashCursor from "@/components/SplashCursor";
import { AppBackground } from "@/components/app-background";

// Body copy — kept plain and legible everywhere.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Headings, nav, quest titles — gives the app an identity beyond the Next.js default.
const bricolageGrotesque = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

// Stats, XP counters, leaderboard ranks, join codes — replaces Geist Mono.
const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

// Sub-headings (h2–h6) everywhere — the typewriter accent, paired with the h1's
// Bricolage Grotesque. Only one static weight exists, so bold sub-headings render
// as browser-synthesized (faux) bold — expected with this font, not a bug.
const specialElite = Special_Elite({
  variable: "--font-special-elite",
  weight: "400",
  subsets: ["latin"],
});

// --- Alternates below are wired up but not applied anywhere yet (see globals.css). ---
// preload: false keeps them out of the critical path — a browser only ever fetches
// an @font-face file once something on the page actually uses that font-family, so
// having these declared costs nothing until you opt a class into one.

// Cleaner "code typewriter" with real bold/italic — reads fine at body size.
const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
  preload: false,
});

// Thin, faint-ribbon typewriter — good for secondary/meta text.
const cutiveMono = Cutive_Mono({
  variable: "--font-cutive-mono",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

// Retro CRT/terminal look — fits the quest/XP HUD aesthetic.
const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Avance — A game layer for real-world work",
  description:
    "Avance turns real-world assignments into measurable quests and gives institutions visibility before failure happens.",
};

// Session check + unread count are both per-request, uncached round trips
// (see the comment on getSessionUser — it revalidates against Supabase's
// Auth server, not just the cookie). Previously these were awaited directly
// in RootLayout, which — since loading.tsx only wraps `page.js` and nested
// layouts, never the layout that defines it — meant every single navigation
// sat blocked on this network round trip with nothing on screen, before any
// loading UI (this app's own, or the target page's) got a chance to render.
// Isolating them in their own async component and wrapping *that* in
// Suspense lets the <html>/<body> shell — and the route's loading.tsx —
// stream immediately; this chrome fills in a moment later without holding
// up the rest of the page. See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md
// ("Good to know" / Navigation section).
async function AppChrome() {
  const user = await getSessionUser();
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, read: false } })
    : 0;

  return (
    <>
      {user && <AppBackground />}
      <Navbar user={user} unreadCount={unreadCount} />
    </>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolageGrotesque.variable} ${spaceMono.variable} ${specialElite.variable} ${courierPrime.variable} ${cutiveMono.variable} ${vt323.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Suspense fallback={<NavbarFallback />}>
          <AppChrome />
        </Suspense>
        {/* Default settings are React Bits' full-quality preset — a 1440px
            dye texture + 20 pressure-solve passes, every frame, forever,
            sitewide (mounted here in the root layout, not per-page). That's
            real, continuous GPU/main-thread cost regardless of the opacity
            dialed on top of it (opacity is a compositing step, not a
            render-cost one) — a likely contributor to "everything feels
            laggy". Cut to a lighter tier: still the same fluid-trail look,
            just computed at a lower resolution/iteration count. */}
        <SplashCursor
          RAINBOW_MODE={false}
          COLOR="#5850ec"
          SIM_RESOLUTION={96}
          DYE_RESOLUTION={720}
          PRESSURE_ITERATIONS={12}
        />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
