import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addDonationAction,
  addDistributionAction,
  addExpenseAction,
  addPaymentAction,
  closeEventAction,
} from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { distributionSnapshot, getEventLedgerTotals } from "@/lib/ledger";
import { formatINR } from "@/lib/money";
import { can } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/utils";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const user = await requirePermission("viewFinance");
  const event = await prisma.event.findFirst({
    where: { id: params.id, villageId: user.villageId! },
    include: {
      donations: { orderBy: { receivedOn: "desc" } },
      expenses: { orderBy: { incurredOn: "desc" } },
      distributions: {
        include: { person: true, payments: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!event) notFound();

  const people = await prisma.person.findMany({
    where: { villageId: user.villageId! },
    orderBy: { name: "asc" },
  });
  const balance = await getEventLedgerTotals(event.id);
  const canWrite = can(user.role, "writeFinance") && event.status !== "CLOSED";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/events?year=${event.year}`} className="hover:underline">
              Events · {event.year}
            </Link>
          </p>
          <h1 className="text-3xl font-semibold">{event.name}</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">{event.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{event.year}</Badge>
          <Badge variant={event.status === "CLOSED" ? "secondary" : "success"}>{event.status}</Badge>
          <Button variant="outline" asChild>
            <a href={`/api/reports/${event.id}/pdf`}>Download PDF</a>
          </Button>
          {can(user.role, "writeEvents") && event.status !== "CLOSED" ? (
            <form action={closeEventAction.bind(null, event.id)}>
              <SubmitButton>Close event</SubmitButton>
            </form>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Opening</CardDescription>
            <CardTitle>{formatINR(balance.openingBalancePaise)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Donations</CardDescription>
            <CardTitle>{formatINR(balance.donationsPaise)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Available before distribution</CardDescription>
            <CardTitle>{formatINR(balance.availableBeforeDistributionPaise)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Distributable</CardDescription>
            <CardTitle>{formatINR(balance.distributableBalancePaise)}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        Available = opening + donations − expenses. Distributable = available − principal already
        given out. Expenses {formatINR(balance.expensesPaise)} · Distributed{" "}
        {formatINR(balance.distributedPaise)}.
      </p>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Donations</CardTitle>
            <CardDescription>Duplicate transaction references are rejected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.donations.length === 0 ? (
              <EmptyState title="No donations" description="Record the first contribution for this event." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donor</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {event.donations.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.donorName}</div>
                        <div className="text-xs text-muted-foreground">
                          {row.method}
                          {row.transactionRef ? ` · ${row.transactionRef}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(row.receivedOn)}</TableCell>
                      <TableCell className="text-right">{formatINR(row.amountPaise)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {canWrite ? (
              <form action={addDonationAction.bind(null, event.id)} className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="donorName">Donor</Label>
                  <Input id="donorName" name="donorName" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="receivedOn">Received on</Label>
                  <Input id="receivedOn" name="receivedOn" type="date" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="method">Method</Label>
                  <select id="method" name="method" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option>CASH</option>
                    <option>UPI</option>
                    <option>BANK</option>
                    <option>OTHER</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="transactionRef">Transaction ref</Label>
                  <Input id="transactionRef" name="transactionRef" />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton>Add donation</SubmitButton>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
            <CardDescription>Food, temple, transport, and other event costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {event.expenses.length === 0 ? (
              <EmptyState title="No expenses" description="Record a payment made from this event fund." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {event.expenses.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="font-medium">{row.description}</div>
                        <div className="text-xs text-muted-foreground">{row.category}</div>
                      </TableCell>
                      <TableCell>{formatDate(row.incurredOn)}</TableCell>
                      <TableCell className="text-right">{formatINR(row.amountPaise)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {canWrite ? (
              <form action={addExpenseAction.bind(null, event.id)} className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="category">Category</Label>
                  <Input id="category" name="category" required placeholder="Food" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exp-amount">Amount (₹)</Label>
                  <Input id="exp-amount" name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input id="description" name="description" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="incurredOn">Date</Label>
                  <Input id="incurredOn" name="incurredOn" type="date" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="paidTo">Paid to</Label>
                  <Input id="paidTo" name="paidTo" />
                </div>
                <div className="sm:col-span-2">
                  <SubmitButton>Add expense</SubmitButton>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Distributions</CardTitle>
          <CardDescription>
            Principal cannot exceed the current distributable balance. Due date defaults to one year
            from start, with 30-day, 7-day, due-day, and overdue reminders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {event.distributions.length === 0 ? (
            <EmptyState title="No distributions" description="Support given from this event will appear here." />
          ) : (
            event.distributions.map((row) => {
              const snap = distributionSnapshot(row);
              return (
                <div key={row.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{row.person.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatINR(row.principalPaise)} principal · {row.interestRateBps / 100}% annual
                        simple · due {formatDate(row.dueDate)}
                      </p>
                    </div>
                    <div className="text-sm">
                      {snap.overdue ? <Badge variant="danger">Overdue</Badge> : null}
                      <p>Outstanding {formatINR(snap.outstandingToDatePaise)}</p>
                      <p className="text-muted-foreground">
                        Interest to date {formatINR(snap.interestToDatePaise)} · repaid{" "}
                        {formatINR(snap.repaidPaise)}
                      </p>
                    </div>
                  </div>
                  {canWrite ? (
                    <form
                      action={addPaymentAction.bind(null, row.id, event.id)}
                      className="mt-3 grid gap-2 sm:grid-cols-4"
                    >
                      <Input name="amount" type="number" step="0.01" min="0.01" placeholder="Repayment ₹" required />
                      <Input name="paidOn" type="date" required />
                      <Input name="notes" placeholder="Note" />
                      <SubmitButton>Record repayment</SubmitButton>
                    </form>
                  ) : null}
                </div>
              );
            })
          )}

          {canWrite ? (
            <form action={addDistributionAction.bind(null, event.id)} className="grid gap-3 rounded-lg bg-muted/40 p-4 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="personId">Recipient</Label>
                <select
                  id="personId"
                  name="personId"
                  required
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select a person</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="dist-amount">Principal (₹)</Label>
                <Input id="dist-amount" name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="interestRate">Annual rate (%)</Label>
                <Input id="interestRate" name="interestRate" type="number" step="0.01" min="0" defaultValue="12" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="interestMethod">Interest method</Label>
                <select
                  id="interestMethod"
                  name="interestMethod"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="ANNUAL_SIMPLE"
                >
                  <option value="ANNUAL_SIMPLE">Annual simple</option>
                  <option value="MONTHLY_SIMPLE">Monthly simple</option>
                  <option value="FIXED_AMOUNT">Fixed amount</option>
                  <option value="CUSTOM">Custom (annual simple)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="fixedInterest">Fixed interest (₹)</Label>
                <Input id="fixedInterest" name="fixedInterest" type="number" step="0.01" min="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="startDate">Start date</Label>
                <Input id="startDate" name="startDate" type="date" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dueDate">Due date (optional)</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" />
              </div>
              <div className="sm:col-span-2">
                <SubmitButton>Create distribution</SubmitButton>
              </div>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
