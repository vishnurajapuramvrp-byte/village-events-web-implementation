import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getEventLedgerTotals } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

export default async function EventsPage() {
  const user = await requirePermission("viewFinance");
  const events = await prisma.event.findMany({
    where: { villageId: user.villageId! },
    orderBy: { startDate: "desc" },
  });
  const balances = await Promise.all(events.map((event) => getEventLedgerTotals(event.id)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Festival funds, collections, and distributions.</p>
        </div>
        {can(user.role, "writeEvents") ? (
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        ) : null}
      </div>

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create an event to start recording donations, expenses, and distributions."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Distributable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event, index) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                      {event.name}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(event.startDate)}</TableCell>
                  <TableCell>
                    <Badge variant={event.status === "CLOSED" ? "secondary" : "success"}>{event.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatINR(balances[index].distributableBalancePaise)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
