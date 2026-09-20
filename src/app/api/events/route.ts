import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http-error";
import { requirePermission } from "@/lib/session";
import { EventStatus } from "@/lib/enums";
import { writeAudit } from "@/lib/audit";
import { parseRupeeInput } from "@/lib/money";
import { getEventLedgerTotals } from "@/lib/ledger";
import { parseEventYear } from "@/lib/event-year";

export async function GET(request: Request) {
  try {
    const user = await requirePermission("viewFinance");
    const yearParam = new URL(request.url).searchParams.get("year");
    const year = yearParam && yearParam !== "all" ? parseEventYear(yearParam) : undefined;
    const events = await prisma.event.findMany({
      where: { villageId: user.villageId!, ...(year ? { year } : {}) },
      orderBy: [{ year: "desc" }, { startDate: "desc" }],
    });
    const balances = await Promise.all(events.map((event) => getEventLedgerTotals(event.id)));
    return NextResponse.json(
      events.map((event, index) => ({ ...event, ledger: balances[index] })),
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("writeEvents");
    const body = await request.json();
    const event = await prisma.event.create({
      data: {
        villageId: user.villageId!,
        name: String(body.name ?? "").trim(),
        description: body.description ? String(body.description) : null,
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        year: parseEventYear(body.year ?? new Date(body.startDate).getFullYear()),
        openingBalancePaise: parseRupeeInput(body.openingBalance ?? body.openingBalancePaise ?? "0"),
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
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
