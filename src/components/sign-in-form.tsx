"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const demos = [
  { email: "admin@village.local", role: "Admin" },
  { email: "treasurer@village.local", role: "Treasurer" },
  { email: "committee@village.local", role: "Committee" },
  { email: "viewer@village.local", role: "Viewer" },
  { email: "recipient@village.local", role: "Recipient" },
];

export function SignInForm({
  googleEnabled,
  demoLoginEnabled,
}: {
  googleEnabled: boolean;
  demoLoginEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(demoLoginEnabled ? "admin@village.local" : "");
  const [password, setPassword] = useState(demoLoginEnabled ? "demo1234" : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!demoLoginEnabled) return;
    setPending(true);
    setError("");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);
    if (result?.error) {
      setError("Check the email and password, then try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {googleEnabled ? (
        <Button
          className="w-full"
          variant={demoLoginEnabled ? "outline" : "default"}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continue with Google
        </Button>
      ) : null}

      {demoLoginEnabled ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
      ) : null}

      {!googleEnabled && !demoLoginEnabled ? (
        <p className="text-sm text-muted-foreground">
          Authentication is not configured. Set Google OAuth keys, or ENABLE_DEMO_LOGIN=true for a demo.
        </p>
      ) : null}

      {demoLoginEnabled ? (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Demo accounts</p>
          <div className="grid gap-2">
            {demos.map((item) => (
              <button
                key={item.email}
                type="button"
                onClick={() => {
                  setEmail(item.email);
                  setPassword("demo1234");
                }}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{item.email}</span>
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
