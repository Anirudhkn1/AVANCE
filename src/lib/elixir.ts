// Elixir — spaced repetition for kids in Avance Schools. Pure helpers shared
// by server and client code (no DB access: see src/lib/elixir-server.ts and
// src/actions/elixir.ts). Scheduling is the same SM-2 as the main app's Study
// (src/lib/study.ts); what's different is who writes the cards (teachers) and
// the reward (drops that fill a flask).

import type { CardGrade } from "@/lib/constants";

/** Drops needed to brew one full flask. */
export const DROPS_PER_FLASK = 50;

/** Cards in one brewing session — short enough for a kid to finish. */
export const SESSION_SIZE = 10;

/** A card counts as mastered once it's scheduled this many days out. */
export const MASTERED_INTERVAL_DAYS = 21;

export const MAX_CARDS_PER_DECK = 150;

/** Drops for a review. Even a miss earns one — trying is the point. */
export const DROPS_BY_GRADE: Record<CardGrade, number> = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

/** Kid-friendly names for the four SM-2 grades. */
export const GRADE_UI: Record<CardGrade, { label: string; hint: string; emoji: string }> = {
  AGAIN: { label: "Oops", hint: "Forgot it", emoji: "😵" },
  HARD: { label: "Tricky", hint: "Took effort", emoji: "😅" },
  GOOD: { label: "Got it", hint: "Remembered", emoji: "😄" },
  EASY: { label: "Easy!", hint: "No problem", emoji: "🤩" },
};

export function elixirInfo(drops: number) {
  const flasks = Math.floor(drops / DROPS_PER_FLASK);
  const into = drops % DROPS_PER_FLASK;
  return { flasks, into, fill: into / DROPS_PER_FLASK, toNext: DROPS_PER_FLASK - into };
}

/** "front | back" per line; lines without a divider (or with an empty side) are reported, not dropped silently. */
export function parseCardLines(text: string) {
  const cards: { front: string; back: string }[] = [];
  const skipped: number[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const at = line.indexOf("|");
    const front = at < 0 ? "" : line.slice(0, at).trim();
    const back = at < 0 ? "" : line.slice(at + 1).trim();
    if (front && back) cards.push({ front, back });
    else skipped.push(i + 1);
  });
  return { cards, skipped };
}
