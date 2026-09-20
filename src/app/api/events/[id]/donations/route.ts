import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http-error";
import { requirePermission } from "@/lib/session";
import { createDonationRecord } from "@/lib/ledger";
import { parseRupeeInput } from "@/lib/money";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("writeFinance");
    const body = await request.json();
    const donation = await createDonationRecord({
      eventId: params.id,
      donorName: String(body.donorName ?? ""),
      amountPaise: parseRupeeInput(body.amount ?? body.amountPaise),
      receivedOn: new Date(body.receivedOn),
      method: body.method ?? "CASH",
      transactionRef: body.transactionRef || null,
      notes: body.notes,
      actorUserId: user.id,
    });
    return NextResponse.json(donation, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
