import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pageStaff } from "@/lib/school";
import { Badge, Card, EmptyState, LinkButton, SectionHeading } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { fieldClass } from "@/components/school";
import { createElixirDeckAction } from "@/actions/elixir";

// Teachers write Elixir decks under the subjects they teach; every approved
// student in that classroom then brews them (src/lib/elixir.ts).
export default async function StaffElixirPage() {
  const { user, school } = await pageStaff();

  const subjects = await prisma.subject.findMany({
    where: { ownerId: user.id, classroom: { schoolId: school.id } },
    include: {
      classroom: { select: { name: true } },
      elixirDecks: { include: { _count: { select: { cards: true } } }, orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ classroom: { name: "asc" } }, { name: "asc" }],
  });

  if (subjects.length === 0) {
    return (
      <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">🧪 Elixir</h1>
        <Card>
          <EmptyState
            title="Add a subject first"
            description="Elixir decks belong to a subject you teach. Join a classroom and add your subject, then write cards for your students to brew."
            action={<LinkButton href="/school/staff?all=1">Go to my classes</LinkButton>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">🧪 Elixir</h1>
        <p className="text-sm text-muted">
          Write question-and-answer cards for your subject. Your students review them on a spaced schedule and earn drops that fill their flask.
        </p>
      </div>

      <Card>
        <SectionHeading title="New deck" subtitle="e.g. Times tables, Parts of a plant" />
        <SubmitForm action={createElixirDeckAction} submitLabel="Create deck" className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="subjectId" required defaultValue={subjects[0].id} className={fieldClass} aria-label="Subject">
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · Class {s.classroom.name}
                </option>
              ))}
            </select>
            <input name="title" placeholder="Deck name" required maxLength={80} className={fieldClass} />
          </div>
        </SubmitForm>
      </Card>

      {subjects.map((s) => (
        <Card key={s.id}>
          <SectionHeading title={s.name} subtitle={`Class ${s.classroom.name}`} />
          {s.elixirDecks.length === 0 ? (
            <p className="text-sm text-muted">No decks for this subject yet.</p>
          ) : (
            <ul className="space-y-2">
              {s.elixirDecks.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/school/staff/elixir/${d.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted px-4 py-3 transition hover:border-accent"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{d.title}</span>
                    <Badge tone={d._count.cards > 0 ? "accent" : "warning"}>
                      {d._count.cards} card{d._count.cards === 1 ? "" : "s"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
