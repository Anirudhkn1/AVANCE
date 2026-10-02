import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeRisk, type RiskResult } from "@/lib/risk";
import { getCheckpointStates, getCompletedCount } from "@/lib/progress";

export interface StudentProgressRow {
  userId: string;
  name: string;
  avatarSeed: string;
  completedCount: number;
  total: number;
  risk: RiskResult;
  currentCheckpointTitle: string | null;
}

export interface CheckpointHealthRow {
  checkpointId: string;
  order: number;
  title: string;
  completedCount: number;
  pct: number;
}

export interface ProjectAnalytics {
  studentCount: number;
  onTrack: number;
  atRisk: number;
  critical: number;
  overallPct: number;
  checkpointHealth: CheckpointHealthRow[];
  bottleneckCheckpointId: string | null;
  students: StudentProgressRow[];
  pendingVerifications: number;
}

/** Include this when loading a project to pass it straight to getProjectAnalytics. */
export const ANALYTICS_PROJECT_INCLUDE = {
  checkpoints: { orderBy: { order: "asc" } },
  group: true,
} satisfies Prisma.ProjectInclude;

export type AnalyticsProject = Prisma.ProjectGetPayload<{ include: typeof ANALYTICS_PROJECT_INCLUDE }>;

/**
 * Institution Command Center analytics (PRD §16-19). Built only from
 * checkpoint completion + deadlines — no device/activity monitoring.
 * Pass an already-loaded project (with ANALYTICS_PROJECT_INCLUDE) to skip
 * re-fetching it.
 */
export async function getProjectAnalytics(
  projectOrId: string | AnalyticsProject,
  now: Date = new Date()
): Promise<ProjectAnalytics> {
  const project =
    typeof projectOrId === "string"
      ? await prisma.project.findUniqueOrThrow({ where: { id: projectOrId }, include: ANALYTICS_PROJECT_INCLUDE })
      : projectOrId;

  // Everything below only needs the project, so it's fetched in one parallel
  // round trip instead of four sequential ones.
  const checkpointIds = project.checkpoints.map((c) => c.id);
  const [groupMembers, memberships, allProgress, pendingVerifications] = await Promise.all([
    prisma.groupMembership.findMany({
      where: { groupId: project.groupId },
      include: { user: true },
    }),
    prisma.organisationMembership.findMany({
      where: {
        organisationId: project.group.organisationId,
        user: { groupMemberships: { some: { groupId: project.groupId } } },
      },
    }),
    prisma.checkpointProgress.findMany({
      where: { checkpointId: { in: checkpointIds } },
    }),
    prisma.checkpointSubmission.count({
      where: { checkpointId: { in: checkpointIds }, status: "PENDING" },
    }),
  ]);
  const membershipByUser = new Map(memberships.map((m) => [m.userId, m]));

  const students: StudentProgressRow[] = [];
  const completedCountByCheckpoint = new Map(checkpointIds.map((id) => [id, 0]));

  for (const member of groupMembers) {
    const membership = membershipByUser.get(member.userId);
    if (!membership || membership.role !== "STUDENT") continue; // command center is about students

    const myProgress = allProgress.filter((p) => p.userId === member.userId);
    const completedIds = new Set(myProgress.filter((p) => p.completed).map((p) => p.checkpointId));
    for (const id of completedIds) {
      completedCountByCheckpoint.set(id, (completedCountByCheckpoint.get(id) ?? 0) + 1);
    }
    const completedCount = getCompletedCount(completedIds, checkpointIds);
    const states = getCheckpointStates(project.checkpoints, completedIds);
    const currentCp = project.checkpoints.find((c) => states.get(c.id) === "current");

    const risk = computeRisk({
      completed: completedCount,
      total: project.checkpoints.length,
      startedAt: project.publishedAt ?? project.createdAt,
      deadline: project.deadline,
      now,
      lastActivityAt: membership.lastActivityAt,
    });

    students.push({
      userId: member.userId,
      name: member.user.name,
      avatarSeed: member.user.avatarSeed,
      completedCount,
      total: project.checkpoints.length,
      risk,
      currentCheckpointTitle: currentCp?.title ?? null,
    });
  }

  const checkpointHealth: CheckpointHealthRow[] = project.checkpoints.map((c) => {
    const completedCount = completedCountByCheckpoint.get(c.id) ?? 0;
    return {
      checkpointId: c.id,
      order: c.order,
      title: c.title,
      completedCount,
      pct: students.length === 0 ? 0 : Math.round((completedCount / students.length) * 100),
    };
  });

  const bottleneck = checkpointHealth.reduce<CheckpointHealthRow | null>((worst, row) => {
    if (!worst || row.pct < worst.pct) return row;
    return worst;
  }, null);

  const overallPct =
    students.length === 0
      ? 0
      : Math.round((students.reduce((s, st) => s + st.completedCount, 0) / (students.length * project.checkpoints.length)) * 100);

  return {
    studentCount: students.length,
    onTrack: students.filter((s) => s.risk.level === "ON_TRACK").length,
    atRisk: students.filter((s) => s.risk.level === "AT_RISK").length,
    critical: students.filter((s) => s.risk.level === "CRITICAL").length,
    overallPct,
    checkpointHealth,
    bottleneckCheckpointId: bottleneck && bottleneck.pct < 60 ? bottleneck.checkpointId : null,
    students: students.sort((a, b) => b.completedCount - a.completedCount),
    pendingVerifications,
  };
}
