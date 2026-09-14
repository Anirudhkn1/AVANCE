// One-off demo/trial data for a "host preview" recording.
// Mirrors the idioms in prisma/seed.ts but writes a separate, additive
// dataset — does not touch or reset the app's existing demo org (CSE-A).
// Safe to re-run: everything is upserted or looked up by unique key first.

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AVATAR_OBJECTS = ["🌸", "🪴", "📚", "🎧", "🧘", "🪄", "🧵", "🪁", "🧊", "🪀"];
function avatarFor(i: number) {
  return AVATAR_OBJECTS[i % AVATAR_OBJECTS.length];
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email)?.id ?? null;
}

async function ensureUser({
  name,
  email,
  password,
  avatarSeed,
}: {
  name: string;
  email: string;
  password: string;
  avatarSeed: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  let authUserId = await findAuthUserIdByEmail(email);
  if (!authUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !data.user) throw error ?? new Error(`Failed to create auth user for ${email}`);
    authUserId = data.user.id;
  }

  return prisma.user.create({ data: { id: authUserId, name, email, avatarSeed } });
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const HOST_EMAIL = "divya.demo@gmail.com";
const HOST_PASSWORD = "Divya@2026";
const STUDENT_PASSWORD = "password123";

async function main() {
  console.log("Seeding Divya host-preview demo data…");

  // --- Host user ------------------------------------------------------------
  const divya = await ensureUser({
    name: "Divya",
    email: HOST_EMAIL,
    password: HOST_PASSWORD,
    avatarSeed: avatarFor(0),
  });

  // --- Fake students ----------------------------------------------------------
  const studentDefs = [
    "Aarav Shetty",
    "Sneha Kulkarni",
    "Kabir Rao",
    "Priyanka Nair",
    "Vikram Joshi",
    "Anjali Menon",
    "Rohan Pillai",
  ];
  const students = [];
  for (let i = 0; i < studentDefs.length; i++) {
    const email = `sirmvit.student${i + 1}@avance.dev`;
    students.push(
      await ensureUser({ name: studentDefs[i], email, password: STUDENT_PASSWORD, avatarSeed: avatarFor(i + 1) })
    );
  }

  // --- Organisation: Sir MVIT --------------------------------------------
  const org = await prisma.organisation.upsert({
    where: { slug: "sir-mvit" },
    update: {},
    create: {
      name: "Sir MVIT",
      slug: "sir-mvit",
      joinCode: "MVIT-CSE1",
      createdById: divya.id,
    },
  });

  await prisma.organisationMembership.upsert({
    where: { userId_organisationId: { userId: divya.id, organisationId: org.id } },
    update: { role: "HEAD" },
    create: { userId: divya.id, organisationId: org.id, role: "HEAD" },
  });

  const studentMemberships = [];
  for (const s of students) {
    studentMemberships.push(
      await prisma.organisationMembership.upsert({
        where: { userId_organisationId: { userId: s.id, organisationId: org.id } },
        update: { role: "STUDENT" },
        create: { userId: s.id, organisationId: org.id, role: "STUDENT" },
      })
    );
  }

  // --- Group: CSE Assignment 1, hosted by Divya --------------------------
  let group = await prisma.group.findFirst({ where: { organisationId: org.id, name: "CSE Assignment 1" } });
  if (!group) {
    group = await prisma.group.create({
      data: { organisationId: org.id, name: "CSE Assignment 1", createdById: divya.id },
    });
  }

  for (const s of students) {
    await prisma.groupMembership.upsert({
      where: { userId_groupId: { userId: s.id, groupId: group.id } },
      update: {},
      create: { userId: s.id, groupId: group.id },
    });
  }

  // --- Project (the actual assignment) + checkpoints ----------------------
  const publishedAt = daysAgo(3);
  const deadline = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);

  let project = await prisma.project.findFirst({
    where: { groupId: group.id, title: "Student Record Management System in C" },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        groupId: group.id,
        title: "Student Record Management System in C",
        description:
          "Build a C program that manages student records: add, delete, search and sort by roll number, with basic file persistence.",
        requirements: JSON.stringify([
          "Support adding and deleting student records",
          "Support searching by roll number",
          "Support sorting by name or marks",
          "Persist records to a file",
        ]),
        deadline,
        status: "PUBLISHED",
        verificationMode: "HOST_APPROVAL",
        aiGenerated: false,
        sourceType: "MANUAL",
        createdById: divya.id,
        publishedAt,
      },
    });
  }

  const checkpointDefs = [
    { title: "Understand Requirements", description: "Read the assignment and list all requirements before coding.", submissionRequired: false, xpValue: 10 },
    { title: "Design Data Structures", description: "Design the student record structure and file layout.", submissionRequired: true, xpValue: 20 },
    { title: "Implement Core Functions", description: "Implement add, delete and search.", submissionRequired: true, xpValue: 25 },
    { title: "Testing & Final Submission", description: "Test against edge cases and submit the completed program.", submissionRequired: true, xpValue: 25 },
  ];
  const checkpoints = [];
  for (let i = 0; i < checkpointDefs.length; i++) {
    const cp = await prisma.checkpoint.upsert({
      where: { projectId_order: { projectId: project.id, order: i + 1 } },
      update: {},
      create: { projectId: project.id, order: i + 1, ...checkpointDefs[i] },
    });
    checkpoints.push(cp);
  }

  // --- Leaderboard spread: fake student progress ---------------------------
  const completedCounts = [4, 3, 3, 2, 1, 1, 0];
  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const membership = studentMemberships[i];
    const completedCount = completedCounts[i] ?? 0;
    let xpTotal = 0;
    let lastActivity: Date | null = null;

    for (let c = 0; c < completedCount; c++) {
      const cp = checkpoints[c];
      const completedAt = new Date(publishedAt.getTime() + (c + 1) * 14 * 60 * 60 * 1000);
      lastActivity = completedAt;
      xpTotal += cp.xpValue;

      await prisma.checkpointProgress.upsert({
        where: { checkpointId_userId: { checkpointId: cp.id, userId: student.id } },
        update: { completed: true, completedAt, xpAwarded: cp.xpValue },
        create: { checkpointId: cp.id, userId: student.id, completed: true, completedAt, xpAwarded: cp.xpValue },
      });

      await prisma.activityEvent.create({
        data: {
          organisationId: org.id,
          groupId: group.id,
          userId: student.id,
          type: "CHECKPOINT_COMPLETED",
          message: `completed ${cp.title}`,
          projectId: project.id,
          checkpointId: cp.id,
          createdAt: completedAt,
        },
      });
    }

    await prisma.organisationMembership.update({
      where: { id: membership.id },
      data: {
        xp: xpTotal,
        streakCurrent: Math.min(completedCount, 3),
        streakLongest: Math.min(completedCount, 3),
        lastActivityAt: lastActivity,
      },
    });
  }

  // A host alert notification, so the command center / notifications feel alive.
  await prisma.notification.create({
    data: {
      userId: divya.id,
      type: "HOST_ALERT",
      title: "Students may need attention",
      message: "2 students in CSE Assignment 1 haven't started Student Record Management System in C yet.",
      link: `/organisations/${org.id}/groups/${group.id}`,
    },
  });

  // --- Divya's personal habits -------------------------------------------
  const habitDefs = [
    { key: "reading", title: "Read a book for 15 minutes" },
    { key: "meditation", title: "Meditate for 15 minutes" },
  ];
  for (const def of habitDefs) {
    const habit = await prisma.habit.upsert({
      where: { id: `${divya.id}-${def.key}-habit` },
      update: {},
      create: { id: `${divya.id}-${def.key}-habit`, userId: divya.id, title: def.title, frequency: "DAILY" },
    });
    for (let d = 0; d < 3; d++) {
      const date = startOfDay(daysAgo(d));
      await prisma.habitCompletion.upsert({
        where: { habitId_date: { habitId: habit.id, date } },
        update: {},
        create: { habitId: habit.id, date },
      });
    }
  }

  // --- Divya's focus session history ---------------------------------------
  const focusDefs = [
    { daysBack: 0, targetSeconds: 1500, actualSeconds: 1500, completed: true }, // today, 25 min
    { daysBack: 0, targetSeconds: 900, actualSeconds: 540, completed: false }, // today, stopped early
    { daysBack: 1, targetSeconds: 1800, actualSeconds: 1800, completed: true }, // yesterday, 30 min
    { daysBack: 2, targetSeconds: 2700, actualSeconds: 2700, completed: true }, // 2 days ago, 45 min
  ];
  for (const f of focusDefs) {
    const startedAt = new Date(daysAgo(f.daysBack).setHours(18, 0, 0, 0));
    const endedAt = new Date(startedAt.getTime() + f.actualSeconds * 1000);
    const existing = await prisma.focusSession.findFirst({
      where: { userId: divya.id, startedAt, targetSeconds: f.targetSeconds },
    });
    if (!existing) {
      await prisma.focusSession.create({
        data: {
          userId: divya.id,
          targetSeconds: f.targetSeconds,
          actualSeconds: f.actualSeconds,
          completed: f.completed,
          startedAt,
          endedAt,
        },
      });
    }
  }

  console.log("\nDone.");
  console.log("Host login  :", HOST_EMAIL, "/", HOST_PASSWORD);
  console.log("Org         :", org.name, "join code:", org.joinCode);
  console.log("Group       :", group.name);
  console.log("Project     :", project.title);
  console.log("Students    :", students.length, "(password:", STUDENT_PASSWORD, "for all)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
