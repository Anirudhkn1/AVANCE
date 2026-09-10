import { notFound } from "next/navigation";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { requireOrgRole } from "@/lib/permissions";
import { getCompletedCount } from "@/lib/progress";
import { computeRisk } from "@/lib/risk";
import { formatDateTime, formatRelativeTime } from "@/lib/format";
import { Card, SectionHeading, StatTile, RiskBadge, Avatar, EmptyState, Badge } from "@/components/ui";
import { InterventionForm, FairPlayForm } from "@/components/host-student-forms";

export default async function StudentDetailPage({ params }: { params: Promise<{ orgId: string; userId: string }> }) {
  const { orgId, userId } = await params;
  const host = await requireSessionUser();

  try {
    await requireOrgRole(host.id, orgId, ["HEAD", "HOST"]);
  } catch {
    notFound();
  }

  const membership = await prisma.organisationMembership.findUnique({
    where: { userId_organisationId: { userId, organisationId: orgId } },
    include: { user: true, organisation: true },
  });
  if (!membership) notFound();

  const groupMemberships = await prisma.groupMembership.findMany({
    where: { userId, group: { organisationId: orgId } },
    include: { group: true },
  });

  const projectRows = await Promise.all(
    groupMemberships.map(async (gm) => {
      const project = await prisma.project.findFirst({
        where: { groupId: gm.groupId, status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        include: { checkpoints: { orderBy: { order: "asc" } } },
      });
      if (!project) return null;
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
      return { group: gm.group, project, completedCount, risk };
    })
  );
  const activeProjects = projectRows.filter((r): r is NonNullable<typeof r> => r !== null);

  const interventions = await prisma.intervention.findMany({
    where: { organisationId: orgId, studentId: userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { host: true },
  });

  const fairPlayHistory = await prisma.fairPlayRecord.findMany({
    where: { membershipId: membership.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { actor: true },
  });

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Avatar seed={membership.user.avatarSeed} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{membership.user.name}</h1>
          <p className="text-sm text-muted">{membership.user.email} · {membership.organisation.name}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-4 gap-4">
        <StatTile label="XP" value={membership.xp} />
        <StatTile label="Streak" value={`🔥 ${membership.streakCurrent}`} />
        <StatTile label="Fair Play" value={membership.fairPlayScore} />
        <StatTile
          label="Last active"
          value={membership.lastActivityAt ? formatRelativeTime(membership.lastActivityAt) : "Never"}
        />
      </div>

      <div>
        <SectionHeading title="Projects" />
        {activeProjects.length === 0 ? (
          <Card><EmptyState title="No active projects" /></Card>
        ) : (
          <div className="space-y-3">
            {activeProjects.map((r) => (
              <Card key={r.project.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{r.project.title}</p>
                  <p className="text-xs text-muted">
                    {r.group.name} · {r.completedCount}/{r.project.checkpoints.length} checkpoints
                  </p>
                </div>
                <RiskBadge level={r.risk.level} />
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card>
          <SectionHeading title="Take action" subtitle="AI can suggest; only you decide." />
          <InterventionForm organisationId={orgId} studentId={userId} />
          {interventions.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-border pt-3">
              {interventions.map((i) => (
                <li key={i.id} className="text-xs">
                  <Badge tone="neutral" className="mr-1.5">{i.type.replace(/_/g, " ")}</Badge>
                  {i.note} <span className="text-muted">— {formatRelativeTime(i.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeading title="Fair Play" subtitle="Host-only, auditable. Never set by AI or the student." />
          <FairPlayForm organisationId={orgId} membershipId={membership.id} />
          {fairPlayHistory.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-border pt-3">
              {fairPlayHistory.map((f) => (
                <li key={f.id} className="text-xs">
                  <span className={f.delta >= 0 ? "text-success" : "text-danger"}>{f.delta >= 0 ? `+${f.delta}` : f.delta}</span>{" "}
                  {f.reason} <span className="text-muted">— {f.actor.name}, {formatDateTime(f.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
