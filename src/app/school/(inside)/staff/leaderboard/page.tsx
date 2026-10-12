import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSessionUserId } from "@/lib/session";
import { pageStaff } from "@/lib/school";
import { classroomLeaderboard, parsePeriod } from "@/lib/school-stats";
import { Avatar, Card, EmptyState } from "@/components/ui";
import { PeriodTabs } from "@/components/school";

// Teachers see names — kids only ever see the anonymous tier view.
export default async function StaffLeaderboardPage({ searchParams }: PageProps<"/school/staff/leaderboard">) {
  const sp = await searchParams;
  const period = parsePeriod(sp.period as string | undefined);
  const userId = await requireSessionUserId();
  // Only the viewer's own classrooms, so it can load alongside the staff check.
  const [, classrooms] = await Promise.all([
    pageStaff(),
    prisma.classroom.findMany({
      where: { teachers: { some: { userId: userId } } },
      orderBy: { name: "asc" },
    }),
  ]);
  if (classrooms.length === 0) {
    return (
      <div className="mx-auto max-w-2xl w-full px-4 py-16">
        <Card>
          <EmptyState title="No classrooms yet" description="Join a classroom to see its leaderboard." />
        </Card>
      </div>
    );
  }
  const active = classrooms.find((c) => c.id === sp.classroom) ?? classrooms[0];
  const { ranked } = await classroomLeaderboard(active.id, period);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">🏆 Leaderboard</h1>
        <PeriodTabs base={`/school/staff/leaderboard?classroom=${active.id}`} period={period} />
      </div>
      {classrooms.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {classrooms.map((c) => (
            <Link
              key={c.id}
              href={`/school/staff/leaderboard?classroom=${c.id}&period=${period}`}
              className={`rounded-full px-3 py-1 text-sm ${c.id === active.id ? "bg-accent text-accent-foreground" : "bg-surface-muted"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <Card>
        {ranked.length === 0 ? (
          <EmptyState title="No students yet" />
        ) : (
          <ol className="divide-y divide-border">
            {ranked.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <span className="w-8 font-mono text-muted tabular-nums">#{r.rank}</span>
                <Avatar seed={r.avatarSeed} size="sm" />
                <span className="flex-1">{r.name}</span>
                <span className="font-mono tabular-nums">{r.count}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
