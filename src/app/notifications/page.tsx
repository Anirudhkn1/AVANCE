import { requireSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime } from "@/lib/format";
import { Card, EmptyState } from "@/components/ui";
import { MarkAllReadButton, NotificationRow } from "@/components/notification-row";

export default async function NotificationsPage() {
  const user = await requireSessionUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl w-full px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-muted mt-1">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 ? (
        <Card><EmptyState title="No notifications yet" /></Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <NotificationRow key={n.id} notification={{ ...n, relativeTime: formatRelativeTime(n.createdAt) }} />
          ))}
        </div>
      )}
    </div>
  );
}
