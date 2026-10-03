import { Alegreya_Sans, Alegreya_Sans_SC, Fredoka, Space_Mono, Special_Elite } from "next/font/google";

// Typewriter face — the "Avance" name everywhere (logo, intro, hero particle
// word) and every heading. Only one static weight exists, so anything asked
// to render bold here is browser-synthesized; globals.css keeps h3–h6 at 400.
export const specialElite = Special_Elite({
  variable: "--font-special-elite",
  weight: "400",
  subsets: ["latin"],
});

// All other copy — a true small-caps family (real SC glyphs, not the
// browser's scaled-capital fake), so body text keeps proper stroke weights.
export const alegreyaSansSC = Alegreya_Sans_SC({
  variable: "--font-alegreya-sc",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

// Same design without small caps — used only for text people type into
// inputs, so capital vs lowercase stays visible while typing.
export const alegreyaSans = Alegreya_Sans({
  variable: "--font-alegreya",
  weight: ["400", "500"],
  subsets: ["latin"],
});

// Numbers that tick or need to line up: XP, ranks, timers, join codes.
export const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  weight: ["400", "700"],
  subsets: ["latin"],
});

// Avance Schools' chunky display face — titles and headings under /school
// only. Imported by the school layouts, so the rest of the app never loads it.
export const fredoka = Fredoka({
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});
