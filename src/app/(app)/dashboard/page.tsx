import Link from "next/link";
import { Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getEventLedgerTotals, distributionSnapshot } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { CalendarDays, Coins, HandCoins } from "lucide-react";

export default async function DashboardPage() {
  const user = await requireUser();

  if (user.role === Role.RECIPIENT) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Your distribution</h1>
        <p className="text-muted-foreground">
          Open your loan page to see the due date and any reminders. Amounts are shown only after
          you sign in, not in reminder text.
        </p>
        <Button asChild>
          <Link href="/my-loan">View my distribution</Link>
        </Button>
      </div>
    );
  }

  if (!user.villageId) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Village assignment needed</h1>
        <p className="mt-2 text-muted-foreground">
          An admin still needs to attach this account to a village before the ledger will appear.
        </p>
      </div>
    );
  }

  const village = await prisma.village.findUniqueOrThrow({
    where: { id: user.villageId },
    include: { organization: true },
  });

  const events = await prisma.event.findMany({
    where: { villageId: user.villageId },
    orderBy: [{ year: "desc" }, { startDate: "desc" }],
  });

  const balances = await Promise.all(events.map((event) => getEventLedgerTotals(event.id)));
  const cash = balances.reduce(
    (sum, item) => sum + item.availableBeforeDistributionPaise,
    0,
  );
  const outstanding = await prisma.distribution.findMany({
    where: { event: { villageId: user.villageId } },
    include: { payments: true, person: true, event: true },
  });
  const dueSoon = outstanding
    .map((row) => ({ row, snap: distributionSnapshot(row) }))
    .filter((item) => item.snap.outstandingToDatePaise > 0)
    .sort((a, b) => a.row.dueDate.getTime() - b.row.dueDate.getTime())
    .slice(0, 5);

  const recentAudit = can(user.role, "viewAudit")
    ? await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { user: true },
      })
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {village.organization.name} · {village.name}
            {village.district ? `, ${village.district}` : ""}
          </p>
          <h1 className="display-type mt-2 text-4xl tracking-tight">The Village ledger</h1>
          <p className="mt-2 text-sm text-muted-foreground">A living view of every contribution, expense, and family supported.</p>
        </div>
        {can(user.role, "writeEvents") ? (
          <Button asChild>
            <Link href="/events/new">New event</Link>
          </Button>
        ) : null}
      </div>

      <div className="festival-photo festival-photo--shrine relative min-h-44 overflow-hidden rounded-xl p-6 text-white shadow-lg shadow-accent/10 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-accent/95 via-accent/65 to-transparent" />
        <div className="relative max-w-lg space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">This year in the village</p>
          <h2 className="display-type text-3xl">Keep the devotion visible.</h2>
          <p className="text-sm leading-6 text-white/80">Every number here comes from the records your committee keeps together.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-primary">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Events
            </CardDescription>
            <CardTitle className="text-3xl">{events.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-t-4 border-t-accent">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Coins className="h-4 w-4" /> Cash across events
            </CardDescription>
            <CardTitle className="text-3xl">{formatINR(cash)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-t-4 border-t-secondary-foreground">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <HandCoins className="h-4 w-4" /> Open distributions
            </CardDescription>
            <CardTitle className="text-3xl">
              {outstanding.filter((row) => distributionSnapshot(row).outstandingToDatePaise > 0).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Events</CardTitle>
              <Button variant="outline" size="sm" asChild><Link href="/events">View all</Link></Button>
            </div>
            <CardDescription>Balances are computed from donations, expenses, and distributions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              events.map((event, index) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-3 hover:bg-muted/40"
                >
                  <div>
                    <Link href={`/events/${event.id}`} className="font-medium hover:underline">{event.name}</Link>
                    <Link href={`/events/${event.id}`} className="block text-xs text-muted-foreground hover:underline">
                      {event.year} · {formatDate(event.startDate)}
                    </Link>
                  </div>
                  <div className="text-right">
                    <Badge variant={event.status === "CLOSED" ? "secondary" : "success"}>{event.status}</Badge>
                    <p className="mt-1 text-sm">{formatINR(balances[index].distributableBalancePaise)}</p>
                    <div className="mt-2 flex gap-2 text-xs">
                      <Link href={`/reminders?eventId=${event.id}`} className="text-primary hover:underline">Reminders</Link>
                      <Link href={`/reports?eventId=${event.id}`} className="text-primary hover:underline">Report</Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Upcoming dues</CardTitle>
              <Button variant="outline" size="sm" asChild><Link href="/reminders">All reminders</Link></Button>
            </div>
            <CardDescription>Principal plus accrued interest, minus repayments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {dueSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
            ) : (
              dueSoon.map(({ row, snap }) => (
                <div key={row.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
                  <div>
                    <p className="font-medium">{row.person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.event.name} · due {formatDate(row.dueDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    {snap.overdue ? <Badge variant="danger">Overdue</Badge> : null}
                    <p className="text-sm">{formatINR(snap.outstandingToDatePaise)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {recentAudit.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent audit activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recentAudit.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
                <span>
                  <span className="font-medium">{item.action}</span> {item.entityType}
                  {item.user?.name ? ` · ${item.user.name}` : ""}
                </span>
                <span className="text-muted-foreground">{formatDate(item.createdAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
