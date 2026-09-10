import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      meta: JSON.stringify(params.meta ?? {}),
    },
  });
}
