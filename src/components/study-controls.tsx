"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDeckAction,
  deleteFlashcardAction,
  reviewCardAction,
  setStudyTimeAction,
} from "@/actions/study";
import type { CardGrade } from "@/lib/constants";
import { Button } from "@/components/ui";

export function DeleteDeckButton({ deckId }: { deckId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Delete this deck and all its cards? This can't be undone.")) return;
          await deleteDeckAction(deckId);
          router.refresh();
        })
      }
      className="text-xs text-muted hover:text-danger"
    >
      Delete deck
    </button>
  );
}

export function DeleteFlashcardButton({ cardId }: { cardId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => { await deleteFlashcardAction(cardId); })}
      className="text-xs text-muted hover:text-danger"
    >
      Delete
    </button>
  );
}

const GRADE_STYLES: Record<CardGrade, string> = {
  AGAIN: "bg-danger text-white hover:opacity-90",
  HARD: "bg-warning-soft text-warning hover:opacity-90",
  GOOD: "bg-accent-soft text-accent hover:opacity-90",
  EASY: "bg-success-soft text-success hover:opacity-90",
};

const GRADE_LABELS: Record<CardGrade, string> = {
  AGAIN: "Again",
  HARD: "Hard",
  GOOD: "Good",
  EASY: "Easy",
};

export function GradeButtons({
  cardId,
  onGraded,
  disabled = false,
}: {
  cardId: string;
  onGraded: () => void;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const grades: CardGrade[] = ["AGAIN", "HARD", "GOOD", "EASY"];
  return (
    <div className="grid grid-cols-4 gap-2">
      {grades.map((grade) => (
        <button
          key={grade}
          disabled={disabled || pending}
          onClick={() =>
            startTransition(async () => {
              await reviewCardAction(cardId, grade);
              onGraded();
            })
          }
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${GRADE_STYLES[grade]}`}
        >
          {GRADE_LABELS[grade]}
        </button>
      ))}
    </div>
  );
}

export function StudyTimeForm({ currentTime }: { currentTime: string | null }) {
  const [error, formAction, pending] = useActionState(setStudyTimeAction, undefined);
  return (
    <form action={formAction} className="flex items-center gap-2">
      <label htmlFor="study-time" className="text-xs text-muted">
        Daily review time
      </label>
      <input
        id="study-time"
        name="time"
        type="time"
        defaultValue={currentTime ?? "19:00"}
        required
        className="rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-accent"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}
