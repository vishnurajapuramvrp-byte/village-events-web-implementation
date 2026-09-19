import { prisma } from "@/lib/prisma";

export { roleLabel } from "@/lib/rbac";

export async function writeAudit(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      oldValue: params.oldValue == null ? null : JSON.stringify(params.oldValue),
      newValue: params.newValue == null ? null : JSON.stringify(params.newValue),
    },
  });
}
