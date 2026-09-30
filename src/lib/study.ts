// Spaced repetition ("Study") — pure SM-2 scheduling helpers. No DB access
// here (see src/actions/study.ts).

import type { CardGrade } from "@/lib/constants";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

type Sm2State = { easeFactor: number; interval: number; repetitions: number };

// Standard SM-2: grade maps onto the algorithm's 0-5 quality scale (Again is
// a fail, the other three are passes at increasing confidence).
const GRADE_QUALITY: Record<CardGrade, number> = { AGAIN: 2, HARD: 3, GOOD: 4, EASY: 5 };

export function applySm2Grade(prev: Sm2State, grade: CardGrade, now: Date = new Date()) {
  const quality = GRADE_QUALITY[grade];
  let { easeFactor, interval, repetitions } = prev;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * easeFactor);
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  return { easeFactor, interval, repetitions, dueDate: addDays(startOfDay(now), interval) };
}

// Two days grace after a deck's deadline before it (and its cards) is
// auto-deleted — see prisma/schema.prisma Deck.deadline.
export const DECK_DEADLINE_GRACE_DAYS = 2;

export function isDeckExpired(deadline: Date | null, now: Date = new Date()) {
  if (!deadline) return false;
  return startOfDay(now).getTime() > addDays(startOfDay(deadline), DECK_DEADLINE_GRACE_DAYS).getTime();
}

type FlashcardLike = { dueDate: Date };

export function countDueToday(cards: FlashcardLike[], now: Date = new Date()) {
  const today = startOfDay(now);
  return cards.filter((c) => startOfDay(c.dueDate).getTime() <= today.getTime()).length;
}

/** Groups due dates by day for the study month calendar — mirrors HabitMonthCalendar's completionDates shape. */
export function groupDueDatesByDay(cards: FlashcardLike[]) {
  const counts = new Map<string, number>();
  for (const c of cards) {
    const key = dateKey(startOfDay(c.dueDate));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
