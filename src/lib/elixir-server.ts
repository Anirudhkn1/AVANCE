import "server-only";
import { prisma } from "@/lib/prisma";
import { MASTERED_INTERVAL_DAYS } from "@/lib/elixir";

export type KidCard = {
  id: string;
  front: string;
  back: string;
  deckId: string;
  deckTitle: string;
  subjectName: string;
  /** Scheduled to review right now (new cards count as due). */
  due: boolean;
  isNew: boolean;
  mastered: boolean;
  dueDate: Date | null;
};

/** Every Elixir card in the kid's classroom, each with that kid's own schedule folded in. */
export async function kidElixirCards(kidId: string, classroomId: string, now = new Date()): Promise<KidCard[]> {
  const rows = await prisma.elixirCard.findMany({
    where: { deck: { subject: { classroomId } } },
    select: {
      id: true,
      front: true,
      back: true,
      deck: { select: { id: true, title: true, subject: { select: { name: true } } } },
      progress: { where: { kidId }, select: { dueDate: true, interval: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((c) => {
    const p = c.progress[0];
    return {
      id: c.id,
      front: c.front,
      back: c.back,
      deckId: c.deck.id,
      deckTitle: c.deck.title,
      subjectName: c.deck.subject.name,
      due: !p || p.dueDate <= now,
      isNew: !p,
      mastered: Boolean(p && p.interval >= MASTERED_INTERVAL_DAYS),
      dueDate: p?.dueDate ?? null,
    };
  });
}

/** Today's brewing session: cards already scheduled (oldest first) before brand-new ones. */
export function brewQueue(cards: KidCard[], size: number) {
  const due = cards.filter((c) => c.due && !c.isNew).sort((a, b) => a.dueDate!.getTime() - b.dueDate!.getTime());
  const fresh = cards.filter((c) => c.isNew);
  return [...due, ...fresh].slice(0, size);
}
