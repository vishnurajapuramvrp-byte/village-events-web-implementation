import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http-error";
import { requirePermission } from "@/lib/session";
import { createDistributionRecord } from "@/lib/ledger";
import { parseRupeeInput } from "@/lib/money";
import { InterestMethod } from "@/lib/enums";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission("writeFinance");
    const body = await request.json();
    const startDate = new Date(body.startDate);
    const distribution = await createDistributionRecord({
      eventId: params.id,
      personId: String(body.personId ?? ""),
      principalPaise: parseRupeeInput(body.amount ?? body.principalPaise),
      interestMethod: (body.interestMethod as InterestMethod) || InterestMethod.ANNUAL_SIMPLE,
      interestRateBps:
        body.interestRateBps != null
          ? Math.round(Number(body.interestRateBps))
          : Math.round(Number(body.interestRate ?? 0) * 100),
      fixedInterestPaise: body.fixedInterest ? parseRupeeInput(body.fixedInterest) : 0,
      startDate,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      notes: body.notes,
      actorUserId: user.id,
    });
    return NextResponse.json(distribution, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
