import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createGroupAction } from "@/actions/groups";
import { canManageGroups } from "@/lib/permissions";
import { Card, SectionHeading, Badge, StatTile, EmptyState, LinkButton } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { RoleControls } from "@/components/role-controls";

export default async function OrganisationOverviewPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  const user = await requireSessionUser();

  const membership = await prisma.organisationMembership.findUnique({
    where: { userId_organisationId: { userId: user.id, organisationId: orgId } },
    include: { organisation: true },
  });
  if (!membership) notFound();

  const isHost = canManageGroups(membership.role);

  const groups = await prisma.group.findMany({
    where: { organisationId: orgId },
    include: { _count: { select: { memberships: true, projects: true } } },
    orderBy: { createdAt: "asc" },
  });

  const [memberCount, totalXp, totalCompleted, members] = await Promise.all([
    prisma.organisationMembership.count({ where: { organisationId: orgId } }),
    prisma.organisationMembership.aggregate({ where: { organisationId: orgId }, _sum: { xp: true } }),
    prisma.checkpointProgress.count({
      where: { completed: true, user: { orgMemberships: { some: { organisationId: orgId } } }, checkpoint: { project: { group: { organisationId: orgId } } } },
    }),
    membership.role === "HEAD"
      ? prisma.organisationMembership.findMany({ where: { organisationId: orgId }, include: { user: true }, orderBy: { joinedAt: "asc" } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{membership.organisation.name}</h1>
            <Badge tone={membership.role === "HEAD" ? "accent" : membership.role === "HOST" ? "warning" : "neutral"}>
              {membership.role}
            </Badge>
          </div>
          {(membership.role === "HEAD" || membership.role === "HOST") && (
            <p className="text-sm text-muted mt-1">
              Join code: <span className="font-mono font-medium text-foreground">{membership.organisation.joinCode}</span>
            </p>
          )}
        </div>
        {isHost && (
          <LinkButton href={`/organisations/${orgId}/command-center`} variant="secondary">
            Command Center →
          </LinkButton>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatTile label="Members" value={memberCount} />
        <StatTile label="Total org XP" value={totalXp._sum.xp ?? 0} />
        <StatTile label="Checkpoints completed" value={totalCompleted} />
      </div>

      <div>
        <SectionHeading
          title="Groups"
          subtitle="Everyone in a group receives the same checkpoints for the same project."
        />
        {groups.length === 0 ? (
          <Card>
            <EmptyState title="No groups yet" description={isHost ? "Create one below to get started." : "Ask your host to create one."} />
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {groups.map((g) => (
              <Link key={g.id} href={`/organisations/${orgId}/groups/${g.id}`}>
                <Card className="h-full hover:border-accent/50 transition-colors">
                  <h3 className="font-semibold">{g.name}</h3>
                  <p className="text-sm text-muted mt-1">
                    {g._count.memberships} member(s) · {g._count.projects} project(s)
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
        {isHost && (
          <Card className="mt-4">
            <SectionHeading title="Create a group" />
            <SubmitForm action={createGroupAction.bind(null, orgId)} submitLabel="Create group">
              <input
                name="name"
                placeholder="e.g. CSE-A / DBMS Batch"
                required
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
              />
            </SubmitForm>
          </Card>
        )}
      </div>

      {members && (
        <div>
          <SectionHeading title="Members" subtitle="Only the Organisation Head can authorise hosts." />
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="font-medium text-sm">{m.user.name}</p>
                    <p className="text-xs text-muted">{m.user.email}</p>
                  </div>
                  <RoleControls organisationId={orgId} membershipId={m.id} currentRole={m.role} isSelf={m.userId === user.id} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
