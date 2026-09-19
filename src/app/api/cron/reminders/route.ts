import { NextResponse } from "next/server";
import { sendDueReminders } from "@/lib/reminders";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  const vercelCron = request.headers.get("x-vercel-cron");
  if (!vercelCron && secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendDueReminders();
  return NextResponse.json({ ok: true, ...result });
}
