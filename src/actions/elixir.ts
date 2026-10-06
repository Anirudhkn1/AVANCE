"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { AuthError, ForbiddenError } from "@/lib/permissions";
import { actionSubject, istDay, istDayStart } from "@/lib/school";
import { getSessionUserId } from "@/lib/session";
import { CARD_GRADES } from "@/lib/constants";
import { applySm2Grade } from "@/lib/study";
import { DROPS_BY_GRADE, MAX_CARDS_PER_DECK, parseCardLines } from "@/lib/elixir";

// Elixir: teachers write decks under the subject they teach, kids in that
// classroom review them and earn drops. See prisma/schema.prisma.

type FormResult = string | undefined;

/** Turns permission failures into a form error message instead of a crash. */
async function guarded(fn: () => Promise<FormResult | void>): Promise<FormResult> {
  try {
    return (await fn()) ?? undefined;
  } catch (e) {
    if (e instanceof AuthError || e instanceof ForbiddenError) return e.message;
    throw e;
  }
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function revalidateSchool() {
  revalidatePath("/school", "layout");
}

// ---------------------------------------------------------------------------
// Teachers: decks and cards (only for subjects the teacher owns)
// ---------------------------------------------------------------------------

const deckTitle = z.string().trim().min(2, "Give the deck a name.").max(80);

export async function createElixirDeckAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  let deckId = "";
  const err = await guarded(async () => {
    const { subject } = await actionSubject(str(fd, "subjectId"));
    const parsed = deckTitle.safeParse(fd.get("title"));
    if (!parsed.success) return parsed.error.issues[0]?.message;
    const deck = await prisma.elixirDeck.create({ data: { subjectId: subject.id, title: parsed.data } });
    deckId = deck.id;
  });
  if (err) return err;
  redirect(`/school/staff/elixir/${deckId}`);
}

async function actionDeck(deckId: string) {
  const deck = await prisma.elixirDeck.findUnique({ where: { id: deckId } });
  if (!deck) throw new ForbiddenError("Deck not found.");
  const ctx = await actionSubject(deck.subjectId);
  return { ...ctx, deck };
}

export async function deleteElixirDeckAction(deckId: string) {
  const { deck } = await actionDeck(deckId);
  await prisma.elixirDeck.delete({ where: { id: deck.id } });
  revalidateSchool();
  redirect("/school/staff/elixir");
}

const side = (what: string) => z.string().trim().min(1, `Write the ${what} of the card.`).max(500, `The ${what} is too long.`);

async function roomLeft(deckId: string) {
  return MAX_CARDS_PER_DECK - (await prisma.elixirCard.count({ where: { deckId } }));
}

export async function addElixirCardAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { deck } = await actionDeck(str(fd, "deckId"));
    const parsed = z.object({ front: side("question"), back: side("answer") }).safeParse({ front: fd.get("front"), back: fd.get("back") });
    if (!parsed.success) return parsed.error.issues[0]?.message;
    if ((await roomLeft(deck.id)) < 1) return `A deck holds up to ${MAX_CARDS_PER_DECK} cards — start another deck.`;
    await prisma.elixirCard.create({ data: { deckId: deck.id, ...parsed.data } });
    revalidateSchool();
  });
}

/** One card per line, "question | answer". */
export async function addElixirCardsBulkAction(_prev: FormResult, fd: FormData): Promise<FormResult> {
  return guarded(async () => {
    const { deck } = await actionDeck(str(fd, "deckId"));
    const { cards, skipped } = parseCardLines(String(fd.get("lines") ?? ""));
    if (skipped.length > 0) return `Line ${skipped.slice(0, 5).join(", ")} needs both a question and an answer split by "|". Nothing was added.`;
    if (cards.length === 0) return "Write one card per line like:  What is 7 × 8? | 56";
    if (cards.some((c) => c.front.length > 500 || c.back.length > 500)) return "A question or answer is too long (500 characters max).";
    const room = await roomLeft(deck.id);
    if (cards.length > room) return `This deck has room for ${Math.max(room, 0)} more card${room === 1 ? "" : "s"}, but you pasted ${cards.length}.`;
    await prisma.elixirCard.createMany({ data: cards.map((c) => ({ deckId: deck.id, ...c })) });
    revalidateSchool();
  });
}

export async function deleteElixirCardAction(cardId: string) {
  const card = await prisma.elixirCard.findUnique({ where: { id: cardId }, include: { deck: true } });
  if (!card) return;
  await actionSubject(card.deck.subjectId);
  await prisma.elixirCard.delete({ where: { id: cardId } });
  revalidateSchool();
}

// ---------------------------------------------------------------------------
// Kids: brewing (reviewing) a card
// ---------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const gradeSchema = z.enum(CARD_GRADES);

export type BrewResult =
  | { ok: true; gained: number; total: number }
  | { ok: false; error: string };

const ALREADY: BrewResult = { ok: false, error: "Already brewed — come back when it's due." };

/**
 * Records one review and pays out drops. A card can only be brewed when it is
 * due — after a review it's scheduled for a later IST day — so drops can't be
 * farmed by repeating a card, and a double tap is a no-op.
 *
 * The schedule write and the drops are ONE SQL statement: it's atomic, the
 * "is it still due?" check lives in the upsert's WHERE (so two racing taps
 * can't both pay out), and it costs a single database round trip — the
 * database is far away, and an interactive transaction here took several and
 * ran into Prisma's transaction timeout.
 */
export async function brewElixirCardAction(kidId: string, cardId: string, grade: string): Promise<BrewResult> {
  try {
    const userId = await getSessionUserId(); // from the token — no database trip
    if (!userId) return { ok: false, error: "Please sign in again." };
    const parsedGrade = gradeSchema.safeParse(grade);
    if (!parsedGrade.success) return { ok: false, error: "Invalid grade." };

    // One query does the whole access check: the card must sit in the
    // classroom of a student profile that belongs to this login (and has
    // been let in by the teacher), and brings that kid's schedule along.
    const card = await prisma.elixirCard.findFirst({
      where: {
        id: cardId,
        deck: { subject: { classroom: { kids: { some: { id: kidId, ownerId: userId, classroomStatus: "APPROVED" } } } } },
      },
      select: { progress: { where: { kidId }, select: { easeFactor: true, interval: true, repetitions: true, dueDate: true } } },
    });
    if (!card) return { ok: false, error: "That card isn't available to this student." };
    const prev = card.progress[0];
    const now = new Date();
    if (prev && prev.dueDate > now) return ALREADY;

    const next = applySm2Grade(prev ?? { easeFactor: 2.5, interval: 0, repetitions: 0 }, parsedGrade.data, now);
    // IST days, like the rest of Schools — not the server's timezone.
    const due = new Date(istDayStart(istDay(now)).getTime() + next.interval * DAY_MS);
    const gained = DROPS_BY_GRADE[parsedGrade.data];
    // Prisma stores DateTime as UTC `timestamp(3)`; an ISO string cast to
    // `timestamp` is read as that same UTC wall time.
    const nowIso = now.toISOString();

    const rows = await prisma.$queryRaw<{ elixirPoints: number }[]>`
      WITH written AS (
        INSERT INTO "ElixirProgress" ("id", "cardId", "kidId", "easeFactor", "interval", "repetitions", "dueDate", "lastReviewedAt")
        VALUES (${randomUUID()}, ${cardId}, ${kidId}, ${next.easeFactor}::float8, ${next.interval}::int, ${next.repetitions}::int,
                ${due.toISOString()}::timestamp, ${nowIso}::timestamp)
        ON CONFLICT ("cardId", "kidId") DO UPDATE SET
          "easeFactor" = EXCLUDED."easeFactor",
          "interval" = EXCLUDED."interval",
          "repetitions" = EXCLUDED."repetitions",
          "dueDate" = EXCLUDED."dueDate",
          "lastReviewedAt" = EXCLUDED."lastReviewedAt"
        WHERE "ElixirProgress"."dueDate" <= ${nowIso}::timestamp
        RETURNING 1
      )
      UPDATE "KidProfile" SET "elixirPoints" = "elixirPoints" + ${gained}::int
      WHERE "id" = ${kidId} AND EXISTS (SELECT 1 FROM written)
      RETURNING "elixirPoints"`;
    if (rows.length === 0) return ALREADY; // a racing tap got there first

    // No revalidatePath on purpose: it re-renders the brew page on every
    // grade (slow, with the database a round trip away) and the session
    // doesn't need it. The session calls router.refresh() once when a round
    // ends, which also clears the client cache (next.config staleTimes) so
    // the room, the home tile and the profile show the new drops.
    return { ok: true, gained, total: Number(rows[0].elixirPoints) };
  } catch (e) {
    if (e instanceof AuthError || e instanceof ForbiddenError) return { ok: false, error: e.message };
    throw e;
  }
}
