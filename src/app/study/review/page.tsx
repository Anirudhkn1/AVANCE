import Link from "next/link";
import { requireSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StudyReviewSession } from "@/components/study-review-session";

export default async function StudyReviewPage() {
  const userId = await requireSessionUserId();

  const cards = await prisma.flashcard.findMany({
    where: { deck: { userId: userId }, dueDate: { lte: new Date() } },
    include: { deck: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="mx-auto max-w-md w-full px-4 py-8 space-y-6">
      <div>
        <Link href="/study" className="text-sm text-muted hover:text-foreground">
          ← Study
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight mt-1">Review</h1>
      </div>

      <StudyReviewSession
        cards={cards.map((c) => ({ id: c.id, front: c.front, back: c.back, deckTitle: c.deck.title }))}
      />
    </div>
  );
}
