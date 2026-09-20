import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/http-error";
import { requirePermission } from "@/lib/session";
import { getEventLedgerTotals } from "@/lib/ledger";
import { EventReportDocument } from "@/lib/pdf/EventReportDocument";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("viewFinance");
    const event = await prisma.event.findFirst({
      where: { id: params.id, villageId: user.villageId! },
      include: {
        village: { include: { organization: true } },
        donations: { orderBy: { receivedOn: "asc" } },
        expenses: { orderBy: { incurredOn: "asc" } },
        distributions: { include: { person: true, payments: true } },
      },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const ledger = await getEventLedgerTotals(event.id);
    const buffer = await renderToBuffer(
      EventReportDocument({
        data: {
          organizationName: event.village.organization.name,
          villageName: event.village.name,
          eventName: event.name,
          year: event.year,
          startDate: event.startDate,
          endDate: event.endDate,
          generatedAt: new Date(),
          generatedBy: user.name ?? user.email ?? "Village Events",
          ...ledger,
          donations: event.donations,
          expenses: event.expenses,
          distributions: event.distributions.map((row) => ({
            personName: row.person.name,
            principalPaise: row.principalPaise,
            dueDate: row.dueDate,
            repaidPaise: row.payments.reduce((sum, payment) => sum + payment.amountPaise, 0),
          })),
        },
      }),
    );

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${event.name.replace(/\s+/g, "-")}-report.pdf"`,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
