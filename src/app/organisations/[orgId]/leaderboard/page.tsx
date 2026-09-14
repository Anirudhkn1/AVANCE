import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireMembership } from "@/lib/permissions";
import { getCompletedCount } from "@/lib/progress";
import { Card, Badge, Avatar, EmptyState } from "@/components/ui";

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { orgId } = await params;
  const { group: groupIdParam } = await searchParams;
  const user = await requireSessionUser();
  const membership = await requireMembership(user.id, orgId).catch(() => null);
  if (!membership) notFound();

  const org = await prisma.organisation.findUniqueOrThrow({ where: { id: orgId } });
  const groups = await prisma.group.findMany({ where: { organisationId: orgId }, orderBy: { createdAt: "asc" } });
  if (groups.length === 0) {
    return (
      <div className="mx-auto max-w-2xl w-full px-4 py-16">
        <Card><EmptyState title="No groups yet" /></Card>
      </div>
    );
  }

  const activeGroup = groups.find((g) => g.id === groupIdParam) ?? groups[0];

  const project = await prisma.project.findFirst({
    where: { groupId: activeGroup.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { checkpoints: true },
  });

  const groupMembers = await prisma.groupMembership.findMany({
    where: { groupId: activeGroup.id },
    include: { user: true },
  });
  const memberships = await prisma.organisationMembership.findMany({
    where: { organisationId: orgId, userId: { in: groupMembers.map((m) => m.userId) }, role: "STUDENT" },
  });
  const membershipByUser = new Map(memberships.map((m) => [m.userId, m]));

  let rows: {
    userId: string;
    name: string;
    avatarSeed: string;
    xp: number;
    completedCount: number;
    total: number;
  }[] = [];

  if (project) {
    const progress = await prisma.checkpointProgress.findMany({
      where: { checkpointId: { in: project.checkpoints.map((c) => c.id) }, completed: true },
    });
    const completedByUser = new Map<string, Set<string>>();
    for (const p of progress) {
      if (!completedByUser.has(p.userId)) completedByUser.set(p.userId, new Set());
      completedByUser.get(p.userId)!.add(p.checkpointId);
    }

    rows = groupMembers
      .filter((m) => membershipByUser.has(m.userId))
      .map((m) => {
        const mem = membershipByUser.get(m.userId)!;
        return {
          userId: m.userId,
          name: m.user.name,
          avatarSeed: m.user.avatarSeed,
          xp: mem.xp,
          completedCount: getCompletedCount(
            completedByUser.get(m.userId) ?? new Set(),
            project.checkpoints.map((c) => c.id)
          ),
          total: project.checkpoints.length,
        };
      })
      .sort((a, b) => b.completedCount - a.completedCount || b.xp - a.xp);
  }

  const topPerformer = rows[0];

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <div>
        <p className="text-sm text-muted">{org.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/organisations/${orgId}/leaderboard?group=${g.id}`}
            className={`rounded-full px-3 py-1.5 text-sm border transition-colors ${
              g.id === activeGroup.id ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:bg-surface-muted"
            }`}
          >
            {g.name}
          </Link>
        ))}
      </div>

      {!project ? (
        <Card><EmptyState title="No active project for this group" /></Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState title="No students yet" /></Card>
      ) : (
        <>
          {topPerformer && (
            <Card className="flex items-center gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-xs text-muted">Top performer</p>
                <p className="font-medium">{topPerformer.name}</p>
              </div>
            </Card>
          )}

          <Card padded={false}>
            <ul className="divide-y divide-border">
              {rows.map((r, i) => (
                <li key={r.userId} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-6 text-sm text-muted">#{i + 1}</span>
                  <Avatar seed={r.avatarSeed} size="sm" />
                  <span className="flex-1 font-medium text-sm">{r.name}</span>
                  <Badge tone="neutral">{r.completedCount}/{r.total}</Badge>
                  <span className="text-sm text-muted w-16 text-right">{r.xp} XP</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
