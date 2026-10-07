"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/providers";
import { translate } from "@/lib/i18n";

export function ExcelImportForm() {
  const router = useRouter();
  const { locale } = useLocale();
  const t = (text: string) => translate(text, locale);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/events/import", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("Import failed."));
      setMessage(locale === "te"
        ? `${result.eventName}లో ${result.importedDonations} విరాళాలు మరియు ${result.importedExpenses} ఖర్చులు దిగుమతి అయ్యాయి.`
        : `Imported ${result.importedDonations} donations and ${result.importedExpenses} expenses into ${result.eventName}.`);
      form.reset();
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("Import failed."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4">
      <div className="min-w-64 flex-1">
        <label htmlFor="event-workbook" className="text-sm font-medium">{t("Import Excel workbook")}</label>
        <p className="text-xs text-muted-foreground">{t("Requires Event Details, Donations, and Expenses sheets.")}</p>
      </div>
      <input id="event-workbook" name="file" type="file" accept=".xlsx" required className="max-w-full text-sm" />
      <Button type="submit" disabled={pending}>{pending ? t("Importing...") : t("Upload and import")}</Button>
      <Button type="button" variant="outline" asChild>
        <a href="/api/events/import/template">{t("Download sample template")}</a>
      </Button>
      {message ? <p className="basis-full text-sm text-muted-foreground" role="status">{message}</p> : null}
    </form>
  );
}
