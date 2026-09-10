import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createHabitAction } from "@/actions/habits";
import { computeHabitStreak } from "@/lib/habitStreak";
import { Card, SectionHeading, Badge, EmptyState, Avatar } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { HabitToggle, ArchiveHabitButton, ShareHabitForm } from "@/components/habit-controls";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default async function HabitsPage() {
  const user = await requireSessionUser();
  const today = startOfDay(new Date());

  const habits = await prisma.habit.findMany({
    where: { userId: user.id, archived: false },
    include: { completions: true, shares: { include: { sharedWith: true } } },
    orderBy: { createdAt: "asc" },
  });

  const sharedWithMe = await prisma.habitShare.findMany({
    where: { sharedWithId: user.id },
    include: { habit: { include: { user: true, completions: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
        <p className="text-muted text-sm mt-1">
          Personal and private by default — this never touches organisation XP, rank, or Fair Play.
        </p>
      </div>

      <Card>
        <SectionHeading title="New habit" />
        <SubmitForm action={createHabitAction} submitLabel="Add habit" className="flex flex-col sm:flex-row gap-2">
          <input
            name="title"
            required
            placeholder="e.g. Practice DSA for 30 minutes"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <select
            name="frequency"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </SubmitForm>
      </Card>

      <div>
        <SectionHeading title="Your habits" />
        {habits.length === 0 ? (
          <Card><EmptyState title="No habits yet" description="Add one above to start tracking." /></Card>
        ) : (
          <div className="space-y-3">
            {habits.map((h) => {
              const doneToday = h.completions.some((c) => startOfDay(c.date).getTime() === today.getTime());
              const streak = computeHabitStreak(h.completions.map((c) => c.date));
              return (
                <Card key={h.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-sm">{h.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone="neutral">{h.frequency}</Badge>
                        {streak > 0 && <Badge tone="accent">🔥 {streak}-day streak</Badge>}
                      </div>
                    </div>
                    <HabitToggle habitId={h.id} doneToday={doneToday} />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 flex-wrap">
                      {h.shares.map((s) => (
                        <Badge key={s.id} tone="neutral">Shared with {s.sharedWith.name}</Badge>
                      ))}
                      <ShareHabitForm habitId={h.id} />
                    </div>
                    <ArchiveHabitButton habitId={h.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {sharedWithMe.length > 0 && (
        <div>
          <SectionHeading title="Shared with you" />
          <div className="space-y-2">
            {sharedWithMe.map((s) => {
              const streak = computeHabitStreak(s.habit.completions.map((c) => c.date));
              return (
                <Card key={s.id} className="flex items-center gap-3">
                  <Avatar seed={s.habit.user.avatarSeed} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{s.habit.title}</p>
                    <p className="text-xs text-muted">{s.habit.user.name}</p>
                  </div>
                  {streak > 0 && <Badge tone="accent">🔥 {streak}</Badge>}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
