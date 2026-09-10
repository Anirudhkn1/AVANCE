import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { summarizeFocusSessions, formatDuration } from "@/lib/focus";
import { formatDateTime } from "@/lib/format";
import { Card, SectionHeading, StatTile, Badge, EmptyState } from "@/components/ui";
import { FocusTimer } from "@/components/focus-timer";

export default async function FocusPage() {
  const user = await requireSessionUser();

  const sessions = await prisma.focusSession.findMany({
    where: { userId: user.id, endedAt: { not: null } },
    orderBy: { startedAt: "desc" },
    take: 200,
  });

  const { todaySeconds, weekSeconds } = summarizeFocusSessions(sessions);
  const recent = sessions.slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Focus Mode</h1>
        <p className="text-muted text-sm mt-1">Start a session, stay off distractions, and Avance keeps the record.</p>
      </div>

      <Card>
        <FocusTimer />
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <StatTile label="Today" value={formatDuration(todaySeconds)} />
        <StatTile label="This week" value={formatDuration(weekSeconds)} />
      </div>

      <div>
        <SectionHeading title="Recent sessions" />
        {recent.length === 0 ? (
          <Card><EmptyState title="No sessions yet" description="Start one above to build your history." /></Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium">{formatDateTime(s.startedAt)}</p>
                    <p className="text-xs text-muted">
                      {formatDuration(s.actualSeconds)} of {formatDuration(s.targetSeconds)} planned
                    </p>
                  </div>
                  <Badge tone={s.completed ? "success" : "neutral"}>{s.completed ? "Completed" : "Stopped early"}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
