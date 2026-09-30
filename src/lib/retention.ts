import "server-only";
import { prisma } from "@/lib/prisma";
import { deleteSubmissionFile } from "@/lib/storage";

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

/**
 * Deletes a reviewed submission's PDF, then clears its filePath. The row is
 * only cleared once the file is really gone, so a failed delete leaves the
 * pointer in place for purgeReviewedUploads() to retry.
 */
export async function releaseSubmissionFile(submission: { id: string; filePath: string }) {
  if (!submission.filePath) return;
  await deleteSubmissionFile(submission.filePath);
  await prisma.checkpointSubmission.update({ where: { id: submission.id }, data: { filePath: "" } });
}

/**
 * Storage housekeeping, run opportunistically like sweepExpiredProjects:
 * - PDFs are only kept while a submission is PENDING review. Anything
 *   already APPROVED/REJECTED (older uploads, or a delete that failed at
 *   review time) is removed here.
 * - Assignment text used to be saved on the project as `sourceExcerpt`
 *   after the Quest Builder read it. It's only needed while the host
 *   reviews the proposal, so any left over is wiped.
 */
export async function purgeReviewedUploads() {
  const reviewed = await prisma.checkpointSubmission.findMany({
    where: { status: { in: ["APPROVED", "REJECTED"] }, filePath: { not: "" } },
    select: { id: true, filePath: true },
    take: 200,
  });
  for (const submission of reviewed) {
    await releaseSubmissionFile(submission).catch((err) =>
      console.error(`Could not delete reviewed submission file ${submission.filePath}:`, err)
    );
  }

  await prisma.project.updateMany({
    where: { sourceExcerpt: { not: "" } },
    data: { sourceExcerpt: "" },
  });
}
