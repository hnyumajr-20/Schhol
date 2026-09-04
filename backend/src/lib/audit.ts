import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function writeAuditLog(input: {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
    },
  });
}
