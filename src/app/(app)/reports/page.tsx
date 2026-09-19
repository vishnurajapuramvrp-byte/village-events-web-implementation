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
    orderBy: { startDate: "desc" },
  });
  const balances = await Promise.all(events.map((event) => getEventLedgerTotals(event.id)));

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
        <div className="grid gap-4">
          {events.map((event, index) => (
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
      )}
    </div>
  );
}
