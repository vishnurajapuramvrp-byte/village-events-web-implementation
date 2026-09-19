import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { SignInForm } from "@/components/sign-in-form";
import { demoLoginEnabled, googleLoginEnabled } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const googleEnabled = googleLoginEnabled();
  const demoEnabled = demoLoginEnabled();

  return (
    <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="inline-flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-primary">
          <Landmark className="h-6 w-6" />
          <span className="text-sm font-semibold">Village Events & Programs</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          A clear ledger for festival funds and need-based support.
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Record donations and expenses, compute balances from transactions, track repayable
          distributions with interest and due dates, and print PDF reports the committee can verify.
        </p>
        <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <li>Balances always derived, never typed in</li>
          <li>Roles for admin, treasurer, committee, viewer</li>
          <li>30 / 7 / due / overdue reminder ladder</li>
          <li>Audit trail on every financial write</li>
        </ul>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {demoEnabled
              ? "Use a demo account locally, or Google once OAuth is configured."
              : "Sign in with the Google account listed in ADMIN_EMAILS."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm googleEnabled={googleEnabled} demoLoginEnabled={demoEnabled} />
        </CardContent>
      </Card>
    </div>
  );
}
