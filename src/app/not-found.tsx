export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">That event or screen is not in this village ledger.</p>
      <a className="mt-4 inline-block text-sm text-primary underline" href="/dashboard">
        Back to dashboard
      </a>
    </div>
  );
}
