"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/components/providers";
import { translate } from "@/lib/i18n";

export type RecipientReminder = {
  id: string;
  eventName: string;
  dueDate: string;
  daysUntilDue: number;
};

export function RecipientReminderPopup({ reminders, storageKey }: { reminders: RecipientReminder[]; storageKey: string }) {
  const { locale } = useLocale();
  const t = (text: string) => translate(text, locale);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.sessionStorage.getItem(storageKey) !== "closed");
  }, [storageKey]);

  if (!open || reminders.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))]">
      <Card role="dialog" aria-label={t("Payment reminders")} className="border-primary/30 shadow-xl">
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <CardTitle className="text-base">{t("Payment reminders")}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("Close payment reminders")}
            onClick={() => {
              window.sessionStorage.setItem(storageKey, "closed");
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium">
                  {locale === "te"
                    ? reminder.daysUntilDue < 0
                      ? `${Math.abs(reminder.daysUntilDue)} రోజులు గడువు దాటింది`
                      : reminder.daysUntilDue === 0
                        ? "ఈరోజు గడువు"
                        : `${reminder.daysUntilDue} రోజుల్లో గడువు`
                    : reminder.daysUntilDue < 0
                      ? `Overdue by ${Math.abs(reminder.daysUntilDue)} day${Math.abs(reminder.daysUntilDue) === 1 ? "" : "s"}`
                      : reminder.daysUntilDue === 0
                        ? "Due today"
                        : `Due in ${reminder.daysUntilDue} day${reminder.daysUntilDue === 1 ? "" : "s"}`}
                </p>
                <p className="text-xs text-muted-foreground">{reminder.eventName} · {locale === "te" ? "గడువు" : "due"} {reminder.dueDate}</p>
              </div>
              <Badge variant={reminder.daysUntilDue <= 7 ? "danger" : reminder.daysUntilDue <= 15 ? "warning" : "success"}>
                {t(reminder.daysUntilDue < 0 ? "Overdue" : "Due soon")}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}