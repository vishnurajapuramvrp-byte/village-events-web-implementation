import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { SignInForm } from "@/components/sign-in-form";
import { demoLoginEnabled, googleLoginEnabled } from "@/lib/auth";
import { getSiteBranding } from "@/lib/site";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Flower2, ShieldCheck } from "lucide-react";

export default async function HomePage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const [googleEnabled, demoEnabled, site] = [googleLoginEnabled(), demoLoginEnabled(), await getSiteBranding()];

  return (
    <main className="min-h-screen p-3 sm:p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[1.5rem] bg-card shadow-2xl shadow-primary/10 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative flex min-h-[32rem] flex-col justify-between overflow-hidden bg-accent p-7 text-accent-foreground sm:p-10 lg:p-14">
          <div className="festival-photo festival-photo--ganesha absolute inset-0 opacity-75" aria-label="Festival deity decorated with flowers" role="img" />
          <div className="absolute inset-0 bg-[linear-gradient(145deg,hsl(153_36%_18%/.9),hsl(153_36%_18%/.35)_55%,hsl(13_76%_20%/.7))]" />
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-primary text-primary-foreground shadow-lg">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold tracking-wide">{site.villageName}</p>
                <p className="text-xs text-white/70">{site.tagline}</p>
              </div>
            </div>
            <Flower2 className="h-7 w-7 text-primary-foreground/80" />
          </div>
          <div className="relative z-10 max-w-xl space-y-5">
            <div className="rangoli-rule h-1 w-20 rounded-full" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">Our festivals, together</p>
            <h1 className="display-type text-4xl leading-[1.08] sm:text-6xl">{site.headline}</h1>
            <p className="max-w-lg text-sm leading-7 text-white/80 sm:text-base">{site.description}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-white/80">
              {site.highlights.slice(0, 3).map((item) => <span key={item}>✦ {item}</span>)}
            </div>
          </div>
          <p className="relative z-10 text-xs text-white/55">A clear record for every celebration and every family.</p>
        </section>

        <section className="flex items-center bg-background p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md">
            <div className="mb-8 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Committee portal</p>
              <h2 className="display-type text-4xl leading-tight">Welcome back</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {demoEnabled
                  ? "Use a demo account to explore the village event ledger."
                  : "Sign in with your email or mobile number to manage events, funds, and community support."}
              </p>
            </div>
            <Card className="border-border/70 bg-card/70 shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Sign in securely</CardTitle>
                <CardDescription className="flex items-center gap-2 text-xs"><ShieldCheck className="h-4 w-4 text-accent" /> Your access is role-based and auditable.</CardDescription>
              </CardHeader>
              <CardContent>
                <SignInForm googleEnabled={googleEnabled} demoLoginEnabled={demoEnabled} />
              </CardContent>
            </Card>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">Built for the people who keep the celebrations moving <ArrowRight className="h-3.5 w-3.5 text-primary" /></p>
          </div>
        </section>
      </div>
    </main>
  );
}
