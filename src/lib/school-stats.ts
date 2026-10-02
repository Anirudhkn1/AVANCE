import "server-only";
import { prisma } from "@/lib/prisma";
import { istDay, istDayStart, istMonthStart, lastIstDays, previousIstDay } from "@/lib/school";

export type Period = "daily" | "monthly";

export function parsePeriod(value: string | undefined): Period {
  return value === "monthly" ? "monthly" : "daily";
}

function periodStart(period: Period) {
  return period === "monthly" ? istMonthStart() : istDayStart(istDay());
}

function approvedKids(classroomId: string) {
  return prisma.kidProfile.findMany({
    where: { classroomId, classroomStatus: "APPROVED" },
    select: { id: true, name: true, avatarSeed: true, xp: true },
    orderBy: { name: "asc" },
  });
}

/**
 * Homework completed in the period, per kid of the classroom, with standard
 * competition ranking (1, 1, 3): rank = 1 + how many kids finished more.
 */
export async function classroomLeaderboard(classroomId: string, period: Period) {
  // Filtering on the kid relation (not a list of ids) lets both run at once.
  const [kids, grouped] = await Promise.all([
    approvedKids(classroomId),
    prisma.homeworkCompletion.groupBy({
      by: ["kidId"],
      where: {
        kid: { classroomId, classroomStatus: "APPROVED" },
        completedAt: { gte: periodStart(period) },
        homework: { subject: { classroomId } },
      },
      _count: { _all: true },
    }),
  ]);
  const counts = new Map(grouped.map((g) => [g.kidId, g._count._all]));
  const rows = kids.map((k) => ({ ...k, count: counts.get(k.id) ?? 0 }));
  const rankOf = (count: number) => 1 + rows.filter((r) => r.count > count).length;
  const ranked = rows.map((r) => ({ ...r, rank: rankOf(r.count) })).sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));

  const tierMap = new Map<number, number>();
  for (const r of rows) tierMap.set(r.count, (tierMap.get(r.count) ?? 0) + 1);
  const tiers = [...tierMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([count, students]) => ({ count, students, rank: rankOf(count) }));

  return { ranked, tiers };
}

/** Full stats for one kid inside their classroom. */
export async function kidStats(kidId: string, classroomId: string) {
  const [subjects, completions] = await Promise.all([
    prisma.subject.findMany({
      where: { classroomId },
      select: { id: true, name: true, _count: { select: { homework: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.homeworkCompletion.findMany({
      where: { kidId, homework: { subject: { classroomId } } },
      select: { completedAt: true, late: true, homework: { select: { subjectId: true } } },
    }),
  ]);

  const perSubject = subjects.map((s) => {
    const done = completions.filter((c) => c.homework.subjectId === s.id);
    return { id: s.id, name: s.name, assigned: s._count.homework, completed: done.length, late: done.filter((c) => c.late).length };
  });
  const assigned = perSubject.reduce((n, s) => n + s.assigned, 0);
  const completed = completions.length;
  const late = completions.filter((c) => c.late).length;

  const perDay = new Map<string, number>();
  for (const c of completions) {
    const d = istDay(c.completedAt);
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  let day = istDay();
  if (!perDay.has(day)) day = previousIstDay(day);
  let streak = 0;
  while (perDay.has(day)) {
    streak++;
    day = previousIstDay(day);
  }

  return {
    perSubject,
    assigned,
    completed,
    onTimePct: completed ? Math.round(((completed - late) / completed) * 100) : null,
    streak,
    last30: lastIstDays(30).map((d) => ({ day: d, count: perDay.get(d) ?? 0 })),
  };
}

/** Per-student rows for one subject, or (subjectId null) the whole classroom. */
export async function studentRows(classroomId: string, subjectId: string | null) {
  const homeworkWhere = subjectId ? { subjectId } : { subject: { classroomId } };
  const [kids, assigned, completions] = await Promise.all([
    approvedKids(classroomId),
    prisma.homework.count({ where: homeworkWhere }),
    prisma.homeworkCompletion.findMany({
      where: { homework: homeworkWhere, kid: { classroomId, classroomStatus: "APPROVED" } },
      select: { kidId: true, completedAt: true, late: true },
    }),
  ]);
  return kids.map((k) => {
    const mine = completions.filter((c) => c.kidId === k.id);
    const late = mine.filter((c) => c.late).length;
    const last = mine.reduce<Date | null>((m, c) => (!m || c.completedAt > m ? c.completedAt : m), null);
    return {
      ...k,
      assigned,
      completed: mine.length,
      onTimePct: mine.length ? Math.round(((mine.length - late) / mine.length) * 100) : null,
      last,
    };
  });
}

/** Completion % per subject across the classroom's approved kids. */
export async function subjectCompletion(classroomId: string) {
  const [kidCount, subjects] = await Promise.all([
    prisma.kidProfile.count({ where: { classroomId, classroomStatus: "APPROVED" } }),
    prisma.subject.findMany({
      where: { classroomId },
      select: { id: true, name: true, homework: { select: { _count: { select: { completions: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);
  return subjects.map((s) => {
    const possible = s.homework.length * kidCount;
    const done = s.homework.reduce((n, h) => n + h._count.completions, 0);
    return { id: s.id, name: s.name, pct: possible ? Math.round((done / possible) * 100) : null };
  });
}
