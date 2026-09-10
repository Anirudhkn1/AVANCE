import "server-only";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { OrgRole } from "@/lib/constants";

/**
 * Every sensitive check in this file runs server-side against the session
 * and the database — never trust a client-supplied role, XP, rank or
 * verification value (PRD §35).
 */

export class AuthError extends Error {}
export class ForbiddenError extends Error {}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("Not signed in.");
  return session.user;
}

export async function getMembership(userId: string, organisationId: string) {
  return prisma.organisationMembership.findUnique({
    where: { userId_organisationId: { userId, organisationId } },
  });
}

export async function requireMembership(userId: string, organisationId: string) {
  const membership = await getMembership(userId, organisationId);
  if (!membership) throw new ForbiddenError("You are not a member of this organisation.");
  return membership;
}

export async function requireOrgRole(userId: string, organisationId: string, roles: OrgRole[]) {
  const membership = await requireMembership(userId, organisationId);
  if (!roles.includes(membership.role as OrgRole)) {
    throw new ForbiddenError(`This action requires one of: ${roles.join(", ")}.`);
  }
  return membership;
}

/** HEAD and HOST can both manage groups/projects; only HEAD manages the org itself. */
export function canManageGroups(role: string) {
  return role === "HEAD" || role === "HOST";
}

export async function requireGroupHost(userId: string, groupId: string) {
  const group = await prisma.group.findUniqueOrThrow({ where: { id: groupId } });
  const membership = await requireOrgRole(userId, group.organisationId, ["HEAD", "HOST"]);
  return { group, membership };
}

export async function isGroupMember(userId: string, groupId: string) {
  const gm = await prisma.groupMembership.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  return Boolean(gm);
}
