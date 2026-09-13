import type { Metadata } from "next";
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
import { Navbar } from "@/components/navbar";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const unreadCount = user
    ? await prisma.notification.count({ where: { userId: user.id, read: false } })
    : 0;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${bricolageGrotesque.variable} ${spaceMono.variable} ${specialElite.variable} ${courierPrime.variable} ${cutiveMono.variable} ${vt323.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {user && <AppBackground />}
        <SplashCursor RAINBOW_MODE={false} COLOR="#5850ec" />
        <Navbar user={user} unreadCount={unreadCount} />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
