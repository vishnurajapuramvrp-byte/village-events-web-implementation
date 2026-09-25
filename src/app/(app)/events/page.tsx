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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Programme archive</p>
          <h1 className="display-type mt-2 text-4xl">Events</h1>
          <p className="text-sm text-muted-foreground">Festival funds grouped by programme year.</p>
        </div>
        {can(user.role, "writeEvents") ? (
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        ) : null}
      </div>

      <div className="festival-photo festival-photo--altar relative min-h-36 overflow-hidden rounded-xl p-6 text-white shadow-lg shadow-primary/10">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/55 to-transparent" />
        <div className="relative max-w-md space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">A record of care</p>
          <p className="display-type text-2xl">Every programme has a story.</p>
          <p className="text-sm text-white/80">Open an event to follow its offerings, costs, and support.</p>
        </div>
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
        <>
          <div className="grid gap-3 sm:hidden">
            {visible.map((event) => {
              const index = events.findIndex((row) => row.id === event.id);
              return (
                <div key={event.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/events/${event.id}`} className="font-semibold hover:text-primary">{event.name}</Link>
                      <p className="mt-1 text-xs text-muted-foreground">{event.year} · {formatDate(event.startDate)}</p>
                    </div>
                    <Badge variant={event.status === "CLOSED" ? "secondary" : "success"}>{event.status}</Badge>
                  </div>
                  <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground">Distributed</p>
                        <p className="mt-1 text-lg font-semibold">{formatINR(balances[index].distributedPaise + balances[index].eventGeneratedPaise)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Distributable</p>
                        <p className="mt-1 text-lg font-semibold">{formatINR(balances[index].distributableBalancePaise)}</p>
                      </div>
                    </div>
                    {can(user.role, "writeEvents") && event.status !== "CLOSED" ? (
                      <form action={deleteEventAction.bind(null, event.id)}>
                        <button type="submit" className="text-xs text-destructive hover:underline">Delete</button>
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="hidden rounded-xl border border-border bg-card sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Distributed</TableHead>
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
                    <TableCell className="text-right">{formatINR(balances[index].distributedPaise + balances[index].eventGeneratedPaise)}</TableCell>
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
        </>
      )}
    </div>
  );
}
