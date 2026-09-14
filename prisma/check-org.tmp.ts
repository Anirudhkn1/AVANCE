import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const org = await prisma.organisation.findUnique({ where: { slug: "sir-mvit" } });
  console.log("ORG:", org);

  const creator = await prisma.user.findUnique({ where: { id: org!.createdById } });
  console.log("CREATOR:", creator);

  const memberships = await prisma.organisationMembership.findMany({
    where: { organisationId: org!.id },
    include: { user: true },
  });
  console.log("MEMBERSHIPS (", memberships.length, "):");
  for (const m of memberships) {
    console.log(" -", m.role, m.user.name, m.user.email, "joinedAt:", m.joinedAt);
  }

  const groups = await prisma.group.findMany({ where: { organisationId: org!.id } });
  console.log("GROUPS (", groups.length, "):");
  for (const g of groups) {
    console.log(" -", g.name, "createdAt:", g.createdAt, "createdById:", g.createdById);
  }
}
main().finally(() => prisma.$disconnect());
