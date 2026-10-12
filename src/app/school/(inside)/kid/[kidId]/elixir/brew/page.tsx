import { redirect } from "next/navigation";
import { pageKid } from "@/lib/school";
import { SESSION_SIZE } from "@/lib/elixir";
import { brewQueue, kidElixirCards } from "@/lib/elixir-server";
import { ElixirSession } from "@/components/elixir-session";

// Today's brewing session. The page just supplies the queue; the session
// (elixir-session.tsx) freezes it per round, so this page re-rendering — as it
// does when a round ends — is harmless, and an empty queue is shown by the
// session itself rather than by redirecting (which would cut off the summary).
export default async function KidBrewPage({ params }: PageProps<"/school/kid/[kidId]/elixir/brew">) {
  const { kidId } = await params;
  const { kid, classroom } = await pageKid(kidId);
  if (!classroom) redirect(`/school/kid/${kid.id}/elixir`);

  const cards = await kidElixirCards(kid.id, classroom.id);
  const queue = brewQueue(cards, SESSION_SIZE);
  const dueTotal = cards.filter((c) => c.due).length;

  return (
    <div className="mx-auto max-w-3xl w-full px-4 py-8">
      <ElixirSession
        kidId={kid.id}
        cards={queue.map((c) => ({ id: c.id, front: c.front, back: c.back, deckTitle: c.deckTitle, subjectName: c.subjectName }))}
        startDrops={kid.elixirPoints}
        moreWaiting={Math.max(0, dueTotal - queue.length)}
      />
    </div>
  );
}
