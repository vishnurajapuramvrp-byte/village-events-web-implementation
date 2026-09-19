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
      <button
        className="mt-4 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
