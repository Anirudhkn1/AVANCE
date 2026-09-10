"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, requireOrgRole, ForbiddenError, AuthError } from "@/lib/permissions";
import { slugify, randomCode } from "@/lib/codes";
import { logAudit } from "@/lib/audit";
import type { OrgRole } from "@/lib/constants";

const createOrgSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(80),
});

export async function createOrganisationAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const parsed = createOrgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid name.";

  const base = slugify(parsed.data.name) || "org";
  let slug = base;
  let attempt = 0;
  while (await prisma.organisation.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${base}-${attempt + 1}`;
  }

  let joinCode = randomCode();
  while (await prisma.organisation.findUnique({ where: { joinCode } })) {
    joinCode = randomCode();
  }

  const org = await prisma.organisation.create({
    data: {
      name: parsed.data.name.trim(),
      slug,
      joinCode,
      createdById: user.id,
      memberships: { create: { userId: user.id, role: "HEAD" } },
    },
  });

  await logAudit({ actorId: user.id, action: "ORG_CREATED", targetType: "Organisation", targetId: org.id });
  redirect(`/organisations/${org.id}`);
}

const joinOrgSchema = z.object({ code: z.string().trim().min(4, "Enter a join code.") });

export async function joinOrganisationAction(
  _prevState: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  let user;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const parsed = joinOrgSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid code.";

  const org = await prisma.organisation.findUnique({
    where: { joinCode: parsed.data.code.trim().toUpperCase() },
  });
  if (!org) return "No organisation found with that join code.";

  const existing = await prisma.organisationMembership.findUnique({
    where: { userId_organisationId: { userId: user.id, organisationId: org.id } },
  });
  if (existing) redirect(`/organisations/${org.id}`);

  await prisma.organisationMembership.create({
    data: { userId: user.id, organisationId: org.id, role: "STUDENT" },
  });
  await logAudit({ actorId: user.id, action: "ORG_JOINED", targetType: "Organisation", targetId: org.id });
  redirect(`/organisations/${org.id}`);
}

export async function setMemberRoleAction(
  organisationId: string,
  membershipId: string,
  role: OrgRole
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await requireOrgRole(user.id, organisationId, ["HEAD"]);
  } catch (e) {
    if (e instanceof ForbiddenError || e instanceof AuthError) return { ok: false, error: e.message };
    throw e;
  }

  const membership = await prisma.organisationMembership.findUnique({ where: { id: membershipId } });
  if (!membership || membership.organisationId !== organisationId) {
    return { ok: false, error: "Member not found in this organisation." };
  }
  if (membership.userId === user.id) {
    return { ok: false, error: "You cannot change your own role." };
  }

  await prisma.organisationMembership.update({ where: { id: membershipId }, data: { role } });
  await logAudit({
    actorId: user.id,
    action: "ORG_ROLE_CHANGED",
    targetType: "OrganisationMembership",
    targetId: membershipId,
    meta: { role },
  });
  revalidatePath(`/organisations/${organisationId}`);
  return { ok: true };
}
