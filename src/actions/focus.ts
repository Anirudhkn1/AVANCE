"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

// Focus Mode — personal session timer + history, outside the organisation
// hierarchy. Never touches XP, streaks, or Fair Play.

const MIN_TARGET_SECONDS = 60; // 1 minute floor
const MAX_TARGET_SECONDS = 4 * 60 * 60; // 4 hour ceiling, sanity bound

export async function startFocusSessionAction(
  targetSeconds: number
): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const target = Math.round(targetSeconds);
  if (!Number.isFinite(target) || target < MIN_TARGET_SECONDS || target > MAX_TARGET_SECONDS) {
    return { ok: false, error: "Pick a duration between 1 minute and 4 hours." };
  }

  const session = await prisma.focusSession.create({
    data: { userId: user.id, targetSeconds: target },
  });
  revalidatePath("/focus");
  return { ok: true, sessionId: session.id };
}

export async function endFocusSessionAction(
  sessionId: string,
  actualSeconds: number,
  completed: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const session = await prisma.focusSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) return { ok: false, error: "Session not found." };
  if (session.endedAt) return { ok: true }; // already finalized, idempotent

  const clamped = Math.max(0, Math.min(Math.round(actualSeconds), session.targetSeconds));

  await prisma.focusSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date(), actualSeconds: clamped, completed },
  });
  revalidatePath("/focus");
  return { ok: true };
}
