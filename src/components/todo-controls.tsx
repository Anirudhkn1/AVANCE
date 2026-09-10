"use client";

import { useTransition } from "react";
import { toggleTodoAction, deleteTodoAction } from "@/actions/todos";

export function ToggleTodoButton({ todoId, done }: { todoId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await toggleTodoAction(todoId); })}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs transition-colors ${
        done ? "border-accent bg-accent text-accent-foreground" : "border-border hover:border-accent"
      }`}
    >
      {done ? "✓" : ""}
    </button>
  );
}

export function DeleteTodoButton({ todoId }: { todoId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await deleteTodoAction(todoId); })}
      className="text-xs text-muted hover:text-danger"
    >
      Delete
    </button>
  );
}
