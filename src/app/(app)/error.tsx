"use client";

import { useEffect } from "react";
import { useLocale } from "@/components/providers";
import { translate } from "@/lib/i18n";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale } = useLocale();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-lg font-semibold">{translate("That change could not be saved", locale)}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        className="mt-4 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        onClick={() => reset()}
      >
        {translate("Try again", locale)}
      </button>
    </div>
  );
}
