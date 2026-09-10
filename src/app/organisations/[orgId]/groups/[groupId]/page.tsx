import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireMembership, canManageGroups, isGroupMember } from "@/lib/permissions";
import { getCompletedCount } from "@/lib/progress";
import { computeRisk } from "@/lib/risk";
import { getProjectAnalytics } from "@/lib/analytics";
import { sweepExpiredProjects } from "@/lib/retention";
import { formatTimeRemaining } from "@/lib/format";
import { Card, SectionHeading, Badge, EmptyState, LinkButton, Avatar } from "@/components/ui";
import { JoinGroupButton } from "@/components/join-group-button";
import { ActivityFeed } from "@/components/activity-feed";
import { QuestPath } from "@/components/quest-path";

export default async function GroupPage({ params }: { params: Promise<{ orgId: string; groupId: string }> }) {
  const { orgId, groupId } = await params;
  const user = await requireSessionUser();
  const membership = await requireMembership(user.id, orgId).catch(() => null);
  if (!membership) notFound();

  const group = await prisma.group.findUnique({ where: { id: groupId }, include: { organisation: true } });
  if (!group || group.organisationId !== orgId) notFound();

  const isHost = canManageGroups(membership.role);
  const memberOfGroup = await isGroupMember(user.id, groupId);

  await sweepExpiredProjects(groupId);

  if (isHost) {
    const projects = await prisma.project.findMany({
      where: { groupId },
      orderBy: { createdAt: "desc" },
      include: { checkpoints: true },
    });
    const memberCount = await prisma.groupMembership.count({ where: { groupId } });

    const publishedAnalytics = await Promise.all(
      projects.filter((p) => p.status === "PUBLISHED").map((p) => getProjectAnalytics(p.id))
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

  const project = await prisma.project.findFirst({
    where: { groupId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { checkpoints: { orderBy: { order: "asc" } } },
  });

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
    where: { userId: user.id, checkpointId: { in: project.checkpoints.map((c) => c.id) } },
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

  const topStudents = await prisma.organisationMembership.findMany({
    where: { organisationId: orgId, role: "STUDENT", user: { groupMemberships: { some: { groupId } } } },
    include: { user: true },
    orderBy: { xp: "desc" },
    take: 5,
  });

  const recentActivity = await prisma.activityEvent.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { user: true, reactions: true },
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
                <span className="w-5 text-muted">#{i + 1}</span>
                <Avatar seed={s.user.avatarSeed} size="sm" />
                <span className="flex-1 font-medium">{s.user.name}</span>
                <span className="text-muted">{s.xp} XP</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionHeading title="Recent activity" />
          <ActivityFeed events={recentActivity} currentUserId={user.id} />
        </Card>
      </div>
    </div>
  );
}
