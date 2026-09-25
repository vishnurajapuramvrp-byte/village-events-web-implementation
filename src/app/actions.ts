"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { DistributionFundingSource, EventStatus, InterestMethod, PaymentMethod, Role } from "@/lib/enums";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireUser } from "@/lib/session";
import { parseRupeeInput } from "@/lib/money";
import { writeAudit } from "@/lib/audit";
import {
  closeEvent,
  createDonationRecord,
  createDistributionRecord,
  createExpenseRecord,
  deleteDonationRecord,
  deleteExpenseRecord,
  updateDonationRecord,
  updateDistributionRecord,
  updateExpenseRecord,
} from "@/lib/ledger";
import { addYears } from "@/lib/interest";
import { parseEventYear, yearFromDate } from "@/lib/event-year";
import { normalizeMobile } from "@/lib/user-identity";

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

export async function deleteDonationAction(eventId: string, donationId: string) {
  const user = await requirePermission("writeFinance");
  await deleteDonationRecord({ id: donationId, actorUserId: user.id });
  revalidatePath(`/events/${eventId}`);
}

export async function deleteExpenseAction(eventId: string, expenseId: string) {
  const user = await requirePermission("writeFinance");
  await deleteExpenseRecord({ id: expenseId, actorUserId: user.id });
  revalidatePath(`/events/${eventId}`);
}

export async function updateEventAction(eventId: string, formData: FormData) {
  const user = await requirePermission("writeEvents");
  const existing = await prisma.event.findFirstOrThrow({ where: { id: eventId, villageId: user.villageId! } });
  if (existing.status === EventStatus.CLOSED) throw new Error("This event is closed.");
  const name = formString(formData, "name");
  if (!name) throw new Error("Event name is required.");
  const startDate = new Date(formString(formData, "startDate"));
  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      name,
      description: formString(formData, "description") || null,
      startDate,
      endDate: formString(formData, "endDate") ? new Date(formString(formData, "endDate")) : null,
      year: parseEventYear(formData.get("year") || yearFromDate(startDate)),
      openingBalancePaise: parseRupeeInput(formData.get("openingBalance") || "0"),
    },
  });
  await writeAudit({ userId: user.id, action: "UPDATE", entityType: "Event", entityId: eventId, oldValue: existing, newValue: updated });
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function deleteEventAction(eventId: string) {
  const user = await requirePermission("writeEvents");
  const existing = await prisma.event.findFirstOrThrow({ where: { id: eventId, villageId: user.villageId! } });
  if (existing.status === EventStatus.CLOSED) throw new Error("Closed events cannot be deleted.");
  await prisma.event.delete({ where: { id: eventId } });
  await writeAudit({ userId: user.id, action: "DELETE", entityType: "Event", entityId: eventId, oldValue: existing });
  revalidatePath("/events");
  redirect("/events");
}

export async function addFeedbackAction(eventId: string, formData: FormData) {
  const user = await requireUser();
  const event = await prisma.event.findFirstOrThrow({ where: { id: eventId, villageId: user.villageId ?? undefined } });
  const message = formString(formData, "message");
  if (!message) throw new Error("Feedback is required.");
  const feedback = await prisma.eventFeedback.create({
    data: { eventId: event.id, userId: user.id, message },
  });
  await writeAudit({ userId: user.id, action: "CREATE", entityType: "EventFeedback", entityId: feedback.id, newValue: feedback });
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/api/reports/${eventId}/pdf`);
}

export async function setFeedbackCompletedAction(eventId: string, feedbackId: string, formData: FormData) {
  const user = await requireUser();
  const existing = await prisma.eventFeedback.findFirstOrThrow({
    where: { id: feedbackId, eventId, event: { villageId: user.villageId ?? undefined } },
  });
  const completed = formData.get("completed") === "true";
  const feedback = await prisma.eventFeedback.update({
    where: { id: existing.id },
    data: { completed },
  });
  await writeAudit({ userId: user.id, action: "UPDATE", entityType: "EventFeedback", entityId: feedback.id, oldValue: existing, newValue: feedback });
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/api/reports/${eventId}/pdf`);
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
    fundingSource: formData.get("fundingSource") === DistributionFundingSource.EVENT_GENERATED
      ? DistributionFundingSource.EVENT_GENERATED
      : DistributionFundingSource.DONATION,
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
    fundingSource: formData.get("fundingSource") === DistributionFundingSource.EVENT_GENERATED
      ? DistributionFundingSource.EVENT_GENERATED
      : DistributionFundingSource.DONATION,
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

export async function deleteUserAction(userId: string) {
  const actor = await requirePermission("manageUsers");
  if (userId === actor.id) throw new Error("You cannot delete your own account.");

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) throw new Error("Keep at least one Admin account.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.auditLog.create({
      data: {
        userId: actor.id,
        action: "DELETE",
        entityType: "User",
        entityId: user.id,
        oldValue: JSON.stringify({ name: user.name, email: user.email, mobile: user.mobile, role: user.role, personId: user.personId }),
      },
    });
    await transaction.user.delete({ where: { id: user.id } });
  });
  revalidatePath("/settings/users");
}

export async function createUserAction(formData: FormData) {
  const actor = await requirePermission("manageUsers");
  if (!actor.villageId) throw new Error("Your account is not assigned to a village.");

  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase() || null;
  const mobileInput = formString(formData, "mobile");
  const mobile = mobileInput ? normalizeMobile(mobileInput) : null;
  const password = formString(formData, "password");
  const role = (formString(formData, "role") || Role.VIEWER) as Role;
  let personId = formString(formData, "personId") || null;

  if (!name) throw new Error("Name is required.");
  if (!email && !mobile) throw new Error("Enter an email address or mobile number.");
  if (mobileInput && !mobile) throw new Error("Enter a valid mobile number.");
  if (password.length < 8) throw new Error("Temporary password must be at least 8 characters.");
  if (!Object.values(Role).includes(role)) throw new Error("Choose a valid role.");
  if (personId) {
    const person = await prisma.person.findFirst({ where: { id: personId, villageId: actor.villageId } });
    if (!person) throw new Error("Choose a person from this village.");
  } else if (mobile) {
    const people = await prisma.person.findMany({
      where: { villageId: actor.villageId, phone: { not: null }, users: { none: {} } },
      select: { id: true, phone: true },
    });
    personId = people.find((person) => normalizeMobile(person.phone ?? "") === mobile)?.id ?? null;
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        ...(email ? [{ email }] : []),
        ...(mobile ? [{ mobile }] : []),
      ],
    },
  });
  if (existing) throw new Error("That email or mobile number is already in use.");

  const user = await prisma.user.create({
    data: {
      name,
      email,
      mobile,
      passwordHash: await bcrypt.hash(password, 10),
      mustChangePassword: true,
      role,
      villageId: actor.villageId,
      personId,
    },
  });
  await writeAudit({
    userId: actor.id,
    action: "CREATE",
    entityType: "User",
    entityId: user.id,
    newValue: { name, email, mobile, role, personId },
  });
  revalidatePath("/settings/users");
}

export async function changePasswordAction(formData: FormData) {
  const user = await requireUser();
  const password = formString(formData, "password");
  const confirmation = formString(formData, "confirmation");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (password !== confirmation) throw new Error("Passwords do not match.");

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, 10), mustChangePassword: false },
  });
  await writeAudit({ userId: user.id, action: "CHANGE_PASSWORD", entityType: "User", entityId: user.id });
  redirect("/dashboard");
}

export async function requireSignedInHome() {
  const user = await requireUser().catch(() => null);
  return user;
}
