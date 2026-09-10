import "server-only";
import type { PrismaClient } from "@prisma/client";
import { notify } from "@/lib/notifications";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

const STREAK_WINDOW_MS = 36 * 60 * 60 * 1000; // generous "still counts as consecutive" window

/**
 * Marks one checkpoint complete for one student: awards XP, updates the
 * streak, logs an activity event, and notifies the student. Idempotent per
 * (checkpoint, user) — the caller is expected to have already confirmed the
 * checkpoint isn't already completed.
 */
export async function awardCheckpointCompletion(
  tx: Tx,
  params: {
    checkpointId: string;
    userId: string;
    xpValue: number;
    checkpointTitle: string;
    projectId: string;
    projectTitle: string;
    organisationId: string;
    groupId: string;
    totalCheckpoints: number;
  }
) {
  const now = new Date();

  await tx.checkpointProgress.upsert({
    where: { checkpointId_userId: { checkpointId: params.checkpointId, userId: params.userId } },
    update: { completed: true, completedAt: now, xpAwarded: params.xpValue },
    create: {
      checkpointId: params.checkpointId,
      userId: params.userId,
      completed: true,
      completedAt: now,
      xpAwarded: params.xpValue,
    },
  });

  const membership = await tx.organisationMembership.findUniqueOrThrow({
    where: { userId_organisationId: { userId: params.userId, organisationId: params.organisationId } },
  });

  const isConsecutive =
    membership.lastActivityAt && now.getTime() - membership.lastActivityAt.getTime() <= STREAK_WINDOW_MS;
  const newStreak = isConsecutive ? membership.streakCurrent + 1 : 1;

  await tx.organisationMembership.update({
    where: { id: membership.id },
    data: {
      xp: membership.xp + params.xpValue,
      streakCurrent: newStreak,
      streakLongest: Math.max(membership.streakLongest, newStreak),
      lastActivityAt: now,
    },
  });

  await tx.activityEvent.create({
    data: {
      organisationId: params.organisationId,
      groupId: params.groupId,
      userId: params.userId,
      type: "CHECKPOINT_COMPLETED",
      message: `completed ${params.checkpointTitle}`,
      projectId: params.projectId,
      checkpointId: params.checkpointId,
    },
  });

  const completedCount = await tx.checkpointProgress.count({
    where: { userId: params.userId, completed: true, checkpoint: { projectId: params.projectId } },
  });

  if (completedCount >= params.totalCheckpoints) {
    await tx.activityEvent.create({
      data: {
        organisationId: params.organisationId,
        groupId: params.groupId,
        userId: params.userId,
        type: "PROJECT_COMPLETED",
        message: `finished ${params.projectTitle}`,
        projectId: params.projectId,
      },
    });
    await notify({
      userId: params.userId,
      type: "PROGRESS_REMINDER",
      title: "Quest complete 🎉",
      message: `You finished every checkpoint in ${params.projectTitle}.`,
    });
  } else {
    await notify({
      userId: params.userId,
      type: "PROGRESS_REMINDER",
      title: "Checkpoint complete",
      message: `${params.checkpointTitle} is done. ${params.totalCheckpoints - completedCount} checkpoint(s) left.`,
    });
  }
}
