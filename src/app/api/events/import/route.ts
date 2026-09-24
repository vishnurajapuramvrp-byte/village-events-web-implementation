import { NextResponse } from "next/server";
import { importWorkbook } from "@/lib/excel-import";
import { jsonError } from "@/lib/http-error";
import { requirePermission } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("writeEvents");
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an Excel workbook." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "Only .xlsx workbooks are supported." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Workbook must be smaller than 10 MB." }, { status: 400 });
    }
    const result = await importWorkbook(Buffer.from(await file.arrayBuffer()), user.villageId!);
    await writeAudit({ userId: user.id, action: "IMPORT", entityType: "Event", entityId: result.eventId, newValue: result });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
