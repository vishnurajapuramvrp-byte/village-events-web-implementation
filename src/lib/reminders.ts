import { prisma } from "@/lib/prisma";

export const GENERIC_REMINDER_TEXT =
  "An event financial amount is approaching its due date — open the app for details";

export async function sendDueReminders(now = new Date()) {
  const due = await prisma.reminder.findMany({
    where: { sentAt: null, scheduledFor: { lte: now } },
    include: { distribution: { include: { person: true, event: true } } },
  });

  const sentIds: string[] = [];
  for (const reminder of due) {
    console.info("[reminder]", GENERIC_REMINDER_TEXT, {
      reminderId: reminder.id,
      kind: reminder.kind,
      personId: reminder.distribution.personId,
      eventId: reminder.distribution.eventId,
    });
    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { sentAt: now },
    });
    sentIds.push(reminder.id);
  }

  return { scanned: due.length, sent: sentIds.length };
}
