"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireMembership, isGroupMember, requireGroupHost } from "@/lib/permissions";
import { saveSubmissionFile } from "@/lib/storage";
import { awardCheckpointCompletion } from "@/lib/gamification";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

async function loadCheckpointContext(checkpointId: string) {
  const checkpoint = await prisma.checkpoint.findUniqueOrThrow({
    where: { id: checkpointId },
    include: { project: { include: { group: true } } },
  });
  return checkpoint;
}

export async function submitCheckpointAction(
  checkpointId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const checkpoint = await loadCheckpointContext(checkpointId);
  const { project } = checkpoint;
  const organisationId = project.group.organisationId;

  await requireMembership(user.id, organisationId);
  if (!(await isGroupMember(user.id, project.groupId))) {
    return { ok: false, error: "You are not a member of this group." };
  }
  if (project.status !== "PUBLISHED") return { ok: false, error: "This project is not active." };

  // Enforce linear progression: only the current checkpoint accepts a submission.
  const allCheckpoints = await prisma.checkpoint.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });
  const progress = await prisma.checkpointProgress.findMany({
    where: { userId: user.id, checkpointId: { in: allCheckpoints.map((c) => c.id) } },
  });
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.checkpointId));
  const currentCheckpoint = allCheckpoints.find((c) => !completedIds.has(c.id));
  if (!currentCheckpoint || currentCheckpoint.id !== checkpointId) {
    return { ok: false, error: "This checkpoint is locked or already complete." };
  }
  if (!checkpoint.submissionRequired) {
    return { ok: false, error: "This checkpoint doesn't require a file — mark it complete instead." };
  }

  const latest = await prisma.checkpointSubmission.findFirst({
    where: { checkpointId, userId: user.id },
    orderBy: { submittedAt: "desc" },
  });
  if (latest && latest.status !== "REJECTED") {
    return { ok: false, error: "A submission is already pending or approved for this checkpoint." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a PDF to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "File is too large (max 15MB)." };
  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    return { ok: false, error: "Only PDF files are accepted." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const { relativePath } = await saveSubmissionFile({
    organisationId,
    checkpointId,
    userId: user.id,
    fileName: file.name,
    buffer,
  });

  const attempt = (latest?.attempt ?? 0) + 1;
  const auto = project.verificationMode === "AUTO";

  await prisma.$transaction(async (tx) => {
    await tx.checkpointSubmission.create({
      data: {
        checkpointId,
        userId: user.id,
        attempt,
        fileName: file.name,
        filePath: relativePath,
        fileSize: file.size,
        status: auto ? "APPROVED" : "PENDING",
        reviewedAt: auto ? new Date() : null,
      },
    });

    if (auto) {
      await awardCheckpointCompletion(tx, {
        checkpointId,
        userId: user.id,
        xpValue: checkpoint.xpValue,
        checkpointTitle: checkpoint.title,
        projectId: project.id,
        projectTitle: project.title,
        organisationId,
        groupId: project.groupId,
        totalCheckpoints: allCheckpoints.length,
      });
    }
  });

  if (!auto) {
    // Notify hosts a review is waiting.
    const hosts = await prisma.organisationMembership.findMany({
      where: { organisationId, role: { in: ["HOST", "HEAD"] } },
    });
    await Promise.all(
      hosts.map((h) =>
        notify({
          userId: h.userId,
          type: "VERIFICATION",
          title: "Submission awaiting review",
          message: `${user.name} submitted ${checkpoint.title} for ${project.title}.`,
          link: `/organisations/${organisationId}/groups/${project.groupId}/projects/${project.id}/checkpoints/${checkpointId}`,
        })
      )
    );
  }

  revalidatePath(`/organisations/${organisationId}/groups/${project.groupId}/projects/${project.id}`);
  return { ok: true };
}

export async function markCheckpointCompleteAction(
  checkpointId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const checkpoint = await loadCheckpointContext(checkpointId);
  const { project } = checkpoint;
  const organisationId = project.group.organisationId;

  await requireMembership(user.id, organisationId);
  if (!(await isGroupMember(user.id, project.groupId))) {
    return { ok: false, error: "You are not a member of this group." };
  }
  if (checkpoint.submissionRequired) {
    return { ok: false, error: "This checkpoint requires a submission." };
  }

  const allCheckpoints = await prisma.checkpoint.findMany({
    where: { projectId: project.id },
    orderBy: { order: "asc" },
  });
  const progress = await prisma.checkpointProgress.findMany({
    where: { userId: user.id, checkpointId: { in: allCheckpoints.map((c) => c.id) } },
  });
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.checkpointId));
  if (completedIds.has(checkpointId)) return { ok: false, error: "Already complete." };
  const currentCheckpoint = allCheckpoints.find((c) => !completedIds.has(c.id));
  if (!currentCheckpoint || currentCheckpoint.id !== checkpointId) {
    return { ok: false, error: "This checkpoint is locked." };
  }

  await prisma.$transaction((tx) =>
    awardCheckpointCompletion(tx, {
      checkpointId,
      userId: user.id,
      xpValue: checkpoint.xpValue,
      checkpointTitle: checkpoint.title,
      projectId: project.id,
      projectTitle: project.title,
      organisationId,
      groupId: project.groupId,
      totalCheckpoints: allCheckpoints.length,
    })
  );

  revalidatePath(`/organisations/${organisationId}/groups/${project.groupId}/projects/${project.id}`);
  return { ok: true };
}

export async function reviewSubmissionAction(
  submissionId: string,
  decision: "APPROVED" | "REJECTED",
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const submission = await prisma.checkpointSubmission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { checkpoint: { include: { project: { include: { group: true } } } } },
  });
  const { checkpoint } = submission;
  const { project } = checkpoint;
  const organisationId = project.group.organisationId;

  const { membership } = await requireGroupHost(user.id, project.groupId);
  if (submission.status !== "PENDING") return { ok: false, error: "This submission was already reviewed." };
  if (decision === "REJECTED" && !reason?.trim()) return { ok: false, error: "Give a reason for rejecting." };

  await prisma.$transaction(async (tx) => {
    await tx.checkpointSubmission.update({
      where: { id: submissionId },
      data: {
        status: decision,
        reviewedAt: new Date(),
        reviewerId: user.id,
        rejectionReason: decision === "REJECTED" ? reason?.trim() : null,
      },
    });

    if (decision === "APPROVED") {
      const totalCheckpoints = await tx.checkpoint.count({ where: { projectId: project.id } });
      await awardCheckpointCompletion(tx, {
        checkpointId: checkpoint.id,
        userId: submission.userId,
        xpValue: checkpoint.xpValue,
        checkpointTitle: checkpoint.title,
        projectId: project.id,
        projectTitle: project.title,
        organisationId,
        groupId: project.groupId,
        totalCheckpoints,
      });
    }
  });

  await logAudit({
    actorId: user.id,
    action: decision === "APPROVED" ? "SUBMISSION_APPROVED" : "SUBMISSION_REJECTED",
    targetType: "CheckpointSubmission",
    targetId: submissionId,
    meta: { reason: reason ?? null, role: membership.role },
  });

  if (decision === "REJECTED") {
    await notify({
      userId: submission.userId,
      type: "VERIFICATION",
      title: `${checkpoint.title} needs another look`,
      message: reason?.trim() || "Your submission was not approved. Please review and resubmit.",
      link: `/organisations/${organisationId}/groups/${project.groupId}/projects/${project.id}/checkpoints/${checkpoint.id}`,
    });
  }

  revalidatePath(`/organisations/${organisationId}/groups/${project.groupId}/projects/${project.id}/checkpoints/${checkpoint.id}`);
  return { ok: true };
}
