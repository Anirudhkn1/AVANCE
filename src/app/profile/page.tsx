import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Card, SectionHeading, StatTile, Badge, Avatar, EmptyState } from "@/components/ui";

export default async function ProfilePage() {
  const user = await requireSessionUser();

  const memberships = await prisma.organisationMembership.findMany({
    where: { userId: user.id },
    include: { organisation: true },
  });

  // The 3 queries below are independent of each other — only the 3 awaits
  // *within* one membership were ever sequential (Promise.all across
  // memberships already parallelized the outer loop). Firing all 3 at once
  // per membership turns each row's cost into 1 round trip instead of 3,
  // which matters here since this page is reached from the navbar on every
  // page load.
  const rows = await Promise.all(
    memberships.map(async (m) => {
      const [completedCheckpoints, higherCount, totalStudents] = await Promise.all([
        prisma.checkpointProgress.count({
          where: { userId: user.id, completed: true, checkpoint: { project: { group: { organisationId: m.organisationId } } } },
        }),
        m.role === "STUDENT"
          ? prisma.organisationMembership.count({
              where: { organisationId: m.organisationId, role: "STUDENT", xp: { gt: m.xp } },
            })
          : Promise.resolve(null),
        prisma.organisationMembership.count({
          where: { organisationId: m.organisationId, role: "STUDENT" },
        }),
      ]);
      const rank = higherCount === null ? null : higherCount + 1;
      return { membership: m, completedCheckpoints, rank, totalStudents };
    })
  );

  // XP is a student concept — a Host/Head's own membership row always sits
  // at 0, so it's excluded here rather than shown as if it meant something.
  const studentMemberships = memberships.filter((m) => m.role === "STUDENT");
  const totalXp = studentMemberships.reduce((s, m) => s + m.xp, 0);
  const totalCompleted = rows
    .filter((r) => r.membership.role === "STUDENT")
    .reduce((s, r) => s + r.completedCheckpoints, 0);

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Avatar seed={user.avatarSeed} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <StatTile label="Total XP" value={totalXp} />
        <StatTile label="Checkpoints completed" value={totalCompleted} />
      </div>

      <div>
        <SectionHeading title="By organisation" subtitle="XP and rank are organisation-specific — never combined into one global score." />
        {rows.length === 0 ? (
          <Card><EmptyState title="Join an organisation to start building a track record." /></Card>
        ) : (
          <div className="space-y-3">
            {rows.map(({ membership: m, completedCheckpoints, rank, totalStudents }) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{m.organisation.name}</h3>
                      <Badge tone={m.role === "HEAD" ? "accent" : m.role === "HOST" ? "warning" : "neutral"}>{m.role}</Badge>
                    </div>
                    {rank !== null && (
                      <p className="text-sm text-muted mt-1">
                        Rank #{rank} of {totalStudents} students
                      </p>
                    )}
                  </div>
                </div>
                {m.role === "STUDENT" ? (
                  <div className="grid grid-cols-3 gap-3 mt-4 text-sm">
                    <div><p className="text-muted">XP</p><p className="font-medium">{m.xp}</p></div>
                    <div><p className="text-muted">Checkpoints</p><p className="font-medium">{completedCheckpoints}</p></div>
                    <div><p className="text-muted">Fair Play</p><p className="font-medium">{m.fairPlayScore}</p></div>
                  </div>
                ) : (
                  <p className="text-sm text-muted mt-3">
                    {m.role === "HEAD" ? "Manages this organisation." : "Manages groups and projects in this organisation."} XP is student-only.
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
