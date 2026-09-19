import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { distributionSnapshot } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export default async function MyLoanPage() {
  const user = await requireUser();
  if (user.role !== "RECIPIENT") {
    return (
      <div>
        <h1 className="text-3xl font-semibold">Recipient view</h1>
        <p className="mt-2 text-muted-foreground">
          This page is for borrower accounts. Committee users should open the event ledger instead.
        </p>
      </div>
    );
  }

  if (!user.personId) {
    return (
      <EmptyState
        title="No recipient record is linked"
        description="Ask an admin to attach this login to a person in the village directory."
      />
    );
  }

  const distributions = await prisma.distribution.findMany({
    where: { personId: user.personId },
    include: { event: true, payments: true, reminders: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">My distribution</h1>
        <p className="text-sm text-muted-foreground">
          Only your own records are shown. Reminder notifications never include amounts.
        </p>
      </div>
      {distributions.length === 0 ? (
        <EmptyState title="No distributions" description="When the committee records support in your name, it will appear here." />
      ) : (
        distributions.map((row) => {
          const snap = distributionSnapshot(row);
          return (
            <Card key={row.id}>
              <CardHeader>
                <CardTitle>{row.event.name}</CardTitle>
                <CardDescription>Due {formatDate(row.dueDate)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Principal</p>
                    <p className="text-lg font-semibold">{formatINR(row.principalPaise)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Interest to date</p>
                    <p className="text-lg font-semibold">{formatINR(snap.interestToDatePaise)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-lg font-semibold">{formatINR(snap.outstandingToDatePaise)}</p>
                  </div>
                </div>
                {snap.overdue ? <Badge variant="danger">Past due</Badge> : <Badge variant="success">On track</Badge>}
                <div>
                  <p className="mb-2 text-sm font-medium">Repayments</p>
                  {row.payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No repayments recorded yet.</p>
                  ) : (
                    <ul className="text-sm">
                      {row.payments.map((payment) => (
                        <li key={payment.id}>
                          {formatDate(payment.paidOn)} · {formatINR(payment.amountPaise)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
