"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireGroupHost } from "@/lib/permissions";
import { analyseAssignment, type QuestProposal } from "@/lib/questBuilder";
import { extractTextFromFile } from "@/lib/extractText";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import type { SourceType, VerificationMode } from "@/lib/constants";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function analyzeAssignmentTextAction(
  groupId: string,
  text: string
): Promise<{ ok: true; proposal: QuestProposal; sourceType: SourceType } | { ok: false; error: string }> {
  const user = await requireUser();
  await requireGroupHost(user.id, groupId);

  if (!text || text.trim().length === 0) {
    return { ok: false, error: "Paste or upload an assignment first." };
  }
  const proposal = analyseAssignment(text);
  return { ok: true, proposal, sourceType: "TEXT" };
}

export async function analyzeAssignmentFileAction(
  groupId: string,
  formData: FormData
): Promise<{ ok: true; proposal: QuestProposal; sourceType: SourceType; extractedText: string } | { ok: false; error: string }> {
  const user = await requireUser();
  await requireGroupHost(user.id, groupId);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF or DOCX file first." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File is too large (max 15MB)." };
  }
  const lower = file.name.toLowerCase();
  if (!lower.endsWith(".pdf") && !lower.endsWith(".docx") && !lower.endsWith(".txt")) {
    return { ok: false, error: "Only PDF, DOCX or TXT files are supported." };
  }

  let text: string;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    text = await extractTextFromFile(buffer, file.name);
  } catch {
    return { ok: false, error: "Could not read that file. Try pasting the assignment text instead." };
  }

  if (!text || text.trim().length < 5) {
    return { ok: false, error: "No readable text was found in that file. Try pasting the assignment text instead." };
  }

  const proposal = analyseAssignment(text);
  const sourceType: SourceType = lower.endsWith(".pdf") ? "PDF" : lower.endsWith(".docx") ? "DOCX" : "TEXT";
  return { ok: true, proposal, sourceType, extractedText: text };
}

const checkpointInput = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(""),
  submissionRequired: z.boolean(),
  xpValue: z.coerce.number().int().min(0).max(1000),
});

const publishSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().trim().min(2, "Title is required.").max(150),
  description: z.string().trim().max(4000),
  requirements: z.array(z.string().trim()).max(50),
  deadline: z.string().refine((v) => !Number.isNaN(new Date(v).getTime()), "Enter a valid deadline."),
  verificationMode: z.enum(["AUTO", "HOST_APPROVAL"]),
  aiGenerated: z.boolean(),
  sourceType: z.enum(["PDF", "DOCX", "TEXT", "MANUAL"]),
  sourceExcerpt: z.string().max(4000).default(""),
  checkpoints: z.array(checkpointInput).min(1, "Add at least one checkpoint.").max(30),
});

export type PublishProjectInput = z.infer<typeof publishSchema>;

export async function publishProjectAction(
  input: PublishProjectInput
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  const user = await requireUser();

  const parsed = publishSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid project data." };
  }
  const data = parsed.data;

  const { group } = await requireGroupHost(user.id, data.groupId);

  const deadline = new Date(data.deadline);
  const now = new Date();

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        groupId: data.groupId,
        title: data.title,
        description: data.description,
        requirements: JSON.stringify(data.requirements.filter(Boolean)),
        deadline,
        status: "PUBLISHED",
        verificationMode: data.verificationMode as VerificationMode,
        aiGenerated: data.aiGenerated,
        sourceType: data.sourceType as SourceType,
        sourceExcerpt: data.sourceExcerpt.slice(0, 4000),
        createdById: user.id,
        publishedAt: now,
      },
    });

    await tx.checkpoint.createMany({
      data: data.checkpoints.map((cp, idx) => ({
        projectId: created.id,
        order: idx + 1,
        title: cp.title,
        description: cp.description,
        submissionRequired: cp.submissionRequired,
        xpValue: cp.xpValue,
        aiGenerated: data.aiGenerated,
      })),
    });

    return created;
  });

  await logAudit({
    actorId: user.id,
    action: "PROJECT_PUBLISHED",
    targetType: "Project",
    targetId: project.id,
    meta: { aiGenerated: data.aiGenerated, checkpointCount: data.checkpoints.length },
  });

  // Notify every current group member — everyone in a group receives the
  // same checkpoints for the same project (PRD §7).
  const members = await prisma.groupMembership.findMany({ where: { groupId: data.groupId } });
  await Promise.all(
    members.map((m) =>
      notify({
        userId: m.userId,
        type: "SYSTEM",
        title: "New quest published",
        message: `${data.title} is live in ${group.name}. ${data.checkpoints.length} checkpoints, due ${deadline.toLocaleDateString()}.`,
        link: `/organisations/${group.organisationId}/groups/${data.groupId}/projects/${project.id}`,
      })
    )
  );

  revalidatePath(`/organisations/${group.organisationId}/groups/${data.groupId}`);
  return { ok: true, projectId: project.id };
}

export async function archiveProjectAction(projectId: string) {
  const user = await requireUser();
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId }, include: { group: true } });
  await requireGroupHost(user.id, project.groupId);
  await prisma.project.update({ where: { id: projectId }, data: { status: "ARCHIVED" } });
  await logAudit({ actorId: user.id, action: "PROJECT_ARCHIVED", targetType: "Project", targetId: projectId });
  revalidatePath(`/organisations/${project.group.organisationId}/groups/${project.groupId}`);
  redirect(`/organisations/${project.group.organisationId}/groups/${project.groupId}`);
}
