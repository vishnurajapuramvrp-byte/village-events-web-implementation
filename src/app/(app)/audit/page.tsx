import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export default async function AuditPage() {
  await requirePermission("viewAudit");
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Who changed what, and when, on financial records.</p>
      </div>
      {logs.length === 0 ? (
        <EmptyState title="No activity yet" description="Writes to events, donations, expenses, and distributions are logged." />
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="py-4">
                <CardTitle className="text-base">
                  {log.action} · {log.entityType}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {log.user?.name ?? "System"} · {formatDate(log.createdAt)} · {log.entityId}
                </p>
              </CardHeader>
              {(log.oldValue || log.newValue) && (
                <CardContent className="grid gap-3 text-xs sm:grid-cols-2">
                  {log.oldValue ? (
                    <pre className="overflow-auto rounded-md bg-muted p-3">{log.oldValue}</pre>
                  ) : null}
                  {log.newValue ? (
                    <pre className="overflow-auto rounded-md bg-muted p-3">{log.newValue}</pre>
                  ) : null}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
