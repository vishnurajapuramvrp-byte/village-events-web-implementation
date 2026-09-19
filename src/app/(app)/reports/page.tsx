import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getEventLedgerTotals } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export default async function ReportsPage() {
  const user = await requirePermission("viewFinance");
  const events = await prisma.event.findMany({
    where: { villageId: user.villageId! },
    orderBy: [{ year: "desc" }, { startDate: "desc" }],
  });
  const balances = await Promise.all(events.map((event) => getEventLedgerTotals(event.id)));
  const years = Array.from(new Set(events.map((event) => event.year)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Each PDF includes income, expenses, distributions, a computed balance, and a signature
          section. Please verify against original receipts.
        </p>
      </div>
      {events.length === 0 ? (
        <EmptyState title="Nothing to report" description="Create an event first, then generate a PDF from its records." />
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <section key={year} className="space-y-4">
              <h2 className="text-lg font-semibold">{year}</h2>
              <div className="grid gap-4">
                {events
                  .map((event, index) => ({ event, index }))
                  .filter(({ event }) => event.year === year)
                  .map(({ event, index }) => (
                    <Card key={event.id}>
                      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <CardTitle>{event.name}</CardTitle>
                          <CardDescription>
                            Available {formatINR(balances[index].availableBeforeDistributionPaise)} ·
                            distributable {formatINR(balances[index].distributableBalancePaise)}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
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
