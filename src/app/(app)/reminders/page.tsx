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

export default async function RemindersPage({ searchParams }: { searchParams: { eventId?: string } }) {
  const user = await requirePermission("viewFinance");
  const events = await prisma.event.findMany({
    where: { villageId: user.villageId! },
    orderBy: [{ year: "desc" }, { startDate: "desc" }],
  });
  const selectedEventId = searchParams.eventId && events.some((event) => event.id === searchParams.eventId)
    ? searchParams.eventId
    : "all";
  const reminders = await prisma.reminder.findMany({
    where: {
      distribution: {
        event: { villageId: user.villageId!, ...(selectedEventId !== "all" ? { id: selectedEventId } : {}) },
      },
    },
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
      <form method="get" className="flex items-center gap-3">
        <label htmlFor="reminder-event" className="text-sm font-medium">Event</label>
        <select id="reminder-event" name="eventId" defaultValue={selectedEventId} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All events</option>
          {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Filter</button>
      </form>
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
