import { requireSessionUser } from "@/lib/session";
import { Card, Badge } from "@/components/ui";

type Example = { label: string; body: string };

function GuideCard({
  icon,
  title,
  description,
  examples,
}: {
  icon: string;
  title: string;
  description: string;
  examples: Example[];
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-xl">{icon}</span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-2 pl-0 sm:pl-[52px]">
        {examples.map((ex) => (
          <div key={ex.label} className="rounded-lg bg-surface-muted px-3 py-2">
            <p className="text-xs font-medium text-muted uppercase tracking-wide">{ex.label}</p>
            <p className="text-sm mt-0.5">{ex.body}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function HowToUsePage() {
  await requireSessionUser();

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">How to use Avance</h1>
        <p className="text-muted text-sm mt-1">A quick tour of every icon on your home screen, with a worked example.</p>
      </div>

      <div className="grid gap-4">
        <GuideCard
          icon="🏫"
          title="Organisations"
          description="A persistent space — a class, department, or team — that holds groups and projects."
          examples={[
            { label: "Create one", body: "Tap Create Organisation, name it (e.g. \"CSE-A\"), and you become its Organisation Head — you can add hosts and see everything." },
            { label: "Join one", body: "Tap Join Organisation and enter the code your host or head shares (e.g. CSEA-2025)." },
            { label: "Each org gets its own icon", body: "Every organisation you create or join shows up as its own icon on your home screen, named after it." },
          ]}
        />

        <GuideCard
          icon="🧭"
          title="Quests & checkpoints"
          description="Inside an organisation, a host publishes a project as a linear sequence of checkpoints — your quest."
          examples={[
            { label: "As a student", body: "Open your organisation → your group to see the current checkpoint, submit your work, and track your progress bar and risk status toward the deadline." },
            { label: "As a host", body: "The Command Center inside your organisation shows who's on track, at risk, or critical, plus which checkpoint is the bottleneck." },
          ]}
        />

        <GuideCard
          icon="✅"
          title="Habit Tracker"
          description="A personal, private tracker — completely separate from any organisation, XP, or Fair Play."
          examples={[
            { label: "Example", body: "Add \"Practice DSA for 30 minutes\", mark it done each day, and watch your streak grow. Optionally share it with a friend so they can see your streak too." },
          ]}
        />

        <GuideCard
          icon="📝"
          title="To-Do List"
          description="Simple personal tasks with an optional due date — for anything that isn't a formal checkpoint."
          examples={[
            { label: "Example", body: "Add \"Finish lab report\" with a due date. Check it off when done; it moves to your Completed list." },
          ]}
        />

        <GuideCard
          icon="⏱️"
          title="Focus Mode"
          description="A distraction-free session timer that keeps a record of your focus time — today and this week."
          examples={[
            { label: "Example", body: "Pick 25, 45, or 60 minutes (or a custom duration), hit Start, and work until it ends. Stopping early still saves the session, just marked \"Stopped early\"." },
          ]}
        />
      </div>

      <Card className="flex items-start gap-3">
        <Badge tone="accent">Good to know</Badge>
        <p className="text-sm text-muted">
          XP, rank, and Fair Play only apply to students completing checkpoints inside an
          organisation — hosts and organisation heads never see a personal XP number for
          themselves. Streaks are a Habit Tracker thing, not tied to any organisation.
        </p>
      </Card>
    </div>
  );
}
