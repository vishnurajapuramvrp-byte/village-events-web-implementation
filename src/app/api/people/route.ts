import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { writeAudit } from "@/lib/audit";

export async function GET() {
  try {
    const user = await requirePermission("viewFinance");
    const people = await prisma.person.findMany({
      where: { villageId: user.villageId! },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(people);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("writePeople");
    const body = await request.json();
    const person = await prisma.person.create({
      data: {
        villageId: user.villageId!,
        name: String(body.name ?? "").trim(),
        phone: body.phone || null,
        address: body.address || null,
        notes: body.notes || null,
      },
    });
    await writeAudit({
      userId: user.id,
      action: "CREATE",
      entityType: "Person",
      entityId: person.id,
      newValue: person,
    });
    return NextResponse.json(person, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
