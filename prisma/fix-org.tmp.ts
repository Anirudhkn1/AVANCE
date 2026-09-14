import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const OLD_ORG_ID = "cmu04op360001xw01u6we4tk5"; // real user's pre-existing "Sir MVIT"
  const divyaEmail = "divya.demo@gmail.com";

  const oldOrg = await prisma.organisation.findUniqueOrThrow({ where: { id: OLD_ORG_ID } });
  const divya = await prisma.user.findUniqueOrThrow({ where: { email: divyaEmail } });

  const studentEmails = Array.from({ length: 7 }, (_, i) => `sirmvit.student${i + 1}@avance.dev`);
  const students = await prisma.user.findMany({ where: { email: { in: studentEmails } } });

  // Capture the memberships we added, to carry xp/streak/lastActivityAt over.
  const toMove = await prisma.organisationMembership.findMany({
    where: { organisationId: OLD_ORG_ID, userId: { in: [divya.id, ...students.map((s) => s.id)] } },
  });
  console.log("Memberships to move:", toMove.length);

  // 1. Create a fresh organisation actually owned by Divya.
  const newOrg = await prisma.organisation.create({
    data: {
      name: "Sir MVIT",
      slug: "sir-mvit-divya-demo",
      joinCode: "SMVT-DIVA",
      createdById: divya.id,
    },
  });
  console.log("New org:", newOrg.id, newOrg.slug, newOrg.joinCode);

  // 2. Re-point the group (and everything hanging off it: project, checkpoints,
  //    checkpoint progress, submissions) to the new org — group itself, not its children, holds organisationId.
  const group = await prisma.group.findFirstOrThrow({
    where: { organisationId: OLD_ORG_ID, name: "CSE Assignment 1" },
  });
  await prisma.group.update({ where: { id: group.id }, data: { organisationId: newOrg.id } });
  console.log("Moved group", group.id, "to new org");

  // 3. Re-point activity events created for this demo.
  const activityUpdate = await prisma.activityEvent.updateMany({
    where: { organisationId: OLD_ORG_ID, groupId: group.id },
    data: { organisationId: newOrg.id },
  });
  console.log("Moved activity events:", activityUpdate.count);

  // 4. Recreate memberships under the new org with the same xp/streak data, then
  //    delete the ones on the real user's org.
  for (const m of toMove) {
    await prisma.organisationMembership.create({
      data: {
        userId: m.userId,
        organisationId: newOrg.id,
        role: m.role,
        xp: m.xp,
        streakCurrent: m.streakCurrent,
        streakLongest: m.streakLongest,
        lastActivityAt: m.lastActivityAt,
        fairPlayScore: m.fairPlayScore,
      },
    });
  }
  const deleted = await prisma.organisationMembership.deleteMany({
    where: { organisationId: OLD_ORG_ID, userId: { in: [divya.id, ...students.map((s) => s.id)] } },
  });
  console.log("Removed demo memberships from real org:", deleted.count);

  // 5. Fix Divya's notification link.
  const notifUpdate = await prisma.notification.updateMany({
    where: { userId: divya.id, type: "HOST_ALERT" },
    data: { link: `/organisations/${newOrg.id}/groups/${group.id}` },
  });
  console.log("Updated notifications:", notifUpdate.count);

  // 6. Verify the real org is back to its original single membership.
  const remaining = await prisma.organisationMembership.findMany({
    where: { organisationId: OLD_ORG_ID },
    include: { user: true },
  });
  console.log("Real org now has", remaining.length, "membership(s):", remaining.map((m) => m.user.email));

  console.log("\nDONE. New demo org id:", newOrg.id, "slug:", newOrg.slug, "joinCode:", newOrg.joinCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
