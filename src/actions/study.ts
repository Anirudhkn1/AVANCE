"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { CARD_GRADES, MAX_CARDS_PER_USER } from "@/lib/constants";
import { applySm2Grade, isDeckExpired } from "@/lib/study";

// Personal spaced-repetition tracker — deliberately outside the organisation
// hierarchy, like Habit/Todo/FocusSession. None of these actions touch
// OrganisationMembership, XP, or Fair Play.

/** Deletes any of the user's decks whose deadline passed more than the grace
 * period ago. Called at the top of /study page loads — no cron needed. */
export async function cleanupExpiredDecks(userId: string) {
  const decks = await prisma.deck.findMany({
    where: { userId, deadline: { not: null } },
    select: { id: true, deadline: true },
  });
  const expiredIds = decks.filter((d) => isDeckExpired(d.deadline)).map((d) => d.id);
  if (expiredIds.length === 0) return;

  await prisma.flashcard.deleteMany({ where: { deckId: { in: expiredIds } } });
  await prisma.deck.deleteMany({ where: { id: { in: expiredIds } } });
}

const createDeckSchema = z.object({
  title: z.string().trim().min(2, "Name is too short.").max(100),
  deadline: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

export async function createDeckAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  const parsed = createDeckSchema.safeParse({
    title: formData.get("title"),
    deadline: formData.get("deadline") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid deck.";
  if (parsed.data.deadline && Number.isNaN(parsed.data.deadline.getTime())) return "Invalid deadline.";

  await prisma.deck.create({
    data: { userId: user.id, title: parsed.data.title, deadline: parsed.data.deadline ?? null },
  });
  revalidatePath("/study");
}

export async function deleteDeckAction(deckId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.userId !== user.id) return { ok: false, error: "Deck not found." };

  await prisma.flashcard.deleteMany({ where: { deckId } });
  await prisma.deck.delete({ where: { id: deckId } });
  revalidatePath("/study");
  return { ok: true };
}

const createCardSchema = z.object({
  front: z.string().trim().min(1, "Front is required.").max(2000),
  back: z.string().trim().min(1, "Back is required.").max(2000),
});

export async function createFlashcardAction(
  deckId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck || deck.userId !== user.id) return "Deck not found.";

  const parsed = createCardSchema.safeParse({ front: formData.get("front"), back: formData.get("back") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid card.";

  const activeCount = await prisma.flashcard.count({ where: { deck: { userId: user.id } } });
  if (activeCount >= MAX_CARDS_PER_USER) {
    return `You've hit the ${MAX_CARDS_PER_USER}-card limit. Delete some cards before adding more.`;
  }

  await prisma.flashcard.create({
    data: { deckId, front: parsed.data.front, back: parsed.data.back },
  });
  revalidatePath("/study");
  revalidatePath(`/study/${deckId}`);
}

export async function deleteFlashcardAction(cardId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const card = await prisma.flashcard.findUnique({ where: { id: cardId }, include: { deck: true } });
  if (!card || card.deck.userId !== user.id) return { ok: false, error: "Card not found." };

  await prisma.flashcard.delete({ where: { id: cardId } });
  revalidatePath("/study");
  revalidatePath(`/study/${card.deckId}`);
  return { ok: true };
}

const gradeSchema = z.enum(CARD_GRADES);

export async function reviewCardAction(
  cardId: string,
  grade: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const card = await prisma.flashcard.findUnique({ where: { id: cardId }, include: { deck: true } });
  if (!card || card.deck.userId !== user.id) return { ok: false, error: "Card not found." };

  const parsedGrade = gradeSchema.safeParse(grade);
  if (!parsedGrade.success) return { ok: false, error: "Invalid grade." };

  const next = applySm2Grade(card, parsedGrade.data);
  await prisma.flashcard.update({
    where: { id: cardId },
    data: {
      easeFactor: next.easeFactor,
      interval: next.interval,
      repetitions: next.repetitions,
      dueDate: next.dueDate,
    },
  });
  revalidatePath("/study");
  revalidatePath("/study/review");
  return { ok: true };
}

const studyTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use a valid 24-hour time, e.g. 19:00.");

export async function setStudyTimeAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  const parsed = studyTimeSchema.safeParse(formData.get("time"));
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid time.";

  await prisma.user.update({ where: { id: user.id }, data: { studyPreferredTime: parsed.data } });
  revalidatePath("/study");
}
