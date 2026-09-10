import { Avatar, EmptyState } from "@/components/ui";
import { ReactionBar } from "@/components/reaction-bar";
import { formatRelativeTime } from "@/lib/format";

interface FeedEvent {
  id: string;
  message: string;
  createdAt: Date;
  user: { name: string; avatarSeed: string };
  reactions: { emoji: string; actorId: string }[];
}

export function ActivityFeed({ events, currentUserId }: { events: FeedEvent[]; currentUserId: string }) {
  if (events.length === 0) {
    return <EmptyState title="No activity yet" description="Completed checkpoints will show up here." />;
  }

  return (
    <ul className="space-y-3">
      {events.map((event) => {
        const counts: Partial<Record<string, number>> = {};
        const mine: Partial<Record<string, boolean>> = {};
        for (const r of event.reactions) {
          counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
          if (r.actorId === currentUserId) mine[r.emoji] = true;
        }
        return (
          <li key={event.id} className="flex items-start gap-3">
            <Avatar seed={event.user.avatarSeed} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{event.user.name}</span> {event.message}
              </p>
              <p className="text-xs text-muted">{formatRelativeTime(event.createdAt)}</p>
              <ReactionBar activityEventId={event.id} counts={counts} mine={mine} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
