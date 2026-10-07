"use client";

import { useLocale } from "@/components/providers";
import { translate } from "@/lib/i18n";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <label className={`inline-flex items-center gap-2 text-sm ${className}`}>
      <span className="sr-only">{translate("Language", locale)}</span>
      <select
        aria-label={translate("Language", locale)}
        value={locale}
        onChange={(event) => setLocale(event.target.value === "te" ? "te" : "en")}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="en">English</option>
        <option value="te">తెలుగు</option>
      </select>
    </label>
  );
}
