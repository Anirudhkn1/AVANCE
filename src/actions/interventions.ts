"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireOrgRole } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { INTERVENTION_TYPES } from "@/lib/constants";

// PRD §20: the system can recommend an action, but only an authorised human
// decides whether to execute it — this action IS that human decision, never
// something an AI calls on its own.

const schema = z.object({
  type: z.enum(INTERVENTION_TYPES),
  note: z.string().trim().min(3, "Add a short note.").max(500),
  projectId: z.string().optional(),
});

export async function createInterventionAction(
  organisationId: string,
  studentId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  await requireOrgRole(user.id, organisationId, ["HEAD", "HOST"]);

  const parsed = schema.safeParse({
    type: formData.get("type"),
    note: formData.get("note"),
    projectId: formData.get("projectId") || undefined,
  });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid input.";

  const student = await prisma.organisationMembership.findUnique({
    where: { userId_organisationId: { userId: studentId, organisationId } },
  });
  if (!student) return "That student is not a member of this organisation.";

  const intervention = await prisma.intervention.create({
    data: {
      hostId: user.id,
      organisationId,
      studentId,
      projectId: parsed.data.projectId || null,
      type: parsed.data.type,
      note: parsed.data.note,
    },
  });

  await logAudit({
    actorId: user.id,
    action: "INTERVENTION_CREATED",
    targetType: "Intervention",
    targetId: intervention.id,
    meta: { type: parsed.data.type, studentId },
  });

  const messageByType: Record<string, string> = {
    REMINDER: "You have a reminder from your host.",
    MESSAGE: "Your host sent you a message.",
    SUPPORT_MATERIAL: "Your host shared support material for you.",
    DEADLINE_EXTENSION: "Your host granted you a deadline extension.",
    CONTACT: "Your host would like to speak with you.",
  };

  await notify({
    userId: studentId,
    type: "HOST_ALERT",
    title: messageByType[parsed.data.type] ?? "Update from your host",
    message: parsed.data.note,
    link: `/organisations/${organisationId}`,
  });

  revalidatePath(`/organisations/${organisationId}/students/${studentId}`);
  revalidatePath(`/organisations/${organisationId}/command-center`);
}
