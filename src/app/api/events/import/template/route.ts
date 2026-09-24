import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requirePermission } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requirePermission("writeEvents");
    const workbook = XLSX.utils.book_new();
    const eventDetails = XLSX.utils.aoa_to_sheet([
      ["Event Name", "Example Community Event"],
      ["Event Date", "2026-01-15"],
      ["End Date", "2026-01-16"],
      ["Year", 2026],
      ["Description", "Purpose of the event fund"],
      ["Opening Balance", 0],
    ]);
    const donations = XLSX.utils.aoa_to_sheet([
      ["Name", "Amount", "Received By", "Received On", "Method", "Transaction Ref", "Notes"],
      ["Example Donor", 1000, "Collector name", "2026-01-10", "CASH", "", ""],
    ]);
    const expenses = XLSX.utils.aoa_to_sheet([
      ["Date", "Paid By", "Expense Item", "Amount (₹)", "Receipt Ref"],
      ["2026-01-12", "Payee name", "Example expense", 250, ""],
    ]);
    XLSX.utils.book_append_sheet(workbook, eventDetails, "Event Details");
    XLSX.utils.book_append_sheet(workbook, donations, "Donations");
    XLSX.utils.book_append_sheet(workbook, expenses, "Expenses");
    const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(output, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="event-import-template.xlsx"',
      },
    });
  } catch {
    return NextResponse.json({ error: "You do not have permission to download the template." }, { status: 403 });
  }
}