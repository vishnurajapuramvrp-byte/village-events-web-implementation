"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EventStatus, InterestMethod, PaymentMethod, Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/session";
import { parseRupeeInput } from "@/lib/money";
import { writeAudit } from "@/lib/audit";
import {
  closeEvent,
  createDonationRecord,
  createDistributionRecord,
  createExpenseRecord,
  updateDonationRecord,
  updateDistributionRecord,
  updateExpenseRecord,
} from "@/lib/ledger";
import { addYears } from "@/lib/interest";
import { parseEventYear, yearFromDate } from "@/lib/event-year";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function createEventAction(formData: FormData) {
  const user = await requirePermission("writeEvents");
  const name = formString(formData, "name");
  if (!name) throw new Error("Event name is required.");

  const startDate = new Date(formString(formData, "startDate"));
  const event = await prisma.event.create({
    data: {
      villageId: user.villageId!,
      name,
      description: formString(formData, "description") || null,
      startDate,
      endDate: formString(formData, "endDate") ? new Date(formString(formData, "endDate")) : null,
      year: parseEventYear(formData.get("year") || yearFromDate(startDate)),
      openingBalancePaise: parseRupeeInput(formData.get("openingBalance") || "0"),
      status: EventStatus.ACTIVE,
    },
  });

  await writeAudit({
    userId: user.id,
    action: "CREATE",
    entityType: "Event",
    entityId: event.id,
    newValue: event,
  });

  revalidatePath("/events");
  redirect(`/events/${event.id}`);
}

export async function addDonationAction(eventId: string, formData: FormData) {
  const user = await requirePermission("writeFinance");
  await createDonationRecord({
    eventId,
    donorName: formString(formData, "donorName"),
    amountPaise: parseRupeeInput(formData.get("amount")),
    receivedOn: new Date(formString(formData, "receivedOn")),
    method: (formString(formData, "method") || "CASH") as PaymentMethod,
    transactionRef: formString(formData, "transactionRef") || null,
    notes: formString(formData, "notes") || undefined,
    actorUserId: user.id,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function addExpenseAction(eventId: string, formData: FormData) {
  const user = await requirePermission("writeFinance");
  await createExpenseRecord({
    eventId,
    category: formString(formData, "category"),
    description: formString(formData, "description"),
    amountPaise: parseRupeeInput(formData.get("amount")),
    incurredOn: new Date(formString(formData, "incurredOn")),
    paidTo: formString(formData, "paidTo") || undefined,
    receiptRef: formString(formData, "receiptRef") || undefined,
    actorUserId: user.id,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function editDonationAction(eventId: string, donationId: string, formData: FormData) {
  const user = await requirePermission("writeFinance");
  await updateDonationRecord({
    id: donationId,
    donorName: formString(formData, "donorName"),
    amountPaise: parseRupeeInput(formData.get("amount")),
    receivedOn: new Date(formString(formData, "receivedOn")),
    method: (formString(formData, "method") || "CASH") as PaymentMethod,
    transactionRef: formString(formData, "transactionRef") || null,
    notes: formString(formData, "notes") || undefined,
    actorUserId: user.id,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function editExpenseAction(eventId: string, expenseId: string, formData: FormData) {
  const user = await requirePermission("writeFinance");
  await updateExpenseRecord({
    id: expenseId,
    category: formString(formData, "category"),
    description: formString(formData, "description"),
    amountPaise: parseRupeeInput(formData.get("amount")),
    incurredOn: new Date(formString(formData, "incurredOn")),
    paidTo: formString(formData, "paidTo") || undefined,
    receiptRef: formString(formData, "receiptRef") || undefined,
    actorUserId: user.id,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function addDistributionAction(eventId: string, formData: FormData) {
  const user = await requirePermission("writeFinance");
  const startDate = new Date(formString(formData, "startDate"));
  const dueRaw = formString(formData, "dueDate");
  await createDistributionRecord({
    eventId,
    recipientName: formString(formData, "recipientName"),
    recipientPhone: formString(formData, "recipientPhone"),
    guarantorOneName: formString(formData, "guarantorOneName"),
    guarantorOnePhone: formString(formData, "guarantorOnePhone"),
    guarantorTwoName: formString(formData, "guarantorTwoName"),
    guarantorTwoPhone: formString(formData, "guarantorTwoPhone"),
    principalPaise: parseRupeeInput(formData.get("amount")),
    interestMethod: (formString(formData, "interestMethod") ||
      "ANNUAL_SIMPLE") as InterestMethod,
    interestRateBps: Math.round(Number(formString(formData, "interestRate") || "0") * 100),
    fixedInterestPaise: formString(formData, "fixedInterest")
      ? parseRupeeInput(formData.get("fixedInterest"))
      : 0,
    startDate,
    dueDate: dueRaw ? new Date(dueRaw) : addYears(startDate, 1),
    notes: formString(formData, "notes") || undefined,
    actorUserId: user.id,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function editDistributionAction(eventId: string, distributionId: string, formData: FormData) {
  const user = await requirePermission("writeFinance");
  await updateDistributionRecord({
    id: distributionId,
    recipientName: formString(formData, "recipientName"),
    recipientPhone: formString(formData, "recipientPhone"),
    guarantorOneName: formString(formData, "guarantorOneName"),
    guarantorOnePhone: formString(formData, "guarantorOnePhone"),
    guarantorTwoName: formString(formData, "guarantorTwoName"),
    guarantorTwoPhone: formString(formData, "guarantorTwoPhone"),
    principalPaise: parseRupeeInput(formData.get("amount")),
    interestMethod: (formString(formData, "interestMethod") || "ANNUAL_SIMPLE") as InterestMethod,
    interestRateBps: Math.round(Number(formString(formData, "interestRate") || "0") * 100),
    fixedInterestPaise: formString(formData, "fixedInterest") ? parseRupeeInput(formData.get("fixedInterest")) : 0,
    startDate: new Date(formString(formData, "startDate")),
    dueDate: new Date(formString(formData, "dueDate")),
    notes: formString(formData, "notes") || undefined,
    actorUserId: user.id,
  });
  revalidatePath(`/events/${eventId}`);
}

export async function addPaymentAction(distributionId: string, eventId: string, formData: FormData) {
  const user = await requirePermission("writeFinance");
  const payment = await prisma.distributionPayment.create({
    data: {
      distributionId,
      amountPaise: parseRupeeInput(formData.get("amount")),
      paidOn: new Date(formString(formData, "paidOn")),
      notes: formString(formData, "notes") || undefined,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "CREATE",
    entityType: "DistributionPayment",
    entityId: payment.id,
    newValue: payment,
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/my-loan");
}

export async function addPersonAction(formData: FormData) {
  const user = await requirePermission("writePeople");
  const person = await prisma.person.create({
    data: {
      villageId: user.villageId!,
      name: formString(formData, "name"),
      phone: formString(formData, "phone") || null,
      address: formString(formData, "address") || null,
      notes: formString(formData, "notes") || null,
    },
  });
  await writeAudit({
    userId: user.id,
    action: "CREATE",
    entityType: "Person",
    entityId: person.id,
    newValue: person,
  });
  revalidatePath("/people");
}

export async function closeEventAction(eventId: string) {
  const user = await requirePermission("writeEvents");
  await closeEvent(eventId, user.id);
  revalidatePath(`/events/${eventId}`);
}

export async function updateUserRoleAction(userId: string, formData: FormData) {
  const actor = await requirePermission("manageUsers");
  const role = formString(formData, "role") as Role;
  if (!Object.values(Role).includes(role)) {
    throw new Error("Choose a valid role.");
  }
  const old = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (old.role === Role.ADMIN && role !== Role.ADMIN) {
    const otherAdmins = await prisma.user.count({
      where: { role: Role.ADMIN, id: { not: userId } },
    });
    if (otherAdmins === 0) {
      throw new Error("Keep at least one Admin account.");
    }
  }
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });
  await writeAudit({
    userId: actor.id,
    action: "UPDATE_ROLE",
    entityType: "User",
    entityId: userId,
    oldValue: { role: old.role },
    newValue: { role: updated.role },
  });
  revalidatePath("/settings/users");
}

export async function requireSignedInHome() {
  const user = await requireUser().catch(() => null);
  return user;
}
