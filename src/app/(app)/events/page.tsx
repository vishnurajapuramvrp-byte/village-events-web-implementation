import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getEventLedgerTotals } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/rbac";
import { currentEventYear } from "@/lib/event-year";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, cn } from "@/lib/utils";
import { ExcelImportForm } from "@/components/excel-import-form";
import { deleteEventAction } from "@/app/actions";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const user = await requirePermission("viewFinance");
  const events = await prisma.event.findMany({
    where: { villageId: user.villageId! },
    orderBy: [{ year: "desc" }, { startDate: "desc" }],
  });
  const balances = await Promise.all(events.map((event) => getEventLedgerTotals(event.id)));
  const years = Array.from(new Set(events.map((event) => event.year))).sort((a, b) => b - a);
  const requested = searchParams.year;
  const selectedYear =
    requested === "all"
      ? "all"
      : requested && years.includes(Number(requested))
        ? Number(requested)
        : years[0] ?? currentEventYear();
  const visible = selectedYear === "all" ? events : events.filter((event) => event.year === selectedYear);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Festival funds grouped by programme year.</p>
        </div>
        {can(user.role, "writeEvents") ? (
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        ) : null}
      </div>

      {can(user.role, "writeEvents") ? <ExcelImportForm /> : null}

      {years.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {years.map((year) => (
            <Link
              key={year}
              href={`/events?year=${year}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                selectedYear === year
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              {year}
            </Link>
          ))}
          <Link
            href="/events?year=all"
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              selectedYear === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            All years
          </Link>
        </div>
      ) : null}

      {events.length === 0 ? (
        <EmptyState
          title="No events yet"
          description="Create an event and pick its year to start recording donations, expenses, and distributions."
        />
      ) : visible.length === 0 ? (
        <EmptyState title="No events in this year" description="Choose another year or create a new event." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Distributable</TableHead>
                {can(user.role, "writeEvents") ? <TableHead>Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((event) => {
                const index = events.findIndex((row) => row.id === event.id);
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Link href={`/events/${event.id}`} className="font-medium hover:underline">
                        {event.name}
                      </Link>
                    </TableCell>
                    <TableCell>{event.year}</TableCell>
                    <TableCell>{formatDate(event.startDate)}</TableCell>
                    <TableCell>
                      <Badge variant={event.status === "CLOSED" ? "secondary" : "success"}>{event.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatINR(balances[index].distributableBalancePaise)}</TableCell>
                    {can(user.role, "writeEvents") ? (
                      <TableCell>
                        {event.status === "CLOSED" ? (
                          <span className="text-xs text-muted-foreground">Locked</span>
                        ) : (
                          <form action={deleteEventAction.bind(null, event.id)}>
                            <button type="submit" className="text-sm text-destructive hover:underline">Delete</button>
                          </form>
                        )}
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
