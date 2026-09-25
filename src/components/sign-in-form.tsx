"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const demos = [
  { identifier: "admin@village.local", role: "Admin" },
  { identifier: "treasurer@village.local", role: "Treasurer" },
  { identifier: "committee@village.local", role: "Committee" },
  { identifier: "viewer@village.local", role: "Viewer" },
  { identifier: "recipient@village.local", role: "Recipient" },
];

export function SignInForm({
  googleEnabled,
  demoLoginEnabled,
}: {
  googleEnabled: boolean;
  demoLoginEnabled: boolean;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(demoLoginEnabled ? "admin@village.local" : "");
  const [password, setPassword] = useState(demoLoginEnabled ? "demo1234" : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError("Check the email and password, then try again.");
      return;
    }
    for (const key of Object.keys(window.sessionStorage)) {
      if (key.startsWith("recipient-reminders:")) window.sessionStorage.removeItem(key);
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Gmail login</p>
            <p className="text-xs text-muted-foreground">For users with an approved Gmail account.</p>
          </div>
          <Button
            className="w-full"
            variant={demoLoginEnabled ? "outline" : "default"}
            onClick={async () => {
              const result = await signIn("google", { callbackUrl: "/dashboard", redirect: false });
              if (!result?.error) {
                for (const key of Object.keys(window.sessionStorage)) {
                  if (key.startsWith("recipient-reminders:")) window.sessionStorage.removeItem(key);
                }
                router.push("/dashboard");
              }
            }}
          >
            Continue with Gmail
          </Button>
        </div>
      ) : null}

      <div className={googleEnabled ? "space-y-3 border-t border-border pt-5" : "space-y-3"}>
        <div>
          <p className="text-sm font-semibold text-foreground">Administrator-provided login</p>
          <p className="text-xs text-muted-foreground">Use the email or mobile number and temporary password given by your administrator.</p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          <strong className="font-semibold text-foreground">Login Guideline:</strong> On your first sign-in, you’ll be prompted to create a new password. Contact your administrator if you don’t have an account or face issues.
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or mobile number</Label>
            <Input id="identifier" type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
        </form>
      </div>

      {!googleEnabled && !demoLoginEnabled ? <p className="text-sm text-muted-foreground">Use the login details provided by an administrator.</p> : null}

      {demoLoginEnabled ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo accounts</p>
          <div className="grid gap-2">
            {demos.map((item) => (
              <button
                key={item.identifier}
                type="button"
                onClick={() => {
                  setIdentifier(item.identifier);
                  setPassword("demo1234");
                }}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{item.identifier}</span>
                <span className="text-xs text-muted-foreground">{item.role}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Password for every seeded account: demo1234</p>
        </div>
      ) : null}
    </div>
  );
}
