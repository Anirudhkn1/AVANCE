"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, EmptyState } from "@/components/ui";
import { GradeButtons } from "@/components/study-controls";

type ReviewCard = { id: string; front: string; back: string; deckTitle: string };

export function StudyReviewSession({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);

  if (queue.length === 0) {
    return (
      <Card>
        <EmptyState
          title="All caught up"
          description="No cards left to review right now."
          action={<Button onClick={() => router.push("/study")}>Back to Study</Button>}
        />
      </Card>
    );
  }

  const current = queue[0];

  function handleGraded() {
    setFlipped(false);
    setQueue((q) => q.slice(1));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{current.deckTitle} · {queue.length} left</p>
      <Card>
        <button
          type="button"
          onClick={() => setFlipped((v) => !v)}
          className="w-full min-h-40 flex items-center justify-center text-center px-4 py-8 rounded-xl bg-surface-muted"
        >
          <span className="text-base font-medium whitespace-pre-wrap">{flipped ? current.back : current.front}</span>
        </button>
        <p className="text-center text-xs text-muted mt-2">{flipped ? "Answer" : "Tap to reveal the answer"}</p>
      </Card>

      {flipped ? (
        <GradeButtons cardId={current.id} onGraded={handleGraded} />
      ) : (
        <Button className="w-full" onClick={() => setFlipped(true)}>
          Show answer
        </Button>
      )}
    </div>
  );
}
