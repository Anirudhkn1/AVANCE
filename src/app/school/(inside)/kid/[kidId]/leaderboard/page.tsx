import Link from "next/link";
import { pageKid } from "@/lib/school";
import { classroomLeaderboard, parsePeriod } from "@/lib/school-stats";
import { equippedCharacter } from "@/lib/voyage";
import { Card, EmptyState } from "@/components/ui";
import { PeriodTabs } from "@/components/school";
import { KidAvatar } from "@/components/kid-avatar";

// Classmates are listed by name with their Voyage hero as the picture; tapping
// a name opens that hero's animated stage (students only — the teachers' own
// leaderboard is separate and shows plain avatars).
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

  const { ranked } = await classroomLeaderboard(classroom.id, period);
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
          {ranked.map((r) => {
            const mine = r.id === kid.id;
            const hero = equippedCharacter(r.characterId, r.xp);
            return (
              <li
                key={r.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${mine ? "bg-accent-soft font-medium" : "bg-surface-muted"}`}
              >
                <span className="w-9 shrink-0 text-lg">{r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`}</span>
                <KidAvatar kid={r} size="md" />
                <span className="min-w-0 flex-1">
                  {hero ? (
                    <Link href={`/school/kid/${kid.id}/hero/${r.id}`} className="truncate hover:underline" title={`See ${r.name}'s ${hero.name}`}>
                      {r.name}
                      <span className="ml-1.5 text-xs text-muted">✨ {hero.name}</span>
                    </Link>
                  ) : (
                    <span className="truncate">{r.name}</span>
                  )}
                </span>
                {mine && <span className="text-sm text-accent">You</span>}
                <span className="text-sm text-muted tabular-nums">
                  {r.count} homework{r.count === 1 ? "" : "s"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
