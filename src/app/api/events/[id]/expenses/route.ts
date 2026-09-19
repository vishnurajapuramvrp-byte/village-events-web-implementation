import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { createExpenseRecord } from "@/lib/ledger";
import { parseRupeeInput } from "@/lib/money";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("writeFinance");
    const body = await request.json();
    const expense = await createExpenseRecord({
      eventId: params.id,
      category: String(body.category ?? ""),
      description: String(body.description ?? ""),
      amountPaise: parseRupeeInput(body.amount ?? body.amountPaise),
      incurredOn: new Date(body.incurredOn),
      paidTo: body.paidTo,
      receiptRef: body.receiptRef,
      actorUserId: user.id,
    });
    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
