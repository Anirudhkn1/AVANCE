"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";
import { HABIT_FREQUENCIES } from "@/lib/constants";

// Personal habit tracker — deliberately outside the organisation hierarchy
// (PRD §30). None of these actions touch OrganisationMembership, XP, or
// Fair Play.

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const createHabitSchema = z.object({
  title: z.string().trim().min(2, "Name is too short.").max(100),
  frequency: z.enum(HABIT_FREQUENCIES),
});

export async function createHabitAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  const parsed = createHabitSchema.safeParse({
    title: formData.get("title"),
    frequency: formData.get("frequency") || "DAILY",
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid habit.";

  await prisma.habit.create({
    data: { userId: user.id, title: parsed.data.title, frequency: parsed.data.frequency },
  });
  revalidatePath("/habits");
}

export async function toggleHabitTodayAction(habitId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== user.id) return { ok: false, error: "Habit not found." };

  const today = startOfDay(new Date());
  const existing = await prisma.habitCompletion.findUnique({
    where: { habitId_date: { habitId, date: today } },
  });

  if (existing) {
    await prisma.habitCompletion.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitCompletion.create({ data: { habitId, date: today } });
  }

  revalidatePath("/habits");
  return { ok: true };
}

export async function archiveHabitAction(habitId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== user.id) return { ok: false, error: "Habit not found." };

  await prisma.habit.update({ where: { id: habitId }, data: { archived: true } });
  revalidatePath("/habits");
  return { ok: true };
}

const shareSchema = z.object({ email: z.string().trim().toLowerCase().email("Enter a valid email.") });

export async function shareHabitAction(
  habitId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== user.id) return "Habit not found.";

  const parsed = shareSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid email.";

  const target = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!target) return "No Avance account with that email.";
  if (target.id === user.id) return "You already own this habit.";

  await prisma.habitShare.upsert({
    where: { habitId_sharedWithId: { habitId, sharedWithId: target.id } },
    update: {},
    create: { habitId, sharedWithId: target.id },
  });
  revalidatePath("/habits");
}

export async function unshareHabitAction(habitId: string, sharedWithId: string) {
  const user = await requireUser();
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== user.id) return { ok: false, error: "Habit not found." };
  await prisma.habitShare.deleteMany({ where: { habitId, sharedWithId } });
  revalidatePath("/habits");
  return { ok: true };
}
