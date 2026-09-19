import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

const labels: Record<string, string> = {
  DAYS_30: "30 days before",
  DAYS_7: "7 days before",
  DUE_DAY: "Due day",
  OVERDUE: "Overdue",
};

export default async function RemindersPage() {
  const user = await requirePermission("viewFinance");
  const reminders = await prisma.reminder.findMany({
    where: { distribution: { event: { villageId: user.villageId! } } },
    include: { distribution: { include: { person: true, event: true } } },
    orderBy: { scheduledFor: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Reminders</h1>
        <p className="text-muted-foreground text-sm">
          Reminder text stays generic on purpose: phones may be shared. Delivery is logged here;
          plug in email, web push, or WhatsApp later.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Daily cron at 03:00 marks due reminders as sent without duplicating them.</CardDescription>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <EmptyState title="No reminders" description="Creating a distribution schedules the four-step ladder automatically." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Person</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatDate(row.scheduledFor)}</TableCell>
                    <TableCell>{labels[row.kind] ?? row.kind}</TableCell>
                    <TableCell>{row.distribution.person.name}</TableCell>
                    <TableCell>{row.distribution.event.name}</TableCell>
                    <TableCell>
                      {row.sentAt ? (
                        <Badge variant="success">Sent {formatDate(row.sentAt)}</Badge>
                      ) : (
                        <Badge variant="warning">Queued</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
