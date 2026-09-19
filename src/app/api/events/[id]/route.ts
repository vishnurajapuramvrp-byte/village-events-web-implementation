import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { getEventLedgerTotals } from "@/lib/ledger";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("viewFinance");
    const event = await prisma.event.findFirst({
      where: { id: params.id, villageId: user.villageId! },
      include: {
        donations: { orderBy: { receivedOn: "desc" } },
        expenses: { orderBy: { incurredOn: "desc" } },
        distributions: { include: { person: true, payments: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ledger = await getEventLedgerTotals(event.id);
    return NextResponse.json({ ...event, ledger });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
