"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireOrgRole, requireMembership } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

const createGroupSchema = z.object({ name: z.string().trim().min(2, "Name is too short.").max(80) });

export async function createGroupAction(
  organisationId: string,
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  const user = await requireUser();
  await requireOrgRole(user.id, organisationId, ["HEAD", "HOST"]);

  const parsed = createGroupSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid name.";

  const group = await prisma.group.create({
    data: { organisationId, name: parsed.data.name.trim(), createdById: user.id },
  });
  await logAudit({ actorId: user.id, action: "GROUP_CREATED", targetType: "Group", targetId: group.id });
  redirect(`/organisations/${organisationId}/groups/${group.id}`);
}

export async function joinGroupAction(organisationId: string, groupId: string) {
  const user = await requireUser();
  await requireMembership(user.id, organisationId);

  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group || group.organisationId !== organisationId) throw new Error("Group not found.");

  await prisma.groupMembership.upsert({
    where: { userId_groupId: { userId: user.id, groupId } },
    update: {},
    create: { userId: user.id, groupId },
  });
  revalidatePath(`/organisations/${organisationId}/groups/${groupId}`);
}
