// Demo data matching the primary demo scenario in prd.md §44:
// a host uploads "Build a C Banking Management System", the quest builder
// proposes 6 checkpoints, students progress at different rates, and the
// command center shows a realistic on-track / at-risk / critical spread
// plus a checkpoint bottleneck.

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
// Not importing src/lib/supabase/admin.ts here: it has `import "server-only"`,
// which Next's bundler special-cases but plain `tsx` (this script's runtime)
// can't resolve — so this seed script builds its own admin client inline.
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AVATAR_OBJECTS = [
  "🪐", "🧭", "🧊", "🪀", "🔭", "🪁", "🧩", "🪄", "🧬", "🛰️",
  "🪛", "🧯", "🪃", "🧱", "🪆", "🧿", "🪤", "🧰", "🪑", "🧶",
];

function avatarFor(i: number) {
  return AVATAR_OBJECTS[i % AVATAR_OBJECTS.length];
}

const DEMO_PASSWORD = "password123";

// `npm run db:reset` runs `prisma db push --force-reset` (drops/recreates
// only the tables Prisma manages, i.e. the `public` schema) followed by this
// seed — it never touches Supabase's separate `auth` schema. So on a second
// run, `prisma.user` is empty but the Supabase Auth users from the previous
// run still exist. Look one up by email before creating, so re-seeding
// doesn't fail on "user already registered".
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email === email)?.id ?? null;
}

async function ensureUser({ name, email, avatarSeed }: { name: string; email: string; avatarSeed: string }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  let authUserId = await findAuthUserIdByEmail(email);
  if (!authUserId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { name },
    });
    if (error || !data.user) throw error ?? new Error(`Failed to create auth user for ${email}`);
    authUserId = data.user.id;
  }

  return prisma.user.create({ data: { id: authUserId, name, email, avatarSeed } });
}

// `prisma db push --force-reset` (used by `npm run db:reset`) drops and
// recreates the entire `public` schema, which wipes Supabase's default role
// grants on it (a known Prisma+Supabase gotcha — Prisma's own connection is
// unaffected since it connects as the schema owner, but the anon/authenticated/
// service_role roles PostgREST and the dashboard use lose access). Restore
// them every run so a reset never needs a manual fix-up afterwards.
async function restoreSupabaseGrants() {
  const roles = "postgres, anon, authenticated, service_role";
  const statements = [
    `grant usage on schema public to ${roles}`,
    `grant all on all tables in schema public to ${roles}`,
    `grant all on all sequences in schema public to ${roles}`,
    `grant all on all functions in schema public to ${roles}`,
    `alter default privileges in schema public grant all on tables to ${roles}`,
    `alter default privileges in schema public grant all on sequences to ${roles}`,
    `alter default privileges in schema public grant all on functions to ${roles}`,
  ];
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function main() {
  console.log("Seeding Avance demo data…");
  await restoreSupabaseGrants();

  // --- Users --------------------------------------------------------------
  const head = await ensureUser({ name: "Ravi Kumar", email: "head@avance.dev", avatarSeed: avatarFor(0) });
  const host = await ensureUser({ name: "Dr. Meera Nair", email: "host@avance.dev", avatarSeed: avatarFor(1) });

  const studentNames = [
    "Ani", "Rahul", "Priya", "Arjun", "Sneha", "Vikram",
    "Divya", "Karthik", "Isha", "Rohan", "Kavya", "Aditya",
  ];
  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const email = `student${i + 1}@avance.dev`;
    const student = await ensureUser({ name: studentNames[i], email, avatarSeed: avatarFor(i + 2) });
    students.push(student);
  }

  // --- Organisation ---------------------------------------------------------
  const org = await prisma.organisation.upsert({
    where: { slug: "cse-a" },
    update: {},
    create: {
      name: "CSE-A",
      slug: "cse-a",
      joinCode: "CSEA-2025",
      createdById: head.id,
    },
  });

  async function ensureMembership(userId: string, role: string) {
    return prisma.organisationMembership.upsert({
      where: { userId_organisationId: { userId, organisationId: org.id } },
      update: { role },
      create: { userId, organisationId: org.id, role },
    });
  }

  await ensureMembership(head.id, "HEAD");
  await ensureMembership(host.id, "HOST");
  const studentMemberships = [];
  for (const s of students) {
    studentMemberships.push(await ensureMembership(s.id, "STUDENT"));
  }

  // --- Group ------------------------------------------------------------
  let group = await prisma.group.findFirst({ where: { organisationId: org.id, name: "CSE-A / DBMS Batch" } });
  if (!group) {
    group = await prisma.group.create({
      data: { organisationId: org.id, name: "CSE-A / DBMS Batch", createdById: host.id },
    });
  }

  for (const s of students) {
    await prisma.groupMembership.upsert({
      where: { userId_groupId: { userId: s.id, groupId: group.id } },
      update: {},
      create: { userId: s.id, groupId: group.id },
    });
  }

  // --- Project + checkpoints ----------------------------------------------
  const now = new Date();
  const publishedAt = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  const deadline = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  let project = await prisma.project.findFirst({ where: { groupId: group.id, title: "Build a C Banking Management System" } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        groupId: group.id,
        title: "Build a C Banking Management System",
        description:
          "Build a C banking management system with account creation, deletion, searching, sorting and testing.",
        requirements: JSON.stringify([
          "Support account creation and deletion",
          "Support searching accounts",
          "Support sorting accounts",
          "Include automated or manual tests",
        ]),
        deadline,
        status: "PUBLISHED",
        verificationMode: "HOST_APPROVAL",
        aiGenerated: true,
        sourceType: "TEXT",
        sourceExcerpt: "Build a C banking management system with account creation, deletion, searching, sorting and testing.",
        createdById: host.id,
        publishedAt,
      },
    });
  }

  const checkpointDefs = [
    { title: "Understand Requirements", description: "Read the assignment and list all requirements before coding.", submissionRequired: false, xpValue: 10 },
    { title: "Design Data Structures", description: "Design the account record structure and storage approach.", submissionRequired: true, xpValue: 15 },
    { title: "Implement Core Functions", description: "Implement account creation and deletion.", submissionRequired: true, xpValue: 20 },
    { title: "Implement Searching & Sorting", description: "Implement and verify searching and sorting of accounts.", submissionRequired: true, xpValue: 20 },
    { title: "Testing", description: "Test the system against the requirements and edge cases.", submissionRequired: true, xpValue: 20 },
    { title: "Final Submission", description: "Submit the completed system for grading.", submissionRequired: true, xpValue: 15 },
  ];

  const checkpoints = [];
  for (let i = 0; i < checkpointDefs.length; i++) {
    const def = checkpointDefs[i];
    const cp = await prisma.checkpoint.upsert({
      where: { projectId_order: { projectId: project.id, order: i + 1 } },
      update: {},
      create: { projectId: project.id, order: i + 1, aiGenerated: true, ...def },
    });
    checkpoints.push(cp);
  }

  // --- Per-student progress spread (drives the command center demo) -------
  // Completed-checkpoint counts chosen to produce a realistic bottleneck
  // curve and a mix of on-track / at-risk / critical students.
  const completedCounts = [6, 5, 5, 4, 4, 4, 3, 3, 2, 2, 1, 0];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const membership = studentMemberships[i];
    const completedCount = completedCounts[i] ?? 0;
    let xpTotal = 0;
    let lastActivity: Date | null = null;

    for (let c = 0; c < completedCount; c++) {
      const cp = checkpoints[c];
      const completedAt = new Date(publishedAt.getTime() + (c + 1) * 16 * 60 * 60 * 1000);
      lastActivity = completedAt;
      xpTotal += cp.xpValue;

      await prisma.checkpointProgress.upsert({
        where: { checkpointId_userId: { checkpointId: cp.id, userId: student.id } },
        update: { completed: true, completedAt, xpAwarded: cp.xpValue },
        create: { checkpointId: cp.id, userId: student.id, completed: true, completedAt, xpAwarded: cp.xpValue },
      });

      if (cp.submissionRequired) {
        await prisma.checkpointSubmission.create({
          data: {
            checkpointId: cp.id,
            userId: student.id,
            fileName: `${cp.title.replace(/\s+/g, "_").toLowerCase()}.pdf`,
            filePath: "seed/placeholder.pdf",
            fileSize: 102_400,
            status: "APPROVED",
            submittedAt: completedAt,
            reviewedAt: completedAt,
            reviewerId: host.id,
          },
        });
      }

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

    // A couple of students have a submission awaiting host approval right now.
    if (completedCount < checkpoints.length && [2, 3, 8].includes(i)) {
      const nextCp = checkpoints[completedCount];
      if (nextCp.submissionRequired) {
        await prisma.checkpointSubmission.create({
          data: {
            checkpointId: nextCp.id,
            userId: student.id,
            fileName: `${nextCp.title.replace(/\s+/g, "_").toLowerCase()}_submission.pdf`,
            filePath: "seed/placeholder.pdf",
            fileSize: 98_304,
            status: "PENDING",
            submittedAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
          },
        });
      }
    }

    await prisma.organisationMembership.update({
      where: { id: membership.id },
      data: {
        xp: xpTotal,
        streakCurrent: Math.min(completedCount, 4),
        streakLongest: Math.min(completedCount, 4),
        lastActivityAt: lastActivity,
      },
    });
  }

  // A couple of reactions on the top performer's latest completion.
  const topEvent = await prisma.activityEvent.findFirst({
    where: { userId: students[0].id },
    orderBy: { createdAt: "desc" },
  });
  if (topEvent) {
    for (const [idx, emoji] of ["👍", "🔥"].entries()) {
      await prisma.reaction.upsert({
        where: { activityEventId_actorId_emoji: { activityEventId: topEvent.id, actorId: students[idx + 1].id, emoji } },
        update: {},
        create: { activityEventId: topEvent.id, actorId: students[idx + 1].id, emoji },
      });
    }
  }

  // --- Host alert notification ---------------------------------------------
  await prisma.notification.create({
    data: {
      userId: host.id,
      type: "HOST_ALERT",
      title: "Students may need attention",
      message: "3 students in CSE-A / DBMS Batch are At Risk or Critical on Build a C Banking Management System.",
      link: `/organisations/${org.id}/command-center`,
    },
  });

  // --- A personal habit for the first student, outside the org hierarchy --
  const habit = await prisma.habit.upsert({
    where: { id: `${students[0].id}-dsa-habit` },
    update: {},
    create: {
      id: `${students[0].id}-dsa-habit`,
      userId: students[0].id,
      title: "Practice DSA for 30 minutes",
      frequency: "DAILY",
    },
  });
  for (let d = 0; d < 4; d++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d);
    await prisma.habitCompletion.upsert({
      where: { habitId_date: { habitId: habit.id, date } },
      update: {},
      create: { habitId: habit.id, date },
    });
  }

  console.log("\nSeed complete. Demo accounts (all use password: %s):", DEMO_PASSWORD);
  console.log("  Org Head : head@avance.dev");
  console.log("  Host     : host@avance.dev");
  console.log("  Students : student1@avance.dev … student12@avance.dev");
  console.log(`  Org join code: ${org.joinCode}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
