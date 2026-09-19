"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-lg font-semibold">That change could not be saved</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button className="mt-4 text-sm underline" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
