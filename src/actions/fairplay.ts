"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireOrgRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const schema = z.object({
  delta: z.number().int().min(-100).max(100),
  reason: z.string().trim().min(3, "Give a reason.").max(300),
});

/**
 * PRD §27: Fair Play changes are host-only and auditable. There is no path
 * here for students to edit their own score, and nothing in this file is
 * ever called by an AI-generated action — only an authenticated host click.
 */
export async function adjustFairPlayAction(
  organisationId: string,
  membershipId: string,
  input: { delta: number; reason: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  await requireOrgRole(user.id, organisationId, ["HEAD", "HOST"]);

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const membership = await prisma.organisationMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.organisationId !== organisationId) {
    return { ok: false, error: "Member not found." };
  }

  const newScore = Math.max(0, Math.min(100, membership.fairPlayScore + parsed.data.delta));

  await prisma.$transaction([
    prisma.organisationMembership.update({ where: { id: membershipId }, data: { fairPlayScore: newScore } }),
    prisma.fairPlayRecord.create({
      data: {
        membershipId,
        delta: newScore - membership.fairPlayScore,
        reason: parsed.data.reason,
        actorId: user.id,
      },
    }),
  ]);

  await logAudit({
    actorId: user.id,
    action: "FAIR_PLAY_ADJUSTED",
    targetType: "OrganisationMembership",
    targetId: membershipId,
    meta: { delta: parsed.data.delta, reason: parsed.data.reason, newScore },
  });

  revalidatePath(`/organisations/${organisationId}`);
  return { ok: true };
}
