import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { pageStaff } from "@/lib/school";
import { MASTERED_INTERVAL_DAYS, MAX_CARDS_PER_DECK } from "@/lib/elixir";
import { Avatar, Card, EmptyState, SectionHeading } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { ActionButton } from "@/components/school-client";
import { BackLink, fieldClass } from "@/components/school";
import {
  addElixirCardAction,
  addElixirCardsBulkAction,
  deleteElixirCardAction,
  deleteElixirDeckAction,
} from "@/actions/elixir";

export default async function StaffElixirDeckPage({ params }: PageProps<"/school/staff/elixir/[deckId]">) {
  const { deckId } = await params;
  const { user, school } = await pageStaff();

  const deck = await prisma.elixirDeck.findUnique({
    where: { id: deckId },
    include: {
      subject: { include: { classroom: { select: { id: true, name: true, schoolId: true } } } },
      cards: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!deck || deck.subject.ownerId !== user.id || deck.subject.classroom.schoolId !== school.id) notFound();

  const classroomId = deck.subject.classroom.id;
  const [kids, progress] = await Promise.all([
    prisma.kidProfile.findMany({
      where: { classroomId, classroomStatus: "APPROVED" },
      select: { id: true, name: true, avatarSeed: true, elixirPoints: true },
      orderBy: { name: "asc" },
    }),
    prisma.elixirProgress.findMany({ where: { card: { deckId } }, select: { kidId: true, interval: true } }),
  ]);
  const rows = kids.map((k) => {
    const mine = progress.filter((p) => p.kidId === k.id);
    return { ...k, reviewed: mine.length, mastered: mine.filter((p) => p.interval >= MASTERED_INTERVAL_DAYS).length };
  });
  const total = deck.cards.length;

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8 space-y-6">
      <BackLink href="/school/staff/elixir">All Elixir decks</BackLink>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">🧪 {deck.title}</h1>
          <p className="text-sm text-muted">
            {deck.subject.name} · Class {deck.subject.classroom.name} · {total}/{MAX_CARDS_PER_DECK} cards
          </p>
        </div>
        <form action={deleteElixirDeckAction.bind(null, deckId)}>
          <ActionButton variant="ghost" confirm="Delete this deck and all its cards? Students keep the drops they already earned.">
            Delete deck
          </ActionButton>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <SectionHeading title="➕ Add a card" />
          <SubmitForm action={addElixirCardAction} submitLabel="Add card">
            <input type="hidden" name="deckId" value={deckId} />
            <textarea name="front" rows={2} required maxLength={500} placeholder="Question — e.g. What is 7 × 8?" className={fieldClass} />
            <textarea name="back" rows={2} required maxLength={500} placeholder="Answer — e.g. 56" className={fieldClass} />
          </SubmitForm>
        </Card>

        <Card>
          <SectionHeading title="📋 Add many at once" subtitle="One card per line: question | answer" />
          <SubmitForm action={addElixirCardsBulkAction} submitLabel="Add all">
            <input type="hidden" name="deckId" value={deckId} />
            <textarea
              name="lines"
              rows={5}
              required
              placeholder={"7 × 8 | 56\nCapital of India | New Delhi\nH₂O is | Water"}
              className={`${fieldClass} font-mono`}
            />
          </SubmitForm>
        </Card>
      </div>

      <Card>
        <SectionHeading title={`Cards (${total})`} />
        {total === 0 ? (
          <EmptyState title="No cards yet" description="Add your first card above — students see the deck as soon as it has one." />
        ) : (
          <ul className="divide-y divide-border">
            {deck.cards.map((c) => (
              <li key={c.id} className="flex items-start gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-sm font-medium">{c.front}</p>
                  <p className="whitespace-pre-wrap text-sm text-muted">{c.back}</p>
                </div>
                <form action={deleteElixirCardAction.bind(null, c.id)}>
                  <ActionButton variant="ghost" confirm="Delete this card?">
                    Delete
                  </ActionButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHeading title="📊 Class progress" subtitle={`Cards reviewed and mastered (scheduled ${MASTERED_INTERVAL_DAYS}+ days out) in this deck`} />
        {rows.length === 0 ? (
          <EmptyState title="No students yet" description="Approved students of this class will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Reviewed</th>
                  <th className="py-2 pr-3 font-medium">Mastered</th>
                  <th className="py-2 font-medium">Drops</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <Avatar seed={r.avatarSeed} size="sm" />
                        {r.name}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {r.reviewed}/{total}
                    </td>
                    <td className="py-2 pr-3 font-mono tabular-nums">
                      {r.mastered}/{total}
                    </td>
                    <td className="py-2 font-mono tabular-nums">{r.elixirPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
