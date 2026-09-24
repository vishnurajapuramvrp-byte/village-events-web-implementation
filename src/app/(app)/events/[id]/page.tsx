import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addDonationAction,
  addDistributionAction,
  addExpenseAction,
  addPaymentAction,
  closeEventAction,
  deleteDonationAction,
  deleteExpenseAction,
  editDonationAction,
  editDistributionAction,
  editExpenseAction,
  updateEventAction,
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

function dateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

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
            <>
              <details>
                <summary className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm">Edit event</summary>
                <form action={updateEventAction.bind(null, event.id)} className="absolute z-10 mt-2 grid w-[min(90vw,32rem)] gap-3 rounded-lg border border-border bg-card p-4 text-left shadow-lg sm:grid-cols-2">
                  <Input name="name" defaultValue={event.name} placeholder="Event name" required />
                  <Input name="year" type="number" defaultValue={event.year} min="1990" max="2200" required />
                  <Textarea name="description" defaultValue={event.description ?? ""} placeholder="Description" className="sm:col-span-2" />
                  <Input name="startDate" type="date" defaultValue={dateValue(event.startDate)} required />
                  <Input name="endDate" type="date" defaultValue={event.endDate ? dateValue(event.endDate) : ""} />
                  <Input name="openingBalance" type="number" step="0.01" min="0" defaultValue={(event.openingBalancePaise / 100).toFixed(2)} />
                  <SubmitButton>Save event</SubmitButton>
                </form>
              </details>
              <form action={closeEventAction.bind(null, event.id)}>
                <SubmitButton>Close event</SubmitButton>
              </form>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <CardDescription>Expenses</CardDescription>
            <CardTitle>{formatINR(balance.expensesPaise)}</CardTitle>
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
                      <TableCell className="text-right">
                        {row.amountPaise === 0 && row.transactionRef ? `Ref: ${row.transactionRef}` : formatINR(row.amountPaise)}
                      </TableCell>
                      <TableCell>
                        {canWrite ? (
                          <details>
                            <summary className="cursor-pointer text-sm text-primary">Edit</summary>
                            <form action={editDonationAction.bind(null, event.id, row.id)} className="mt-3 grid gap-2 sm:grid-cols-2">
                              <Input name="donorName" defaultValue={row.donorName} required />
                              <Input name="amount" type="number" step="0.01" min="0" defaultValue={(row.amountPaise / 100).toFixed(2)} required />
                              <Input name="receivedOn" type="date" defaultValue={dateValue(row.receivedOn)} required />
                              <select name="method" defaultValue={row.method} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                                <option>CASH</option><option>UPI</option><option>BANK</option><option>OTHER</option>
                              </select>
                              <Input name="transactionRef" defaultValue={row.transactionRef ?? ""} placeholder="Transaction ref" />
                              <SubmitButton>Save donation</SubmitButton>
                            </form>
                          </details>
                        ) : null}
                        {canWrite ? (
                          <form action={deleteDonationAction.bind(null, event.id, row.id)}>
                            <SubmitButton>Delete</SubmitButton>
                          </form>
                        ) : null}
                      </TableCell>
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
                  <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
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
                      <TableCell>
                        {canWrite ? (
                          <details>
                            <summary className="cursor-pointer text-sm text-primary">Edit</summary>
                            <form action={editExpenseAction.bind(null, event.id, row.id)} className="mt-3 grid gap-2 sm:grid-cols-2">
                              <Input name="category" defaultValue={row.category} required />
                              <Input name="description" defaultValue={row.description} required />
                              <Input name="amount" type="number" step="0.01" min="0.01" defaultValue={(row.amountPaise / 100).toFixed(2)} required />
                              <Input name="incurredOn" type="date" defaultValue={dateValue(row.incurredOn)} required />
                              <Input name="paidTo" defaultValue={row.paidTo ?? ""} placeholder="Paid to" />
                              <Input name="receiptRef" defaultValue={row.receiptRef ?? ""} placeholder="Receipt ref" />
                              <SubmitButton>Save expense</SubmitButton>
                            </form>
                          </details>
                        ) : null}
                        {canWrite ? (
                          <form action={deleteExpenseAction.bind(null, event.id, row.id)}>
                            <SubmitButton>Delete</SubmitButton>
                          </form>
                        ) : null}
                      </TableCell>
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        Recipient: {row.person.phone || "No phone"} · Guarantor 1: {row.guarantorOneName} ({row.guarantorOnePhone}) · Guarantor 2: {row.guarantorTwoName} ({row.guarantorTwoPhone})
                      </p>
                      {canWrite ? (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-primary">Edit distribution</summary>
                          <form action={editDistributionAction.bind(null, event.id, row.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
                            <Input name="recipientName" defaultValue={row.person.name} placeholder="Recipient name" required />
                            <Input name="recipientPhone" defaultValue={row.person.phone ?? ""} placeholder="Recipient phone" />
                            <Input name="guarantorOneName" defaultValue={row.guarantorOneName ?? ""} placeholder="Guarantor 1 name" required />
                            <Input name="guarantorOnePhone" defaultValue={row.guarantorOnePhone ?? ""} placeholder="Guarantor 1 phone" required />
                            <Input name="guarantorTwoName" defaultValue={row.guarantorTwoName ?? ""} placeholder="Guarantor 2 name" required />
                            <Input name="guarantorTwoPhone" defaultValue={row.guarantorTwoPhone ?? ""} placeholder="Guarantor 2 phone" required />
                            <Input name="amount" type="number" step="0.01" min="0.01" defaultValue={(row.principalPaise / 100).toFixed(2)} required />
                            <Input name="interestRate" type="number" step="0.01" min="0" defaultValue={(row.interestRateBps / 100).toFixed(2)} required />
                            <select name="interestMethod" defaultValue={row.interestMethod} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                              <option value="ANNUAL_SIMPLE">Annual simple</option><option value="MONTHLY_SIMPLE">Monthly simple</option><option value="FIXED_AMOUNT">Fixed amount</option><option value="CUSTOM">Custom</option>
                            </select>
                            <Input name="fixedInterest" type="number" step="0.01" min="0" defaultValue={(row.fixedInterestPaise / 100).toFixed(2)} placeholder="Fixed interest" />
                            <Input name="startDate" type="date" defaultValue={dateValue(row.startDate)} required />
                            <Input name="dueDate" type="date" defaultValue={dateValue(row.dueDate)} required />
                            <Textarea name="notes" defaultValue={row.notes ?? ""} placeholder="Notes" className="sm:col-span-2" />
                            <SubmitButton>Save distribution</SubmitButton>
                          </form>
                        </details>
                      ) : null}
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
              <div className="space-y-1">
                <Label htmlFor="recipientName">Recipient name</Label>
                <Input id="recipientName" name="recipientName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recipientPhone">Recipient phone</Label>
                <Input id="recipientPhone" name="recipientPhone" type="tel" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guarantorOneName">Guarantor 1 name</Label>
                <Input id="guarantorOneName" name="guarantorOneName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guarantorOnePhone">Guarantor 1 phone</Label>
                <Input id="guarantorOnePhone" name="guarantorOnePhone" type="tel" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guarantorTwoName">Guarantor 2 name</Label>
                <Input id="guarantorTwoName" name="guarantorTwoName" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="guarantorTwoPhone">Guarantor 2 phone</Label>
                <Input id="guarantorTwoPhone" name="guarantorTwoPhone" type="tel" required />
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
