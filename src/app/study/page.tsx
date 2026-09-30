import Link from "next/link";
import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanupExpiredDecks, createDeckAction } from "@/actions/study";
import { countDueToday, groupDueDatesByDay } from "@/lib/study";
import { Card, SectionHeading, Badge, EmptyState, LinkButton } from "@/components/ui";
import { SubmitForm } from "@/components/forms";
import { DeleteDeckButton, StudyTimeForm } from "@/components/study-controls";
import { StudyMonthCalendar } from "@/components/study-month-calendar";

export default async function StudyPage() {
  const user = await requireSessionUser();
  await cleanupExpiredDecks(user.id);

  const decks = await prisma.deck.findMany({
    where: { userId: user.id },
    include: { cards: true },
    orderBy: { createdAt: "asc" },
  });

  const allCards = decks.flatMap((d) => d.cards);
  const totalDueToday = countDueToday(allCards);
  const dueDatesByDay = Object.fromEntries(groupDueDatesByDay(allCards));

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Study</h1>
        <p className="text-muted text-sm mt-1">
          Spaced-repetition flashcards, scheduled with SM-2. Personal and private — this never touches
          organisation XP, rank, or Fair Play.
        </p>
      </div>

      <Card>
        <SectionHeading
          title="Today"
          action={
            totalDueToday > 0 ? (
              <LinkButton href="/study/review" size="sm">
                Review {totalDueToday} card{totalDueToday === 1 ? "" : "s"}
              </LinkButton>
            ) : undefined
          }
        />
        {totalDueToday === 0 ? (
          <p className="text-sm text-muted">Nothing due today — add cards below or check back tomorrow.</p>
        ) : (
          <p className="text-sm text-muted">
            {totalDueToday} card{totalDueToday === 1 ? "" : "s"} due across {decks.length} deck
            {decks.length === 1 ? "" : "s"}.
          </p>
        )}
        <div className="mt-4 pt-4 border-t border-border">
          <StudyTimeForm currentTime={user.studyPreferredTime ?? null} />
        </div>
      </Card>

      <Card>
        <SectionHeading title="Review calendar" subtitle="Days with cards due — the in-app stand-in for a synced calendar." />
        <StudyMonthCalendar dueDatesByDay={dueDatesByDay} />
      </Card>

      <Card>
        <SectionHeading title="New deck" />
        <SubmitForm action={createDeckAction} submitLabel="Add deck" className="flex flex-col sm:flex-row gap-2">
          <input
            name="title"
            required
            placeholder="e.g. Organic Chemistry"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            name="deadline"
            type="date"
            title="Optional deadline — the deck auto-deletes 2 days after it passes"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </SubmitForm>
      </Card>

      <div>
        <SectionHeading title="Your decks" />
        {decks.length === 0 ? (
          <Card><EmptyState title="No decks yet" description="Add one above to start building cards." /></Card>
        ) : (
          <div className="space-y-3">
            {decks.map((deck) => {
              const due = countDueToday(deck.cards);
              return (
                <Card key={deck.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Link href={`/study/${deck.id}`} className="font-medium text-sm hover:underline">
                        {deck.title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge tone="neutral">{deck.cards.length} card{deck.cards.length === 1 ? "" : "s"}</Badge>
                        {due > 0 && <Badge tone="accent">{due} due</Badge>}
                        {deck.deadline && (
                          <Badge tone="warning">
                            Due {deck.deadline.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DeleteDeckButton deckId={deck.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
