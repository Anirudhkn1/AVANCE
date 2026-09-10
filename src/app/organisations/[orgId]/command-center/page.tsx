import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/permissions";
import { getProjectAnalytics } from "@/lib/analytics";
import { formatDate } from "@/lib/format";
import { Card, SectionHeading, ProgressBar, StatTile, RiskBadge, EmptyState, LinkButton, Avatar } from "@/components/ui";

export default async function CommandCenterPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await requireSessionUser();

  try {
    await requireOrgRole(user.id, orgId, ["HEAD", "HOST"]);
  } catch {
    notFound();
  }

  const org = await prisma.organisation.findUniqueOrThrow({ where: { id: orgId } });
  const groups = await prisma.group.findMany({ where: { organisationId: orgId } });

  const activeProjects = await Promise.all(
    groups.map((g) =>
      prisma.project.findFirst({
        where: { groupId: g.id, status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
      })
    )
  );

  const groupAnalytics = await Promise.all(
    activeProjects.map((p) => (p ? getProjectAnalytics(p.id) : null))
  );

  const rows = groups.map((g, i) => ({ group: g, project: activeProjects[i], analytics: groupAnalytics[i] }));
  const withAnalytics = rows.filter((r) => r.analytics);

  const totals = withAnalytics.reduce(
    (acc, r) => ({
      students: acc.students + r.analytics!.studentCount,
      onTrack: acc.onTrack + r.analytics!.onTrack,
      atRisk: acc.atRisk + r.analytics!.atRisk,
      critical: acc.critical + r.analytics!.critical,
      pending: acc.pending + r.analytics!.pendingVerifications,
    }),
    { students: 0, onTrack: 0, atRisk: 0, critical: 0, pending: 0 }
  );

  const needsAttention = withAnalytics
    .flatMap((r) =>
      r.analytics!.students
        .filter((s) => s.risk.level !== "ON_TRACK")
        .map((s) => ({ ...s, groupName: r.group.name, projectTitle: r.project!.title }))
    )
    .sort((a, b) => (a.risk.level === b.risk.level ? 0 : a.risk.level === "CRITICAL" ? -1 : 1));

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8 space-y-8">
      <div>
        <p className="text-sm text-muted">{org.name}</p>
        <h1 className="text-2xl font-semibold tracking-tight">Command Center</h1>
        <p className="text-muted text-sm mt-1">How is everyone doing right now?</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <StatTile label="Students" value={totals.students} />
        <StatTile label="On Track" value={`🟢 ${totals.onTrack}`} />
        <StatTile label="At Risk" value={`🟡 ${totals.atRisk}`} />
        <StatTile label="Critical" value={`🔴 ${totals.critical}`} />
      </div>

      {totals.pending > 0 && (
        <Card className="border-warning/40 bg-warning-soft">
          <p className="text-sm font-medium text-warning">{totals.pending} submission(s) awaiting your review.</p>
        </Card>
      )}

      <div>
        <SectionHeading title="Groups" subtitle="Each group's current published project." />
        {rows.length === 0 ? (
          <Card><EmptyState title="No groups yet" /></Card>
        ) : (
          <div className="space-y-4">
            {rows.map(({ group, project, analytics }) => (
              <Card key={group.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/organisations/${orgId}/groups/${group.id}`} className="font-semibold hover:text-accent">
                      {group.name}
                    </Link>
                    {project ? (
                      <p className="text-sm text-muted mt-0.5">
                        {project.title} · due {formatDate(project.deadline)}
                      </p>
                    ) : (
                      <p className="text-sm text-muted mt-0.5">No active project</p>
                    )}
                  </div>
                  {analytics && (
                    <div className="flex items-center gap-3 text-sm">
                      <span>🟢 {analytics.onTrack}</span>
                      <span>🟡 {analytics.atRisk}</span>
                      <span>🔴 {analytics.critical}</span>
                      {project && (
                        <LinkButton href={`/organisations/${orgId}/groups/${group.id}/projects/${project.id}`} size="sm" variant="secondary">
                          Details →
                        </LinkButton>
                      )}
                    </div>
                  )}
                </div>
                {analytics && analytics.checkpointHealth.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {analytics.checkpointHealth.map((row) => (
                      <div key={row.checkpointId} className="flex items-center gap-3 text-xs">
                        <span className="w-40 shrink-0 truncate text-muted">{row.order}. {row.title}</span>
                        <ProgressBar
                          percent={row.pct}
                          tone={row.checkpointId === analytics.bottleneckCheckpointId ? "danger" : row.pct < 60 ? "warning" : "success"}
                          className="flex-1"
                        />
                        <span className="w-9 text-right">{row.pct}%</span>
                        {row.checkpointId === analytics.bottleneckCheckpointId && <span title="Bottleneck">⚠</span>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeading title="Students who may need attention" subtitle="Ranked critical first, based on checkpoint progress vs. time remaining." />
        {needsAttention.length === 0 ? (
          <Card><EmptyState title="Nobody needs attention right now 🎉" /></Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {needsAttention.map((s) => (
                <li key={`${s.userId}-${s.projectTitle}`} className="flex items-center justify-between gap-3 px-5 py-3">
                  <Link href={`/organisations/${orgId}/students/${s.userId}`} className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar seed={s.avatarSeed} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted truncate">
                        {s.groupName} · {s.projectTitle} · {s.completedCount}/{s.total} checkpoints
                      </p>
                    </div>
                  </Link>
                  <RiskBadge level={s.risk.level} />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
