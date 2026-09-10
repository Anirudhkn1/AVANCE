"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/permissions";

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser();
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification || notification.userId !== user.id) return { ok: false as const, error: "Not found." };
  await prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
  revalidatePath("/notifications");
  return { ok: true as const };
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/notifications");
  return { ok: true as const };
}
