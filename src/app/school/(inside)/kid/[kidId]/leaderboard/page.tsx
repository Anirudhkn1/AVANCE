import { pageKid } from "@/lib/school";
import { classroomLeaderboard, parsePeriod } from "@/lib/school-stats";
import { Card, EmptyState } from "@/components/ui";
import { PeriodTabs } from "@/components/school";

// Anonymous on purpose: kids see how many classmates sit at each homework
// count and their own rank, never who is where.
export default async function KidLeaderboardPage({
  params,
  searchParams,
}: PageProps<"/school/kid/[kidId]/leaderboard">) {
  const { kidId } = await params;
  const period = parsePeriod((await searchParams).period as string | undefined);
  const { kid, classroom } = await pageKid(kidId);

  if (!classroom) {
    return (
      <div className="mx-auto max-w-2xl w-full px-4 py-16">
        <Card>
          <EmptyState title="Join a classroom first" description="The leaderboard compares you with your classmates." />
        </Card>
      </div>
    );
  }

  const { ranked, tiers } = await classroomLeaderboard(classroom.id, period);
  const me = ranked.find((r) => r.id === kid.id);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">🏆 Class {classroom.name}</h1>
        <PeriodTabs base={`/school/kid/${kid.id}/leaderboard`} period={period} />
      </div>

      <Card className="text-center">
        <p className="text-sm text-muted">{kid.name}, you&apos;re</p>
        <p className="text-5xl font-semibold tracking-tight">Rank {me?.rank ?? "—"}</p>
        <p className="mt-1 text-sm text-muted">
          {me?.count ?? 0} homework{me?.count === 1 ? "" : "s"} done {period === "daily" ? "today" : "this month"}
        </p>
      </Card>

      <Card>
        <ul className="space-y-2">
          {tiers.map((t) => {
            const mine = me?.count === t.count;
            return (
              <li
                key={t.count}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 ${mine ? "bg-accent-soft font-medium" : "bg-surface-muted"}`}
              >
                <span className="w-10 text-lg">{t.rank === 1 ? "🥇" : t.rank === 2 ? "🥈" : t.rank === 3 ? "🥉" : `#${t.rank}`}</span>
                <span className="flex-1">
                  {t.students} student{t.students === 1 ? "" : "s"} finished {t.count} homework{t.count === 1 ? "" : "s"}
                </span>
                {mine && <span className="text-sm text-accent">You</span>}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
