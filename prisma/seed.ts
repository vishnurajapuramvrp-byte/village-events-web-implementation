import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { EventStatus, InterestMethod, PaymentMethod, ReminderKind, Role } from "../src/lib/enums";
import { addDays, addYears } from "../src/lib/interest";

const prisma = new PrismaClient();

async function main() {
  const onVercel = Boolean(process.env.VERCEL);
  const production = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if ((onVercel || production) && process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error(
      "Demo seed wipes the database. For production run `npm run db:seed:prod`, or set ALLOW_DEMO_SEED=true.",
    );
  }

  await prisma.reminder.deleteMany();
  await prisma.distributionPayment.deleteMany();
  await prisma.distribution.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.eventDocument.deleteMany();
  await prisma.event.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.person.deleteMany();
  await prisma.village.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: "Village Welfare Trust" },
  });

  const village = await prisma.village.create({
    data: {
      name: "Vishnu Raja Puram",
      district: "Nellore",
      state: "Andhra Pradesh",
      organizationId: org.id,
    },
  });

  const passwordHash = await bcrypt.hash("demo1234", 10);

  const people = await Promise.all(
    [
      { name: "Lakshmi Devi", phone: "9876500001", address: "Near temple street" },
      { name: "Rama Rao", phone: "9876500002", address: "Main road, house 14" },
      { name: "Sita Mahalakshmi", phone: "9876500003", address: "School lane" },
      { name: "Venkat Reddy", phone: "9876500004", address: "Canal bund" },
      { name: "Anjali Kumari", phone: "9876500005", address: "Post office road" },
    ].map((person) => prisma.person.create({ data: { ...person, villageId: village.id } })),
  );

  await prisma.user.createMany({
    data: [
      {
        name: "Committee Admin",
        email: "admin@village.local",
        passwordHash,
        role: Role.ADMIN,
        villageId: village.id,
      },
      {
        name: "Srinivas Treasurer",
        email: "treasurer@village.local",
        passwordHash,
        role: Role.TREASURER,
        villageId: village.id,
      },
      {
        name: "Padma Committee",
        email: "committee@village.local",
        passwordHash,
        role: Role.COMMITTEE_MEMBER,
        villageId: village.id,
      },
      {
        name: "Ravi Viewer",
        email: "viewer@village.local",
        passwordHash,
        role: Role.VIEWER,
        villageId: village.id,
      },
    ],
  });

  const recipient = await prisma.user.create({
    data: {
      name: people[0].name,
      email: "recipient@village.local",
      passwordHash,
      role: Role.RECIPIENT,
      villageId: village.id,
      personId: people[0].id,
    },
  });

  const startDate = new Date("2026-01-14");
  const event = await prisma.event.create({
    data: {
      villageId: village.id,
      name: "Sankranti 2026 Community Fund",
      description:
        "Village festival collections used for community meals, temple expenses, and need-based support.",
      startDate,
      endDate: new Date("2026-01-16"),
      year: 2026,
      openingBalancePaise: 25_000_00,
      status: EventStatus.ACTIVE,
    },
  });

  await prisma.donation.createMany({
    data: [
      {
        eventId: event.id,
        donorName: "NRI family — USA",
        amountPaise: 50_000_00,
        receivedOn: new Date("2026-01-05"),
        method: PaymentMethod.BANK,
        transactionRef: "NEFT-SRIRAM-001",
      },
      {
        eventId: event.id,
        donorName: "Local merchants association",
        amountPaise: 18_500_00,
        receivedOn: new Date("2026-01-10"),
        method: PaymentMethod.UPI,
        transactionRef: "UPI-MERCHANTS-441",
      },
      {
        eventId: event.id,
        donorName: "Cash collection — temple gate",
        amountPaise: 8_750_00,
        receivedOn: new Date("2026-01-14"),
        method: PaymentMethod.CASH,
      },
    ],
  });

  await prisma.expense.createMany({
    data: [
      {
        eventId: event.id,
        category: "Food",
        description: "Community meal provisions",
        amountPaise: 12_400_00,
        incurredOn: new Date("2026-01-15"),
        paidTo: "Village kitchen committee",
      },
      {
        eventId: event.id,
        category: "Temple",
        description: "Decorations and oil",
        amountPaise: 3_200_00,
        incurredOn: new Date("2026-01-14"),
        paidTo: "Temple store",
        receiptRef: "RCPT-88",
      },
    ],
  });

  const distStart = new Date("2026-02-01");
  const dueDate = addYears(distStart, 1);
  const distribution = await prisma.distribution.create({
    data: {
      eventId: event.id,
      personId: people[0].id,
      principalPaise: 20_000_00,
      interestMethod: InterestMethod.ANNUAL_SIMPLE,
      interestRateBps: 1200,
      startDate: distStart,
      dueDate,
      notes: "Support for medical expenses, repayable in one year.",
      payments: {
        create: {
          amountPaise: 2_000_00,
          paidOn: new Date("2026-06-01"),
          notes: "First instalment",
        },
      },
      reminders: {
        create: [
          { kind: ReminderKind.DAYS_30, scheduledFor: addDays(dueDate, -30) },
          { kind: ReminderKind.DAYS_7, scheduledFor: addDays(dueDate, -7) },
          { kind: ReminderKind.DUE_DAY, scheduledFor: dueDate },
          { kind: ReminderKind.OVERDUE, scheduledFor: addDays(dueDate, 1) },
        ],
      },
    },
  });

  await prisma.distribution.create({
    data: {
      eventId: event.id,
      personId: people[1].id,
      principalPaise: 10_000_00,
      interestMethod: InterestMethod.ANNUAL_SIMPLE,
      interestRateBps: 1200,
      startDate: distStart,
      dueDate,
      notes: "Small business working capital.",
      reminders: {
        create: [
          { kind: ReminderKind.DAYS_30, scheduledFor: addDays(dueDate, -30) },
          { kind: ReminderKind.DAYS_7, scheduledFor: addDays(dueDate, -7) },
          { kind: ReminderKind.DUE_DAY, scheduledFor: dueDate },
          { kind: ReminderKind.OVERDUE, scheduledFor: addDays(dueDate, 1) },
        ],
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: recipient.id,
      action: "SEED",
      entityType: "Event",
      entityId: event.id,
      newValue: JSON.stringify({ name: event.name, distributionId: distribution.id }),
    },
  });

  console.log("Seeded Vishnu Raja Puram village with Sankranti 2026 event.");
  console.log("Demo password for all accounts: demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
