import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireMembership, canManageGroups, isGroupMember } from "@/lib/permissions";
import { getCompletedCount } from "@/lib/progress";
import { computeRisk } from "@/lib/risk";
import { getProjectAnalytics } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import { Card, SectionHeading, Badge, ProgressBar, StatTile, RiskBadge, EmptyState, LinkButton, Avatar } from "@/components/ui";
import { QuestPath } from "@/components/quest-path";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ orgId: string; groupId: string; projectId: string }>;
}) {
  const { orgId, groupId, projectId } = await params;
  const user = await requireSessionUser();
  const membership = await requireMembership(user.id, orgId).catch(() => null);
  if (!membership) notFound();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { checkpoints: { orderBy: { order: "asc" } }, group: true },
  });
  if (!project || project.groupId !== groupId || project.group.organisationId !== orgId) notFound();

  const isHost = canManageGroups(membership.role);

  if (isHost) {
    const analytics = await getProjectAnalytics(projectId);
    const pendingSubmissions = await prisma.checkpointSubmission.findMany({
      where: { checkpoint: { projectId }, status: "PENDING" },
      include: { user: true, checkpoint: true },
      orderBy: { submittedAt: "asc" },
    });

    return (
      <div className="mx-auto max-w-5xl w-full px-4 py-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">
              <Link href={`/organisations/${orgId}/groups/${groupId}`} className="hover:text-foreground">
                {project.group.name}
              </Link>
            </p>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
              <Badge tone={project.status === "PUBLISHED" ? "success" : "neutral"}>{project.status}</Badge>
              {project.aiGenerated && <Badge tone="accent">AI-generated</Badge>}
            </div>
            <p className="text-sm text-muted mt-1">Due {formatDate(project.deadline)}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <StatTile label="Students" value={analytics.studentCount} />
          <StatTile label="On Track" value={`🟢 ${analytics.onTrack}`} />
          <StatTile label="At Risk" value={`🟡 ${analytics.atRisk}`} />
          <StatTile label="Critical" value={`🔴 ${analytics.critical}`} />
        </div>

        <Card>
          <SectionHeading title="Checkpoint health" subtitle="Where students are getting stuck." />
          <div className="space-y-2.5">
            {analytics.checkpointHealth.map((row) => (
              <div key={row.checkpointId} className="flex items-center gap-3 text-sm">
                <span className="w-48 shrink-0 truncate text-muted">
                  {row.order}. {row.title}
                </span>
                <ProgressBar
                  percent={row.pct}
                  tone={row.checkpointId === analytics.bottleneckCheckpointId ? "danger" : row.pct < 60 ? "warning" : "success"}
                  className="flex-1"
                />
                <span className="w-12 text-right">{row.pct}%</span>
                {row.checkpointId === analytics.bottleneckCheckpointId && <span title="Bottleneck">⚠</span>}
              </div>
            ))}
          </div>
        </Card>

        {pendingSubmissions.length > 0 && (
          <Card>
            <SectionHeading title={`Pending verifications (${pendingSubmissions.length})`} />
            <ul className="divide-y divide-border -mx-5">
              {pendingSubmissions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar seed={s.user.avatarSeed} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{s.user.name}</p>
                      <p className="text-xs text-muted">{s.checkpoint.title}</p>
                    </div>
                  </div>
                  <LinkButton
                    href={`/organisations/${orgId}/groups/${groupId}/projects/${projectId}/checkpoints/${s.checkpoint.id}`}
                    size="sm"
                    variant="secondary"
                  >
                    Review →
                  </LinkButton>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card padded={false}>
          <div className="p-5 pb-0">
            <SectionHeading title="Students" />
          </div>
          <ul className="divide-y divide-border">
            {analytics.students.map((s) => (
              <li key={s.userId} className="flex items-center justify-between gap-3 px-5 py-3">
                <Link href={`/organisations/${orgId}/students/${s.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar seed={s.avatarSeed} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted truncate">
                      {s.currentCheckpointTitle ? `Working on ${s.currentCheckpointTitle}` : "All checkpoints complete"}
                    </p>
                  </div>
                </Link>
                <span className="text-sm text-muted shrink-0">
                  {s.completedCount}/{s.total}
                </span>
                <RiskBadge level={s.risk.level} />
              </li>
            ))}
          </ul>
          {analytics.students.length === 0 && <div className="p-5"><EmptyState title="No students yet" /></div>}
        </Card>
      </div>
    );
  }

  // --- Student view ---------------------------------------------------
  if (!(await isGroupMember(user.id, groupId))) notFound();

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

  return (
    <div className="mx-auto max-w-4xl w-full px-4 py-8 space-y-6">
      <p className="text-sm text-muted">
        <Link href={`/organisations/${orgId}/groups/${groupId}`} className="hover:text-foreground">
          {project.group.name}
        </Link>
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
    </div>
  );
}
