"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireMembership } from "@/lib/permissions";
import { REACTION_EMOJIS } from "@/lib/constants";
import { notify } from "@/lib/notifications";

export async function toggleReactionAction(
  activityEventId: string,
  emoji: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return { ok: false, error: "Unsupported reaction." };
  }

  const event = await prisma.activityEvent.findUnique({ where: { id: activityEventId } });
  if (!event) return { ok: false, error: "Activity not found." };
  await requireMembership(user.id, event.organisationId);

  const existing = await prisma.reaction.findUnique({
    where: { activityEventId_actorId_emoji: { activityEventId, actorId: user.id, emoji } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { activityEventId, actorId: user.id, emoji } });
    if (event.userId !== user.id) {
      await notify({
        userId: event.userId,
        type: "REACTION",
        title: "Someone reacted to your progress",
        message: `${emoji} on "${event.message}"`,
      });
    }
  }

  if (event.groupId) {
    revalidatePath(`/organisations/${event.organisationId}/groups/${event.groupId}`);
  }
  return { ok: true };
}
