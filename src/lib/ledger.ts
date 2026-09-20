import { EventStatus, InterestMethod, PaymentMethod, ReminderKind } from "@/lib/enums";
import { writeAudit } from "@/lib/audit";
import { addDays, addYears, simpleInterestPaise } from "@/lib/interest";
import { prisma } from "@/lib/prisma";

export type LedgerTotals = {
  openingBalancePaise: number;
  donationsPaise: number;
  expensesPaise: number;
  distributedPaise: number;
  availableBeforeDistributionPaise: number;
  distributableBalancePaise: number;
};

export async function getEventLedgerTotals(eventId: string): Promise<LedgerTotals> {
  const event = await prisma.event.findUniqueOrThrow({
    where: { id: eventId },
    include: {
      donations: { select: { amountPaise: true } },
      expenses: { select: { amountPaise: true } },
      distributions: { select: { principalPaise: true } },
    },
  });

  const donationsPaise = event.donations.reduce((sum, row) => sum + row.amountPaise, 0);
  const expensesPaise = event.expenses.reduce((sum, row) => sum + row.amountPaise, 0);
  const distributedPaise = event.distributions.reduce((sum, row) => sum + row.principalPaise, 0);
  const availableBeforeDistributionPaise =
    event.openingBalancePaise + donationsPaise - expensesPaise;
  const distributableBalancePaise = availableBeforeDistributionPaise - distributedPaise;

  return {
    openingBalancePaise: event.openingBalancePaise,
    donationsPaise,
    expensesPaise,
    distributedPaise,
    availableBeforeDistributionPaise,
    distributableBalancePaise,
  };
}

export function distributionSnapshot(
  row: {
    principalPaise: number;
    interestMethod: string;
    interestRateBps: number;
    fixedInterestPaise: number;
    startDate: Date;
    dueDate: Date;
    payments: { amountPaise: number }[];
  },
  asOf: Date = new Date(),
) {
  const interestToDatePaise = simpleInterestPaise({
    principalPaise: row.principalPaise,
    interestMethod: row.interestMethod,
    interestRateBps: row.interestRateBps,
    fixedInterestPaise: row.fixedInterestPaise,
    startDate: row.startDate,
    asOf,
  });
  const repaidPaise = row.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
  const outstandingToDatePaise = Math.max(
    0,
    row.principalPaise + interestToDatePaise - repaidPaise,
  );
  const overdue = asOf > row.dueDate && outstandingToDatePaise > 0;
  return { interestToDatePaise, repaidPaise, outstandingToDatePaise, overdue };
}

export async function createDonationRecord(input: {
  eventId: string;
  donorName: string;
  amountPaise: number;
  receivedOn: Date;
  method: PaymentMethod | string;
  transactionRef?: string | null;
  notes?: string;
  actorUserId?: string;
}) {
  if (!input.donorName) throw new Error("Donor name is required.");
  if (input.amountPaise <= 0) throw new Error("Donation amount must be greater than zero.");

  const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId } });
  if (event.status === EventStatus.CLOSED) throw new Error("This event is closed.");

  if (input.transactionRef) {
    const duplicate = await prisma.donation.findUnique({
      where: { transactionRef: input.transactionRef },
    });
    if (duplicate) throw new Error("This transaction reference has already been recorded.");
  }

  const donation = await prisma.donation.create({
    data: {
      eventId: input.eventId,
      donorName: input.donorName,
      amountPaise: input.amountPaise,
      receivedOn: input.receivedOn,
      method: input.method,
      transactionRef: input.transactionRef || null,
      notes: input.notes,
    },
  });

  await writeAudit({
    userId: input.actorUserId,
    action: "CREATE",
    entityType: "Donation",
    entityId: donation.id,
    newValue: donation,
  });

  return donation;
}

export async function updateDonationRecord(input: {
  id: string;
  donorName: string;
  amountPaise: number;
  receivedOn: Date;
  method: PaymentMethod | string;
  transactionRef?: string | null;
  notes?: string;
  actorUserId?: string;
}) {
  if (!input.donorName) throw new Error("Donor name is required.");
  if (input.amountPaise <= 0) throw new Error("Donation amount must be greater than zero.");
  const existing = await prisma.donation.findUniqueOrThrow({ where: { id: input.id }, include: { event: true } });
  if (existing.event.status === EventStatus.CLOSED) throw new Error("This event is closed.");
  if (input.transactionRef) {
    const duplicate = await prisma.donation.findFirst({
      where: { transactionRef: input.transactionRef, id: { not: input.id } },
    });
    if (duplicate) throw new Error("This transaction reference has already been recorded.");
  }
  const donation = await prisma.donation.update({
    where: { id: input.id },
    data: {
      donorName: input.donorName,
      amountPaise: input.amountPaise,
      receivedOn: input.receivedOn,
      method: input.method,
      transactionRef: input.transactionRef || null,
      notes: input.notes,
    },
  });
  await writeAudit({ userId: input.actorUserId, action: "UPDATE", entityType: "Donation", entityId: donation.id, newValue: donation });
  return donation;
}

export async function createExpenseRecord(input: {
  eventId: string;
  category: string;
  description: string;
  amountPaise: number;
  incurredOn: Date;
  paidTo?: string;
  receiptRef?: string;
  actorUserId?: string;
}) {
  if (!input.category || !input.description) throw new Error("Category and description are required.");
  if (input.amountPaise <= 0) throw new Error("Expense amount must be greater than zero.");

  const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId } });
  if (event.status === EventStatus.CLOSED) throw new Error("This event is closed.");

  const expense = await prisma.expense.create({
    data: {
      eventId: input.eventId,
      category: input.category,
      description: input.description,
      amountPaise: input.amountPaise,
      incurredOn: input.incurredOn,
      paidTo: input.paidTo,
      receiptRef: input.receiptRef,
    },
  });

  await writeAudit({
    userId: input.actorUserId,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    newValue: expense,
  });

  return expense;
}

export async function updateExpenseRecord(input: {
  id: string;
  category: string;
  description: string;
  amountPaise: number;
  incurredOn: Date;
  paidTo?: string;
  receiptRef?: string;
  actorUserId?: string;
}) {
  if (!input.category || !input.description) throw new Error("Category and description are required.");
  if (input.amountPaise <= 0) throw new Error("Expense amount must be greater than zero.");
  const existing = await prisma.expense.findUniqueOrThrow({ where: { id: input.id }, include: { event: true } });
  if (existing.event.status === EventStatus.CLOSED) throw new Error("This event is closed.");
  const expense = await prisma.expense.update({
    where: { id: input.id },
    data: {
      category: input.category,
      description: input.description,
      amountPaise: input.amountPaise,
      incurredOn: input.incurredOn,
      paidTo: input.paidTo,
      receiptRef: input.receiptRef,
    },
  });
  await writeAudit({ userId: input.actorUserId, action: "UPDATE", entityType: "Expense", entityId: expense.id, newValue: expense });
  return expense;
}

function reminderSchedule(dueDate: Date) {
  return [
    { kind: ReminderKind.DAYS_30, scheduledFor: addDays(dueDate, -30) },
    { kind: ReminderKind.DAYS_7, scheduledFor: addDays(dueDate, -7) },
    { kind: ReminderKind.DUE_DAY, scheduledFor: dueDate },
    { kind: ReminderKind.OVERDUE, scheduledFor: addDays(dueDate, 1) },
  ];
}

export async function createDistributionRecord(input: {
  eventId: string;
  personId?: string;
  recipientName: string;
  recipientPhone?: string;
  guarantorOneName: string;
  guarantorOnePhone: string;
  guarantorTwoName: string;
  guarantorTwoPhone: string;
  principalPaise: number;
  interestMethod: InterestMethod | string;
  interestRateBps: number;
  fixedInterestPaise?: number;
  startDate: Date;
  dueDate?: Date;
  notes?: string;
  actorUserId?: string;
}) {
  if (input.principalPaise <= 0) throw new Error("Principal must be greater than zero.");
  if (!input.recipientName.trim()) throw new Error("Recipient name is required.");
  if (!input.guarantorOneName.trim() || !input.guarantorOnePhone.trim()) {
    throw new Error("First guarantor name and phone are required.");
  }
  if (!input.guarantorTwoName.trim() || !input.guarantorTwoPhone.trim()) {
    throw new Error("Second guarantor name and phone are required.");
  }

  const event = await prisma.event.findUniqueOrThrow({ where: { id: input.eventId } });
  if (event.status === EventStatus.CLOSED) throw new Error("This event is closed.");

  const totals = await getEventLedgerTotals(input.eventId);
  if (input.principalPaise > totals.distributableBalancePaise) {
    throw new Error("Distribution cannot exceed the current distributable balance.");
  }

  const dueDate = input.dueDate ?? addYears(input.startDate, 1);
  const person = input.personId
    ? await prisma.person.findUniqueOrThrow({ where: { id: input.personId } })
    : await prisma.person.create({
        data: {
          villageId: event.villageId,
          name: input.recipientName.trim(),
          phone: input.recipientPhone?.trim() || null,
        },
      });

  const distribution = await prisma.distribution.create({
    data: {
      eventId: input.eventId,
      personId: person.id,
      guarantorOneName: input.guarantorOneName.trim(),
      guarantorOnePhone: input.guarantorOnePhone.trim(),
      guarantorTwoName: input.guarantorTwoName.trim(),
      guarantorTwoPhone: input.guarantorTwoPhone.trim(),
      principalPaise: input.principalPaise,
      interestMethod: input.interestMethod,
      interestRateBps: input.interestRateBps,
      fixedInterestPaise: input.fixedInterestPaise ?? 0,
      startDate: input.startDate,
      dueDate,
      notes: input.notes,
      reminders: { create: reminderSchedule(dueDate) },
    },
  });

  await writeAudit({
    userId: input.actorUserId,
    action: "CREATE",
    entityType: "Distribution",
    entityId: distribution.id,
    newValue: distribution,
  });

  return distribution;
}

export async function updateDistributionRecord(input: {
  id: string;
  recipientName: string;
  recipientPhone?: string;
  guarantorOneName: string;
  guarantorOnePhone: string;
  guarantorTwoName: string;
  guarantorTwoPhone: string;
  principalPaise: number;
  interestMethod: InterestMethod | string;
  interestRateBps: number;
  fixedInterestPaise?: number;
  startDate: Date;
  dueDate: Date;
  notes?: string;
  actorUserId?: string;
}) {
  if (input.principalPaise <= 0) throw new Error("Principal must be greater than zero.");
  if (!input.recipientName.trim()) throw new Error("Recipient name is required.");
  if (!input.guarantorOneName.trim() || !input.guarantorOnePhone.trim()) throw new Error("First guarantor name and phone are required.");
  if (!input.guarantorTwoName.trim() || !input.guarantorTwoPhone.trim()) throw new Error("Second guarantor name and phone are required.");
  const existing = await prisma.distribution.findUniqueOrThrow({ where: { id: input.id }, include: { event: true, person: true } });
  if (existing.event.status === EventStatus.CLOSED) throw new Error("This event is closed.");
  const totals = await getEventLedgerTotals(existing.eventId);
  if (input.principalPaise > totals.distributableBalancePaise + existing.principalPaise) {
    throw new Error("Distribution cannot exceed the current distributable balance.");
  }
  const distribution = await prisma.$transaction(async (transaction) => {
    await transaction.person.update({
      where: { id: existing.personId },
      data: { name: input.recipientName.trim(), phone: input.recipientPhone?.trim() || null },
    });
    if (input.dueDate.getTime() !== existing.dueDate.getTime()) {
      await transaction.reminder.deleteMany({ where: { distributionId: input.id } });
    }
    const updated = await transaction.distribution.update({
      where: { id: input.id },
      data: {
        principalPaise: input.principalPaise,
        interestMethod: input.interestMethod,
        interestRateBps: input.interestRateBps,
        fixedInterestPaise: input.fixedInterestPaise ?? 0,
        startDate: input.startDate,
        dueDate: input.dueDate,
        notes: input.notes,
        guarantorOneName: input.guarantorOneName.trim(),
        guarantorOnePhone: input.guarantorOnePhone.trim(),
        guarantorTwoName: input.guarantorTwoName.trim(),
        guarantorTwoPhone: input.guarantorTwoPhone.trim(),
        reminders:
          input.dueDate.getTime() !== existing.dueDate.getTime()
            ? { create: reminderSchedule(input.dueDate) }
            : undefined,
      },
    });
    return updated;
  });
  await writeAudit({ userId: input.actorUserId, action: "UPDATE", entityType: "Distribution", entityId: distribution.id, newValue: distribution });
  return distribution;
}

export async function closeEvent(eventId: string, actorUserId?: string) {
  const totals = await getEventLedgerTotals(eventId);
  if (totals.distributedPaise > totals.availableBeforeDistributionPaise) {
    throw new Error("An event cannot close while distributions exceed available funds.");
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: EventStatus.CLOSED },
  });

  await writeAudit({
    userId: actorUserId,
    action: "CLOSE",
    entityType: "Event",
    entityId: eventId,
    newValue: { status: event.status },
  });

  return event;
}
