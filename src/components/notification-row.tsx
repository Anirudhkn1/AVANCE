"use client";

import { useTransition } from "react";
import Link from "next/link";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/actions/notifications";
import { Card, Badge, Button } from "@/components/ui";

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  relativeTime: string;
}

export function NotificationRow({ notification }: { notification: NotificationData }) {
  const [pending, startTransition] = useTransition();

  const content = (
    <Card className={notification.read ? "opacity-60" : "border-accent/40"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{notification.title}</p>
            <Badge tone="neutral">{notification.type.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-sm text-muted mt-1">{notification.message}</p>
          <p className="text-xs text-muted mt-1">{notification.relativeTime}</p>
        </div>
        {!notification.read && (
          <button
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => { await markNotificationReadAction(notification.id); });
            }}
            className="text-xs text-accent hover:underline shrink-0"
          >
            Mark read
          </button>
        )}
      </div>
    </Card>
  );

  return notification.link ? <Link href={notification.link}>{content}</Link> : content;
}

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="secondary" size="sm" disabled={pending} onClick={() => startTransition(async () => { await markAllNotificationsReadAction(); })}>
      Mark all read
    </Button>
  );
}
