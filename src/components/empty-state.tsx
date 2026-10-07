"use client";

import { useLocale } from "@/components/providers";
import { translate } from "@/lib/i18n";

export function EmptyState({ title, description }: { title: string; description: string }) {
  const { locale } = useLocale();
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-8 text-center">
      <p className="font-medium">{translate(title, locale)}</p>
      <p className="mt-1 text-sm text-muted-foreground">{translate(description, locale)}</p>
    </div>
  );
}
