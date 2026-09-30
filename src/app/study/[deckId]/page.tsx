import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createFlashcardAction } from "@/actions/study";
import { Card, SectionHeading, Badge, EmptyState } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { DeleteFlashcardButton } from "@/components/study-controls";

export default async function DeckPage({ params }: { params: Promise<{ deckId: string }> }) {
  const user = await requireSessionUser();
  const { deckId } = await params;

  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: { cards: { orderBy: { createdAt: "asc" } } },
  });
  if (!deck || deck.userId !== user.id) notFound();

  const createCardAction = createFlashcardAction.bind(null, deck.id);
  const today = new Date();

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-8">
      <div>
        <Link href="/study" className="text-sm text-muted hover:text-foreground">
          ← Study
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">{deck.title}</h1>
        {deck.deadline && (
          <p className="text-muted text-sm mt-1">
            Deadline {deck.deadline.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
        )}
      </div>

      <Card>
        <SectionHeading title="New card" />
        <SubmitForm action={createCardAction} submitLabel="Add card" className="space-y-2">
          <textarea
            name="front"
            required
            placeholder="Front"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent resize-none"
          />
          <textarea
            name="back"
            required
            placeholder="Back"
            rows={2}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </SubmitForm>
      </Card>

      <div>
        <SectionHeading title={`Cards (${deck.cards.length})`} />
        {deck.cards.length === 0 ? (
          <Card><EmptyState title="No cards yet" description="Add one above to start reviewing." /></Card>
        ) : (
          <Card padded={false}>
            <ul className="divide-y divide-border">
              {deck.cards.map((card) => {
                const due = card.dueDate.getTime() <= today.getTime();
                return (
                  <li key={card.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{card.front}</p>
                      <p className="text-xs text-muted truncate">{card.back}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {due ? <Badge tone="accent">Due</Badge> : <Badge tone="neutral">In {card.interval}d</Badge>}
                      <DeleteFlashcardButton cardId={card.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
