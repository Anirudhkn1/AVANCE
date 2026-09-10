import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * PRD §34: 5 days after a project's deadline, its detail stops appearing in
 * the active user-facing system — but aggregate organisation stats (XP,
 * completed checkpoints, rank) already live on OrganisationMembership and
 * are untouched by this. Called opportunistically from list pages instead
 * of a real cron, which is enough for this MVP.
 */
export async function sweepExpiredProjects(groupId?: string) {
  const cutoff = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  await prisma.project.updateMany({
    where: {
      status: "PUBLISHED",
      deadline: { lt: cutoff },
      ...(groupId ? { groupId } : {}),
    },
    data: { status: "ARCHIVED" },
  });
}
