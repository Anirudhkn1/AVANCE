"use client";

import { useTransition } from "react";
import { toggleReactionAction } from "@/actions/reactions";
import { REACTION_EMOJIS } from "@/lib/constants";

export function ReactionBar({
  activityEventId,
  counts,
  mine,
}: {
  activityEventId: string;
  counts: Partial<Record<string, number>>;
  mine: Partial<Record<string, boolean>>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {REACTION_EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = Boolean(mine[emoji]);
        if (count === 0 && !active) {
          return (
            <button
              key={emoji}
              disabled={pending}
              onClick={() => startTransition(async () => { await toggleReactionAction(activityEventId, emoji); })}
              className="text-xs opacity-40 hover:opacity-100 transition-opacity px-1"
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          );
        }
        return (
          <button
            key={emoji}
            disabled={pending}
            onClick={() => startTransition(async () => { await toggleReactionAction(activityEventId, emoji); })}
            className={`text-xs rounded-full px-1.5 py-0.5 border transition-colors ${
              active ? "border-accent bg-accent-soft text-accent" : "border-border text-muted hover:bg-surface-muted"
            }`}
          >
            {emoji} {count}
          </button>
        );
      })}
    </div>
  );
}
