import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getEventLedgerTotals } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { currentEventYear } from "@/lib/event-year";

export default async function ReportsPage({ searchParams }: { searchParams: { year?: string; eventId?: string } }) {
  const user = await requirePermission("viewFinance");
  const events = await prisma.event.findMany({
    where: { villageId: user.villageId! },
    orderBy: [{ year: "desc" }, { startDate: "desc" }],
    include: { _count: { select: { feedback: true } } },
  });
  const years = Array.from(new Set([currentEventYear(), ...events.map((event) => event.year)])).sort((a, b) => b - a);
  const selectedYear =
    searchParams.year === "all"
      ? "all"
      : searchParams.year && years.includes(Number(searchParams.year))
        ? Number(searchParams.year)
        : currentEventYear();
  const yearEvents = selectedYear === "all" ? events : events.filter((event) => event.year === selectedYear);
  const selectedEventId = searchParams.eventId && yearEvents.some((event) => event.id === searchParams.eventId)
    ? searchParams.eventId
    : "all";
  const visibleEvents = selectedEventId === "all" ? yearEvents : yearEvents.filter((event) => event.id === selectedEventId);
  const balances = await Promise.all(visibleEvents.map((event) => getEventLedgerTotals(event.id)));
  const visibleYears = Array.from(new Set(visibleEvents.map((event) => event.year)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Each PDF includes income, expenses, distributions, a computed balance, and a signature
          section. Please verify against original receipts.
        </p>
      </div>
      <form method="get" className="flex flex-wrap items-center gap-3">
        <label htmlFor="report-year" className="text-sm font-medium">Year</label>
        <select id="report-year" name="year" defaultValue={selectedYear} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All years</option>
          {years.map((year) => <option key={year} value={year}>{year}</option>)}
        </select>
        <label htmlFor="report-event" className="text-sm font-medium">Event</label>
        <select id="report-event" name="eventId" defaultValue={selectedEventId} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All events</option>
          {yearEvents.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">Filter</button>
      </form>
      {visibleEvents.length === 0 ? (
        <EmptyState title="Nothing to report" description="Create an event first, then generate a PDF from its records." />
      ) : (
        <div className="space-y-8">
          {visibleYears.map((year) => (
            <section key={year} className="space-y-4">
              <h2 className="text-lg font-semibold">{year}</h2>
              <div className="grid gap-4">
                {visibleEvents
                  .map((event, index) => ({ event, index }))
                  .filter(({ event }) => event.year === year)
                  .map(({ event, index }) => (
                    <Card key={event.id}>
                      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle>{event.name}</CardTitle>
                          <CardDescription>
                            Available {formatINR(balances[index].totalAvailablePaise)} ·
                            distributed {formatINR(balances[index].totalDistributedPaise)} ·
                            distributable {formatINR(balances[index].distributableBalancePaise)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" asChild>
                            <Link href={`/events/${event.id}#feedback`}>Feedback ({event._count.feedback})</Link>
                          </Button>
                          <Button variant="outline" asChild>
                            <Link href={`/events/${event.id}`}>Open event</Link>
                          </Button>
                          <Button asChild>
                            <a href={`/api/reports/${event.id}/pdf`}>Download PDF</a>
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm text-muted-foreground">
                        Generated-by footer includes the standard disclaimer from the village reports policy.
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
