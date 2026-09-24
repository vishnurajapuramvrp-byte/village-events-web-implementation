import * as XLSX from "xlsx";
import { EventStatus, PaymentMethod } from "@/lib/enums";
import { parseEventYear } from "@/lib/event-year";
import { prisma } from "@/lib/prisma";

const aliases = {
  eventName: ["event name", "event", "name", "program name", "programme name"],
  description: ["description", "details", "event description"],
  startDate: ["start date", "event date", "date", "from date"],
  endDate: ["end date", "to date"],
  year: ["year", "event year"],
  openingBalance: ["opening balance", "opening amount", "opening balance (rs)", "opening balance (₹)"],
  donorName: ["donor name", "donor", "contributor", "name"],
  amount: ["amount", "amount (rs)", "amount (₹)", "donation amount", "expense amount"],
  receivedOn: ["received on", "received date", "date", "donation date"],
  receivedBy: ["received by", "collector", "collected by"],
  incurredOn: ["incurred on", "expense date", "date"],
  method: ["method", "payment method", "mode"],
  transactionRef: ["transaction ref", "transaction reference", "reference", "utr"],
  notes: ["notes", "remarks", "comments"],
  category: ["category", "expense category", "type"],
  expenseDescription: ["description", "expense", "expense item", "particulars", "item"],
  paidTo: ["paid to", "paid by", "payee", "paid to name"],
  receiptRef: ["receipt ref", "receipt reference", "receipt"],
} as const;

type Row = Record<string, unknown>;
type ImportResult = { eventId: string; eventName: string; importedDonations: number; importedExpenses: number; skippedRows: number };

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/[₹()_\-]+/g, " ").replace(/\s+/g, " ");
}

function sheetFor(workbook: XLSX.WorkBook, name: string) {
  const expected = normalize(name);
  const sheetName = workbook.SheetNames.find((item) => {
    const normalized = normalize(item);
    return normalized === expected || normalized.endsWith(expected) || normalized.includes(expected);
  });
  if (!sheetName) throw new Error(`Missing required sheet: ${name}.`);
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    blankrows: false,
  });
}

function tableRows(workbook: XLSX.WorkBook, name: string, headerKeys: readonly string[]) {
  const rows = sheetFor(workbook, name);
  const headerIndex = rows.findIndex((row) => {
    const values = row.map(normalize);
    return headerKeys.every((key) => values.includes(normalize(key)));
  });
  if (headerIndex === -1) throw new Error(`${name} sheet is missing its header row.`);
  const headers = rows[headerIndex].map((value) => String(value ?? "").trim());
  return rows.slice(headerIndex + 1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  ) as Row[];
}

function read(row: Row, keys: readonly string[]) {
  const wanted = keys.map(normalize);
  const key = Object.keys(row).find((item) => wanted.includes(normalize(item)));
  return key ? row[key] : "";
}

function required(row: Row, keys: readonly string[], label: string) {
  const value = String(read(row, keys) ?? "").trim();
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function dateValue(value: unknown, label: string) {
  if (value instanceof Date) return value;
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return new Date(Date.UTC(date.y, date.m - 1, date.d));
  }
  const raw = String(value ?? "").trim();
  const dayFirst = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  const date = dayFirst
    ? new Date(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1]))
    : new Date(raw);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} must be a valid date.`);
  return date;
}

function amountPaise(value: unknown, label: string, allowNegative = false) {
  const raw = String(value ?? "").trim().replace(/[₹,]/g, "");
  const pattern = allowNegative ? /^-?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/;
  if (!pattern.test(raw)) throw new Error(`${label} must be a valid amount.`);
  const negative = raw.startsWith("-");
  const [rupees, paise = ""] = raw.replace(/^-/, "").split(".");
  const amount = Number(rupees) * 100 + Number((paise + "00").slice(0, 2));
  return negative ? -amount : amount;
}

function eventDetailsRow(workbook: XLSX.WorkBook) {
  const rows = sheetFor(workbook, "Event Details");
  const values = Object.fromEntries(
    rows
      .filter((row) => row.length >= 2 && String(row[0] ?? "").trim())
      .map((row) => [String(row[0]).trim(), row[1]]),
  );
  if (!Object.keys(values).length) throw new Error("Event Details sheet is empty.");
  return values as Row;
}

function isSummaryRow(row: Row) {
  return Object.values(row).some((value) => normalize(value).startsWith("total"));
}

export async function importWorkbook(buffer: Buffer, villageId: string): Promise<ImportResult> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const eventRow = eventDetailsRow(workbook);
  const name = required(eventRow, aliases.eventName, "Event name");
  const startDate = dateValue(required(eventRow, aliases.startDate, "Event start date"), "Event start date");
  const yearValue = read(eventRow, aliases.year);
  const year = parseEventYear(String(yearValue ?? "").trim() || startDate.getFullYear());
  const endValue = read(eventRow, aliases.endDate);
  const endDate = String(endValue ?? "").trim() ? dateValue(endValue, "Event end date") : null;
  const description = String(read(eventRow, aliases.description) ?? "").trim() || null;
  const openingValue = String(read(eventRow, aliases.openingBalance) ?? "").trim();
  const openingBalancePaise = openingValue ? amountPaise(openingValue, "Opening balance") : 0;
  const donationRows = tableRows(workbook, "Donations", ["Name", "Amount"]);
  const expenseRows = tableRows(workbook, "Expenses", ["Date", "Expense Item", "Amount (₹)"]);

  return prisma.$transaction(async (transaction) => {
    const event = await transaction.event.findFirst({ where: { villageId, name, year } });
    const savedEvent = event
      ? await transaction.event.update({ where: { id: event.id }, data: { description, startDate, endDate, openingBalancePaise } })
      : await transaction.event.create({
          data: { villageId, name, description, startDate, endDate, year, openingBalancePaise, status: EventStatus.ACTIVE },
        });
    let importedDonations = 0;
    let importedExpenses = 0;
    let skippedRows = 0;

    for (let index = 0; index < donationRows.length; index += 1) {
      const row = donationRows[index];
      if (!Object.values(row).some((value) => String(value ?? "").trim())) continue;
      if (isSummaryRow(row)) {
        skippedRows += 1;
        continue;
      }
      try {
        const donorName = required(row, aliases.donorName, `Donations row ${index + 2} donor`);
        const reference = String(read(row, aliases.transactionRef) ?? "").trim() || null;
        const donationAmount = amountPaise(read(row, aliases.amount), `Donations row ${index + 2} amount`);
        if (donationAmount === 0 && !reference) {
          throw new Error("Transaction reference is required for a zero-amount donation.");
        }
        if (reference && await transaction.donation.findUnique({ where: { transactionRef: reference } })) {
          skippedRows += 1;
          continue;
        }
        await transaction.donation.create({
          data: {
            eventId: savedEvent.id,
            donorName,
            amountPaise: donationAmount,
            receivedOn: read(row, aliases.receivedOn)
              ? dateValue(read(row, aliases.receivedOn), `Donations row ${index + 2} date`)
              : startDate,
            method: (String(read(row, aliases.method) || PaymentMethod.CASH).trim().toUpperCase() || PaymentMethod.CASH),
            transactionRef: reference,
            notes: String(read(row, aliases.notes) || read(row, aliases.receivedBy) || "").trim() || null,
          },
        });
        importedDonations += 1;
      } catch (error) {
        throw new Error(`Donations row ${index + 2}: ${error instanceof Error ? error.message : "invalid row"}`);
      }
    }

    for (let index = 0; index < expenseRows.length; index += 1) {
      const row = expenseRows[index];
      if (!Object.values(row).some((value) => String(value ?? "").trim())) continue;
      if (isSummaryRow(row)) {
        skippedRows += 1;
        continue;
      }
      try {
        await transaction.expense.create({
          data: {
            eventId: savedEvent.id,
            category: String(read(row, aliases.category) || "Expenses").trim(),
            description: required(row, aliases.expenseDescription, `Expenses row ${index + 2} description`),
            amountPaise: amountPaise(read(row, aliases.amount), `Expenses row ${index + 2} amount`, true),
            incurredOn: dateValue(read(row, aliases.incurredOn), `Expenses row ${index + 2} date`),
            paidTo: String(read(row, aliases.paidTo) ?? "").trim() || null,
            receiptRef: String(read(row, aliases.receiptRef) ?? "").trim() || null,
          },
        });
        importedExpenses += 1;
      } catch (error) {
        throw new Error(`Expenses row ${index + 2}: ${error instanceof Error ? error.message : "invalid row"}`);
      }
    }

    return { eventId: savedEvent.id, eventName: savedEvent.name, importedDonations, importedExpenses, skippedRows };
  });
}
