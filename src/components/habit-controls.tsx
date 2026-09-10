"use client";

import { useActionState, useState, useTransition } from "react";
import { toggleHabitTodayAction, archiveHabitAction, shareHabitAction } from "@/actions/habits";
import { Button } from "@/components/ui";

export function HabitToggle({ habitId, doneToday }: { habitId: string; doneToday: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={doneToday ? "primary" : "secondary"}
      disabled={pending}
      onClick={() => startTransition(async () => { await toggleHabitTodayAction(habitId); })}
    >
      {doneToday ? "✓ Done today" : "Mark today"}
    </Button>
  );
}

export function ArchiveHabitButton({ habitId }: { habitId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => { await archiveHabitAction(habitId); })}
      className="text-xs text-muted hover:text-danger"
    >
      Archive
    </button>
  );
}

export function ShareHabitForm({ habitId }: { habitId: string }) {
  const [open, setOpen] = useState(false);
  const action = shareHabitAction.bind(null, habitId);
  const [error, formAction, pending] = useActionState(action, undefined);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-accent hover:underline">
        Share
      </button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2 mt-1">
      <input
        name="email"
        type="email"
        required
        placeholder="friend@avance.dev"
        className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-accent"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Share"}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </form>
  );
}
