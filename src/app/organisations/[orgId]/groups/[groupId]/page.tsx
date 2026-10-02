import { notFound } from "next/navigation";
import { after } from "next/server";
import Link from "next/link";
import { requireSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireMembership, canManageGroups, isGroupMember } from "@/lib/permissions";
import { getCompletedCount } from "@/lib/progress";
import { computeRisk } from "@/lib/risk";
import { getProjectAnalytics, ANALYTICS_PROJECT_INCLUDE } from "@/lib/analytics";
import { sweepExpiredProjects, purgeReviewedUploads } from "@/lib/retention";
import { formatTimeRemaining } from "@/lib/format";
import { Card, SectionHeading, Badge, EmptyState, LinkButton, Avatar } from "@/components/ui";
import { JoinGroupButton } from "@/components/join-group-button";
import { ActivityFeed } from "@/components/activity-feed";
import { QuestPath } from "@/components/quest-path";

export default async function GroupPage({ params }: { params: Promise<{ orgId: string; groupId: string }> }) {
  const { orgId, groupId } = await params;
  const userId = await requireSessionUserId();
  // Archives expired projects, so it must finish before projects are read —
  // started first so it overlaps the access checks. Housekeeping only: a
  // failure is logged rather than breaking the page.
  const swept = sweepExpiredProjects(groupId).catch((err) => console.error("sweepExpiredProjects failed:", err));
  // Independent lookups — one round trip instead of three.
  const [membership, group, memberOfGroup] = await Promise.all([
    requireMembership(userId, orgId).catch(() => null),
    prisma.group.findUnique({ where: { id: groupId }, include: { organisation: true } }),
    isGroupMember(userId, groupId),
  ]);
  if (!membership) notFound();
  if (!group || group.organisationId !== orgId) notFound();

  const isHost = canManageGroups(membership.role);

  if (isHost) {
    // Storage housekeeping doesn't affect this page, so it runs after the
    // response is sent instead of holding up the render.
    after(() => purgeReviewedUploads().catch((err) => console.error("purgeReviewedUploads failed:", err)));

    const [projects, memberCount] = await Promise.all([
      swept.then(() =>
        prisma.project.findMany({
          where: { groupId },
          orderBy: { createdAt: "desc" },
          include: ANALYTICS_PROJECT_INCLUDE,
        })
      ),
      prisma.groupMembership.count({ where: { groupId } }),
    ]);

    const publishedAnalytics = await Promise.all(
      projects.filter((p) => p.status === "PUBLISHED").map((p) => getProjectAnalytics(p))
    );
    const analyticsByProject = new Map(
      projects.filter((p) => p.status === "PUBLISHED").map((p, i) => [p.id, publishedAnalytics[i]])
    );

    return (
      <div className="mx-auto max-w-5xl w-full px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              <Link href={`/organisations/${orgId}`} className="hover:text-foreground">
                {group.organisation.name}
              </Link>
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
            <p className="text-sm text-muted mt-1">{memberCount} member(s)</p>
          </div>
          <LinkButton href={`/organisations/${orgId}/groups/${groupId}/projects/new`}>+ New Project</LinkButton>
        </div>

        <div>
          <SectionHeading title="Projects" />
          {projects.length === 0 ? (
            <Card>
              <EmptyState
                title="No projects yet"
                description="Use the AI Quest Builder to turn an assignment into a linear checkpoint quest."
                action={<LinkButton href={`/organisations/${orgId}/groups/${groupId}/projects/new`}>Create your first project</LinkButton>}
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => {
                const analytics = analyticsByProject.get(p.id);
                return (
                  <Link key={p.id} href={`/organisations/${orgId}/groups/${groupId}/projects/${p.id}`}>
                    <Card className="hover:border-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{p.title}</h3>
                            <Badge tone={p.status === "PUBLISHED" ? "success" : p.status === "DRAFT" ? "neutral" : "warning"}>
                              {p.status}
                            </Badge>
                            {p.aiGenerated && <Badge tone="accent">AI-generated</Badge>}
                          </div>
                          <p className="text-sm text-muted mt-1">
                            {p.checkpoints.length} checkpoints · due {formatTimeRemaining(p.deadline)}
                          </p>
                        </div>
                        {analytics && (
                          <div className="text-right text-sm shrink-0">
                            <p className="font-medium">{analytics.overallPct}% complete</p>
                            <p className="text-muted">
                              🟢{analytics.onTrack} 🟡{analytics.atRisk} 🔴{analytics.critical}
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Student view ---------------------------------------------------
  await swept;
  if (!memberOfGroup) {
    return (
      <div className="mx-auto max-w-lg w-full px-4 py-16">
        <Card>
          <EmptyState
            title={group.name}
            description="You're not a member of this group yet. Join to see its quest."
            action={<JoinGroupButton organisationId={orgId} groupId={groupId} />}
          />
        </Card>
      </div>
    );
  }

  const [project, topStudents, recentActivity] = await Promise.all([
    prisma.project.findFirst({
      where: { groupId, status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      include: { checkpoints: { orderBy: { order: "asc" } } },
    }),
    prisma.organisationMembership.findMany({
      where: { organisationId: orgId, role: "STUDENT", user: { groupMemberships: { some: { groupId } } } },
      include: { user: true },
      orderBy: { xp: "desc" },
      take: 5,
    }),
    prisma.activityEvent.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: true, reactions: true },
    }),
  ]);

  if (!project) {
    return (
      <div className="mx-auto max-w-lg w-full px-4 py-16">
        <Card>
          <EmptyState title={group.name} description="No quest has been published for this group yet." />
        </Card>
      </div>
    );
  }

  const progress = await prisma.checkpointProgress.findMany({
    where: { userId, checkpointId: { in: project.checkpoints.map((c) => c.id) } },
  });
  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.checkpointId));
  const completedCount = getCompletedCount(completedIds, project.checkpoints.map((c) => c.id));
  const risk = computeRisk({
    completed: completedCount,
    total: project.checkpoints.length,
    startedAt: project.publishedAt ?? project.createdAt,
    deadline: project.deadline,
    lastActivityAt: membership.lastActivityAt,
  });

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 space-y-8">
      <p className="text-sm text-muted">
        <Link href={`/organisations/${orgId}`} className="hover:text-foreground">
          {group.organisation.name}
        </Link>{" "}
        / {group.name}
      </p>

      <QuestPath
        orgId={orgId}
        groupId={groupId}
        projectId={project.id}
        projectTitle={project.title}
        projectDescription={project.description}
        deadline={project.deadline}
        checkpoints={project.checkpoints}
        completedIds={completedIds}
        risk={risk}
        completedCount={completedCount}
      />

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <SectionHeading
            title="Group leaderboard"
            action={<LinkButton href={`/organisations/${orgId}/leaderboard`} variant="ghost" size="sm">View full →</LinkButton>}
          />
          <ul className="space-y-2">
            {topStudents.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-muted font-mono tabular-nums">#{i + 1}</span>
                <Avatar seed={s.user.avatarSeed} size="sm" />
                <span className="flex-1 font-medium">{s.user.name}</span>
                <span className="text-muted font-mono tabular-nums">{s.xp} XP</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeading title="Recent activity" />
          <ActivityFeed events={recentActivity} currentUserId={userId} />
        </Card>
      </div>
    </div>
  );
}
